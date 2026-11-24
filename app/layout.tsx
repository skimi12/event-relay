import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Relay | 展示会の什器を、次の舞台へ。",
  description: "展示会を終えた展示台・棚・装飾資材を、次の出展企業へ。引渡場所と日時から探す、企業向けリユースマーケット。プレビュー公開中。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
