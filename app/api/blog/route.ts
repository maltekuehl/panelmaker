import { createAuthHandler, getSessionUser } from "@/lib/auth"
import { createBlogPost, getBlogPosts, type BlogPostFilters, type CreateBlogPostData } from "@/lib/blog"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getRequestContext, logger } from "@/lib/monitoring"
import { revalidateTag } from "next/cache"
import { connection, NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const blogListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(200).optional(),
  published: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  authorId: z.string().max(64).optional(),
})

// The author email is never part of a public response.
function withPublicAuthor<T extends { author: { id: string; name: string | null; image: string | null } }>(post: T) {
  const { author, ...rest } = post
  return { ...rest, author: { id: author.id, name: author.name, image: author.image } }
}

// Validation schema for blog post creation
const createBlogPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  excerpt: z.string().max(500, "Excerpt must be 500 characters or less").optional(),
  content: z.string().min(1, "Content is required"),
  published: z.boolean().optional().default(false),
  metaTitle: z.string().max(200, "Meta title must be 200 characters or less").optional(),
  metaDescription: z.string().max(500, "Meta description must be 500 characters or less").optional(),
  keywords: z.array(z.string()).optional().default([]),
})

// GET /api/blog - Fetch blog posts with pagination and filtering
export async function GET(request: NextRequest) {
  await connection()
  try {
    const query = blogListParamsSchema.parse(Object.fromEntries(request.nextUrl.searchParams))

    const filters: BlogPostFilters = {}
    if (query.published !== undefined) {
      filters.published = query.published
    }
    if (query.authorId) {
      filters.authorId = query.authorId
    }
    if (query.search) {
      filters.search = query.search
    }

    const isAdmin = (await getSessionUser())?.isAdmin ?? false

    if (!isAdmin && filters.published === undefined) {
      filters.published = true
    }

    const result = await getBlogPosts(filters, { page: query.page, limit: query.limit })

    return NextResponse.json({ ...result, posts: result.posts.map(withPublicAuthor) })
  } catch (error) {
    return createErrorResponse(error, "Failed to fetch blog posts")
  }
}

// POST /api/blog - Create a new blog post (Admin only)
export const POST = createAuthHandler(async (request: NextRequest, user) => {
  const context = getRequestContext(request)
  logger.apiRequest("POST", "/api/blog", { ...context, userId: user.id })

  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedData = createBlogPostSchema.parse(body)

    // Create blog post
    const blogPostData: CreateBlogPostData = {
      ...validatedData,
      authorId: user.id,
    }

    const blogPost = await createBlogPost(blogPostData)

    logger.info("Blog post created", { blogPostId: blogPost.id, userId: user.id })

    // Invalidate blog caches
    revalidateTag("blog:list", "max")
    revalidateTag("blog:post", "max")

    return createSuccessResponse(
      {
        message: "Blog post created successfully",
        blogPost,
      },
      201,
    )
  } catch (error) {
    return createErrorResponse(error, "Failed to create blog post")
  }
}, true)
