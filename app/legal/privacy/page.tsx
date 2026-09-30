import { LegalPageSkeleton } from "@/components/legal/legal-page-skeleton"
import Markdown from "@/components/markdown"
import { buildPrivacyMarkdown, getInstanceConfig, loadLegalOverride } from "@/lib/instance"
import { cacheLife, cacheTag } from "next/cache"
import { Suspense } from "react"

async function PrivacyContent() {
  "use cache"
  cacheLife("hours")
  cacheTag("legal-privacy")

  const override = await loadLegalOverride("privacy")
  const content = override ?? buildPrivacyMarkdown(getInstanceConfig())

  return <Markdown>{content}</Markdown>
}

export default function LegalPrivacyPage() {
  return (
    <Suspense fallback={<LegalPageSkeleton />}>
      <PrivacyContent />
    </Suspense>
  )
}
