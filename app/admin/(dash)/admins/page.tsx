"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Activity, Clock, KeyRound, Loader2, Search, ShieldCheck, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import {
  CreateAdminDialog,
  type CreatedAdminUser,
} from "@/components/admin/create-admin-dialog"
import {
  AdminAccountActions,
  type ManagedAdminUser,
} from "@/components/admin/admin-account-actions"
import { getAdminAuditLogs, getUsersWithPagination } from "@/lib/actions"
import { resolveActionError } from "@/lib/action-error"
import { useAdminAuth } from "@/components/auth/admin-auth-provider"
import { PasswordChangeDialog } from "@/components/admin/password-change-dialog"

type AdminUser = ManagedAdminUser

interface AuditLog {
  id: string
  actorEmail: string
  action: string
  targetEmail: string | null
  metadata: string | null
  createdAt: Date | string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const initialPagination: Pagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
}

export default function AdminAccountsPage() {
  const t = useTranslations("admin.admins")
  const tAE = useTranslations("actionErrors")
  const locale = useLocale()
  const { role } = useAdminAuth()
  const isOwner = role === "OWNER"
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [passwordOpen, setPasswordOpen] = useState(false)
  const requestIdRef = useRef(0)

  async function loadAdmins(page: number, query: string) {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const [result, auditResult] = await Promise.all([
        getUsersWithPagination({
          page,
          pageSize: initialPagination.pageSize,
          search: query || undefined,
        }),
        isOwner
          ? getAdminAuditLogs(20)
          : Promise.resolve({ success: true, data: [] as AuditLog[] }),
      ])
      if (requestId !== requestIdRef.current) return
      if (result.success && result.data && result.pagination) {
        setUsers(result.data as AdminUser[])
        setPagination(result.pagination)
        setAppliedSearch(query)
      } else {
        toast.error(resolveActionError(tAE, result.error, t("loadFailed")))
      }
      if (auditResult.success && auditResult.data) {
        setAuditLogs(auditResult.data as AuditLog[])
      }
    } catch {
      toast.error(t("loadFailed"))
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }

  const loadAdminsRef = useRef(loadAdmins)
  useEffect(() => {
    loadAdminsRef.current = loadAdmins
  })
  useEffect(() => {
    void loadAdminsRef.current(1, "")
    fetch("/api/admin/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setCurrentUserId(data?.user?.id ?? null))
      .catch(() => undefined)
  }, [])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void loadAdminsRef.current(1, search.trim())
  }

  function handleCreated(_user: CreatedAdminUser) {
    setSearch("")
    void loadAdminsRef.current(1, "")
  }

  function formatDateTime(value: Date | string | null) {
    if (!value) return t("never")
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "—"
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  }

  function formatCreatedAt(value: Date | string) {
    return formatDateTime(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">
            {isOwner ? t("desc") : t("descSelf")}
          </p>
        </div>
        {isOwner ? (
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <UserPlus className="mr-2 h-4 w-4" />
            {t("create")}
          </Button>
        ) : (
          <Button onClick={() => setPasswordOpen(true)} className="shrink-0">
            <KeyRound className="mr-2 h-4 w-4" />
            {t("changeOwnPassword")}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("listTitle")}
              </CardTitle>
              <CardDescription>
                {t("total", { count: pagination.total })}
              </CardDescription>
            </div>
            {isOwner && <form onSubmit={handleSearch} className="flex w-full gap-2 sm:w-auto">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="sm:w-64"
              />
              <Button type="submit" variant="outline" disabled={loading}>
                <Search className="h-4 w-4" />
                <span className="sr-only">{t("search")}</span>
              </Button>
            </form>}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t("loading")}
            </div>
          ) : users.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
              <ShieldCheck className="h-9 w-9 text-muted-foreground" />
              <p className="font-medium">{t("emptyTitle")}</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("emptyDesc")}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("email")}</TableHead>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("role")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("lastLogin")}</TableHead>
                      <TableHead>{t("createdAt")}</TableHead>
                      <TableHead className="w-12 text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === "OWNER" ? "default" : "secondary"} className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            {user.role === "OWNER" ? t("roleOwner") : t("roleAdmin")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={user.isActive ? "outline" : "destructive"}>
                              {user.isActive ? t("active") : t("inactive")}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDateTime(user.lastLoginAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatCreatedAt(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isOwner ? (
                            <AdminAccountActions
                              user={user}
                              currentUserId={currentUserId}
                              onChanged={() => void loadAdminsRef.current(pagination.page, appliedSearch)}
                            />
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => setPasswordOpen(true)}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              {t("changePassword")}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    {t("page", {
                      current: pagination.page,
                      total: pagination.totalPages,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1 || loading}
                      onClick={() =>
                        void loadAdminsRef.current(
                          pagination.page - 1,
                          appliedSearch
                        )
                      }
                    >
                      {t("previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        pagination.page >= pagination.totalPages || loading
                      }
                      onClick={() =>
                        void loadAdminsRef.current(
                          pagination.page + 1,
                          appliedSearch
                        )
                      }
                    >
                      {t("next")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isOwner && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("auditTitle")}
          </CardTitle>
          <CardDescription>{t("auditDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("auditEmpty")}</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {t(`auditActions.${log.action}` as any)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t("auditActorTarget", {
                        actor: log.actorEmail,
                        target: log.targetEmail || "—",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>}

      <CreateAdminDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreated}
      />
      <PasswordChangeDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        userEmail={users.find((user) => user.id === currentUserId)?.email || ""}
      />
    </div>
  )
}
