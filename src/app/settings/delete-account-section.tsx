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
import { signOut } from "next-auth/react"
import { useState } from "react"
import { toast } from "sonner"

export default function DeleteAccountSection() {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch("/api/user/me", {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData: { error: string } = await response.json()
        throw new Error(errorData.error || "Failed to delete account")
      }

      toast.success("Account deleted", { description: "Your account has been permanently deleted" })

      await signOut({ callbackUrl: "/" })
    } catch (error) {
      toast.error("Error", { description: error instanceof Error ? error.message : "Failed to delete account" })
      setIsDeleting(false)
    }
  }

  return (
    <section className="space-y-4 border-t pt-6">
      <div>
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">Irreversible actions that affect your account</p>
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Delete Account</p>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data from
                our servers, including your profile, experiments and reports, panels, lab memberships, and chat
                conversations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete My Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  )
}
