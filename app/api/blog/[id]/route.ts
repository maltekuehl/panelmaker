import { createAuthHandler, getSessionUser } from "@/lib/auth"
import { deleteBlogPost, getBlogPostById, updateBlogPost, type UpdateBlogPostData } from "@/lib/blog"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { logger } from "@/lib/monitoring"
import { revalidateTag } from "next/cache"
import { connection, NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Validation schema for blog post updates
const updateBlogPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less").optional(),
  excerpt: z.string().max(500, "Excerpt must be 500 characters or less").optional(),
  content: z.string().min(1, "Content is required").optional(),
  published: z.boolean().optional(),
  metaTitle: z.string().max(200, "Meta title must be 200 characters or less").optional(),
  metaDescription: z.string().max(500, "Meta description must be 500 characters or less").optional(),
  keywords: z.array(z.string()).optional(),
})

// GET /api/blog/[id] - Get a single blog post
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection()
  logger.apiRequest("GET", "/api/blog/[id]")

  try {
    const isAdmin = (await getSessionUser())?.isAdmin ?? false

    const urlParams = await params
    const blogPost = await getBlogPostById(urlParams.id, isAdmin)

    if (!blogPost) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
    }

    const { author, ...rest } = blogPost
    return createSuccessResponse({
      blogPost: { ...rest, author: { id: author.id, name: author.name, image: author.image } },
    })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch blog post")
  }
}

// PUT /api/blog/[id] - Update a blog post (Admin only)
export const PUT = createAuthHandler(
  async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
    logger.apiRequest("PUT", "/api/blog/[id]")

    try {
      // Check if blog post exists
      const urlParams = await params
      const existingPost = await getBlogPostById(urlParams.id, true)
      if (!existingPost) {
        return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
      }

      // Parse and validate request body
      const body = await request.json()
      const validatedData: UpdateBlogPostData = updateBlogPostSchema.parse(body)

      // Update blog post
      const updatedPost = await updateBlogPost(urlParams.id, validatedData)

      logger.info("Updated blog post", { userId: user.id, blogPostId: urlParams.id })

      // Invalidate blog caches
      revalidateTag("blog:list", "max")
      revalidateTag("blog:post", "max")

      return createSuccessResponse({
        message: "Blog post updated successfully",
        blogPost: updatedPost,
      })
    } catch (error) {
      return createErrorResponse(error, "Failed to update blog post")
    }
  },
  true,
) // requireAdminAccess = true

// DELETE /api/blog/[id] - Delete a blog post (Admin only)
export const DELETE = createAuthHandler(
  async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
    logger.apiRequest("DELETE", "/api/blog/[id]")

    try {
      // Check if blog post exists
      const urlParams = await params
      const existingPost = await getBlogPostById(urlParams.id, true)
      if (!existingPost) {
        return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
      }

      // Delete blog post
      await deleteBlogPost(urlParams.id)

      logger.info("Deleted blog post", { userId: user.id, blogPostId: urlParams.id })

      // Invalidate blog caches
      revalidateTag("blog:list", "max")
      revalidateTag("blog:post", "max")

      return createSuccessResponse({
        message: "Blog post deleted successfully",
      })
    } catch (error) {
      return createErrorResponse(error, "Failed to delete blog post")
    }
  },
  true,
) // requireAdminAccess = true
