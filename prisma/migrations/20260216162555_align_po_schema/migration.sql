-- DropIndex
DROP INDEX "user_prefs_shop_idx";

-- AlterTable
ALTER TABLE "shop_installation" ALTER COLUMN "updated_at" DROP DEFAULT;
