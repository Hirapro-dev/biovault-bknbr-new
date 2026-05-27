import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// POST: 閲覧数を記録（フロント側から呼び出し）
// body: { postId }
export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();
    if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

    await prisma.$transaction([
      prisma.pageView.create({ data: { postId } }),
      prisma.post.update({ where: { id: postId }, data: { views: { increment: 1 } } }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// GET: 解析データ取得（管理画面用）
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  const period = searchParams.get("period") || "all"; // all, monthly, daily

  try {
    if (postId) {
      const id = parseInt(postId);
      const post = await prisma.post.findUnique({
        where: { id },
        select: { id: true, title: true, views: true },
      });

      let groupBy: "day" | "month" = "day";
      let dateFilter: Date | undefined;
      const now = new Date();

      if (period === "daily") {
        dateFilter = new Date(now);
        dateFilter.setDate(dateFilter.getDate() - 30);
      } else if (period === "monthly") {
        dateFilter = new Date(now);
        dateFilter.setMonth(dateFilter.getMonth() - 12);
        groupBy = "month";
      }

      const viewWhere = {
        postId: id,
        ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
      };

      const views = await prisma.pageView.findMany({
        where: viewWhere,
        orderBy: { createdAt: "asc" },
      });

      const clicks = await prisma.click.findMany({
        where: {
          postId: id,
          ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      // グループ化（日付キー → 件数）
      const viewsByDateRaw: Record<string, number> = {};
      views.forEach((v) => {
        const key = groupBy === "month"
          ? v.createdAt.toISOString().slice(0, 7)
          : v.createdAt.toISOString().slice(0, 10);
        viewsByDateRaw[key] = (viewsByDateRaw[key] || 0) + 1;
      });

      const clicksByDateRaw: Record<string, number> = {};
      clicks.forEach((c) => {
        const key = groupBy === "month"
          ? c.createdAt.toISOString().slice(0, 7)
          : c.createdAt.toISOString().slice(0, 10);
        clicksByDateRaw[key] = (clicksByDateRaw[key] || 0) + 1;
      });

      // 日別・月別は全期間を0埋めして返す
      const viewsByDate: Record<string, number> = {};
      const clicksByDate: Record<string, number> = {};
      if (period === "daily" && dateFilter) {
        const start = new Date(dateFilter);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0, 10);
          viewsByDate[key] = viewsByDateRaw[key] ?? 0;
          clicksByDate[key] = clicksByDateRaw[key] ?? 0;
        }
      } else if (period === "monthly" && dateFilter) {
        const startYear = dateFilter.getFullYear();
        const startMonth = dateFilter.getMonth();
        const endYear = now.getFullYear();
        const endMonth = now.getMonth();
        for (let y = startYear; y <= endYear; y++) {
          const mStart = y === startYear ? startMonth : 0;
          const mEnd = y === endYear ? endMonth : 11;
          for (let m = mStart; m <= mEnd; m++) {
            const key = `${y}-${String(m + 1).padStart(2, "0")}`;
            viewsByDate[key] = viewsByDateRaw[key] ?? 0;
            clicksByDate[key] = clicksByDateRaw[key] ?? 0;
          }
        }
      } else {
        Object.assign(viewsByDate, viewsByDateRaw);
        Object.assign(clicksByDate, clicksByDateRaw);
      }

      const clicksByUrl: Record<string, { count: number; label: string | null }> = {};
      clicks.forEach((c) => {
        if (!clicksByUrl[c.url]) clicksByUrl[c.url] = { count: 0, label: c.label };
        clicksByUrl[c.url].count++;
      });

      return NextResponse.json({ post, viewsByDate, clicksByDate, clicksByUrl, totalClicks: clicks.length });
    }

    // 全体サマリー
    const posts = await prisma.post.findMany({
      select: {
        id: true, title: true, views: true, published: true, createdAt: true, scheduledAt: true,
        writer: { select: { id: true, name: true } },
      },
      orderBy: { views: "desc" },
    });

    const postIds = posts.map((p) => p.id);

    const totalViews = postIds.length > 0
      ? await prisma.pageView.count({ where: { postId: { in: postIds } } })
      : 0;
    const totalClicks = postIds.length > 0
      ? await prisma.click.count({ where: { postId: { in: postIds } } })
      : 0;

    // 当日の統計
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // 直近7日間の統計
    const week7Start = new Date(now);
    week7Start.setDate(week7Start.getDate() - 7);
    week7Start.setHours(0, 0, 0, 0);

    const dateRangeToday = { createdAt: { gte: todayStart } };
    const dateRange7Days = { createdAt: { gte: week7Start } };
    const postIdFilter = postIds.length > 0 ? { postId: { in: postIds } } : { postId: -1 };

    const [todayViews, todayClicks, last7DaysViews, last7DaysClicks] = await Promise.all([
      prisma.pageView.count({ where: { ...postIdFilter, ...dateRangeToday } }),
      prisma.click.count({ where: { ...postIdFilter, ...dateRangeToday } }),
      prisma.pageView.count({ where: { ...postIdFilter, ...dateRange7Days } }),
      prisma.click.count({ where: { ...postIdFilter, ...dateRange7Days } }),
    ]);

    return NextResponse.json({
      posts, totalViews, totalClicks,
      todayViews, todayClicks, last7DaysViews, last7DaysClicks,
    });
  } catch {
    return NextResponse.json({ error: "解析データの取得に失敗しました" }, { status: 500 });
  }
}
