import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import type {
  Env
} from "../../config/env.js";
import type {
  AutomationOutcome,
  PersonRecord,
  PortalProgress,
  RegistrationType,
  SessionRecord,
  UploadedDocument
} from "../../types/domain.js";
import type { OtpResolver } from "./otp-resolver.js";
import type { AgentDecisionEngine } from "../ai/agent-decision-engine.js";
import { RegistrationRecoveryService } from "../ai/recovery-service.js";
import type { StorageProvider } from "../storage/storage-provider.js";

function required<T>(value: T | undefined, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function firstDocument(
  session: SessionRecord,
  predicate: (document: UploadedDocument) => boolean
): UploadedDocument | undefined {
  return session.collectedData.documents.find(predicate);
}

function registrationLabel(type: RegistrationType | undefined): string {
  switch (type) {
    case "BUSINESS_NAME":
      return "Business Name";
    case "COMPANY":
      return "Company";
    case "INCORPORATED_TRUSTEES":
      return "Incorporated Trustees";
    default:
      return "Business Name";
  }
}

function participantGroup(
  session: SessionRecord
): { label: string; people: PersonRecord[] } {
  switch (session.collectedData.registrationType) {
    case "COMPANY":
      return { label: "director", people: session.collectedData.directors };
    case "INCORPORATED_TRUSTEES":
      return { label: "trustee", people: session.collectedData.trustees };
    case "BUSINESS_NAME":
    default:
      return { label: "proprietor", people: session.collectedData.proprietors };
  }
}

export class CacAutomationService {
  private readonly recoveryService: RegistrationRecoveryService;

  constructor(
    private readonly env: Env,
    private readonly otpResolver: OtpResolver,
    private readonly storage: StorageProvider,
    private readonly adl: AgentDecisionEngine
  ) {
    this.recoveryService = new RegistrationRecoveryService(env);
  }

  /** Check if the CAC portal is reachable before launching a full browser session. */
  async checkPortalHealth(): Promise<boolean> {
    const url = "https://icrp.cac.gov.ng/";
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) });
        if (res.status < 500) return true;
      } catch (err) {
        console.warn(`[cac-automation] Pre-flight check failed for ${url} (attempt ${attempt})`);
      }
    }
    return false;
  }

  /** Retry a step up to `maxAttempts` times, capturing a screenshot on each failure. */
  private async retryStep<T>(
    page: Page,
    session: SessionRecord,
    stepName: string,
    action: () => Promise<T>,
    maxAttempts = 3
  ): Promise<T> {
    const startedAt = Date.now();
    let lastError: Error | undefined;
    
    // Log the start of the step
    session.auditTrail.push({
       at: new Date().toISOString(),
       actor: "system",
       action: "automation_step_started",
       detail: { stepName }
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStartedAt = Date.now();
      try {
        const result = await action();
        
        // Log successful completion with duration
        const durationMs = Date.now() - startedAt;
        session.auditTrail.push({
           at: new Date().toISOString(),
           actor: "system",
           action: "automation_step_completed",
           detail: { 
             stepName, 
             durationMs, 
             attempts: attempt,
             success: true 
           }
        });
        
        return result;
      } catch (error) {
        const attemptDurationMs = Date.now() - attemptStartedAt;
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `[cac-automation] Step "${stepName}" failed (attempt ${attempt}/${maxAttempts}): ${lastError.message}`
        );
        
        session.auditTrail.push({
           at: new Date().toISOString(),
           actor: "system",
           action: "automation_step_failed",
           detail: { 
             stepName, 
             attempt, 
             durationMs: attemptDurationMs, 
             error: lastError.message 
           }
        });
        
        await this.capture(page, session.id, `retry-${stepName}-attempt${attempt}`).catch(() => undefined);
        await this.captureHtml(page, session.id, `retry-${stepName}-attempt${attempt}`).catch(() => undefined);
        
        if (attempt === maxAttempts) {
           console.log(`[cac-automation] Final attempt failed. Triggering Intelligent Recovery System...`);
           try {
             const domText = (await page.locator("body").innerText().catch(() => "")) || "Blank Page";
             
             // --- 🧠 CALL ADL FOR RECOVERY ---
             const recoveryDecision = await this.adl.decide(session, {
               event: "automation_step_failure",
               error: lastError.message,
               domSnapshot: domText
             });
             
             console.log(`[cac-automation] ADL Recovery Decision:`, recoveryDecision);
             
             if (recoveryDecision.action === "ESCALATE") {
               throw new Error(`RECOVERY_FAILED: ${recoveryDecision.reasoning}`);
             }

             if (recoveryDecision.action === "RETRY") {
               attempt = 1; // Reset attempts for a fresh start with new strategy
               continue;
             }

             // If the ADL suggests a specific browser action, we use the RecoveryService (which uses Claude) to find the selector
             const recoveryAction = await this.recoveryService.processFailure(
               session,
               lastError.message,
               domText,
               stepName
             );
             
             console.log(`[cac-automation] AI Recovery returned action:`, recoveryAction);
             
             // --- 🛡️ ACTION GUARDRAILS ---
             const restrictedActions = ["submit", "finalize", "confirm", "pay", "delete"];
             const isRestricted = restrictedActions.some(a => 
                recoveryAction.reason.toLowerCase().includes(a) || 
                (recoveryAction.selector && recoveryAction.selector.toLowerCase().includes(a))
             );

             if (isRestricted) {
                console.warn(`[cac-automation] AI attempted restricted action: ${recoveryAction.reason}. Aborting for safety.`);
                throw lastError;
             }

             session.auditTrail.push({
                at: new Date().toISOString(),
                actor: "system",
                action: "automation_recovery_triggered",
                detail: { stepName, recoveryAction }
             });

             if (recoveryAction.action === "abort") {
                throw lastError;
             }
             
             if (recoveryAction.action === "click" && recoveryAction.selector) {
                await page.locator(recoveryAction.selector).first().click({ force: true, timeout: 5000 });
             } else if (recoveryAction.action === "fill" && recoveryAction.selector && recoveryAction.value) {
                await page.locator(recoveryAction.selector).first().fill(recoveryAction.value, { force: true, timeout: 5000 });
             }
             
             await page.waitForTimeout(2500); 
             return await action();
           } catch (recoveryErr) {
             console.error(`[cac-automation] Recovery failed: ${String(recoveryErr)}`);
             throw lastError;
           }
        }
        
        await page.waitForTimeout(2000 * attempt);
      }
    }
    throw lastError ?? new Error(`Step "${stepName}" failed after ${maxAttempts} attempts.`);
  }

  private async captureHtml(page: Page, sessionId: string, name: string): Promise<string> {
    try {
      const content = await page.content();
      const path = `sessions/${sessionId}/artifacts/${Date.now()}-${name}.html`;
      await this.storage.upload(path, content, "text/html");
      return path;
    } catch (err) {
      return "";
    }
  }

  private async capture(page: Page, sessionId: string, name: string): Promise<string> {
    try {
      const buffer = await page.screenshot({ fullPage: true });
      const storagePath = `sessions/${sessionId}/artifacts/${Date.now()}-${name}.png`;
      await this.storage.upload(storagePath, buffer, "image/png");
      return storagePath;
    } catch (err) {
      return "";
    }
  }

  /**
   * Fast-fails automation if the portal displays known maintenance or downtime messaging.
   */
  private async checkSiteMaintenance(page: Page): Promise<void> {
    const pageText = await page.locator("body").innerText().catch(() => "");
    if (
      /under maintenance/i.test(pageText) ||
      /temporarily down/i.test(pageText) ||
      /service unavailable/i.test(pageText) ||
      /server maintenance/i.test(pageText) ||
      /undergoing upgrade/i.test(pageText) ||
      /error 502/i.test(pageText) ||
      /error 504/i.test(pageText)
    ) {
      throw new Error("CAC_MAINTENANCE_ERROR: The CAC Portal is currently undergoing maintenance. Automation halted to prevent blind loops.");
    }
  }

  /**
   * Universal UI Stabilization
   * Clears CAC's blocking alerts/modals before taking automated DOM actions
   */
  private async stabilizeUi(page: Page): Promise<void> {
    try {
      // 1. Try clicking obvious explicit close buttons in modals
      const modalClose = page.locator('button:has-text("Close"), button:has-text("X"), .btn-close, .btn.p-0');
      if (await modalClose.count().catch(() => 0) > 0) {
        await modalClose.first().click({ force: true, timeout: 1000 }).catch(() => {});
      } else {
        await page.keyboard.press("Escape").catch(() => {});
      }

      // 2. Brute-force obliterate overlay elements
      await page.evaluate(() => {
        document.querySelectorAll('ngb-modal-window, .modal-backdrop, .overlay-container').forEach(el => el.remove());
      }).catch(() => {});

      // 3. Confirm detachment before proceeding
      await page.waitForSelector('ngb-modal-window', {
        state: 'detached',
        timeout: 1000
      }).catch(() => {});
    } catch {
      // Ignore stabilization failures
    }
  }

  private async visibleLocator(
    page: Page,
    candidates: Array<() => Locator>,
    waitMs = 3000
  ): Promise<Locator> {
    await this.stabilizeUi(page);
    
    // Quick scan for any existing candidate
    for (const build of candidates) {
      try {
        const locator = build();
        const count = await locator.count().catch(() => 0);
        if (count > 0) {
          // Prefer a visible element when possible
          const maybeVisible = await locator.first().isVisible().catch(() => false);
          if (maybeVisible) return locator.first();
          return locator.first();
        }
      } catch (err) {
        console.warn(`[cac-automation] visibleLocator candidate error: ${String(err)}`);
      }
    }

    // Wait-loop across candidates until timeout
    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      for (const build of candidates) {
        try {
          const locator = build();
          const count = await locator.count().catch(() => 0);
          if (count > 0) {
            const vis = await locator.first().isVisible().catch(() => false);
            if (vis) return locator.first();
            return locator.first();
          }
        } catch {
          // ignore and try next
        }
      }
      await page.waitForTimeout(250);
    }

    // Last resort: capture a short snapshot to help debugging
    const snippet = (await page.locator("body").innerText().catch(() => "")) || "<no-body>";
    throw new Error(`Expected CAC portal element was not found. Page snapshot: ${snippet.slice(0, 400)}`);
  }

  private async clickFirst(page: Page, candidates: Array<() => Locator>, waitMs = 3000): Promise<void> {
    await this.stabilizeUi(page);
    const locator = await this.visibleLocator(page, candidates, waitMs);
    try {
      await locator.click();
    } catch (err) {
      console.error(`[cac-automation] clickFirst failed: ${String(err)}`);
      throw err;
    }
  }

  private async maybeClick(page: Page, candidates: Array<() => Locator>): Promise<boolean> {
    await this.stabilizeUi(page);
    for (const build of candidates) {
      const locator = build();
      const count = await locator.count().catch(() => 0);
      if (count > 0) {
        await locator.first().click();
        return true;
      }
    }

    return false;
  }

  private async fillByLabels(page: Page, labels: string[], value: string): Promise<void> {
    await this.stabilizeUi(page);
    for (const label of labels) {
      // Try by exact label first
      let locator = page.getByLabel(new RegExp(label, "i"));
      if ((await locator.count().catch(() => 0)) > 0) {
        // Double check it's an input or textarea
        const tagName = await locator.first().evaluate(el => el.tagName.toLowerCase()).catch(() => "");
        if (tagName === "input" || tagName === "textarea") {
          await locator.first().fill(value);
          return;
        }
      }

      // Try by placeholder
      locator = page.getByPlaceholder(new RegExp(label, "i"));
      if ((await locator.count().catch(() => 0)) > 0) {
        await locator.first().fill(value);
        return;
      }

      // Try by finding a textbox that contains the label text as its name
      locator = page.getByRole("textbox", { name: new RegExp(label, "i") });
      if ((await locator.count().catch(() => 0)) > 0) {
        await locator.first().fill(value);
        return;
      }
    }

    throw new Error(`Unable to locate an input matching any labels: ${labels.join(", ")}`);
  }

  private async fillIfPresent(page: Page, labels: string[], value?: string): Promise<void> {
    if (!value) {
      return;
    }
    
    await this.stabilizeUi(page);
    for (const label of labels) {
      const locator = page.getByLabel(new RegExp(label, "i"));
      if ((await locator.count().catch(() => 0)) > 0) {
        await locator.first().fill(value);
        return;
      }
    }
  }

  private async selectByLabels(page: Page, labels: string[], value: string): Promise<void> {
    await this.stabilizeUi(page);
    for (const label of labels) {
      const locator = page.getByLabel(new RegExp(label, "i"));
      if ((await locator.count().catch(() => 0)) > 0) {
        await locator.first().selectOption({ label: value }).catch(async () => {
          await locator.first().selectOption(value);
        });
        return;
      }
    }

    throw new Error(`Unable to locate a select for labels: ${labels.join(", ")}`);
  }

  private async selectIfPresent(page: Page, labels: string[], value?: string): Promise<void> {
    if (!value) {
      return;
    }
    
    await this.stabilizeUi(page);
    for (const label of labels) {
      const locator = page.getByLabel(new RegExp(label, "i"));
      if ((await locator.count().catch(() => 0)) > 0) {
        await locator.first().selectOption({ label: value }).catch(async () => {
          await locator.first().selectOption(value);
        });
        return;
      }
    }
  }

  private async login(page: Page, session: SessionRecord): Promise<void> {
    const startedAt = new Date().toISOString();

    if (this.env.CAC_DEMO_NETWORK === "offline" || this.env.CAC_DEMO_NETWORK === "fail-fast") {
      throw new Error(`CAC_DEMO_NETWORK is ${this.env.CAC_DEMO_NETWORK}, skipping login to fail-fast.`);
    }

    // Explicit network logging when page.goto() has issues with /auth/login
    page.on("response", (response) => {
      if (response.url().includes("/auth/login")) {
        console.log(`[cac-automation] Login response received: ${response.status()} from ${response.url()}`);
      }
    });

    page.on("requestfailed", (request) => {
      if (request.url().includes("/auth/login")) {
        console.error(`[cac-automation] Login request failed: ${request.url()} - ${request.failure()?.errorText || "Unknown error"}`);
      }
    });

    const rootUrl = "https://icrp.cac.gov.ng/";
    // FIX: Add trailing slash to bypass buggy NGINX 301 redirect to HTTP!
    const loginUrl = "https://icrp.cac.gov.ng/auth/login/";
    
    await this.retryStep(page, session, "navigate-login", async () => {
      // Step 1: Hit root page to acquire initial cookies and look like a human
      console.log(`[cac-automation] Navigating to root ${rootUrl} first...`);
      await page.goto(rootUrl, { waitUntil: "commit", timeout: 20000 }).catch(() => undefined);
      await page.waitForTimeout(1000 + Math.random() * 1000);

      // Step 2: Navigate directly to EXACT login path to prevent HTTP downgrade
      console.log(`[cac-automation] Navigating to ${loginUrl}...`);
      await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      // Wait for network to settle somewhat without requiring full networkidle
      await page.waitForTimeout(2000);
      // Validate we didn't land on a gateway timeout page
      await this.checkSiteMaintenance(page);
    }, 4);
    
    // Attempt to dismiss any announcement modals that block pointer events
    // This is now natively handled by stabilizeUi(), but keep localized try-catch just in case
    await this.stabilizeUi(page);
    
    // Explicitly click the 'Email' tab
    await this.maybeClick(page, [
      () => page.getByRole("tab", { name: /email/i }),
      () => page.getByText(/^email$/i)
    ]);
    
    await this.capture(page, session.id, "at-login-page");

    // Select credentials (Custom vs Environment)
    const creds = session.collectedData.portalCredentials;
    const email = (creds && !creds.useProfessionalAccount && creds.email) 
      ? creds.email 
      : required(this.env.CAC_EMAIL, "CAC_EMAIL is missing.");
    const password = (creds && !creds.useProfessionalAccount && creds.password) 
      ? creds.password 
      : required(this.env.CAC_PASSWORD, "CAC_PASSWORD is missing.");

    await this.fillByLabels(
      page,
      [
        "email",
        "username",
        "phone number",
        "accreditation number",
        "Username, Email, Phone Number or Accreditation Number"
      ],
      email
    );
    await this.fillByLabels(
      page,
      ["password"],
      password
    );
    await this.clickFirst(page, [
      () => page.getByRole("button", { name: /login/i }),
      () => page.getByText(/^login$/i)
    ]);

    // Phase 5: Manual OTP Fallback Hierarchy
    let otp: string | undefined;
    const manual = session.collectedData.portal?.pendingManualOtp;
    
    // 1. Check if we have a fresh, confirmed manual OTP from the user
    if (manual?.confirmed && manual.code) {
      const receivedAt = new Date(manual.receivedAt).getTime();
      const now = Date.now();
      const isFresh = (now - receivedAt) < 180_000; // 3 minute window
      
      if (isFresh) {
        console.log(`[cac-automation] Using confirmed manual OTP: ${manual.code}`);
        otp = manual.code;
        
        // Clear it so it's not reused if the login fails for other reasons
        if (session.collectedData.portal) {
          session.collectedData.portal.pendingManualOtp = undefined;
        }
      } else {
        console.warn(`[cac-automation] Manual OTP expired. Falling back to IMAP.`);
      }
    }

    // 2. Fallback to automated IMAP resolver if no manual OTP was provided/valid
    if (!otp) {
      try {
        otp = await this.otpResolver.resolveOtp(startedAt);
      } catch (err) {
        console.error(`[cac-automation] Automated OTP retrieval failed: ${String(err)}`);
        // Signal to the orchestrator that we are stuck on OTP
        session.state = "AWAITING_OTP";
        throw err;
      }
    }

    await this.fillByLabels(page, ["otp", "one-time password", "verification code"], otp);
    await this.clickFirst(page, [
      () => page.getByRole("button", { name: /submit|verify|continue/i }),
      () => page.getByText(/submit|verify|continue/i)
    ]);

    // Wait for portal to process OTP — look for dashboard indicators instead of blind timeout
    console.log("OTP submitted, waiting for portal redirect...");
    await Promise.race([
      page.waitForSelector('text=/dashboard|reservation|registration|Post Inc/i', { timeout: 20000 }),
      page.waitForURL(/dashboard|home/i, { timeout: 20000 }),
      page.waitForTimeout(12000)
    ]).catch(() => undefined);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await this.capture(page, session.id, "after-login-otp");
  }

  private async ensureNameReservation(
    page: Page,
    session: SessionRecord
  ): Promise<PortalProgress> {
    if (session.collectedData.portal?.avCode) {
      return {
        ...session.collectedData.portal,
        lastCheckpoint: "reservation-existing"
      };
    }

    // CRP 3.0: Dashboard → "Name Reservation" nav link
    await this.clickFirst(page, [
      () => page.getByRole("link", { name: /name reservation/i }),
      () => page.getByRole("button", { name: /name reservation/i }),
      () => page.getByText(/name reservation/i)
    ]);

    await this.clickFirst(page, [
      () => page.getByRole("button", { name: /new reservation/i }),
      () => page.getByText(/new reservation/i)
    ]);

    // CRP 3.0 uses "Business Classification" (Company, LP, LLP, Business Name)
    await this.selectByLabels(
      page,
      ["business classification", "classification"],
      registrationLabel(session.collectedData.registrationType)
    );
    // CRP 3.0 uses "Business Type" (e.g. Sole Proprietorship, Private Ltd, etc.)
    await this.selectIfPresent(
      page,
      ["business type", "company type"],
      session.collectedData.registrationSubtype
    );

    await this.clickFirst(page, [
      () => page.getByRole("button", { name: /continue/i }),
      () => page.getByText(/^continue$/i)
    ]);

    // CRP 3.0: "Enter your Proposed Name"
    await this.fillByLabels(
      page,
      ["proposed name", "proposed business name", "business name", "company name"],
      required(
        session.collectedData.businessNameOptions[0],
        "At least one business name option is required."
      )
    );

    // CRP 3.0: "Nature of Business" and "Specific Nature of Business"
    await this.selectIfPresent(
      page,
      ["nature of business", "nature", "principal activity"],
      session.collectedData.businessActivity
    );
    await this.selectIfPresent(
      page,
      ["specific nature of business", "specific nature", "specific activity"],
      session.collectedData.specificBusinessActivity
    );

    await this.maybeClick(page, [
      () => page.getByRole("button", { name: /check availability/i }),
      () => page.getByText(/check availability/i)
    ]);

    await page.waitForLoadState("networkidle");
    const pageText = await page.locator("body").innerText();
    const avCodeText = pageText.match(/\bAV\s*Code[:\s]+([A-Z0-9-]+)/i)?.[1];

    await this.maybeClick(page, [
      () => page.getByRole("button", { name: /continue to payment|continue/i }),
      () => page.getByText(/continue to payment|continue/i)
    ]);

    return {
      avCode: avCodeText,
      lastCheckpoint: "name-reserved"
    };
  }

  private async openRegistrationStart(page: Page, session: SessionRecord): Promise<void> {
    await this.clickFirst(page, [
      () => page.getByRole("link", { name: /registration/i }),
      () => page.getByText(/^registration$/i)
    ]);

    const registrationType = session.collectedData.registrationType;
    const actionPatterns =
      registrationType === "COMPANY"
        ? [/register new company/i, /company registration/i]
        : registrationType === "INCORPORATED_TRUSTEES"
          ? [/register incorporated trustees/i, /trustee registration/i]
          : [/register new business/i, /business name registration/i];

    await this.clickFirst(
      page,
      actionPatterns.flatMap((pattern) => [
        () => page.getByRole("button", { name: pattern }),
        () => page.getByText(pattern)
      ])
    );
  }

  private async fillStartFromAvCode(
    page: Page,
    session: SessionRecord,
    portal: PortalProgress
  ): Promise<void> {
    await this.openRegistrationStart(page, session);

    await this.fillByLabels(
      page,
      ["av code", "approval validation code"],
      required(portal.avCode, "AV code is required to continue.")
    );
    await this.clickFirst(page, [
      () => page.getByRole("button", { name: /continue/i }),
      () => page.getByText(/^continue$/i)
    ]);
  }

  private async fillOrganizationDetails(page: Page, session: SessionRecord): Promise<void> {
    await this.fillByLabels(
      page,
      ["email", "registered email"],
      required(session.collectedData.clientEmail, "clientEmail is required.")
    );
    await this.fillByLabels(
      page,
      ["business address", "registered address", "address"],
      required(session.collectedData.address?.line1, "Business address is required.")
    );
    await this.fillIfPresent(page, ["city"], session.collectedData.address?.city);
    await this.fillIfPresent(page, ["state"], session.collectedData.address?.state);
    await this.fillByLabels(
      page,
      ["date of business commencement", "commencement", "incorporation date", "date of commencement"],
      required(session.collectedData.commencementDate, "commencementDate is required.")
    );

    if (session.collectedData.registrationType === "COMPANY") {
      await this.fillIfPresent(
        page,
        ["authorized share capital", "share capital"],
        session.collectedData.shareCapitalNaira
          ? String(session.collectedData.shareCapitalNaira)
          : undefined
      );
    }

    await this.maybeClick(page, [
      () => page.getByRole("button", { name: /save & continue|continue/i }),
      () => page.getByText(/save & continue|continue/i)
    ]);
  }

  private async fillParticipant(page: Page, person: PersonRecord): Promise<void> {
    await this.fillByLabels(
      page,
      ["full name", "name"],
      required(person.fullName, "Participant fullName is required.")
    );
    await this.fillByLabels(
      page,
      ["date of birth", "dob"],
      required(person.dob, "Participant dob is required.")
    );
    await this.fillByLabels(
      page,
      ["phone", "telephone"],
      required(person.phone, "Participant phone is required.")
    );
    await this.fillIfPresent(page, ["email"], person.email);
    await this.fillIfPresent(
      page,
      ["residential address", "home address"],
      person.residentialAddress?.line1
    );
    await this.selectIfPresent(page, ["means of identification", "id type"], person.idType);
    await this.fillByLabels(
      page,
      ["identification number", "id number"],
      required(person.idNumber, "Participant idNumber is required.")
    );
    await this.selectIfPresent(page, ["nationality"], person.nationality);
  }

  private async fillParticipants(page: Page, session: SessionRecord): Promise<void> {
    const { people, label } = participantGroup(session);
    if (people.length === 0) {
      throw new Error(`At least one ${label} is required.`);
    }

    for (const [index, person] of people.entries()) {
      if (index > 0) {
        await this.maybeClick(page, [
          () => page.getByRole("button", { name: new RegExp(`add ${label}`, "i") }),
          () => page.getByText(new RegExp(`add ${label}`, "i")),
          () => page.getByRole("button", { name: /add director|add trustee|add proprietor/i })
        ]);
      }

      await this.fillParticipant(page, person);
      await this.maybeClick(page, [
        () => page.getByRole("button", { name: /save & continue|save|continue/i }),
        () => page.getByText(/save & continue|save|continue/i)
      ]);
    }
  }

  private async uploadIfPresent(page: Page, filePath?: string): Promise<void> {
    if (!filePath) {
      return;
    }

    const input = page.locator("input[type='file']");
    if ((await input.count().catch(() => 0)) > 0) {
      await input.first().setInputFiles(filePath);
    }
  }

  private async uploadCoreDocuments(page: Page, session: SessionRecord): Promise<void> {
    const idDoc = firstDocument(session, (item) => item.kind.includes("identification"));
    const passport = firstDocument(session, (item) => item.kind.includes("passport"));
    const signature = firstDocument(session, (item) => item.kind.includes("signature"));

    await this.uploadIfPresent(page, idDoc?.localPath);
    await this.uploadIfPresent(page, passport?.localPath);
    await this.uploadIfPresent(page, signature?.localPath);

    // CRP 3.0: "Add Proprietor Document" button
    await this.maybeClick(page, [
      () => page.getByRole("button", { name: /add proprietor document/i }),
      () => page.getByRole("button", { name: /add .*document|upload/i }),
      () => page.getByText(/add proprietor document/i),
      () => page.getByText(/add .*document|upload/i)
    ]);

    await this.maybeClick(page, [
      () => page.getByRole("button", { name: /save \u0026 continue|save|continue/i }),
      () => page.getByText(/save \u0026 continue|continue/i)
    ]);
  }

  private async extractPaymentOutcome(
    page: Page,
    session: SessionRecord,
    portal: PortalProgress
  ): Promise<AutomationOutcome> {
    await this.maybeClick(page, [
      () => page.getByRole("button", { name: /proceed to payment|payment|continue/i }),
      () => page.getByText(/proceed to payment|payment|continue/i)
    ]);

    await page.waitForLoadState("networkidle");
    const pageText = await page.locator("body").innerText();
    const rrr = pageText.match(/\bRRR[:\s]+(\d{12})\b/i)?.[1];
    const amountMatch = pageText.match(/(?:NGN|N)\s?([\d,]+\.\d{2}|[\d,]+)/i);
    const amountNaira = amountMatch?.[1]
      ? Number.parseFloat(amountMatch[1].replace(/,/g, ""))
      : undefined;

    return {
      kind: "AWAITING_PAYMENT",
      payment: {
        rrr,
        amountNaira,
        paymentLink: page.url()
      },
      portal: {
        ...portal,
        applicationId:
          pageText.match(/\bApplication\s*(?:ID|No\.?)[:\s]+([A-Z0-9-]+)/i)?.[1] ??
          portal.applicationId,
        statusText: "Awaiting payment",
        lastCheckpoint: `${session.collectedData.registrationType?.toLowerCase() ?? "registration"}-payment-page`
      },
      summary: `${registrationLabel(session.collectedData.registrationType)} registration has reached the Remita payment stage.`
    };
  }

  private async proceedToBusinessNameRegistration(
    page: Page,
    session: SessionRecord,
    portal: PortalProgress
  ): Promise<AutomationOutcome> {
    await this.fillStartFromAvCode(page, session, portal);
    await this.fillOrganizationDetails(page, session);
    await this.fillParticipants(page, session);
    await this.uploadCoreDocuments(page, session);
    return this.extractPaymentOutcome(page, session, portal);
  }

  private async proceedToCompanyRegistration(
    page: Page,
    session: SessionRecord,
    portal: PortalProgress
  ): Promise<AutomationOutcome> {
    await this.fillStartFromAvCode(page, session, portal);
    await this.fillOrganizationDetails(page, session);
    await this.fillParticipants(page, session);

    await this.fillIfPresent(
      page,
      ["company secretary", "secretary name"],
      session.collectedData.notes.find((note: string) => /secretary/i.test(note))
    );
    await this.uploadCoreDocuments(page, session);
    return this.extractPaymentOutcome(page, session, portal);
  }

  private async proceedToTrusteesRegistration(
    page: Page,
    session: SessionRecord,
    portal: PortalProgress
  ): Promise<AutomationOutcome> {
    await this.fillStartFromAvCode(page, session, portal);
    await this.fillOrganizationDetails(page, session);
    await this.fillParticipants(page, session);

    await this.fillIfPresent(
      page,
      ["objectives", "aims", "mission statement"],
      session.collectedData.notes[0]
    );
    await this.uploadCoreDocuments(page, session);
    return this.extractPaymentOutcome(page, session, portal);
  }

  private async proceedToPostIncFiling(page: Page, session: SessionRecord): Promise<AutomationOutcome> {
    // Navigate to Post Inc. section
    await this.clickFirst(page, [
      () => page.getByRole("link", { name: /post\s*inc/i }),
      () => page.getByRole("button", { name: /post\s*inc/i }),
      () => page.getByText(/post\s*inc/i)
    ]).catch(() => undefined);

    // Search for entity by RC number or existing name
    const rc = session.collectedData.postIncData?.existingRcNumber ?? "";
    const name = session.collectedData.postIncData?.existingName ?? "";
    const query = rc || name || session.collectedData.clientName || "";

    if (query) {
      const searchInputCandidates = [
        () => page.getByPlaceholder(/search/i),
        () => page.getByRole("searchbox"),
        () => page.getByRole("textbox", { name: /search/i }),
        () => page.getByLabel(/search|entity search|rc number/i)
      ];

      for (const build of searchInputCandidates) {
        const locator = build();
        if ((await locator.count().catch(() => 0)) > 0) {
          await locator.first().fill(query);
          await this.maybeClick(page, [
            () => page.getByRole("button", { name: /search|find|entity search/i }),
            () => page.getByText(/search|find/i)
          ]).catch(() => undefined);
          break;
        }
      }
    }

    await page.waitForLoadState("networkidle");

    // Try to open the found entity (match RC first, then name)
    const opened = await this.maybeClick(page, [
      () => page.getByRole("link", { name: new RegExp(rc || name || "", "i") }),
      () => page.getByRole("button", { name: new RegExp(rc || name || "", "i") }),
      () => page.getByText(new RegExp(rc || name || "", "i"))
    ]).catch(() => false);

    await page.waitForLoadState("networkidle");

    // Choose the correct Post-Inc action
    const wf = session.collectedData.workflowType;
    const resolutionDoc = firstDocument(session, (d) =>
      (d.kind && /resolution|board/i.test(d.kind)) || /resolution|board/i.test(d.fileName)
    );

    // Helper to detect whether portal asks for payment
    const pageText = await page.locator("body").innerText().catch(() => "");

    try {
      switch (wf) {
        case "CHANGE_NAME":
          await this.clickFirst(page, [
            () => page.getByRole("button", { name: /change\s*name|change of name/i }),
            () => page.getByText(/change\s*name|change of name/i)
          ]).catch(() => undefined);

          // Fill proposed names
          const proposed = session.collectedData.postIncData?.proposedNames ?? [];
          for (let i = 0; i < proposed.length; i++) {
            await this.fillIfPresent(page, [
              `proposed name ${i + 1}`,
              `proposed name`,
              `proposed business name`,
              `alternative name`
            ], proposed[i]).catch(() => undefined);
          }

          // Attach board resolution if available
          await this.uploadIfPresent(page, resolutionDoc?.localPath).catch(() => undefined);

          // Submit and check for payment / pending
          await this.maybeClick(page, [
            () => page.getByRole("button", { name: /submit|save & continue|save/i }),
            () => page.getByText(/submit|save & continue|save/i)
          ]).catch(() => undefined);

          await page.waitForLoadState("networkidle");

          // Prefer to detect payment details
          if (/RRR|Remita|Payment|proceed to payment/i.test(await page.locator("body").innerText())) {
            return await this.extractPaymentOutcome(page, session, {
              applicationId: pageText.match(/Application\s*(?:ID|No\.?):?\s*([A-Z0-9-]+)/i)?.[1]
            } as PortalProgress);
          }

          return {
            kind: "PENDING_APPROVAL",
            summary: "Change of name submitted and awaiting CAC review.",
            portal: {
              applicationId: pageText.match(/Application\s*(?:ID|No\.?):?\s*([A-Z0-9-]+)/i)?.[1],
              statusText: "Pending approval",
              lastCheckpoint: "post-inc-change-name-submitted"
            }
          };

        case "CHANGE_DIRECTORS":
          await this.clickFirst(page, [
            () => page.getByRole("button", { name: /change\s*director|change of directors|directors/i }),
            () => page.getByText(/change\s*director|change of directors|directors/i)
          ]).catch(() => undefined);

          // Add new directors
          const additions = session.collectedData.postIncData?.newDirectors ?? [];
          for (const person of additions) {
            await this.maybeClick(page, [
              () => page.getByRole("button", { name: /add director/i }),
              () => page.getByText(/add director/i)
            ]).catch(() => undefined);
            await this.fillParticipant(page, person).catch(() => undefined);
            await this.maybeClick(page, [
              () => page.getByRole("button", { name: /save & continue|save|continue/i }),
              () => page.getByText(/save & continue|save|continue/i)
            ]).catch(() => undefined);
          }

          // Remove directors (attempt to fill a removal field)
          const removals = session.collectedData.postIncData?.removedDirectorNames ?? [];
          if (removals.length > 0) {
            await this.fillIfPresent(page, ["directors to remove", "removed directors", "remove director"], removals.join(", ")).catch(() => undefined);
          }

          // Attach board resolution
          await this.uploadIfPresent(page, resolutionDoc?.localPath).catch(() => undefined);

          await this.maybeClick(page, [
            () => page.getByRole("button", { name: /submit|save & continue|save/i }),
            () => page.getByText(/submit|save & continue|save/i)
          ]).catch(() => undefined);

          await page.waitForLoadState("networkidle");

          if (/RRR|Remita|Payment|proceed to payment/i.test(await page.locator("body").innerText())) {
            return await this.extractPaymentOutcome(page, session, {
              applicationId: pageText.match(/Application\s*(?:ID|No\.?):?\s*([A-Z0-9-]+)/i)?.[1]
            } as PortalProgress);
          }

          return {
            kind: "PENDING_APPROVAL",
            summary: `Change of directors submitted for RC ${rc}.`,
            portal: {
              applicationId: pageText.match(/Application\s*(?:ID|No\.?):?\s*([A-Z0-9-]+)/i)?.[1],
              statusText: "Pending approval",
              lastCheckpoint: "post-inc-change-directors-submitted"
            }
          };

        case "ANNUAL_RETURNS":
          await this.clickFirst(page, [
            () => page.getByRole("button", { name: /annual return|annual returns|file annual/i }),
            () => page.getByText(/annual return|annual returns|file annual/i)
          ]).catch(() => undefined);

          // Attach financials / annual documents
          const finDoc = firstDocument(session, (d) => /annual|financial|returns/i.test(d.fileName) || /annual|financial|returns/i.test(d.kind));
          await this.uploadIfPresent(page, finDoc?.localPath).catch(() => undefined);

          await this.maybeClick(page, [
            () => page.getByRole("button", { name: /submit|save & continue|save/i }),
            () => page.getByText(/submit|save & continue|save/i)
          ]).catch(() => undefined);

          await page.waitForLoadState("networkidle");

          // Annual returns are commonly manually reviewed by CAC
          return {
            kind: "PENDING_APPROVAL",
            summary: `Annual returns filed for RC ${rc}.`,
            portal: {
              applicationId: pageText.match(/Application\s*(?:ID|No\.?):?\s*([A-Z0-9-]+)/i)?.[1],
              statusText: "Pending approval",
              lastCheckpoint: "post-inc-annual-returns-submitted"
            }
          };

        case "CHANGE_ADDRESS":
        case "CHANGE_ACTIVITY":
        case "CHANGE_SHARES":
          // Generic handler: attempt to click an action, fill fields and attach resolution if needed
          await this.clickFirst(page, [
            () => page.getByRole("button", { name: /change|edit|amend/i }),
            () => page.getByText(/change|edit|amend/i)
          ]).catch(() => undefined);

          // Fill address or activity or shares depending on workflow
          if (wf === "CHANGE_ADDRESS") {
            await this.fillIfPresent(page, ["address line 1", "address", "street"], session.collectedData.address?.line1).catch(() => undefined);
            await this.fillIfPresent(page, ["city", "town"], session.collectedData.address?.city).catch(() => undefined);
            await this.fillIfPresent(page, ["state", "region"], session.collectedData.address?.state).catch(() => undefined);
          }
          if (wf === "CHANGE_ACTIVITY") {
            await this.fillIfPresent(page, ["nature of business", "business activity", "activity"], session.collectedData.businessActivity).catch(() => undefined);
            await this.fillIfPresent(page, ["specific nature of business", "specific activity"], session.collectedData.specificBusinessActivity).catch(() => undefined);
          }
          if (wf === "CHANGE_SHARES") {
            await this.fillIfPresent(page, ["share capital", "authorized share capital", "share capital (ngn)"], String(session.collectedData.shareCapitalNaira ?? "")).catch(() => undefined);
          }

          await this.uploadIfPresent(page, resolutionDoc?.localPath).catch(() => undefined);
          await this.maybeClick(page, [
            () => page.getByRole("button", { name: /submit|save & continue|save/i }),
            () => page.getByText(/submit|save & continue|save/i)
          ]).catch(() => undefined);

          await page.waitForLoadState("networkidle");

          if (/RRR|Remita|Payment|proceed to payment/i.test(await page.locator("body").innerText())) {
            return await this.extractPaymentOutcome(page, session, {
              applicationId: pageText.match(/Application\s*(?:ID|No\.?):?\s*([A-Z0-9-]+)/i)?.[1]
            } as PortalProgress);
          }

          return {
            kind: "PENDING_APPROVAL",
            summary: `Post-incorporation change (${wf}) submitted for RC ${rc}.`,
            portal: {
              applicationId: pageText.match(/Application\s*(?:ID|No\.?):?\s*([A-Z0-9-]+)/i)?.[1],
              statusText: "Pending approval",
              lastCheckpoint: `post-inc-${String(wf).toLowerCase()}-submitted`
            }
          };

        default:
          throw new Error(`Unsupported post-inc workflow: ${String(wf)}`);
      }
    } catch (err) {
      throw err;
    }
  }

  private async setupAuthenticatedPage(session: SessionRecord): Promise<{ browser: Browser, context: BrowserContext, page: Page }> {
    const creds = session.collectedData.portalCredentials;
    const credEmail = (creds && !creds.useProfessionalAccount && creds.email) 
      ? creds.email 
      : this.env.CAC_EMAIL;
      
    const emailKey = credEmail ? credEmail.replace(/[^a-z0-9]/gi, '_') : 'default';
    const stateKey = `sessions/auth/cac-session-${emailKey}.json`;

    const browser = await chromium.launch({
      headless: this.env.CAC_HEADLESS,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });

    const widths = [1920, 1366, 1536, 1440, 1600];
    const heights = [1080, 768, 864, 900, 900];
    const idx = Math.floor(Math.random() * widths.length);

    const contextOptions: any = {
      viewport: { width: widths[idx], height: heights[idx] },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
      }
    };

    let cachedState: any;
    try {
      const buffer = await this.storage.download(stateKey);
      cachedState = JSON.parse(buffer.toString("utf8"));
      contextOptions.storageState = cachedState;
    } catch (err) {
      // Ignore if file doesn't exist
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    let sessionValid = false;
    if (cachedState) {
      console.log(`[cac-automation] Validating cached session ${stateKey}...`);
      await page.goto("https://icrp.cac.gov.ng/dashboard", { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => undefined);
      // Let any immediate 301/302 redirects to /auth/login resolve
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      if (!currentUrl.includes("/auth/login")) {
        console.log(`[cac-automation] Cached session is valid (URL: ${currentUrl}). Skipping login.`);
        sessionValid = true;
      } else {
        console.warn(`[cac-automation] Cached session is invalid or expired. Falling back to login.`);
      }
    }

    if (!sessionValid) {
       await this.retryStep(page, session, "login", () => this.login(page, session));
       // Save fresh state to cloud
       const freshState = await context.storageState();
       await this.storage.upload(stateKey, JSON.stringify(freshState), "application/json");
       console.log(`[cac-automation] New session saved to cloud: ${stateKey}`);
    }

    return { browser, context, page };
  }

  async startSubmission(session: SessionRecord): Promise<AutomationOutcome> {
    // Pre-flight portal health check
    const healthy = await this.checkPortalHealth();
    if (!healthy) {
       throw new Error(
         "CAC portal (icrp.cac.gov.ng) is unreachable. The submission will be retried automatically."
       );
    }

    const { browser, page } = await this.setupAuthenticatedPage(session);

    try {
      // If this is a post-incorporation workflow, use the dedicated Post-Inc handler
      if (session.collectedData.workflowType && session.collectedData.workflowType !== "NEW_REGISTRATION") {
        return await this.retryStep(page, session, "post-inc-filing", () =>
          this.proceedToPostIncFiling(page, session)
        );
      }

      const portal = await this.retryStep(page, session, "name-reservation", () =>
        this.ensureNameReservation(page, session)
      );

      switch (session.collectedData.registrationType) {
        case "COMPANY":
          return await this.retryStep(page, session, "company-registration", () =>
            this.proceedToCompanyRegistration(page, session, portal)
          );
        case "INCORPORATED_TRUSTEES":
          return await this.retryStep(page, session, "trustees-registration", () =>
            this.proceedToTrusteesRegistration(page, session, portal)
          );
        case "BUSINESS_NAME":
        default:
          return await this.retryStep(page, session, "bn-registration", () =>
            this.proceedToBusinessNameRegistration(page, session, portal)
          );
      }
    } finally {
      await this.capture(page, session.id, "start-submission-final").catch(() => undefined);
      await browser.close();
    }
  }

  async resumeAfterPayment(session: SessionRecord): Promise<AutomationOutcome> {
    const { browser, page } = await this.setupAuthenticatedPage(session);

    try {
      // If this is a post-incorporation workflow, look under the "Post Inc." area
      if (session.collectedData.workflowType && session.collectedData.workflowType !== "NEW_REGISTRATION") {
        await this.clickFirst(page, [
          () => page.getByRole("link", { name: /post\s*inc/i }),
          () => page.getByRole("button", { name: /post\s*inc/i }),
          () => page.getByText(/post\s*inc/i)
        ]).catch(() => undefined);

        const query =
          session.collectedData.portal?.applicationId ||
          session.collectedData.postIncData?.existingRcNumber ||
          session.collectedData.postIncData?.existingName ||
          "";

        if (query) {
          const searchInputCandidates = [
            () => page.getByPlaceholder(/search/i),
            () => page.getByRole("searchbox"),
            () => page.getByRole("textbox", { name: /search/i }),
            () => page.getByLabel(/search|entity search|rc number/i)
          ];

          for (const build of searchInputCandidates) {
            const locator = build();
            if ((await locator.count().catch(() => 0)) > 0) {
              await locator.first().fill(query);
              await this.maybeClick(page, [
                () => page.getByRole("button", { name: /search|find|entity search/i }),
                () => page.getByText(/search|find/i)
              ]).catch(() => undefined);
              break;
            }
          }
        }

        await page.waitForLoadState("networkidle");
        const bodyText = await page.locator("body").innerText().catch(() => "");
        const statusMatch = bodyText.match(/\b(Pending|Queried|Approved|Submitted|Rejected)\b/i);
        const currentStatus = statusMatch?.[1] ?? "Submitted";

        let certificatePath: string | undefined;
        const certificateButton = page.getByText(/download certificate/i);
        if ((await certificateButton.count().catch(() => 0)) > 0) {
          const downloadPromise = page.waitForEvent("download").catch(() => undefined);
          await certificateButton.first().click();
          const download = await downloadPromise;
          if (download) {
            certificatePath = `sessions/${session.id}/artifacts/${download.suggestedFilename()}`;
            const stream = await download.createReadStream();
            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
              chunks.push(chunk as Buffer);
            }
            await this.storage.upload(certificatePath, Buffer.concat(chunks));
          }
        }

        const portal: PortalProgress = {
          ...session.collectedData.portal,
          statusText: currentStatus,
          referenceNumber: bodyText.match(/\bReference\s*(?:No\.?|Number)[:\s]+([A-Z0-9-]+)/i)?.[1] ?? session.collectedData.portal?.referenceNumber,
          certificatePath,
          lastCheckpoint: "post-inc-post-payment-status-check"
        };

        if (/Approved/i.test(currentStatus)) {
          return {
            kind: "COMPLETED",
            portal,
            summary: `Post-incorporation filing is approved and ready for delivery.`
          };
        }

        if (/Queried/i.test(currentStatus)) {
          return {
            kind: "QUERIED",
            portal,
            summary: `Post-incorporation filing for the entity is queried by CAC.`
          };
        }

        return {
          kind: "PENDING_APPROVAL",
          portal,
          summary: `Post-incorporation filing is pending CAC approval.`
        };
      }

      // Default: check registration application status page
      await this.clickFirst(page, [
        () => page.getByRole("link", { name: /registration/i }),
        () => page.getByText(/^registration$/i)
      ]);

      if (session.collectedData.portal?.applicationId) {
        const searchInput = page.getByPlaceholder(/search/i);
        if ((await searchInput.count().catch(() => 0)) > 0) {
          await searchInput.first().fill(session.collectedData.portal.applicationId);
        }
      }

      await page.waitForLoadState("networkidle");
      const pageText = await page.locator("body").innerText();
      const currentStatus = pageText.match(/\b(Pending|Queried|Approved|Submitted)\b/i)?.[1] ?? "Submitted";

      let certificatePath: string | undefined;
      const certificateButton2 = page.getByText(/download certificate/i);
      if ((await certificateButton2.count().catch(() => 0)) > 0) {
        const downloadPromise = page.waitForEvent("download").catch(() => undefined);
        await certificateButton2.first().click();
        const download = await downloadPromise;
        if (download) {
          certificatePath = `sessions/${session.id}/artifacts/${download.suggestedFilename()}`;
          const stream = await download.createReadStream();
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(chunk as Buffer);
          }
          await this.storage.upload(certificatePath, Buffer.concat(chunks));
        }
      }

      return {
        kind: "COMPLETED",
        portal: {
          ...session.collectedData.portal,
          statusText: currentStatus,
          referenceNumber:
            pageText.match(/\bReference\s*(?:No\.?|Number)[:\s]+([A-Z0-9-]+)/i)?.[1] ??
            session.collectedData.portal?.referenceNumber,
          certificatePath,
          lastCheckpoint: "post-payment-status-check"
        },
        summary:
          currentStatus.toLowerCase() === "approved"
            ? `${registrationLabel(session.collectedData.registrationType)} registration is approved and ready for delivery.`
            : `Payment was confirmed and the application is now ${currentStatus}.`
      };
    } finally {
      await this.capture(page, session.id, "resume-payment-final").catch(() => undefined);
      await browser.close();
    }
  }
}

