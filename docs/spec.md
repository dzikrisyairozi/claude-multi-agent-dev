# ファイル管理AIエージェント 仕様書 v1.0

## 0. エグゼクティブサマリー

チャットUIを入口に、ドラッグ&ドロップで投入された様々なファイルを自動仕分け・メタデータ付与・検索性向上・アクセス制御まで行い、Google Driveへ最適配置する「ファイル管理AIエージェント」の仕様。
将来的に Slack / LINE からも同等操作を可能にし、n8n を活用した低コードなオーケストレーションで素早い開発・運用を実現します。

> ひとことで言うと：「投げたファイルが“あとで探せるファイル”になる」エージェントです。

---

## 1. 目的・ゴール

* **目的**: ユーザがファイルを投げ入れるだけで、AIが中身を理解し、適切に整理・命名・格納・検索・提示まで行う。
* **ビジネスゴール**

  * 書類探しの時間を 50% 以上削減
  * 社内標準のファイル命名・分類ルールを自動適用
  * マルチチャネル（Web → Slack/LINE）で同一体験
---

## 2. スコープ

* **インスコープ（MVP）**

  * WebチャットUI（D&Dアップロード対応）
  * 自動分類・命名・タグ付与（LLM + 規則）
  * Google Drive への自動格納（フォルダ戦略 + カスタムプロパティ）
  * チャットからの自然言語検索 → 候補表示 → 即オープン
  * ベーシックなアクセス制御（ユーザ単位 / ワークスペース単位）
  * n8n によるワークフロー化（監査ログ、通知、失敗時リトライ）
* **アウトスコープ（将来）**

  * DLPポリシーの自動適用・マスキング
  * 電子署名・文書承認フロー
  * 版管理の高度化（差分可視化）

---

## 3. 想定ユーザ / ペルソナ

* **一般社員**: とにかく “投げて検索できればOK”。
* **情報管理担当**: 分類ルール一元化、監査ログ、アクセス権の整合性。
* **管理職**: プロジェクト横断の俯瞰、最新資料の素早い発見。

---

## 4. 主要ユースケース

1. D&Dで契約書PDFを投入 → 「契約種別/相手先/期間」を抽出 → 命名・タグ → 法務/契約 フォルダへ格納 → チャットで「A社の更新間近な契約」を検索。
2. 会議議事録（docx）を投入 → 参加者/日時/要点を抽出 → プロジェクト/日付ベースで格納 → 「昨日の会議の結論は？」に回答。
3. 画像/スキャン（jpeg, png） → OCR → 主要項目抽出 → タグ付与 → 検索対象化。

---

## 5. 機能要件

### 5.1 取り込み

* D&D/ファイル選択、複数同時、最大サイズ（環境設定）
* サポート拡張子: pdf, docx, xlsx, pptx, csv, txt, md, jpg, png, heic, zip（内包テキストは将来）
* 文字コード・OCR（内蔵/外部）

### 5.2 解析・メタデータ抽出

* LLM でタイトル/要約/キーワード/機密度/相手先/日付等を抽出
* 正規表現/ルールエンジン併用（例: 契約書パターン、請求書パターン）
* カスタム辞書（社内固有名詞、案件コード）

### 5.3 分類・命名・格納

* **命名規則（例）**: `<YYYYMMDD>_<DocType>_<ProjectOrCounterparty>_<ShortTitle>_v1`
* **フォルダ戦略**: `/Workspace/<Domain>/<Project>/<DocType>/` または `/Company/<Dept>/...`
* Google Drive **カスタムプロパティ**にメタデータ保存（検索性向上）

### 5.4 検索・推薦

* 自然言語クエリ → **メタデータ + ベクトル検索**（RRF等で統合）
* 「直近」「担当者」「未読」「期限」等のフィルタ
* 候補のプレビュー/即オープン（Drive 直リンク）

### 5.5 チャット体験

* WebUI での対話（Next.js + shadcn/ui 前提）
* スラッシュコマンド風補助（`/upload`, `/find`, `/pin` など）
* 結果カード: タイトル、要約、タグ、アクション（開く/共有/ピン）

### 5.6 権限/共有

* ワークスペース（テナント）分離
* ユーザ/ロール（管理者, 編集, 閲覧）
* Drive 側 ACL と同期（最小権限）

### 5.7 ログ/監査

* 取り込み/分類/閲覧/検索/ダウンロード/共有のイベントログ
* n8n で Slack 通知（失敗/要レビュー）

---

## 6. 非機能要件

* **可用性**: 99.9%（営業時間帯）
* **パフォーマンス**: 1件あたり平均 5–10 秒で初期分類（並列処理前提）
* **セキュリティ**: OAuth2/OIDC, TLS1.2+, PII最小化、秘密管理（Vault/SSM）
* **拡張性**: コネクタ追加（Slack/LINE/Box/Dropbox など）
* **運用**: 監視（メトリクス/ログ/アラート）、ワークフロー可視化（n8n）

---

## 7. システム構成（MVP）

* **フロント**: Next.js (App Router) + shadcn/ui + Dropzone
* **API**: FastAPI or Node(Express)（どちらでも可）
* **ワーカー**: 取り込み/解析/ベクトル化/Drive格納
* **メタDB**: MySQL 8 or PostgreSQL（テナント・メタデータ・ジョブ）
* **ベクトルDB**: Qdrant / Weaviate / pgvector（いずれか）
* **ストレージ**: 一時S3互換（アップロード一次保管）
* **外部**: Google Drive API, OAuth2, n8n（ワークフロー）

```
[Web UI] → [API] → [Queue] → [Worker] → (LLM/OCR) → [Vector DB]
                                    ↘ → [Google Drive] (格納/ACL/プロパティ)
```

---

## 8. データモデル（サマリ）

* **files**: id, tenant_id, drive_file_id, name, mime, size, checksum, created_at
* **file_metadata**: file_id, title, summary, keywords[], doc_type, project, counterparty, date, sensitivity, custom_json
* **embeddings**: file_id, chunk_id, vector, text, page, section
* **events**: id, type, actor_id, file_id, payload_json, created_at
* **users**: id, tenant_id, role, oauth_provider, oauth_sub, email
* **tenants**: id, plan, settings_json

> 設計ポリシー: 将来の柔軟性を優先し、FKは最小限（運用ポリシーで整合性担保）。

---

## 9. 分類/命名ロジック（抜粋）

1. LLM による**候補生成**（タイトル/要約/タグ/DocType）
2. ルールエンジンで**確定**（優先度: ルール > LLM）
3. 命名テンプレートへ埋め込み & 重複回避（suffix自動採番）
4. Google Drive へ移動 + カスタムプロパティ保存

**DocTypeの例**: 契約, 請求書, 見積, 会議録, 仕様書, 企画書, 技術資料, 設計図, 画像, その他

---

## 10. 検索ロジック

* クエリを **構造化**（時期/相手先/DocType/担当 等を抽出）
* **ベクトル検索**（要旨に強い）と **メタ検索**（絞り込みに強い）を融合
* **RRF**（Reciprocal Rank Fusion）でスコア統合 → 上位N件カード表示

---

## 11. Google Drive 連携

* **認可**: OAuth2（スコープ最小化、token refresh）
* **格納**: 既定のルート配下にテナント別ルートを割当
* **プロパティ**: `app:doc_type, app:project, app:counterparty, app:date, app:keywords` 等
* **リンク**: WebViewLink をチャットカードに埋め込み

---

## 12. n8n を用いた簡略開発

### 12.1 役割

* 取り込み後フック → 監査ログ記録 → 失敗時の**自動リトライ**
* 承認フロー（例: 高機密度=要レビュー → 担当へSlack通知）
* 定期メンテ（孤児ファイル検出、重複検出、期限アラート）

### 12.2 代表ワークフロー（雛形）

1. **Webhook**（API からコール：`/wf/file.ingested`）
2. **Function**（メタ/機密度からルーティング）
3. **Google Drive**（プロパティ更新・移動）
4. **If**（失敗 or 要承認）
5. **Slack**（通知）/ **Email**（バックアップ）
6. **Wait+Retry**（指数バックオフ）
7. **Datastore**（監査イベントを保存）

### 12.3 例：n8n ノード構成（抜粋）

* Trigger: Webhook, Cron
* Apps: Google Drive, Slack, Gmail
* Utility: Function, IF, Switch, Merge, HTTP Request
* Control: Wait, Error Trigger, Set

> ベンダーロックを避けるため、LLM推論は原則API側/ワーカー側で実施。n8n は“つなぐ・見せる・やり直す”。

---

## 13. API（外部/内部）

* `POST /api/files` : アップロード（レスポンスに `upload_id`）
* `POST /api/files/{id}/ingest` : 解析開始（非同期）
* `GET /api/search?q=...&filters=...` : 検索
* `GET /api/files/{id}` : メタ/リンク取得
* `POST /api/chat` : チャット問い合わせ（検索/推薦）
* **Webhook**: `/wf/file.ingested`（n8n 連携用）

**認可**: OAuth2/OIDC（Auth0 など）

---

## 14. セキュリティ/コンプライアンス

* 最小権限（Drive スコープ、アプリ権限）
* PII/機密度タグに応じた共有制限（外部共有の禁止/期限）
* 監査ログの改ざん防止（WORM的保全 or 外部監査保管）
* データ保持/削除ポリシー（Right to be Forgotten）

---

## 15. 運用・監視

* メトリクス: 処理レイテンシ、失敗率、誤分類率、検索CTR
* ログ: 解析エラー、API失敗、Drive API Rate Limit
* アラート: 失敗率>2%/5分, レイテンシ>30秒, トークン期限切れ
* ランブック: n8n から再実行、保留案件の手動承認

---

## 16. UI要件（Web）

* チャット + D&D ドロップゾーン（大きめエリア）
* 結果カード（サムネ/要約/タグ/アクション）
* クイックフィルタ（期間/DocType/担当/相手先）
* ダークモード、i18n（ja/en）

---

## 19. リスクと対応

* Drive API 制限 → バッチ/指数バックオフ、キュー制御
* 誤分類 → 人手レビューUI + 学習ループ（フィードバックで重み付け）
* 権限不整合 → 定期整合性チェック（n8n Cron）

---

## 20. 参考プロンプト（LLM）

**メタ抽出プロンプト（要約）**

```
あなたは社内文書のメタデータ抽出器です。以下を日本語で返す:
- タイトル（最大50字）
- 要約（3文）
- DocType（契約/請求書/見積/会議録/仕様書/企画書/技術資料/設計図/画像/その他）
- 相手先/案件名/日付/キーワード5件
- 機密度（低/中/高）
```
---

## 22. 付録：Slack/LINE 将来拡張

* **Slack**: Slash Command `/find`, Event Subscriptions, OAuth（Bot Token）
* **LINE**: Messaging API, リッチメニューからアップロード誘導、認証はWebへデリゲート
