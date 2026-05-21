import Link from "next/link";
import Image from "next/image";
import Pagination from "@/components/Pagination";
import { formatDate, getDisplayDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import WelHeader from "./_components/WelHeader";
import WelFooter from "./_components/WelFooter";
import WelPostCard from "./_components/WelPostCard";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  eyecatch: string | null;
  published: boolean;
  views: number;
  createdAt: Date;
  scheduledAt: Date | null;
  showDate?: boolean;
  writer?: { name: string; avatarUrl: string | null } | null;
};

type Banner = { id: number; label: string; url: string; imageUrl: string | null; media: string; order: number };
type MenuCategory = { id: number; name: string; slug: string };

const postSelect = {
  id: true, title: true, slug: true, excerpt: true,
  eyecatch: true, published: true, views: true, createdAt: true, scheduledAt: true, showDate: true,
  writer: { select: { name: true, avatarUrl: true } },
} as const;

async function getMenuCategories(): Promise<MenuCategory[]> {
  return prisma.category.findMany({
    where: { showInMenu: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

async function publishScheduledPosts() {
  const now = new Date();
  await prisma.post.updateMany({
    where: { published: false, scheduledAt: { lte: now, not: null } },
    data: { published: true },
  });
}

async function getPosts(page: number, q?: string, categorySlug?: string) {
  const limit = 10;
  const skip = (page - 1) * limit;
  const where: Prisma.PostWhereInput = { published: true, showForWel: true };
  if (q?.trim()) {
    const k = q.trim();
    where.OR = [
      { title: { contains: k, mode: "insensitive" } },
      { excerpt: { contains: k, mode: "insensitive" } },
      { content: { contains: k, mode: "insensitive" } },
    ];
  }
  if (categorySlug) {
    where.categories = { some: { category: { slug: categorySlug } } };
  }
  const [rawPosts, total] = await Promise.all([
    prisma.post.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit, select: postSelect }),
    prisma.post.count({ where }),
  ]);
  const posts = rawPosts.sort((a, b) =>
    new Date(b.scheduledAt ?? b.createdAt).getTime() - new Date(a.scheduledAt ?? a.createdAt).getTime()
  );
  return { posts, total, page, totalPages: Math.ceil(total / limit) };
}

async function getPickupPosts(): Promise<Post[]> {
  try {
    const pickups = await prisma.post.findMany({
      where: { published: true, isPickup: true, showForWel: true } as Prisma.PostWhereInput,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: postSelect,
    });
    return pickups.sort((a, b) =>
      new Date(b.scheduledAt ?? b.createdAt).getTime() - new Date(a.scheduledAt ?? a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

async function getRecommended(): Promise<Post[]> {
  try {
    return await prisma.post.findMany({
      where: { published: true, showForWel: true } as Prisma.PostWhereInput,
      orderBy: { views: "desc" },
      take: 5,
      select: { id: true, title: true, slug: true, excerpt: true, eyecatch: true, published: true, views: true, createdAt: true, scheduledAt: true, showDate: true },
    });
  } catch {
    return [];
  }
}

async function getBanners(): Promise<Banner[]> {
  return prisma.banner.findMany({
    where: { OR: [{ media: "wel" }, { media: "all" }] },
    orderBy: { order: "asc" },
    select: { id: true, label: true, url: true, imageUrl: true, media: true, order: true },
  });
}

export default async function WelMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; cat?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const q = params.q?.trim() || undefined;
  const catSlug = params.cat?.trim() || undefined;

  let data: { posts: Post[]; total: number; page: number; totalPages: number };
  let pickupPosts: Post[];
  let recommended: Post[];
  let banners: Banner[];
  let menuCategories: MenuCategory[];
  try {
    await publishScheduledPosts();
    [data, pickupPosts, recommended, banners, menuCategories] = await Promise.all([
      getPosts(page, q, catSlug),
      getPickupPosts(),
      getRecommended(),
      getBanners(),
      getMenuCategories(),
    ]);
  } catch {
    data = { posts: [], total: 0, page: 1, totalPages: 0 };
    pickupPosts = [];
    recommended = [];
    banners = [];
    menuCategories = [];
  }

  const activeCategoryName = catSlug ? menuCategories.find((c) => c.slug === catSlug)?.name : undefined;
  const showPickup = !catSlug && !q && page === 1 && pickupPosts.length > 0;
  const paginationBase = catSlug ? `/wel?cat=${catSlug}` : "/wel";

  return (
    <div className="min-h-screen flex flex-col">
      <WelHeader />
      <main className="flex-1">
        <div className="wel-box mx-0 sm:mx-6">
          {/* カテゴリタブ */}
          {menuCategories.length > 0 && (
            <div className="pt-4 pb-2 wel-border-line border-b overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex items-center gap-2 min-w-max">
                <Link href="/wel" className={`wel-cat-tab whitespace-nowrap ${!catSlug ? "is-active" : ""}`}>
                  すべて
                </Link>
                {menuCategories.map((cat) => (
                  <Link key={cat.id} href={`/wel?cat=${cat.slug}`} className={`wel-cat-tab whitespace-nowrap ${catSlug === cat.slug ? "is-active" : ""}`}>
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="lg:flex lg:gap-10">
            <div className="flex-1 min-w-0">
              {showPickup && (
                <section className="pt-8 pb-6 wel-border-line border-b">
                  <div className="flex items-baseline gap-3 mb-6">
                    <h2 className="wel-section-title text-2xl md:text-3xl">PickUp</h2>
                    <p className="wel-section-sub text-sm">人気記事</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pickupPosts.map((post) => (
                      <WelPostCard key={post.id} post={post} variant="pickup" />
                    ))}
                  </div>
                </section>
              )}

              <section className="pt-8 pb-6">
                <div className="flex items-baseline gap-3 mb-6">
                  {q ? (
                    <h2 className="wel-section-title text-2xl md:text-3xl">検索：{q}</h2>
                  ) : activeCategoryName ? (
                    <h2 className="wel-section-title text-2xl md:text-3xl">{activeCategoryName}</h2>
                  ) : (
                    <>
                      <h2 className="wel-section-title text-2xl md:text-3xl">Latest</h2>
                      <p className="wel-section-sub text-sm">新着記事</p>
                    </>
                  )}
                </div>
                {data.posts.length > 0 ? (
                  <>
                    <div className="hidden md:block">
                      {data.posts.map((post) => (
                        <WelPostCard key={post.id} post={post} variant="list" />
                      ))}
                    </div>
                    <div className="md:hidden grid grid-cols-2 gap-x-4 gap-y-6 pt-6">
                      {data.posts.map((post) => (
                        <WelPostCard key={post.id} post={post} variant="grid" />
                      ))}
                    </div>
                    <div className="wel-pagination">
                      <Pagination currentPage={data.page} totalPages={data.totalPages} basePath={paginationBase} />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20">
                    <span className="wel-empty-mark font-black text-5xl">KWR</span>
                    <h2 className="text-lg font-bold mt-4" style={{ color: "var(--wel-wine-deep)" }}>記事はまだありません</h2>
                    <p className="text-sm mt-1" style={{ color: "var(--wel-ink-soft)" }}>
                      {q ? "検索条件に一致する記事がありません" : activeCategoryName ? `${activeCategoryName}の記事はありません` : "ウェルネス向けの記事はありません"}
                    </p>
                  </div>
                )}
              </section>

              {/* スマホ向けバナー・おすすめ記事セクション */}
              <div className="lg:hidden">
                <div className="pt-6 pb-4 wel-border-line border-t">
                  <form action="/wel" method="get" className="wel-search-form relative max-w-2xl">
                    <input type="hidden" name="page" value="1" />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--wel-gold)" }} aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    </span>
                    <input type="search" name="q" defaultValue={q} placeholder="どんな記事をお探しですか?" className="w-full pl-10 pr-2 py-1.5" aria-label="記事を検索" />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2">検索</button>
                  </form>
                </div>
                {banners.length > 0 && (
                  <section className="pt-6 pb-6 wel-border-line border-t">
                    <ul className="space-y-3">
                      {banners.map((b) => (
                        <li key={b.id}>
                          <a href={b.url} target="_blank" rel="noopener noreferrer" className="wel-banner block overflow-hidden hover:opacity-90 transition-opacity">
                            {b.imageUrl ? (
                              <div className="aspect-[2/1] relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={b.imageUrl} alt={b.label} className="w-full h-full object-cover" />
                              </div>
                            ) : null}
                            <p className={`font-medium text-sm text-center ${b.imageUrl ? "py-2" : "py-3 px-3"}`}>{b.label}</p>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {recommended.length > 0 && (
                  <section className="pt-6 pb-8 wel-border-line border-t">
                    <h2 className="wel-section-title text-lg mb-4">あなたにおすすめの記事</h2>
                    <ul className="space-y-4">
                      {recommended.map((post) => (
                        <li key={post.id} className="wel-border-line border-b last:border-0 pb-4 last:pb-0">
                          <Link href={`/wel/${post.slug}`} className="group flex gap-3">
                            <div className="w-28 h-20 shrink-0 overflow-hidden" style={{ background: "var(--wel-paper-dark)", border: "1px solid var(--wel-line)" }}>
                              {post.eyecatch ? (
                                <Image src={post.eyecatch} alt={post.title} width={112} height={80} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><span className="font-black text-lg" style={{ color: "var(--wel-line)", fontFamily: "Yu Mincho, serif" }}>KWR</span></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug line-clamp-2 group-hover:opacity-70" style={{ fontFamily: '"Yu Mincho", "Hiragino Mincho ProN", serif', fontWeight: 600, color: "var(--wel-wine-deep)" }}>{post.title}</p>
                              {post.showDate !== false && (
                                <time className="text-xs mt-1 block" style={{ color: "var(--wel-gold)", letterSpacing: "0.15em" }}>{formatDate(getDisplayDate(post))}</time>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>

            <aside className="hidden lg:block w-[320px] shrink-0 pt-10">
              <div className="mb-6">
                <form action="/wel" method="get" className="wel-search-form relative">
                  <input type="hidden" name="page" value="1" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--wel-gold)" }} aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </span>
                  <input type="search" name="q" defaultValue={q} placeholder="記事を検索" className="w-full pl-10 pr-3 py-2.5 text-sm" aria-label="記事を検索" />
                  <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2">検索</button>
                </form>
              </div>
              {banners.length > 0 && (
                <section className="mb-8">
                  <ul className="space-y-3">
                    {banners.map((b) => (
                      <li key={b.id}>
                        <a href={b.url} target="_blank" rel="noopener noreferrer" className="wel-banner block overflow-hidden hover:opacity-90 transition-opacity">
                          {b.imageUrl ? (
                            <div className="aspect-[2/1] relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={b.imageUrl} alt={b.label} className="w-full h-full object-cover" />
                            </div>
                          ) : null}
                          <p className={`font-medium text-sm text-center ${b.imageUrl ? "py-2" : "py-3 px-3"}`}>{b.label}</p>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {recommended.length > 0 && (
                <section className="mb-8">
                  <h2 className="wel-section-title text-lg mb-4">あなたにおすすめの記事</h2>
                  <ul className="space-y-4">
                    {recommended.map((post) => (
                      <li key={post.id} className="wel-border-line border-b last:border-0 pb-4 last:pb-0">
                        <Link href={`/wel/${post.slug}`} className="group flex gap-3">
                          <div className="w-28 h-20 shrink-0 overflow-hidden" style={{ background: "var(--wel-paper-dark)", border: "1px solid var(--wel-line)" }}>
                            {post.eyecatch ? (
                              <Image src={post.eyecatch} alt={post.title} width={112} height={80} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><span className="font-black text-lg" style={{ color: "var(--wel-line)", fontFamily: "Yu Mincho, serif" }}>KWR</span></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug line-clamp-2 group-hover:opacity-70" style={{ fontFamily: '"Yu Mincho", "Hiragino Mincho ProN", serif', fontWeight: 600, color: "var(--wel-wine-deep)" }}>{post.title}</p>
                            {post.showDate !== false && (
                              <time className="text-xs mt-1 block" style={{ color: "var(--wel-gold)", letterSpacing: "0.15em" }}>{formatDate(getDisplayDate(post))}</time>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>
      <WelFooter />
    </div>
  );
}
