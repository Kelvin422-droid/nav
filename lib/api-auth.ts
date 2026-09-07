import { cookies } from "next/headers"
import { prisma } from "./prisma"
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session"

export interface AdminSession {
  userId: string
  role: "OWNER" | "ADMIN"
  email: string
  name: string | null
  mustChangePassword: boolean
  iat?: number
}

interface AdminSessionOptions {
  allowPasswordChangeRequired?: boolean
}

export function isAdminRole(role: unknown): role is AdminSession["role"] {
  return role === "OWNER" || role === "ADMIN"
}

/**
 * 读取并校验当前请求的管理员会话。
 *
 * 供 API 路由与 Server Actions 统一使用：仅当会话 token 签名有效、
 * 未过期、角色为 ADMIN 且用户在数据库中仍然存在时返回会话信息。
 * 三层校验：签名验证防伪造，查库确认防数据库重建/删除用户后
 * 旧 token 在有效期内继续生效，改密时间比对保证改密后旧会话立即失效。
 */
export async function getAdminSession(
  options: AdminSessionOptions = {}
): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  const session = await verifySessionToken(token)
  if (!session || !isAdminRole(session.role)) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true,
      email: true,
      name: true,
      isActive: true,
      mustChangePassword: true,
      passwordChangedAt: true,
    },
  })
  if (!user || !isAdminRole(user.role) || !user.isActive) return null

  // 新 token 使用毫秒时间；兼容旧版秒级 iat。改密前签发的全部会话立即失效。
  const issuedAtMs = session.iat === undefined
    ? undefined
    : session.iat < 10_000_000_000
      ? session.iat * 1000
      : session.iat
  if (
    user.passwordChangedAt &&
    (issuedAtMs === undefined || issuedAtMs <= user.passwordChangedAt.getTime())
  ) {
    return null
  }

  return {
    userId: session.userId,
    role: user.role,
    email: user.email,
    name: user.name,
    mustChangePassword: user.mustChangePassword,
    iat: session.iat,
  }
}

export async function getOwnerSession(
  options: AdminSessionOptions = {}
): Promise<AdminSession | null> {
  const session = await getAdminSession(options)
  return session?.role === "OWNER" ? session : null
}
