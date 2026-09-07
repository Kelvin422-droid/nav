"use client"

import { FormEvent, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { createAdminUser } from "@/lib/actions"
import { resolveActionError } from "@/lib/action-error"

export interface CreatedAdminUser {
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

interface CreateAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (user: CreatedAdminUser) => void
}

export function CreateAdminDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateAdminDialogProps) {
  const t = useTranslations("admin.admins")
  const tAE = useTranslations("actionErrors")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail("")
    setName("")
    setPassword("")
    setConfirmPassword("")
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirmPassword) {
      toast.error(t("passwordMismatch"))
      return
    }

    setSaving(true)
    try {
      const result = await createAdminUser({ email, name, password })
      if (result.success && result.data) {
        toast.success(t("createSuccess"), {
          description: t("createSuccessDesc", { email: result.data.email }),
        })
        onSuccess?.(result.data)
        onOpenChange(false)
      } else {
        toast.error(
          resolveActionError(tAE, result.error, t("createFailed"))
        )
      }
    } catch {
      toast.error(t("createFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
            <DialogDescription>{t("createDesc")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div className="grid gap-2">
              <Label htmlFor="admin-email">{t("emailLabel")}</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
                maxLength={254}
                required
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin-name">{t("nameLabel")}</Label>
              <Input
                id="admin-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("namePlaceholder")}
                autoComplete="name"
                maxLength={100}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin-password">{t("passwordLabel")}</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("passwordPlaceholder")}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("passwordHint")}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin-password-confirm">
                {t("confirmPasswordLabel")}
              </Label>
              <Input
                id="admin-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t("confirmPasswordPlaceholder")}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? t("creating") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
