import type { Metadata } from "next"
import SignUp from "./SignUp"

export const metadata: Metadata = {
  title: "Sign Up | PanelMaker",
  description:
    "Create a PanelMaker account to design antibody panels, contribute validation data, and collaborate with the spatial proteomics community.",
  keywords: ["sign up", "register", "create account", "PanelMaker"],
  openGraph: {
    title: "Sign Up | PanelMaker",
    description: "Create a PanelMaker account to contribute to spatial proteomics research",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SignUpPage() {
  return <SignUp />
}
