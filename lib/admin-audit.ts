import { prisma } from "./prisma"

export type AdminAuditAction =
  | "ADMIN_CREATED"
  | "ADMIN_ENABLED"
  | "ADMIN_DISABLED"
  | "ADMIN_ROLE_CHANGED"
  | "ADMIN_PASSWORD_RESET"
  | "ADMIN_DELETED"
  | "PROFILE_UPDATED"
  | "PASSWORD_CHANGED"
  | "LOGIN_SUCCESS"

export async function recordAdminAudit(input: {
  actorId?: string | null
  actorEmail: string
  action: AdminAuditAction
  targetUserId?: string | null
  targetEmail?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: input.actorId || null,
        actorEmail: input.actorEmail,
        action: input.action,
        targetUserId: input.targetUserId || null,
        targetEmail: input.targetEmail || null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    })
  } catch (error) {
    // 审计异常不应把已完成的账号操作伪装成失败；保留服务端告警。
    console.error("Failed to record admin audit log:", error)
  }
}
