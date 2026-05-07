import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/** GET: サービス一覧を表示順で返す */
export async function GET() {
  const services = await prisma.service.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true, label: true, url: true, imageUrl: true, order: true },
  });
  return NextResponse.json(services);
}

/** POST: 管理画面用。サービス追加 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 });
  try {
    const body = await request.json();
    const { label, url, imageUrl, order } = body;
    if (!label || !url) {
      return NextResponse.json({ error: "label と url は必須です" }, { status: 400 });
    }
    const service = await prisma.service.create({
      data: {
        label: String(label),
        url: String(url),
        imageUrl: imageUrl ? String(imageUrl) : null,
        order: typeof order === "number" ? order : 0,
      },
    });
    return NextResponse.json(service);
  } catch {
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
