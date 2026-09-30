import { getInstanceConfig } from "@/lib/instance"
import type { Metadata } from "next"

const instanceName = getInstanceConfig().name

export const metadata: Metadata = {
  title: `Legal | ${instanceName}`,
  description: `Legal information, terms of service, privacy policy, and legal notices for ${instanceName}`,
  robots: {
    index: true,
    follow: true,
  },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-6">
      <div className="prose">{children}</div>
    </div>
  )
}
