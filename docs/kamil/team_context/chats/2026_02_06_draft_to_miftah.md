# Draft Message to Miftah-san — 2026-02-06

## English Version (Reference)

---

@Miftah Farhan

Miftah-san, hello.

I've been studying the Phase 2 spec and reviewing the codebase this week to fully understand the overall picture. I'd like to share a few things and discuss them with you when you have time.

**1. About testing and review**

As I'm getting familiar with the app, I had a few questions about how we plan to verify the current functionality before the next delivery:
- Do we have test scenarios prepared? (e.g., upload many files → can the user retrieve the correct one? Each role's workflow works as intended?)
- Are sample files for testing upload/classification ready?
- When do we plan to review the app together to verify that the current features are working properly?

I'm happy to help with testing if it would be useful — just let me know how you'd like to approach this.

**2. Confirming scope — items from the spec**

While reading the spec (spec.eng.md), I noticed several features described that I'd like to confirm whether they're in the current scope or planned for later:

1. **Approval Routing Engine** — The spec describes multi-step approval routing by amount/department/category with CSV import. Will we implement this? Is the UI/UX design ready for it?
2. **Multi-Step Approval Workflow** — Currently approval is single-step (manager approves directly). The spec describes step-based tracking with multiple approvers. Is this planned? Is it in a future backlog?
3. **Send-Back vs Rejection** — The spec treats these as separate flows (send-back = return for correction, rejection = terminal). Currently the code uses a single `need_revision` status. Do we need to separate them?
4. **Status Model** — The spec defines 7 statuses (draft, submitted, pending per step, sent back, rejected, approved, expired). The current code has 5. Should we align these?
5. **Additional Fields** — The spec mentions budget code, project code, currency, period (start/end date), desired approval date. Are these in scope?
6. **Deadline & Escalation** — The spec requires due dates with 24h/72h reminders and overdue escalation. Is this planned?
7. **Proxy Approval** — The spec describes approval delegation with period/scope/amount limits. Is this in scope for the current phase?
8. **Reporting Dashboard** — The spec requires approval lead time, send-back rate, category breakdown, and CSV export. When is this planned?
9. **PDF Generation** — The spec says a ringi PDF is generated upon completion and stored in S3. Is this in scope?

**3. Notification**

For the notification system — I believe this is being developed this week, is that correct?

**4. How can I best help?**

I'd like to contribute as much as possible. Given what needs to be done and the timeline, please let me know which tasks or areas you'd like me to take on. I'm ready to start on whatever makes the most sense for the project.

Thank you for your time.

---

## Japanese Version (Ready to Send)

---

@Miftah Farhan

Miftahさん、こんにちは。

今週、Phase 2の仕様書とコードベースを詳しく確認して、全体像を把握しました。いくつか共有・相談したいことがありますので、お時間ある時に確認いただければと思います。

**1. テスト・レビューについて**

アプリに慣れてきた中で、次の納品に向けて現在の機能をどのように検証する予定か、いくつか確認したい点があります：
- テストシナリオは準備されていますか？（例：多数のファイルをアップロード → ユーザーが正確に正しいファイルを取得できるか？各ロールのワークフローが意図通り動作するか？）
- アップロード・分類テスト用のサンプルファイルは準備されていますか？
- 現在の機能が正しく動作しているか、一緒にレビューするのはいつ頃の予定でしょうか？

テストに関して何かお手伝いできることがあれば、喜んで対応します。どのように進めるかご指示いただければと思います。

**2. スコープの確認 — 仕様書の項目について**

仕様書（spec.eng.md）を読んでいて、いくつかの機能について現在のスコープに含まれているか、それとも後のフェーズに予定されているか確認したい項目があります：

1. **承認ルートエンジン** — 仕様書では金額・部署・カテゴリによる多段階承認ルーティング（CSV取込対応）が記載されています。これは実装予定でしょうか？UI/UXデザインは準備されていますか？
2. **多段階承認ワークフロー** — 現在は単段階（マネージャーが直接承認）ですが、仕様書ではステップベースの追跡が記載されています。これは予定されていますか？将来のバックログにありますか？
3. **差戻しと却下の区別** — 仕様書ではこれらを別のフローとして扱っています（差戻し＝修正のため返却、却下＝最終状態）。現在のコードでは `need_revision` というステータスで統一されています。これらを分離する必要がありますか？
4. **ステータスモデル** — 仕様書では7つのステータス（下書き、提出済み、承認待ち（ステップごと）、差戻し、却下、承認済み、期限切れ）が定義されています。現在のコードは5つです。合わせるべきでしょうか？
5. **追加フィールド** — 仕様書では予算コード、プロジェクトコード、通貨、期間（開始/終了日）、希望承認日が記載されています。これらはスコープ内でしょうか？
6. **期限とエスカレーション** — 仕様書では期限設定、24時間/72時間前のリマインダー、期限超過時のエスカレーションが求められています。これは予定されていますか？
7. **代理承認** — 仕様書では期間・範囲・金額上限付きの承認委任が記載されています。現フェーズのスコープに含まれていますか？
8. **レポートダッシュボード** — 仕様書では承認リードタイム、差戻し率、カテゴリ別集計、CSV出力が求められています。これはいつ頃予定されていますか？
9. **PDF生成** — 仕様書では完了時に稟議PDFを生成しS3に保存すると記載されています。これはスコープ内でしょうか？

**3. 通知機能について**

通知機能については今週開発予定と認識していますが、合っていますでしょうか？

**4. どのようにお手伝いできますか？**

できる限り貢献したいと思っています。やるべきことやスケジュールを踏まえて、私が担当すべきタスクや領域を教えていただければと思います。プロジェクトにとって最も効果的なことからすぐに着手できます。

よろしくお願いいたします。
