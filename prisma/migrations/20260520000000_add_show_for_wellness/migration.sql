-- AlterTable: ウェルネス媒体向けの表示フラグを追加
ALTER TABLE "posts" ADD COLUMN "showForWel" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: ウェルネス媒体向けの一覧取得を高速化
CREATE INDEX "posts_published_showForWel_createdAt_idx" ON "posts"("published", "showForWel", "createdAt");
