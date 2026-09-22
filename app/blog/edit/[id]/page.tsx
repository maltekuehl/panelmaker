import BlogForm from "@/components/blog/blog-form"
import { getSessionUser } from "@/lib/auth"
import { getBlogPostById } from "@/lib/blog"
import { signInUrl } from "@/lib/routes"
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Edit Blog Post | PanelMaker",
  description: "Edit blog post",
  robots: {
    index: false,
    follow: false,
  },
}

interface EditBlogPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  const { id } = await params
  const user = await getSessionUser()

  if (!user) {
    redirect(signInUrl(`/blog/edit/${id}`))
  }

  if (!user.isAdmin) {
    redirect("/blog")
  }

  const blogPost = await getBlogPostById(id, true)
  if (!blogPost) {
    notFound()
  }

  return (
    <BlogForm
      initialData={{
        id: blogPost.id,
        title: blogPost.title,
        excerpt: blogPost.excerpt || "",
        content: blogPost.content,
        published: blogPost.published,
        metaTitle: blogPost.metaTitle || "",
        metaDescription: blogPost.metaDescription || "",
        keywords: blogPost.keywords,
      }}
      isEditing={true}
    />
  )
}
