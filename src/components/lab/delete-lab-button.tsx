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
import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface DeleteLabButtonProps {
  labId: string
  labName: string
}

export function DeleteLabButton({ labId, labName }: DeleteLabButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/labs/${labId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete lab")
        return
      }
      toast.success("Lab deleted")
      router.push("/labs")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={deleting}>
          {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Delete lab
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{labName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the lab and remove all members. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete lab
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
