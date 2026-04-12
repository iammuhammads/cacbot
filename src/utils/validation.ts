import type { PersonRecord, RegistrationData, RegistrationType } from "../types/domain.js";

const nigeriaPhonePattern = /^(\+234|0)\d{10}$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export interface ValidationResult {
  ready: boolean;
  missingFields: string[];
  issues: string[];
}

function hasDocumentKind(data: RegistrationData, kind: string): boolean {
  return data.documents.some((document) =>
    document.kind.toLowerCase().includes(kind.toLowerCase())
  );
}

function validatePerson(
  person: PersonRecord,
  label: string,
  missingFields: string[],
  issues: string[]
): void {
  if (!person.fullName) {
    missingFields.push(`${label}.fullName`);
  }
  if (!person.dob) {
    missingFields.push(`${label}.dob`);
  } else if (!isoDatePattern.test(person.dob)) {
    issues.push(`${label}.dob must be in YYYY-MM-DD format.`);
  }
  if (!person.idType) {
    missingFields.push(`${label}.idType`);
  }
  if (!person.idNumber) {
    missingFields.push(`${label}.idNumber`);
  }
  if (!person.phone) {
    missingFields.push(`${label}.phone`);
  } else if (!nigeriaPhonePattern.test(person.phone)) {
    issues.push(`${label}.phone must be a valid Nigerian number.`);
  }
}

function validateRegistrationSpecifics(
  data: RegistrationData,
  registrationType: RegistrationType,
  missingFields: string[],
  issues: string[]
): void {
  if (registrationType === "BUSINESS_NAME") {
    if (data.proprietors.length === 0) {
      missingFields.push("proprietors[0]");
    }
    data.proprietors.forEach((person, index) =>
      validatePerson(person, `proprietors[${index}]`, missingFields, issues)
    );
  }

  if (registrationType === "COMPANY") {
    if (data.directors.length === 0) {
      missingFields.push("directors[0]");
    }
    if (!data.shareCapitalNaira) {
      missingFields.push("shareCapitalNaira");
    }
    data.directors.forEach((person, index) =>
      validatePerson(person, `directors[${index}]`, missingFields, issues)
    );
  }

  if (registrationType === "INCORPORATED_TRUSTEES") {
    if (data.trustees.length < 2) {
      missingFields.push("trustees[0..1]");
    }
    data.trustees.forEach((person, index) =>
      validatePerson(person, `trustees[${index}]`, missingFields, issues)
    );
  }
}

export function validateRegistrationData(data: RegistrationData): ValidationResult {
  const missingFields: string[] = [];
  const issues: string[] = [];

  if (!data.registrationType) {
    missingFields.push("registrationType");
  }

  if (data.businessNameOptions.length < 2) {
    missingFields.push("businessNameOptions (at least 2 preferred names)");
  }

  if (!data.clientEmail) {
    missingFields.push("clientEmail");
  }

  if (!data.clientPhone) {
    missingFields.push("clientPhone");
  } else if (!nigeriaPhonePattern.test(data.clientPhone)) {
    issues.push("clientPhone must be a valid Nigerian number.");
  }

  if (!data.address?.line1) {
    missingFields.push("address.line1");
  }
  if (!data.address?.state) {
    missingFields.push("address.state");
  }
  if (!data.businessActivity) {
    missingFields.push("businessActivity");
  }
  if (!data.commencementDate) {
    missingFields.push("commencementDate");
  } else if (!isoDatePattern.test(data.commencementDate)) {
    issues.push("commencementDate must be in YYYY-MM-DD format.");
  }

  if (!hasDocumentKind(data, "identification")) {
    missingFields.push("documents.means_of_identification");
  }
  if (!hasDocumentKind(data, "passport")) {
    missingFields.push("documents.passport_photo");
  }
  if (!hasDocumentKind(data, "signature")) {
    missingFields.push("documents.signature");
  }

  if (data.registrationType) {
    validateRegistrationSpecifics(data, data.registrationType, missingFields, issues);
  }

  return {
    ready: missingFields.length === 0 && issues.length === 0,
    missingFields,
    issues
  };
}

export function getNextPromptTargets(missingFields: string[]): string[] {
  return missingFields.slice(0, 2);
}

