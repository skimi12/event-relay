# Event Relay

**展示会の什器を、次の舞台へ。**

展示会終了後の展示台・棚・装飾品を、引渡場所・時間・運搬条件で探せる、日本語のB2Bリユースマーケットです。

公開プレビュー: https://event-relay.sano2822097.chatgpt.site/

GitHub: https://github.com/skimi12/event-relay

## 現在の段階

初期プレビュー。取引需要・売上は未検証です。サンプル商品は実在する在庫ではありません。実取引の公開と本番課金は無効です。

公開状況、直近の検証結果、GitHub投稿状況は [docs/HANDOFF.md](docs/HANDOFF.md) が正本です。

## 製品の構成

- 会場、カテゴリ、価格、引渡日による検索と商品詳細。
- 寸法・重量、数量、解体・運搬条件、出品権限・搬出ルールの確認。
- ChatGPT sign-inと、運営者アカウントの出品下書き（一般公開前は第三者の書込を拒否）。
- D1に保存する出品・受取希望・状態遷移、R2に保存する写真。
- 所有者認可、申込条件検証、重複予約防止、連絡先の限定表示。
- 仮の手数料試算。決済事業者への接続・実請求は含まれません。

サンプル閲覧は匿名で可能です。出品者の自己申告を運営審査済みと扱わず、会場の承認や物流手配も保証しません。

## 技術構成

React / TypeScript / Vinext、Cloudflare Workers、D1（Drizzle migrations）、R2。Sitesがホスティングと認証を提供します。`worker/index.ts` と `scripts/vite/` のSites統合を保持してください。

## 開発

Node.js 22.13以上が必要です。新しいチェックアウトで次を実行します。

```sh
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build
```

Sitesで開発する場合、Sitesスキルのインストール・ビルド・preview手順を使用してください。managed Linuxでは `sites-preview start <checkoutの絶対パス>` がプレビューを管理します。

DBスキーマ変更時は `npm run db:generate` でmigrationを生成し、SQLとDrizzleメタデータを確認します。ローカルmigrationはビルド後の `dist/server/wrangler.json` を使います。

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/<未適用migration>.sql
```

ローカルデータベースは本番と別です。既に適用したmigrationを繰り返し実行しないでください。

## 環境設定

| 設定 | 意味 | 初期状態 |
| --- | --- | --- |
| `DB` | D1 binding | Sitesが提供 |
| `BUCKET` | R2 binding | Sitesが提供 |
| `PREVIEW_OWNER_EMAIL` | プレビューで下書きを作成できる所有者（サーバー秘密値） | Sitesへ設定 |
| `MARKETPLACE_LIVE` | 実在出品の公開・申込を有効にする設定 | 未設定＝無効 |
| `OPERATOR_NAME` | 実際の運営者名称 | 未設定 |
| `OPERATOR_CONTACT` | 実在する運営問い合わせ窓口 | 未設定 |

環境値はSitesの実行環境へ設定します。 `.openai/hosting.json` はbindingとSite IDだけを保持し、秘密情報を書きません。`MARKETPLACE_LIVE=true` だけでは実取引を開始せず、運営情報と [公開条件](docs/LAUNCH_CHECKLIST.md) を整えます。決済の有効化は別の実装・本番契約が必要です。

## GitHubへの投稿

公開リポジトリは `skimi12/event-relay` です。Sitesのデプロイ用ソースとGitHubのソースを同じファイル内容に保ちます。初回のGitHub履歴は別の初期コミットから始まるため、SitesとGitHubのコミットSHAは一致するとは限りません。同期する際はtreeと変更内容を確認してください。既存のSites用remoteを維持し、GitHubの認証情報をREADMEやソースへ書きません。

## 次の開発

- [開発ロードマップ](docs/ROADMAP.md)
- [公開・収益化の条件](docs/LAUNCH_CHECKLIST.md)
- [事業・公式資料の調査メモ](docs/LAUNCH_RESEARCH.md)
- [引継ぎ記録](docs/HANDOFF.md)

権利者がライセンスを選択するまで、独自コードのオープンソースライセンスは設定していません。第三者依存関係とスターターに含まれるライセンスはそれぞれの条件に従います。
