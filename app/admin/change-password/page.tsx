"use client"

import { FormEvent, useEffect, useState } from "react"
import { KeyRound, Loader2, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { resolveActionError } from "@/lib/action-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

async function clearSessionAndLogin() {
  await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined)
  window.location.href = "/admin/login"
}

export default function RequiredPasswordChangePage() {
  const t = useTranslations("admin.requiredPasswordChange")
  const tAE = useTranslations("actionErrors")
  const [currentPassword, setCurrentPassword] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          await clearSessionAndLogin()
          return null
        }
        return response.json()
      })
      .then((data) => {
        if (data?.user && !data.user.mustChangePassword) {
          window.location.href = "/admin/dashboard"
        }
      })
      .catch(() => undefined)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"))
      return
    }
    setSaving(true)
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword: password,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        if (result.error === "Unauthorized") {
          await clearSessionAndLogin()
          return
        }
        setError(resolveActionError(tAE, result.error, t("failed")))
        return
      }
      window.location.href = "/admin/dashboard"
    } catch {
      setError(t("failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">{t("currentPassword")}</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={72}
                required
              />
              <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                maxLength={72}
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              {saving ? t("saving") : t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
