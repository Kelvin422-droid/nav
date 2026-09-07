import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/api-auth"

export async function OwnerOnlyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()
  if (!session) redirect("/admin/login")
  if (session.role !== "OWNER") redirect("/admin/dashboard")
  return <>{children}</>
}
