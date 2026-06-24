import { AntigenRetrieval, Clonality, Fixation, MultiplexMethod, Specificity } from "@/lib/generated/prisma/enums"

export const FIXATION_LABELS: Record<Fixation, string> = {
  FFPE: "FFPE",
  FRESH_FROZEN: "Fresh Frozen",
  PFA: "PFA",
  ACETONE: "Acetone",
  METHANOL: "Methanol",
  OTHER: "Other",
}

export const METHOD_LABELS: Record<MultiplexMethod, string> = {
  PATHOPLEX: "PathoPlex",
  CODEX: "CODEX",
  CYCIF: "CyCIF",
  IMC: "IMC",
  MIBI: "MIBI",
  IBEX: "IBEX",
  OTHER: "Other",
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
