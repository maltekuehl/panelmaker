import BlogForm from "@/components/blog/blog-form"
import { getSessionUser } from "@/lib/auth"
import { signInUrl } from "@/lib/routes"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Create Blog Post | PanelMaker",
  description: "Create a new blog post for the PanelMaker community",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function CreateBlogPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl("/blog/create"))
  }

  if (!user.isAdmin) {
    redirect("/blog")
  }

  return <BlogForm />
}
