import { LegalPageSkeleton } from "@/components/legal/legal-page-skeleton"
import Markdown from "@/components/markdown"
import { buildNoticeMarkdown, getInstanceConfig, loadLegalOverride } from "@/lib/instance"
import { cacheLife, cacheTag } from "next/cache"
import { Suspense } from "react"

async function NoticeContent() {
  "use cache"
  cacheLife("hours")
  cacheTag("legal-notice")

  const override = await loadLegalOverride("notice")
  const content = override ?? buildNoticeMarkdown(getInstanceConfig())

  return <Markdown>{content}</Markdown>
}

export default function LegalNoticePage() {
  return (
    <Suspense fallback={<LegalPageSkeleton />}>
      <NoticeContent />
    </Suspense>
  )
}
