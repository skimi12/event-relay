# Event Relay 引継ぎ

更新：2026-11-25 JST（初回公開・GitHub連携の記録）

## 目的・ユーザーの許可

展示会終了後の什器を引き継ぐプラットフォームを実装し、GitHubへ投稿し、公開・収益化できる段階まで継続開発する依頼です。1回で商用完成する必要はありません。ユーザーは1時間ごとの実行を希望しています。

コード実装、必要な検証、Gitへの保存、公開に向けた作業は許可されています。営業連絡、課金契約、決済口座開設、本人情報の推測・公開は許可されていません。

## 正本とアクセス

- Site project_id: `appgprj_6b05a7e488fc8191aede73716f48f063`
- slug: `event-relay`
- 初回checkout: `/workspace/sites/event-relay`
- Sites source remote: `https://git.chatgpt-team.site/37c12fbf-bba6-4de2-9fb0-0c9a0831a6b4/appgprj_6b05a7e488fc8191aede73716f48f063.git`
- GitHub: https://github.com/skimi12/event-relay （public、所有者skimi12）。接続ツールには新規repo作成APIがなかったため、ユーザーの安全な認証入力後にブラウザーで作成。ファイル投稿はGitHubのGit objects APIで実施します。正確な最新headを取得してから次の変更を追加してください。
- GitHub初期コミット: `ba529bb63bd4d6c9a0f02af7eaac367477593faa`。Sitesと別の履歴なので強制pushせず、GitHubの現在headを親としたcommitで同期します。
- 公開URL: https://event-relay.sano2822097.chatgpt.site/
- 初回公開: version 1、2026-11-25 00:21 JSTにsucceededを確認。初回Sites source commit: `cb2db045e163840447febe8afc50ef3e0039bf94`。
- この文書を追記した版でも公開処理を行います。最新versionとsource commitはget_site / list_site_versionsで確認。未完の公開を成功扱いしないでください。

トークンはこのファイルへ記載しません。checkoutが消えた場合、Sitesスキルを読み、同じIDのget_siteとcreate_source_repository_write_credentialからソースを復元します。

## 定期実行

未設定。createを呼んだ結果 `too_many_active_automations`、有効20件/上限20件。既存タスクの停止や転用は実施していません。入替対象の指示が必要です。

## 初版の方針

実際の在庫が未提供のため、6件のサンプルで検索・詳細を確認できる公開プレビューとします。サンプルへの申込はサーバーでも拒否します。運営者本人の出品下書きをD1、写真をR2に保存する構成です。PREVIEW_OWNER_EMAILを秘密の実行環境値に設定し、プレビュー段階では第三者の書込・情報収集を拒否します。実取引の公開・申込は設定で無効化し、課金は実装しません。10%の参考試算は価格案であり実請求ではありません。

## 今回の検証

- `npm test`: 18件合格（ドメイン11件・実APIハンドラーのSQLite/D1・R2アダプター統合7件）。
- `npm run typecheck`: 合格。
- Sites build helper: ビルド成功。最終パッケージング時にも最新CSSをビルド。
- ローカルD1: drizzle/0000_thick_blockbuster.sqlを適用、9コマンド成功。
- ブラウザー: デスクトップ表示、検索で6件→1件、詳細のサンプル購入不可、お気に入りの保存/絞込、Escape閉じる、無料商品絞込、一般閲覧者への出品フォーム非表示、30007円→手数料3000円/受取27007円を確認。横方向のページはみ出しなし。
- 本番URLの匿名閲覧成功、本番D1のlistings/photos/requestsの3テーブル作成をnative readで確認。
- 実際のChatGPT認証後の本番D1/R2書込、複数実アカウントのE2E、スマートフォン実機は未検証。決済は未実装。ローカルadapterテストを本番E2E成功と言い換えないでください。
- コードレビューで売り手の予約取消漏れを修正し、競合承認が200/409で一件だけ予約されることを確認。
- プレビューの写真は運営者限定。ファイル検査は3MB制限・形式シグネチャまでで、完全デコード/EXIF除去は後続。

## 次回

1. 公開状態・source・GitHub投稿・定期実行の実際の状態を確認。
2. 初回の未完事項と検証限界を解消。
3. ROADMAPのP1から、下書き編集/削除・通報/管理・受渡確認など最も重要な一項目を実装。
4. 実物出品と運営者情報が未提供なら偽のデータを補わず、ソフトウェア開発を続ける。

## 2026-11-25 セキュリティ改善

出品/申込上限を原子的に修正し、HTTP防御を統一。自動テスト24件・型検査・Sites build成功。詳細と未検証項目はSECURITY_REVIEW_2026-11-25.md参照。GitHubとSitesの最新反映状況は各サービスのhead/versionで確認してください。
