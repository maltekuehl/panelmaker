"use client"

import { DataTable } from "@/components/browse/data-table"
import { PaginationControls } from "@/components/data-table/pagination"
import { DebouncedSearchInput } from "@/components/data-table/search-input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants"
import type { UserRole, UserStatus } from "@/lib/generated/prisma/enums"
import { profileHref } from "@/lib/routes"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { BadgeCheck, Clock, Loader2, MoreHorizontal, Shield, ShieldCheck, ShieldOff, Trash2, User } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: "USER" | "ADMIN"
  status: "ACTIVE" | "BLOCKED"
  accessStatus: "NONE" | "REQUESTED" | "VERIFIED"
  accessRequestedAt: string | null
  createdAt: string
  updatedAt: string
  _count: {
    panels: number
    experiments: number
    blogPosts: number
  }
}

interface PaginationInfo {
  page: number
  pageSize: number
  totalUsers: number
  totalPages: number
}

type PendingConfirm = { user: User; action: "block" | "delete" }

interface BuildColumnsOptions {
  actionLoading: string | null
  onBlock: (user: User) => void
  onUnblock: (user: User) => void
  onAccess: (user: User, action: "grant" | "revoke") => void
  onDelete: (user: User) => void
}

function AccessBadge({ user }: { user: User }) {
  if (user.role === "ADMIN") return null
  if (user.accessStatus === "VERIFIED") {
    return (
      <Badge variant="outline" className="border-success/40 text-success">
        <BadgeCheck className="size-3" />
        Verified
      </Badge>
    )
  }
  if (user.accessStatus === "REQUESTED") {
    return (
      <Badge variant="outline" className="border-warning/40 text-warning">
        <Clock className="size-3" />
        Requested
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Unverified
    </Badge>
  )
}

function buildUserColumns({
  actionLoading,
  onBlock,
  onUnblock,
  onAccess,
  onDelete,
}: BuildColumnsOptions): ColumnDef<User>[] {
  return [
    {
      id: "user",
      header: "User",
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-7">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="text-xs">
                {user.name ? user.name.slice(0, 2).toUpperCase() : <User className="size-3.5" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Link href={profileHref(user.id)} className="block truncate font-medium text-primary hover:underline">
                {user.name || "No name"}
              </Link>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === "ADMIN" ? "default" : "secondary"}>
          {USER_ROLE_LABELS[row.original.role as UserRole] ?? row.original.role}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "BLOCKED" ? "destructive" : "outline"}>
          {USER_STATUS_LABELS[row.original.status as UserStatus] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: "access",
      header: "Submission access",
      cell: ({ row }) => <AccessBadge user={row.original} />,
    },
    {
      id: "panels",
      header: () => <div className="text-right">Panels</div>,
      cell: ({ row }) => <div className="text-right font-mono text-sm">{row.original._count.panels}</div>,
    },
    {
      id: "experiments",
      header: () => <div className="text-right">Experiments</div>,
      cell: ({ row }) => <div className="text-right font-mono text-sm">{row.original._count.experiments}</div>,
    },
    {
      id: "blogPosts",
      header: () => <div className="text-right">Posts</div>,
      cell: ({ row }) => <div className="text-right font-mono text-sm">{row.original._count.blogPosts}</div>,
    },
    {
      id: "joined",
      header: "Joined",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm">{format(new Date(row.original.createdAt), "MMM d, yyyy")}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const user = row.original
        const isLoading = actionLoading === user.id
        const canChangeAccess = user.role !== "ADMIN"
        return (
          <div className="flex items-center justify-end gap-1">
            {canChangeAccess && user.accessStatus === "REQUESTED" && (
              <Button size="sm" variant="outline" onClick={() => onAccess(user, "grant")} disabled={isLoading}>
                <ShieldCheck className="size-4" />
                Approve
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground" disabled={isLoading}>
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canChangeAccess &&
                  (user.accessStatus === "VERIFIED" ? (
                    <DropdownMenuItem onSelect={() => onAccess(user, "revoke")}>
                      <ShieldOff className="size-4" />
                      Revoke access
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => onAccess(user, "grant")}>
                      <ShieldCheck className="size-4" />
                      {user.accessStatus === "REQUESTED" ? "Approve access" : "Verify user"}
                    </DropdownMenuItem>
                  ))}
                {user.status === "ACTIVE" ? (
                  <DropdownMenuItem onSelect={() => onBlock(user)}>
                    <ShieldOff className="size-4" />
                    Block user
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => onUnblock(user)}>
                    <Shield className="size-4" />
                    Unblock user
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onDelete(user)} className="text-destructive focus:text-destructive">
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 25,
    totalUsers: 0,
    totalPages: 0,
  })

  const fetchUsers = useCallback(
    async (page: number) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: page.toString(), pageSize: pagination.pageSize.toString() })
        if (searchQuery.trim()) params.append("search", searchQuery.trim())

        const response = await fetch(`/api/user?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch users")
        const data: { users: User[]; pagination: PaginationInfo } = await response.json()
        setUsers(data.users)
        setPagination(data.pagination)
      } catch {
        toast.error("Error", { description: "Failed to fetch users" })
      } finally {
        setLoading(false)
      }
    },
    [pagination.pageSize, searchQuery],
  )

  useEffect(() => {
    fetchUsers(1)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  const runAction = async (userId: string, request: () => Promise<Response>, success: string, failure: string) => {
    setActionLoading(userId)
    try {
      const response = await request()
      if (!response.ok) {
        const errorData: { error: string } = await response.json()
        throw new Error(errorData.error || failure)
      }
      toast.success("Success", { description: success })
      await fetchUsers(pagination.page)
    } catch (error) {
      toast.error("Error", { description: error instanceof Error ? error.message : failure })
    } finally {
      setActionLoading(null)
    }
  }

  const patchJson = (url: string, body: object) => () =>
    fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

  const handleBlockUser = (userId: string, action: "block" | "unblock") =>
    runAction(
      userId,
      patchJson(`/api/user/${userId}/block`, { action }),
      `User ${action}ed successfully`,
      "Failed to update user status",
    )

  const handleSubmissionAccess = (userId: string, action: "grant" | "revoke") =>
    runAction(
      userId,
      patchJson(`/api/user/${userId}/submission-access`, { action }),
      action === "grant" ? "Submission access granted" : "Submission access revoked",
      "Failed to update submission access",
    )

  const handleDeleteUser = (userId: string) =>
    runAction(
      userId,
      () => fetch(`/api/user/${userId}`, { method: "DELETE" }),
      "User deleted successfully",
      "Failed to delete user",
    )

  const columns = useMemo(
    () =>
      buildUserColumns({
        actionLoading,
        onBlock: (user) => setPendingConfirm({ user, action: "block" }),
        onUnblock: (user) => handleBlockUser(user.id, "unblock"),
        onAccess: (user, action) => handleSubmissionAccess(user.id, action),
        onDelete: (user) => setPendingConfirm({ user, action: "delete" }),
      }),
    [actionLoading, pagination.page, searchQuery], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const confirmTarget = pendingConfirm?.user
  const confirmName = confirmTarget ? confirmTarget.name || confirmTarget.email : ""
  const isDelete = pendingConfirm?.action === "delete"

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DebouncedSearchInput
          placeholder="Search by name or email"
          value={searchQuery}
          onCommit={setSearchQuery}
          className="h-8 w-[200px] lg:w-[280px]"
        />
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      <div aria-busy={loading} className={loading ? "opacity-60 transition-opacity" : undefined}>
        <DataTable
          columns={columns}
          data={users}
          emptyMessage={searchQuery ? `No users found matching "${searchQuery}"` : "There are no users yet."}
        />
      </div>

      <PaginationControls
        page={pagination.page}
        pageCount={Math.max(pagination.totalPages, 1)}
        total={pagination.totalUsers}
        onPageChange={fetchUsers}
      />

      <AlertDialog open={pendingConfirm !== null} onOpenChange={(open) => !open && setPendingConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isDelete ? "Delete user" : "Block user"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isDelete
                ? `Are you sure you want to permanently delete ${confirmName}? This action cannot be undone and will remove all their data including panels, reports, and blog posts.`
                : `Are you sure you want to block ${confirmName}? They will not be able to sign in until unblocked.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!confirmTarget) return
                if (isDelete) handleDeleteUser(confirmTarget.id)
                else handleBlockUser(confirmTarget.id, "block")
              }}
            >
              {isDelete ? "Delete user" : "Block user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
