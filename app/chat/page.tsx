import { auth } from "@/auth"
import Chat from "@/components/chat/chat"
import ChatSignInRequired from "@/components/chat/chat-signin-required"
import NoSsr from "@/components/no-ssr"
import type { Metadata } from "next"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Chat | PanelMaker",
  description:
    "PanelMaker&apos;s AI assistant for spatial proteomics panel design. Get help with antibody selection, marker compatibility, and panel optimization through natural conversation.",
  keywords: [
    "PanelMaker chat",
    "spatial proteomics AI",
    "antibody panel design",
    "AI assistant",
    "biomedical AI",
    "panel optimization",
    "marker selection",
  ],
  openGraph: {
    title: "Chat | PanelMaker",
    description: "AI assistant for spatial proteomics antibody panel design and optimization",
    type: "website",
  },
}

export default async function ChatHome() {
  const session = await auth()

  if (!session?.user) {
    return <ChatSignInRequired />
  }

  return (
    <Suspense>
      <NoSsr>
        <Chat name={session.user.name ?? undefined} />
      </NoSsr>
    </Suspense>
  )
}
