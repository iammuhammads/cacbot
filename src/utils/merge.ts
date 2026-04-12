import type { RegistrationData, UploadedDocument } from "../types/domain.js";

function mergeStringArray(current: string[], incoming?: string[]): string[] {
  if (!incoming || incoming.length === 0) {
    return current;
  }

  const merged = new Set<string>();
  for (const value of [...current, ...incoming]) {
    const normalized = value.trim();
    if (normalized) {
      merged.add(normalized);
    }
  }

  return [...merged];
}

function mergeDocuments(
  current: UploadedDocument[],
  incoming?: UploadedDocument[]
): UploadedDocument[] {
  if (!incoming || incoming.length === 0) {
    return current;
  }

  const byId = new Map(current.map((item) => [item.id, item]));
  for (const document of incoming) {
    byId.set(document.id, document);
  }

  return [...byId.values()];
}

export function mergeRegistrationData(
  current: RegistrationData,
  candidate: Partial<RegistrationData>
): RegistrationData {
  return {
    ...current,
    ...candidate,
    address: {
      ...current.address,
      ...candidate.address
    },
    payment: {
      ...current.payment,
      ...candidate.payment
    },
    portal: {
      ...current.portal,
      ...candidate.portal
    },
    businessNameOptions: mergeStringArray(
      current.businessNameOptions,
      candidate.businessNameOptions
    ),
    notes: mergeStringArray(current.notes, candidate.notes),
    documents: mergeDocuments(current.documents, candidate.documents),
    proprietors: candidate.proprietors ?? current.proprietors,
    directors: candidate.directors ?? current.directors,
    trustees: candidate.trustees ?? current.trustees
  };
}

