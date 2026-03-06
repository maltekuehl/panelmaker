import type { Metadata } from "next"
import SignIn from "./SignIn"

export const metadata: Metadata = {
  title: "Sign In | PanelMaker",
  description:
    "Sign in to PanelMaker to design antibody panels, contribute validation data, and access personalized features.",
  keywords: ["sign in", "login", "authentication", "PanelMaker account"],
  openGraph: {
    title: "Sign In | PanelMaker",
    description: "Sign in to access personalized features and contribute to spatial proteomics research",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SignInPage() {
  return <SignIn />
}
