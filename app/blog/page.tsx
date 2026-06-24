import { auth } from "@/auth"
import BlogSearchInput from "@/components/blog/blog-search-input"
import DeleteBlogPostButton from "@/components/blog/delete-blog-post-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { isUserAdmin } from "@/lib/auth"
import { getBlogPosts } from "@/lib/blog"
import { format } from "date-fns"
import { CalendarDays, Clock, Edit, PlusCircle, User } from "lucide-react"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
import Link from "next/link"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Blog | PanelMaker",
  description:
    "Read the latest news, updates, and insights about biomedical Model Context Protocol servers, AI-driven research tools, and the PanelMaker community.",
  keywords: [
    "PanelMaker blog",
    "MCP news",
    "biomedical AI updates",
    "research software",
    "computational biology",
    "bioinformatics",
    "AI in healthcare",
    "Model Context Protocol",
  ],
  openGraph: {
    title: "Blog | PanelMaker",
    description: "Latest news and insights about biomedical MCP servers and AI-driven research tools",
    type: "website",
  },
}

interface BlogPageSearchParams {
  page?: string
  search?: string
}

async function getCachedBlogPosts(
  filters: Parameters<typeof getBlogPosts>[0],
  pagination: Parameters<typeof getBlogPosts>[1],
) {
  "use cache"
  cacheLife("hours")
  cacheTag("blog:list")

  return getBlogPosts(filters, pagination)
}

function BlogPostsSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-3 py-8 first:pt-0">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  )
}

async function BlogPostsList({ page, search }: { page: number; search?: string }) {
  const session = await auth()
  const isAdmin = session?.user?.id ? await isUserAdmin(session.user.id) : false

  const result = await getCachedBlogPosts(
    {
      published: !isAdmin ? true : undefined,
      search,
    },
    { page, limit: 10 },
  )

  const { posts, totalPages, currentPage, hasNextPage, hasPreviousPage } = result

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-muted-foreground">
          {search ? "No blog posts found matching your search." : "No blog posts available yet."}
        </h3>
        {search && (
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your search terms or{" "}
            <Link href="/blog" className="text-primary hover:underline">
              view all posts
            </Link>
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="divide-y">
        {posts.map((post) => {
          const keywords: string[] = (() => {
            try {
              return JSON.parse(post.keywords)
            } catch {
              return []
            }
          })()
          const dateValue = post.publishedAt ?? post.createdAt

          return (
            <article key={post.id} className="group py-8 first:pt-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold leading-tight tracking-tight">
                      <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-primary">
                        {post.title}
                      </Link>
                    </h2>
                    {!post.published && (
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      >
                        Draft
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3.5" />
                      {post.author.name || post.author.email}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {format(new Date(dateValue), "MMM d, yyyy")}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {Math.ceil(post.content.split(" ").length / 200)} min read
                    </span>
                  </div>

                  {post.excerpt && <p className="leading-relaxed text-muted-foreground line-clamp-3">{post.excerpt}</p>}

                  {keywords.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {keywords.slice(0, 5).join(" · ")}
                      {keywords.length > 5 && ` · +${keywords.length - 5} more`}
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Link href={`/blog/edit/${post.id}`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <DeleteBlogPostButton postId={post.id} postTitle={post.title} variant="ghost" size="icon" />
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <PaginationContent>
              {hasPreviousPage && (
                <PaginationItem>
                  <PaginationPrevious
                    href={`/blog?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                  />
                </PaginationItem>
              )}

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href={`/blog?page=${pageNum}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                      isActive={pageNum === currentPage}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}

              {hasNextPage && (
                <PaginationItem>
                  <PaginationNext
                    href={`/blog?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  )
}

export default async function BlogPage(props: { searchParams: Promise<BlogPageSearchParams> }) {
  const searchParams = await props.searchParams
  const page = parseInt(searchParams.page || "1", 10)
  const search = searchParams.search

  const session = await auth()
  const isAdmin = session?.user?.id ? await isUserAdmin(session.user.id) : false

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
          <p className="text-lg text-muted-foreground mt-2">Insights, tutorials, and updates from our team</p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/blog/create">
              <PlusCircle className="h-4 w-4" />
              New Post
            </Link>
          </Button>
        )}
      </div>

      <div className="mb-6">
        <BlogSearchInput />
      </div>

      <Suspense fallback={<BlogPostsSkeleton />}>
        <BlogPostsList page={page} search={search} />
      </Suspense>
    </div>
  )
}
