import { LegalPageSkeleton } from "@/components/legal/legal-page-skeleton"
import Markdown from "@/components/markdown"
import {
  buildNoticeMarkdown,
  buildPrivacyMarkdown,
  buildTermsMarkdown,
  getInstanceConfig,
  loadLegalOverride,
  type InstanceConfig,
  type LegalDocument as LegalDocumentKind,
} from "@/lib/instance"
import { connection } from "next/server"
import { Suspense } from "react"

const TEMPLATES: Record<LegalDocumentKind, (config: InstanceConfig) => string> = {
  notice: buildNoticeMarkdown,
  privacy: buildPrivacyMarkdown,
  terms: buildTermsMarkdown,
}

async function LegalDocumentContent({ document }: { document: LegalDocumentKind }) {
  await connection()
  const override = await loadLegalOverride(document)
  return <Markdown>{override ?? TEMPLATES[document](getInstanceConfig())}</Markdown>
}

export function LegalDocument({ document }: { document: LegalDocumentKind }) {
  return (
    <Suspense fallback={<LegalPageSkeleton />}>
      <LegalDocumentContent document={document} />
    </Suspense>
  )
}
