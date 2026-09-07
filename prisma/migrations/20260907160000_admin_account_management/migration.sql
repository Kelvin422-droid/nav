-- Existing installations had a single ADMIN role. Promote those accounts to
-- OWNER during the migration so no deployment loses access to account controls.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole"
  USING ('OWNER'::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
DROP TYPE "UserRole_old";

ALTER TABLE "User"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "last_login_at" TIMESTAMP(3),
  ADD COLUMN "created_by_id" TEXT;

CREATE INDEX "User_role_is_active_idx" ON "User"("role", "is_active");

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "actor_id" TEXT,
  "actor_email" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "target_user_id" TEXT,
  "target_email" TEXT,
  "metadata" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_actor_id_idx" ON "AdminAuditLog"("actor_id");
CREATE INDEX "AdminAuditLog_target_user_id_idx" ON "AdminAuditLog"("target_user_id");
CREATE INDEX "AdminAuditLog_created_at_idx" ON "AdminAuditLog"("created_at");
