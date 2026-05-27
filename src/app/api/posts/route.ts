import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { generateSlug } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");
  const all = searchParams.get("all") === "true";
  const sort = searchParams.get("sort") || "newest";
  const pickup = searchParams.get("pickup") === "true";
  const q = searchParams.get("q")?.trim() || "";

  // 予約投稿の自動公開チェック
  const now = new Date();
  await prisma.post.updateMany({
    where: { published: false, scheduledAt: { lte: now, not: null } },
    data: { published: true },
  });

  const where: Prisma.PostWhereInput = all ? {} : { published: true };
  if (pickup) (where as Prisma.PostWhereInput).isPickup = true;
  if (q) {
    (where as Prisma.PostWhereInput).OR = [
      { title: { contains: q, mode: "insensitive" } },
      { excerpt: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }
  const skip = (page - 1) * limit;

  /** 表示用の有効日付（scheduledAt ?? createdAt）を取得するヘルパー */
  const getEffectiveDate = (p: { scheduledAt: Date | string | null; createdAt: Date | string }) =>
    new Date(p.scheduledAt ?? p.createdAt).getTime();

  let orderBy: Prisma.PostOrderByWithRelationInput;
  const useEffectiveDateSort = sort === "newest" || sort === "oldest";
  switch (sort) {
    case "views_desc": orderBy = { views: "desc" }; break;
    case "views_asc": orderBy = { views: "asc" }; break;
    default: orderBy = { createdAt: "desc" }; // 日付ソートはJS側で再ソート
  }

  const select = {
    id: true,
    title: true,
    slug: true,
    excerpt: true,
    eyecatch: true,
    published: true,
    isPickup: true,
    showDate: true,
    views: true,
    scheduledAt: true,
    createdAt: true,
    writer: { select: { id: true, name: true, avatarUrl: true } },
    categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
  };

  try {
    const [rawPosts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select,
      }),
      prisma.post.count({ where }),
    ]);
    const posts = useEffectiveDateSort
      ? rawPosts.sort((a, b) =>
          sort === "newest"
            ? getEffectiveDate(b) - getEffectiveDate(a)
            : getEffectiveDate(a) - getEffectiveDate(b)
        )
      : rawPosts;
    return NextResponse.json({
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    return NextResponse.json({ error: "記事の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, content, excerpt, eyecatch, published, scheduledAt, writerId, isPickup, showDate, categoryIds } = body;

    const slug = generateSlug();
    const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || content.replace(/<[^>]*>/g, "").slice(0, 200),
        eyecatch: eyecatch || null,
        published: isScheduled ? false : (published ?? false),
        isPickup: isPickup === true,
        showDate: showDate !== false,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        writerId: writerId ? parseInt(writerId) : null,
        categories: Array.isArray(categoryIds) && categoryIds.length > 0
          ? { create: categoryIds.map((cid: number) => ({ categoryId: cid })) }
          : undefined,
      },
      include: { categories: { include: { category: true } } },
    });

    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: "記事の作成に失敗しました" }, { status: 500 });
  }
}
