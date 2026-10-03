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
import { useApiRequest } from "@/hooks/use-api-request"
import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface DeleteLabButtonProps {
  labId: string
  labName: string
}

export function DeleteLabButton({ labId, labName }: DeleteLabButtonProps) {
  const router = useRouter()
  const { pending, request } = useApiRequest()

  async function handleDelete() {
    const data = await request(true, {
      url: `/api/labs/${labId}`,
      method: "DELETE",
      errorMessage: "Failed to delete lab",
    })
    if (!data) return
    toast.success("Lab deleted")
    router.push("/labs")
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={pending !== null}>
          {pending !== null ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
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
