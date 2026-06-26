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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ROLE_RANK } from "@/models/lab/access"
import { ChevronDown, Loader2, Trash2, UserMinus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

type LabRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"

interface Member {
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string | null
    image: string | null
    institution: string | null
  }
}

interface Invitation {
  id: string
  email: string | null
  role: string
  status: string
  expiresAt: string
  useCount: number
  maxUses: number | null
}

interface MemberManagerProps {
  labId: string
  currentUserId: string
  viewerRole: LabRole
  members: Member[]
  invitations: Invitation[]
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
}

const ROLE_BADGE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
  VIEWER: "outline",
}

function canChangeMemberRole(viewerRole: LabRole, targetRole: string): boolean {
  if (viewerRole !== "OWNER" && viewerRole !== "ADMIN") return false
  if (targetRole === "OWNER") return viewerRole === "OWNER"
  return true
}

function canRemoveMember(viewerRole: LabRole, targetRole: string, isSelf: boolean): boolean {
  if (isSelf) return true
  if (viewerRole !== "OWNER" && viewerRole !== "ADMIN") return false
  if (targetRole === "OWNER") return viewerRole === "OWNER"
  return ROLE_RANK[viewerRole as LabRole] > ROLE_RANK[targetRole as LabRole]
}

export function MemberManager({ labId, currentUserId, viewerRole, members, invitations }: MemberManagerProps) {
  const router = useRouter()
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function changeRole(userId: string, newRole: string) {
    setChangingRole(userId)
    try {
      const res = await fetch(`/api/labs/${labId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to change role")
        return
      }
      toast.success("Role updated")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setChangingRole(null)
    }
  }

  async function removeMember(userId: string, isSelf: boolean) {
    setRemoving(userId)
    try {
      const res = await fetch(`/api/labs/${labId}/members/${userId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to remove member")
        setRemoving(null)
        return
      }
      toast.success(isSelf ? "You left the lab" : "Member removed")
      if (isSelf) {
        router.push("/labs")
      } else {
        router.refresh()
      }
    } catch {
      toast.error("Something went wrong")
      setRemoving(null)
    }
  }

  async function revokeInvitation(invId: string) {
    setRevoking(invId)
    try {
      const res = await fetch(`/api/labs/${labId}/invitations/${invId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to revoke invitation")
        setRevoking(null)
        return
      }
      toast.success("Invitation revoked")
      router.refresh()
    } catch {
      toast.error("Something went wrong")
      setRevoking(null)
    }
  }

  const isAdminOrOwner = viewerRole === "ADMIN" || viewerRole === "OWNER"

  return (
    <div className="space-y-8">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 py-1 text-xs">Member</TableHead>
              <TableHead className="h-8 py-1 text-xs">Institution</TableHead>
              <TableHead className="h-8 py-1 text-xs">Role</TableHead>
              <TableHead className="h-8 py-1 text-xs">Joined</TableHead>
              {isAdminOrOwner && <TableHead className="h-8 py-1 text-xs" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.user.id === currentUserId
              const showRoleControls = isAdminOrOwner && !isSelf && canChangeMemberRole(viewerRole, member.role)
              const showRemove = canRemoveMember(viewerRole, member.role, isSelf)

              return (
                <TableRow key={member.id}>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm">
                        <AvatarImage src={member.user.image ?? undefined} alt={member.user.name ?? "Member"} />
                        <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                      </Avatar>
                      <Link href={`/profile/${member.user.id}`} className="font-medium text-primary hover:underline">
                        {member.user.name ?? "Unnamed user"}
                      </Link>
                      {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {member.user.institution ?? <span className="text-muted-foreground/50">N/A</span>}
                  </TableCell>
                  <TableCell className="py-2">
                    {showRoleControls ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={changingRole === member.user.id}>
                            {changingRole === member.user.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <>
                                {ROLE_LABELS[member.role] ?? member.role}
                                <ChevronDown className="size-4" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {(["ADMIN", "MEMBER", "VIEWER"] as const).map((r) => (
                            <DropdownMenuItem
                              key={r}
                              onSelect={() => changeRole(member.user.id, r)}
                              disabled={member.role === r}
                            >
                              {ROLE_LABELS[r]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Badge variant={ROLE_BADGE_VARIANTS[member.role] ?? "outline"}>
                        {ROLE_LABELS[member.role] ?? member.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {new Date(member.joinedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  {isAdminOrOwner && (
                    <TableCell className="py-2 text-right">
                      {showRemove && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={removing === member.user.id}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              {removing === member.user.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : isSelf ? (
                                <UserMinus className="size-4" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent size="sm">
                            <AlertDialogHeader>
                              <AlertDialogTitle>{isSelf ? "Leave lab?" : "Remove member?"}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {isSelf
                                  ? "You will lose access to this lab and its resources."
                                  : `Remove ${member.user.name ?? "this member"} from the lab? They will lose access immediately.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => removeMember(member.user.id, isSelf)}
                              >
                                {isSelf ? "Leave" : "Remove"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {invitations.length > 0 && (
        <div className="space-y-3 border-t pt-6">
          <h3 className="text-lg font-semibold">Pending invitations</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 py-1 text-xs">Recipient</TableHead>
                  <TableHead className="h-8 py-1 text-xs">Role</TableHead>
                  <TableHead className="h-8 py-1 text-xs">Uses</TableHead>
                  <TableHead className="h-8 py-1 text-xs">Expires</TableHead>
                  {isAdminOrOwner && <TableHead className="h-8 py-1 text-xs" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="py-2 text-sm">
                      {inv.email ? (
                        <span className="font-mono text-xs">{inv.email}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Shareable link</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant={ROLE_BADGE_VARIANTS[inv.role] ?? "outline"}>
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {inv.useCount}/{inv.maxUses ?? "any"}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    {isAdminOrOwner && (
                      <TableCell className="py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={revoking === inv.id}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => revokeInvitation(inv.id)}
                        >
                          {revoking === inv.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
