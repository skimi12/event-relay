# Event Relay セキュリティ改善記録

実施日: 2026-11-25 JST

## 今回の修正

出品30件と受取申込30件/24時間の判定を、INSERT内のSELECT/WHEREへ統合しました。同時保存でも上限を越えず、取り下げまたは期間経過後は正しく再利用できます。認証・所有者認可・申込の重複防止・競合承認の既存制御は維持しています。

HTML/API/認証済み応答を private, no-store にし、既存のVaryとCookieを保持します。nosniff、Referrer-Policy、Permissions-Policyを追加・統一しました。CSPはobject/base/form/frameの用途を制限します。Vinextのインライン起動スクリプトを維持するためscript-src制限は設定しておらず、完全なXSS防御をCSPだけで達成したとは扱いません。既存のより厳しいCSP（写真取得のsandbox等）とReferrer-Policyは保持します。SitesのChatGPT認証と共有範囲は変更しません。

## 検証

- ローカル自動テスト 24 件成功（HTTP応答テスト4件を含む）。
- TypeScript型検査成功。
- 原子的quota、匿名・他人による操作拒否、非公開データ分離などはローカルの実ハンドラーとSQLite/D1アダプターで確認。実利用者の本番書込みによるテストではありません。
- npm auditはレジストリの応答待ちでタイムアウトし、依存関係の既知脆弱性を網羅的に照合できていません。依存関係が安全と保証したものではありません。
- 共有previewが別作業で使用中のため、この変更に対するローカル実ブラウザ検証は未実施。公開結果はSitesの保存版と配備状態を別途確認してください。
- 本番の実利用者データ、課金状態、公開範囲は変更していません。

## 継続時の注意

同時リクエストでの制約はDBの条件付き書込で維持してください。クライアントのボタン無効化や先行COUNTだけに戻さないでください。認証・上限エラーの詳細へSQLや個人情報を含めないでください。機能追加時は認可・未公開情報・異常系のテストを同時に更新してください。

参照: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
