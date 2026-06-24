import { auth } from "@/auth"
import DeleteBlogPostButton from "@/components/blog/delete-blog-post-button"
import Markdown from "@/components/markdown"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { isUserAdmin } from "@/lib/auth"
import { getBlogPostBySlug, getRelatedBlogPosts } from "@/lib/blog"
import { format } from "date-fns"
import { CalendarDays, Clock, Edit, User } from "lucide-react"
import { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
import Link from "next/link"
import { notFound } from "next/navigation"

interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

async function getCachedBlogPost(slug: string, isAdmin: boolean) {
  "use cache"
  cacheLife("hours")
  cacheTag("blog:post")

  return getBlogPostBySlug(slug, isAdmin)
}

async function getCachedRelatedPosts(postId: string, keywords: string[], limit: number) {
  "use cache"
  cacheLife("hours")
  cacheTag("blog:post")

  return getRelatedBlogPosts(postId, keywords, limit)
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const session = await auth()
  const isAdmin = session?.user?.id ? await isUserAdmin(session.user.id) : false
  const post = await getCachedBlogPost(slug, isAdmin)

  if (!post) {
    return {
      title: "Blog Post Not Found",
    }
  }

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
    keywords: (() => {
      try {
        const parsed = JSON.parse(post.keywords)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })(),
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || undefined,
      type: "article",
      publishedTime: post.publishedAt ? post.publishedAt.toISOString() : undefined,
      authors: [post.author.name || post.author.email],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || undefined,
    },
  }
}

async function RelatedPosts({ currentPostId, keywords }: { currentPostId: string; keywords: string[] }) {
  const relatedPosts = await getCachedRelatedPosts(currentPostId, keywords, 3)

  if (relatedPosts.length === 0) {
    return null
  }

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="text-xl font-semibold tracking-tight">Related posts</h2>
      <ul className="mt-5 space-y-6">
        {relatedPosts.map((post) => (
          <li key={post.id}>
            <Link href={`/blog/${post.slug}`} className="font-medium transition-colors hover:text-primary">
              {post.title}
            </Link>
            {post.excerpt && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">{post.excerpt}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="size-3" />
                {post.author.name || post.author.email}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" />
                {format(new Date(post.publishedAt ?? post.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const session = await auth()
  const isAdmin = session?.user?.id ? await isUserAdmin(session.user.id) : false

  const post = await getCachedBlogPost(slug, isAdmin)

  if (!post) {
    notFound()
  }

  if (!post.published && !isAdmin) {
    notFound()
  }

  const parsedKeywords: string[] = (() => {
    try {
      const parsed = JSON.parse(post.keywords)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })()

  const readingTime = Math.ceil(post.content.split(" ").length / 200)

  return (
    <article className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/blog">Blog</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1">{post.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {isAdmin && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/blog/edit/${post.id}`}>
                <Edit className="h-4 w-4" />
                Edit Post
              </Link>
            </Button>
            <DeleteBlogPostButton postId={post.id} postTitle={post.title} variant="outline" size="sm" />
          </div>
        )}
      </div>

      <header className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">{post.title}</h1>
          {!post.published && (
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            >
              Draft
            </Badge>
          )}
        </div>

        {post.excerpt && <p className="text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="size-4" />
            {post.author.name || post.author.email}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-4" />
            {format(new Date(post.publishedAt ?? post.createdAt), "MMMM d, yyyy")}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" />
            {readingTime} min read
          </span>
        </div>
      </header>

      <Separator className="my-8" />

      <div className="prose prose-gray max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-code:text-sm prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg prose-img:shadow-md prose-blockquote:border-l-primary prose-blockquote:bg-accent/20 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:rounded-r-lg">
        <Markdown>{post.content}</Markdown>
      </div>

      {parsedKeywords.length > 0 && (
        <p className="mt-8 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Tags: </span>
          {parsedKeywords.join(" · ")}
        </p>
      )}

      <RelatedPosts currentPostId={post.id} keywords={parsedKeywords} />
    </article>
  )
}
