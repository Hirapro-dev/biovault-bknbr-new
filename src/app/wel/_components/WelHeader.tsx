import Link from "next/link";

/** ウェルネス媒体専用ヘッダー（ワインレッド × ゴールド） */
export default function WelHeader() {
  return (
    <header className="wel-header">
      <div className="wel-header-inner">
        <Link href="/wel" className="wel-header-title">
          <small>投資のKAWARA版.com</small>
          “次世代ウェルネス”×“資産形成”戦略通信
        </Link>
      </div>
    </header>
  );
}
