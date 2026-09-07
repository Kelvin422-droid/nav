// 管理员账号页允许 OWNER 与 ADMIN 访问；具体数据范围和操作权限由
// Server Actions 按当前会话角色强制限制。
export default function AdminAccountsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
