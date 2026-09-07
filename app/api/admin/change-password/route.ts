import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { changePassword } from "@/lib/actions"
import { getAdminSession } from "@/lib/api-auth"
import { jsonResponseWithSession } from "@/lib/auth-cookies"
import { createSessionToken } from "@/lib/session"

const passwordChangeSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
})

export async function POST(request: NextRequest) {
  const session = await getAdminSession({ allowPasswordChangeRequired: true })
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const parsed = passwordChangeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "PASSWORD_CHANGE_INVALID" },
        { status: 400 }
      )
    }

    const result = await changePassword(
      parsed.data.currentPassword,
      parsed.data.newPassword
    )
    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error === "Unauthorized" ? 401 : 400,
      })
    }

    // 改密会吊销旧 token；立即签发一个基于新密码状态的新 token，
    // 首次改密用户无需再经历一次登录。
    const token = await createSessionToken(session.userId, session.role, false)
    return jsonResponseWithSession({ success: true }, token)
  } catch (error) {
    console.error("Required password change error:", error)
    return NextResponse.json(
      { success: false, error: "PASSWORD_CHANGE_FAILED" },
      { status: 500 }
    )
  }
}
