"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { hasErrorProperty } from "@/types/api"
import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, type ComponentProps } from "react"
import { toast } from "sonner"

type DeleteBlogPostButtonProps = Pick<ComponentProps<typeof Button>, "variant" | "size" | "className"> & {
  postId: string
  postTitle: string
}

export default function DeleteBlogPostButton({
  postId,
  postTitle,
  variant = "destructive",
  size = "default",
  className,
}: DeleteBlogPostButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/blog/${postId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = hasErrorProperty(errorData) ? errorData.error : "Failed to delete blog post"
        throw new Error(errorMessage)
      }

      toast.success("Blog post deleted successfully")

      // Redirect to blog list
      router.push("/blog")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete blog post")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={isLoading} className={className}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          <span className={size?.startsWith("icon") ? "sr-only" : undefined}>
            {isLoading ? "Deleting\u2026" : "Delete Post"}
          </span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete <strong>&quot;{postTitle}&quot;</strong>? This action cannot be
            undone and will remove the blog post and all its content.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete Post
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
