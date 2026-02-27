"use client"
import { usePathname } from "next/navigation"
import CustomLink from "./custom-link"
import Bluesky from "./icons/bluesky"
import GitHub from "./icons/github"

export default function Footer() {
  const pathname = usePathname()
  const show = !pathname.startsWith("/chat")

  return (
    show && (
      <div className="bg-zinc-950 text-white">
        <footer className="container mx-auto text-sm pt-12 pb-8 flex flex-col sm:grid grid-cols-2 md:grid-cols-4 justify-between gap-x-4 gap-y-8">
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold">External Links</h2>
            <CustomLink href="https://github.com/complextissue/panelmaker" className="flex items-center gap-x-2">
              <GitHub className="w-4 h-4" />
              GitHub
            </CustomLink>
            <CustomLink href="https://bsky.app/profile/panelmaker.ai" className="flex items-center gap-x-2">
              <Bluesky className="w-4 h-4" />
              Bluesky
            </CustomLink>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold">Partner projects</h2>
            <CustomLink href="https://scverse.org">scverse®</CustomLink>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold">PanelMaker</h2>
            <CustomLink href="/docs/community/team">Team members</CustomLink>
            <CustomLink href="/docs/community/governance">Governance</CustomLink>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold">Legal</h2>
            <CustomLink href="/legal/notice">Legal Notice</CustomLink>
            <CustomLink href="/legal/terms">Terms of Service</CustomLink>
            <CustomLink href="/legal/privacy">Privacy Policy</CustomLink>
          </div>
          <div className="col-span-4 text-center pt-4">© 2025 - now. PanelMaker</div>
        </footer>
      </div>
    )
  )
}
