import { LegalDocument } from "@/components/legal/legal-document"
import type { LegalDocument as LegalDocumentKind } from "@/lib/instance"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

const TITLES: Record<LegalDocumentKind, string> = {
  notice: "Legal Notice",
  privacy: "Privacy Policy",
  terms: "Terms and Conditions",
}

function isLegalDocument(value: string): value is LegalDocumentKind {
  return value in TITLES
}

export function generateStaticParams(): { document: LegalDocumentKind }[] {
  return (Object.keys(TITLES) as LegalDocumentKind[]).map((document) => ({ document }))
}

export async function generateMetadata({ params }: PageProps<"/docs/legal/[document]">): Promise<Metadata> {
  const { document } = await params
  return isLegalDocument(document) ? { title: TITLES[document] } : {}
}

export default async function LegalPage({ params }: PageProps<"/docs/legal/[document]">) {
  const { document } = await params
  if (!isLegalDocument(document)) notFound()
  return <LegalDocument document={document} />
}
