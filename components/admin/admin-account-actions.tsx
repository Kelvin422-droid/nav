"use client"

import { FormEvent, useState } from "react"
import { KeyRound, Loader2, MoreHorizontal, Shield, ShieldMinus, Trash2, UserCheck, UserX } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  deleteAdminUser,
  resetAdminPassword,
  setAdminActive,
  updateAdminRole,
} from "@/lib/actions"
import { resolveActionError } from "@/lib/action-error"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface ManagedAdminUser {
  id: string
  email: string
  name: string | null
  role: "OWNER" | "ADMIN"
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAt: Date | string | null
  createdById: string | null
  createdAt: Date | string
}

export function AdminAccountActions({
  user,
  currentUserId,
  onChanged,
}: {
  user: ManagedAdminUser
  currentUserId: string | null
  onChanged: () => void
}) {
  const t = useTranslations("admin.admins")
  const tAE = useTranslations("actionErrors")
  const [confirmAction, setConfirmAction] = useState<"disable" | "delete" | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const isSelf = user.id === currentUserId

  async function run(
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) {
    setBusy(true)
    try {
      const result = await action()
      if (!result.success) {
        toast.error(resolveActionError(tAE, result.error, t("actionFailed")))
        return false
      }
      toast.success(successMessage)
      onChanged()
      return true
    } catch {
      toast.error(t("actionFailed"))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmedAction() {
    if (confirmAction === "disable") {
      const ok = await run(
        () => setAdminActive(user.id, false),
        t("disabledSuccess", { email: user.email })
      )
      if (ok) setConfirmAction(null)
    } else if (confirmAction === "delete") {
      const ok = await run(
        () => deleteAdminUser(user.id),
        t("deletedSuccess", { email: user.email })
      )
      if (ok) setConfirmAction(null)
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirmPassword) {
      toast.error(t("passwordMismatch"))
      return
    }
    const ok = await run(
      () => resetAdminPassword(user.id, password),
      t("resetSuccess", { email: user.email })
    )
    if (ok) {
      setResetOpen(false)
      setPassword("")
      setConfirmPassword("")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={busy} aria-label={t("actions")}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            disabled={isSelf}
            onSelect={() => void run(
              () => updateAdminRole(user.id, user.role === "OWNER" ? "ADMIN" : "OWNER"),
              t("roleChangedSuccess")
            )}
          >
            {user.role === "OWNER" ? <ShieldMinus /> : <Shield />}
            {user.role === "OWNER" ? t("demote") : t("promote")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isSelf} onSelect={() => setResetOpen(true)}>
            <KeyRound />
            {t("resetPassword")}
          </DropdownMenuItem>
          {user.isActive ? (
            <DropdownMenuItem disabled={isSelf} onSelect={() => setConfirmAction("disable")}>
              <UserX />
              {t("disable")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => void run(
              () => setAdminActive(user.id, true),
              t("enabledSuccess", { email: user.email })
            )}>
              <UserCheck />
              {t("enable")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isSelf}
            className="text-destructive focus:text-destructive"
            onSelect={() => setConfirmAction("delete")}
          >
            <Trash2 />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && !busy && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "delete" ? t("deleteTitle") : t("disableTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete"
                ? t("deleteDesc", { email: user.email })
                : t("disableDesc", { email: user.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className={confirmAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmedAction()
              }}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={resetOpen} onOpenChange={(open) => !busy && setResetOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleReset}>
            <DialogHeader>
              <DialogTitle>{t("resetTitle")}</DialogTitle>
              <DialogDescription>{t("resetDesc", { email: user.email })}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <div className="grid gap-2">
                <Label htmlFor={`reset-password-${user.id}`}>{t("passwordLabel")}</Label>
                <Input
                  id={`reset-password-${user.id}`}
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`reset-confirm-${user.id}`}>{t("confirmPasswordLabel")}</Label>
                <Input
                  id={`reset-confirm-${user.id}`}
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setResetOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("resetPassword")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
