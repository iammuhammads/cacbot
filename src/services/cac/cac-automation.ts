import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";
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
  constructor(
    private readonly env: Env,
    private readonly otpResolver: OtpResolver
  ) {}

  private async artifactDirectory(sessionId: string): Promise<string> {
    const target = path.resolve(this.env.ARTIFACTS_ROOT, sessionId);
    await mkdir(target, { recursive: true });
    return target;
  }

  private async capture(page: Page, sessionId: string, name: string): Promise<string> {
    const dir = await this.artifactDirectory(sessionId);
    const target = path.join(dir, `${Date.now()}-${name}.png`);
    await page.screenshot({ path: target, fullPage: true });
    return target;
  }

  private async visibleLocator(
    page: Page,
    candidates: Array<() => Locator>
  ): Promise<Locator> {
    for (const build of candidates) {
      const locator = build();
      const count = await locator.count().catch(() => 0);
      if (count > 0) {
        return locator.first();
      }
    }

    throw new Error("Expected CAC portal element was not found.");
  }

  private async clickFirst(page: Page, candidates: Array<() => Locator>): Promise<void> {
    const locator = await this.visibleLocator(page, candidates);
    await locator.click();
  }

  private async maybeClick(page: Page, candidates: Array<() => Locator>): Promise<boolean> {
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
    for (const label of labels) {
      // Try by exact label first
      let locator = page.getByLabel(new RegExp(label, "i"));
      if ((await locator.count().catch(() => 0)) > 0) {
        await locator.first().fill(value);
        return;
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

    for (const label of labels) {
      const locator = page.getByLabel(new RegExp(label, "i"));
      if ((await locator.count().catch(() => 0)) > 0) {
        await locator.first().fill(value);
        return;
      }
    }
  }

  private async selectByLabels(page: Page, labels: string[], value: string): Promise<void> {
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
    
    // Navigate directly to the login page
    const loginUrl = "https://icrp.cac.gov.ng/auth/login";
    await page.goto(loginUrl, { waitUntil: "networkidle" });
    
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

    const otp = await this.otpResolver.resolveOtp(startedAt);
    await this.fillByLabels(page, ["otp", "one-time password", "verification code"], otp);
    await this.clickFirst(page, [
      () => page.getByRole("button", { name: /submit|verify|continue/i }),
      () => page.getByText(/submit|verify|continue/i)
    ]);

    // Portal usually takes ~5 seconds to process OTP and redirect
    console.log("OTP submitted, waiting for portal to process...");
    await page.waitForTimeout(5000);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await this.capture(page, sessionId, "after-login-otp");
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

    await this.clickFirst(page, [
      () => page.getByRole("link", { name: /name reservation/i }),
      () => page.getByText(/name reservation/i)
    ]);

    await this.clickFirst(page, [
      () => page.getByRole("button", { name: /new reservation/i }),
      () => page.getByText(/new reservation/i)
    ]);

    await this.selectByLabels(
      page,
      ["business classification", "classification", "entity type"],
      registrationLabel(session.collectedData.registrationType)
    );
    await this.selectIfPresent(
      page,
      ["business type", "company type", "incorporation type"],
      session.collectedData.registrationSubtype
    );

    await this.clickFirst(page, [
      () => page.getByRole("button", { name: /continue/i }),
      () => page.getByText(/^continue$/i)
    ]);

    await this.fillByLabels(
      page,
      ["proposed business name", "business name", "company name", "trustee name"],
      required(
        session.collectedData.businessNameOptions[0],
        "At least one business name option is required."
      )
    );

    await this.selectIfPresent(
      page,
      ["nature of business", "principal activity", "business activity"],
      session.collectedData.businessActivity
    );
    await this.selectIfPresent(
      page,
      ["specific nature of business", "specific business activity", "specific activity"],
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

    await this.maybeClick(page, [
      () => page.getByRole("button", { name: /add .*document|upload|continue/i }),
      () => page.getByText(/add .*document|upload|continue/i)
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
      session.collectedData.notes.find((note) => /secretary/i.test(note))
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

  async startSubmission(session: SessionRecord): Promise<AutomationOutcome> {
    const browser = await chromium.launch({ headless: this.env.CAC_HEADLESS });
    const page = await browser.newPage();

    try {
      await this.login(page, session);
      const portal = await this.ensureNameReservation(page, session);

      switch (session.collectedData.registrationType) {
        case "COMPANY":
          return this.proceedToCompanyRegistration(page, session, portal);
        case "INCORPORATED_TRUSTEES":
          return this.proceedToTrusteesRegistration(page, session, portal);
        case "BUSINESS_NAME":
        default:
          return this.proceedToBusinessNameRegistration(page, session, portal);
      }
    } finally {
      await this.capture(page, session.id, "start-submission-final").catch(() => undefined);
      await browser.close();
    }
  }

  async resumeAfterPayment(session: SessionRecord): Promise<AutomationOutcome> {
    const browser = await chromium.launch({ headless: this.env.CAC_HEADLESS });
    const page = await browser.newPage();

    try {
      await this.login(page, session);
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
      const currentStatus =
        pageText.match(/\b(Pending|Queried|Approved|Submitted)\b/i)?.[1] ?? "Submitted";

      let certificatePath: string | undefined;
      const certificateButton = page.getByText(/download certificate/i);
      if ((await certificateButton.count().catch(() => 0)) > 0) {
        const dir = await this.artifactDirectory(session.id);
        const downloadPromise = page.waitForEvent("download").catch(() => undefined);
        await certificateButton.first().click();
        const download = await downloadPromise;
        if (download) {
          certificatePath = path.join(dir, download.suggestedFilename());
          await download.saveAs(certificatePath);
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

