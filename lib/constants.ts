import { Fixation, MultiplexMethod, Species } from "@/lib/generated/prisma/enums"

export const SPECIES_LABELS: Record<Species, string> = {
  HUMAN: "Homo sapiens",
  MOUSE: "Mus musculus",
  RAT: "Rattus norvegicus",
  NON_HUMAN_PRIMATE: "Non-human primate",
  PIG: "Sus scrofa",
  RABBIT: "Oryctolagus cuniculus",
  ZEBRAFISH: "Danio rerio",
  OTHER: "Other",
}

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
