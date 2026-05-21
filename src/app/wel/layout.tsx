import type { Metadata } from "next";
import "./wellness.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // /wel 配下だけにウェルネス用テーマを適用するため、ラッパーに data-theme="wel" を付与
  return <div data-theme="wel">{children}</div>;
}
