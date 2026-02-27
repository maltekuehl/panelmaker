import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Legal | PanelMaker",
  description: "Legal information, terms of service, privacy policy, and legal notices for PanelMaker",
  robots: {
    index: true,
    follow: true,
  },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-6">
      <div className="prose prose-zinc dark:prose-invert">{children}</div>
    </div>
  )
}
