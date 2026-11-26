# Cloudflare移行準備（2026-11-26）

このファイルは移行準備の記録です。**Cloudflareアカウントへの配備はまだ行っていません。** 既存のChatGPT Sitesを削除せず、現在の公開範囲を変更しません。

## 構成と依存
- Next.js 16 + vinext + Vite/Workers。Cloudflare D1 binding: `DB`、Cloudflare R2 binding: `BUCKET`。
- 出品画像・掲載依頼・受渡し確認はDB/R2と認証に依存しています。**公開デモのまま移行**し、実取引を有効にしないでください。
- Sitesのログインと管理者ロールは自分のCloudflareアカウントで自動復元されません。

## 移行ゲート
1. `npx vinext check` と `npx vinext init --platform=cloudflare` を専用作業ブランチで検証し、Sites専用スクリプトを除外した配備構成を用意。
2. 新Cloudflare D1とR2を作成。既存D1のエクスポート、R2画像の一覧/ハッシュ/参照先を控える。現行のプロバイダーから出力できない場合は**データ移行未完了**と扱う。
3. Cloudflare Accessなど認証/IDの再実装・権限拒否テストを必須にする。画像アップロードの所有権、Content-Type、サイズを検査。
4. 保護済みの新Workerにデプロイし、D1/R2、プレビュー画面、出品下書き・画像・受取希望・二重予約をE2E確認。
5. 新・旧サイトの並行比較後、旧サイトをロールバック先として保持。実顧客の移行・決済は別途判断。

## 未完
Cloudflareアカウント連携、R2・D1・認証移植、画像データ移行、実デプロイ、商用運用の検証。

公式: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ 、https://developers.cloudflare.com/d1/best-practices/import-export-data/ 。
