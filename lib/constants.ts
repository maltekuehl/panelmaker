import {
  AntigenRetrieval,
  Clonality,
  DonorSex,
  Fixation,
  LabRole,
  Preservation,
  SampleType,
  SignalQuality,
  Specificity,
  UserRole,
  UserStatus,
  ValidationStatus,
  Visibility,
} from "@/lib/generated/prisma/enums"

export const FIXATION_LABELS: Record<Fixation, string> = {
  FFPE: "FFPE",
  FRESH_FROZEN: "Fresh Frozen",
  PFA: "PFA",
  ACETONE: "Acetone",
  METHANOL: "Methanol",
  OTHER: "Other",
}

export const PRESERVATION_LABELS: Record<Preservation, string> = {
  FFPE: "FFPE",
  FRESH_FROZEN: "Fresh frozen",
  FIXED_FROZEN: "Fixed frozen",
  FRESH: "Fresh",
  OTHER: "Other",
}

export const SAMPLE_TYPE_LABELS: Record<SampleType, string> = {
  TISSUE: "Tissue",
  CELL_LINE: "Cell line",
  PRIMARY_CELL_CULTURE: "Primary cell culture",
  ORGANOID: "Organoid",
  OTHER: "Other",
}

export const DONOR_SEX_LABELS: Record<DonorSex, string> = {
  MALE: "Male",
  FEMALE: "Female",
  INTERSEX: "Intersex",
  UNKNOWN: "Unknown",
}

// PATO terms for the sex values, as SDRF and CELLxGENE record them. UNKNOWN has no term: the
// absence of a value is the statement, so it maps to nothing.
export const DONOR_SEX_PATO_IDS: Record<DonorSex, string | null> = {
  MALE: "PATO:0000384",
  FEMALE: "PATO:0000383",
  INTERSEX: "PATO:0001340",
  UNKNOWN: null,
}

export const ANTIGEN_RETRIEVAL_LABELS: Record<AntigenRetrieval, string> = {
  CITRATE_PH6: "Citrate pH 6.0",
  TRIS_EDTA_PH9: "Tris-EDTA pH 9.0",
  ENZYMATIC: "Enzymatic (Pepsin/Trypsin)",
  NONE: "None",
}

export const CLONALITY_LABELS: Record<Clonality, string> = {
  MONOCLONAL: "Monoclonal",
  POLYCLONAL: "Polyclonal",
  RECOMBINANT: "Recombinant",
  OLIGOCLONAL: "Oligoclonal",
}

export const SPECIFICITY_LABELS: Record<Specificity, string> = {
  HIGH: "High",
  MODERATE: "Moderate",
  LOW: "Low",
  NON_SPECIFIC: "Non-specific",
}

export const SPECIFICITY_RANK: Record<Specificity, number> = {
  HIGH: 3,
  MODERATE: 2,
  LOW: 1,
  NON_SPECIFIC: 0,
}

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PRIVATE: "Private",
  LAB: "Lab",
  PUBLIC: "Public",
}

export const LAB_ROLE_LABELS: Record<LabRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  USER: "User",
  ADMIN: "Admin",
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  BLOCKED: "Blocked",
}

export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  PENDING: "Pending review",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
}

export const SIGNAL_QUALITY_LABELS: Record<SignalQuality, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  MODERATE: "Moderate",
  POOR: "Poor",
  NONE: "None",
}
