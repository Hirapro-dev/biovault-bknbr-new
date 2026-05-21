import Link from "next/link";
import Image from "next/image";
import { formatDate, getDisplayDate } from "@/lib/utils";

type Post = {
  id?: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  eyecatch?: string | null;
  createdAt: Date | string;
  scheduledAt?: Date | string | null;
  showDate?: boolean;
  writer?: { name: string; avatarUrl: string | null } | null;
};

type Props = {
  post: Post;
  variant?: "list" | "grid" | "pickup";
};

/**
 * ウェルネス専用記事カード
 * 既存 PostCard と同じ pickup/list/grid の3バリアント構造を踏襲しつつ、
 * 色とタイポグラフィをウェルネス調(ワインレッド × ゴールド × 明朝体)に置き換え
 */
export default function WelPostCard({ post, variant = "grid" }: Props) {
  const href = `/wel/${post.slug}`;

  if (variant === "pickup") {
    return (
      <Link href={href} className="group block">
        <article className="relative aspect-video overflow-hidden bg-black/20 shadow-md" style={{ border: "1px solid var(--wel-line)", borderTop: "3px solid var(--wel-wine)" }}>
          {post.eyecatch ? (
            <Image
              src={post.eyecatch}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--wel-paper-dark)" }}>
              <span className="font-black text-4xl" style={{ color: "var(--wel-line)", fontFamily: "Yu Mincho, serif" }}>KWR</span>
            </div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0.15) 100%)" }} />
          <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
            <h2
              className="text-lg md:text-xl leading-snug line-clamp-2 group-hover:opacity-90"
              style={{
                fontFamily: '"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Sawarabi Mincho", "Noto Serif JP", serif',
                fontWeight: 600,
                color: "var(--wel-paper)",
                letterSpacing: "0.04em",
                textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.6)",
              }}
            >
              {post.title}
            </h2>
            <div className="flex items-center gap-2 mt-3">
              {post.writer?.avatarUrl ? (
                <Image src={post.writer.avatarUrl} alt={post.writer.name} width={28} height={28} className="rounded-full object-cover" />
              ) : post.writer ? (
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(245,236,220,0.3)" }}>
                  <span className="text-xs font-bold" style={{ color: "var(--wel-paper)" }}>{post.writer.name.charAt(0)}</span>
                </div>
              ) : null}
              {post.writer && <span className="text-sm" style={{ color: "rgba(245,236,220,0.85)" }}>{post.writer.name}</span>}
              {post.showDate !== false && (
                <time className="text-sm" style={{ color: "rgba(245,236,220,0.9)", letterSpacing: "0.1em" }}>{formatDate(getDisplayDate(post))}</time>
              )}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "list") {
    // Desktop: 横並びリスト型（既存 PostCard list と同じ構造、装飾だけウェルネス調）
    return (
      <Link href={href} className="group block">
        <article className="flex gap-6 py-8" style={{ borderBottom: "1px solid var(--wel-line)" }}>
          <div className="w-[240px] shrink-0 aspect-video relative overflow-hidden" style={{ background: "var(--wel-paper-dark)", border: "1px solid var(--wel-line)" }}>
            {post.eyecatch ? (
              <Image
                src={post.eyecatch}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="240px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-black text-3xl" style={{ color: "var(--wel-line)", fontFamily: "Yu Mincho, serif" }}>KWR</span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center flex-1 min-w-0">
            <h2
              className="text-xl leading-snug line-clamp-2 group-hover:opacity-70 transition-opacity"
              style={{
                fontFamily: '"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Sawarabi Mincho", "Noto Serif JP", serif',
                fontWeight: 600,
                color: "var(--wel-wine-deep)",
                letterSpacing: "0.04em",
              }}
            >
              {post.title}
            </h2>
            {post.showDate !== false && (
              <time className="mt-3 text-sm block" style={{ color: "var(--wel-gold)", letterSpacing: "0.15em" }}>
                {formatDate(getDisplayDate(post))}
              </time>
            )}
            {post.writer && (
              <div className="flex items-center gap-2 mt-2">
                {post.writer.avatarUrl ? (
                  <Image src={post.writer.avatarUrl} alt={post.writer.name} width={29} height={29} className="rounded-full object-cover" />
                ) : (
                  <div className="w-[29px] h-[29px] rounded-full flex items-center justify-center" style={{ background: "var(--wel-paper-dark)" }}>
                    <span className="text-[11px] font-bold" style={{ color: "var(--wel-ink-soft)" }}>{post.writer.name.charAt(0)}</span>
                  </div>
                )}
                <span className="text-sm" style={{ color: "var(--wel-ink-soft)" }}>{post.writer.name}</span>
              </div>
            )}
          </div>
        </article>
      </Link>
    );
  }

  // Mobile: グリッドカード型（既存 PostCard grid と同じ構造、装飾だけウェルネス調）
  return (
    <Link href={href} className="group block">
      <article>
        <div className="aspect-video relative overflow-hidden" style={{ background: "var(--wel-paper-dark)", border: "1px solid var(--wel-line)" }}>
          {post.eyecatch ? (
            <Image
              src={post.eyecatch}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-black text-2xl" style={{ color: "var(--wel-line)", fontFamily: "Yu Mincho, serif" }}>KWR</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <h2
            className="text-sm leading-snug line-clamp-3 group-hover:opacity-70 transition-opacity"
            style={{
              fontFamily: '"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Sawarabi Mincho", "Noto Serif JP", serif',
              fontWeight: 600,
              color: "var(--wel-wine-deep)",
              letterSpacing: "0.04em",
            }}
          >
            {post.title}
          </h2>
          {post.showDate !== false && (
            <time className="mt-2 text-xs block" style={{ color: "var(--wel-gold)", letterSpacing: "0.15em" }}>
              {formatDate(getDisplayDate(post))}
            </time>
          )}
          {post.writer && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {post.writer.avatarUrl ? (
                <Image src={post.writer.avatarUrl} alt={post.writer.name} width={24} height={24} className="rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--wel-paper-dark)" }}>
                  <span className="text-[10px] font-bold" style={{ color: "var(--wel-ink-soft)" }}>{post.writer.name.charAt(0)}</span>
                </div>
              )}
              <span className="text-xs" style={{ color: "var(--wel-ink-soft)" }}>{post.writer.name}</span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
