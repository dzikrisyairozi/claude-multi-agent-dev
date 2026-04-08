# Demo Preparation - Actionable Items

> Focus: Two core features solidly working, then ringi.
> Generated: 2026-02-16

---

## Action Summary

- For the upload area "Drag & drop files here," dropping a file should not automatically create a submission
- Create scenarios for AI interactions related to file upload
- Research the draft ringi mechanism
- Implement draft status for ringi
- ~~Document current RAG and Chat System~~ (DONE) -> `docs/kamil/architecture/2026-02-16/ai-chat-and-rag-architecture.md`
- OCR support for scanned/image-based PDFs — currently text extraction returns empty for non-text PDFs
- File deletion orphans embeddings — deleting a document doesn't clean up `document_embeddings`, causing ghost search results
- Duplicate upload handling — uploading the same file twice creates duplicate embeddings and duplicate search results
- Loading/processing states polish — "Receiving -> Extracting -> Auto-filling" steps need smooth skeleton/spinner UX
- Pre-seeded demo data — prepare demo environment with documents already uploaded so search scenarios work immediately
- Submission through AI chat should have required field validations
- Other small bugs
- Document test scenarios solely for AI Chat and File RAG, and a bit related to ringi submission as well (through chat) (Kamil)
- AI Chat and File RAG reliability improvement ideas and implementation (outside tasks that have been mentioned) (Kamil)

---

## Ringkasan Aksi (Bahasa Indonesia)

- Untuk area upload "Drag & drop files here," saat file di-drop seharusnya tidak langsung membuat submission secara otomatis
- Buat skenario untuk interaksi AI terkait upload file
- Riset mekanisme draft ringi
- Implementasi status draft untuk ringi
- ~~Dokumentasi sistem RAG dan Chat saat ini~~ (SELESAI) -> `docs/kamil/architecture/2026-02-16/ai-chat-and-rag-architecture.md`
- Dukungan OCR untuk PDF hasil scan/berbasis gambar — saat ini ekstraksi teks mengembalikan kosong untuk PDF non-teks
- Penghapusan file meninggalkan embeddings orphan — menghapus dokumen tidak membersihkan `document_embeddings`, menyebabkan hasil pencarian hantu
- Penanganan upload duplikat — mengupload file yang sama dua kali membuat embeddings duplikat dan hasil pencarian duplikat
- Perbaikan tampilan loading/processing — langkah "Receiving -> Extracting -> Auto-filling" perlu skeleton/spinner UX yang halus
- Data demo yang sudah disiapkan — siapkan environment demo dengan dokumen yang sudah diupload agar skenario pencarian langsung bisa berjalan
- Submission melalui AI chat harus memiliki validasi field yang wajib diisi
- Bug2 lain kecil-kecil
- Dokumentasi skenario tes khusus untuk AI Chat dan File RAG, serta sedikit terkait Ringi Submission juga (melalui chat) (Kamil)
- Ide perbaikan dan implementasi reliabilitas AI Chat dan File RAG (di luar task yang sudah disebutkan) (Kamil)

---

## アクション概要（日本語）

- アップロードエリア「Drag & drop files here」にファイルをドロップした際、自動的に申請を作成しないようにする
- ファイルアップロードに関連するAIインタラクションのシナリオを作成する
- 稟議のドラフト（下書き）メカニズムを調査する
- 稟議のドラフトステータスを実装する
- ~~現在のRAGおよびチャットシステムのドキュメント作成~~ （完了） -> `docs/kamil/architecture/2026-02-16/ai-chat-and-rag-architecture.md`
- スキャン・画像ベースのPDFに対するOCRサポート — 現在、非テキストPDFではテキスト抽出が空で返される
- ファイル削除時のembeddings孤立問題 — ドキュメントを削除しても`document_embeddings`がクリーンアップされず、ゴースト検索結果が発生する
- 重複アップロードの処理 — 同じファイルを2回アップロードすると、embeddingsと検索結果が重複する
- ローディング／処理状態の改善 — 「Receiving -> Extracting -> Auto-filling」のステップにスムーズなスケルトン/スピナーUXが必要
- デモ用の事前データ準備 — 検索シナリオがすぐに動作するよう、ドキュメントがアップロード済みのデモ環境を準備する
- AIチャット経由の申請に必須フィールドのバリデーションを追加する
- その他の小さなバグ修正
- AIチャットとFile RAGのテストシナリオを文書化し、チャット経由の稟議申請にも少し関連する内容を含める（Kamil）
- AIチャットとFile RAGの信頼性改善のアイデアと実装（上記以外のタスク）（Kamil）

---

## Slack Message

### English

Hi team, @Miftah

As I understand from the recent info, the project is still aimed for demo purposes. For that, the guidance I received is that we will be prioritizing these core areas:

1. **File RAG storage functions correctly**
2. **AI responds appropriately in chat**
3. **Ringi (approval request) submission via chat**

Based on my review of the current codebase, here are the actionable items I'd recommend:

- Fix the upload area ("Drag & drop files here") — dropping a file should not automatically create a submission
- Create scenarios for AI interactions related to file upload
- Research the draft ringi mechanism
- Implement draft status for ringi
- OCR support for scanned/image-based PDFs
- File deletion should clean up orphaned embeddings
- Handle duplicate file uploads
- Polish loading/processing states (Receiving -> Extracting -> Auto-filling)
- Prepare pre-seeded demo data
- Add required field validations for submission through AI chat
- Fix other small bugs
- Document test scenarios for AI Chat, File RAG, and ringi submission through chat (Kamil)
- AI Chat and File RAG reliability improvements and implementation (Kamil)

### 日本語

チームの皆さん、@Miftah

最近の情報によると、プロジェクトは引き続きデモを目的とした段階とのことです。その方針として、以下のコア部分を優先するようガイダンスを受けています：

1. **ファイルRAGストレージが正しく機能すること**
2. **AIがチャットで適切に応答すること**
3. **チャット経由の稟議（承認申請）提出**

現在のコードベースを確認した結果、以下のアクション項目を提案します：

- アップロードエリア（「Drag & drop files here」）の修正 — ファイルをドロップしても自動的に申請を作成しないようにする
- ファイルアップロードに関連するAIインタラクションのシナリオを作成する
- 稟議のドラフト（下書き）メカニズムを調査する
- 稟議のドラフトステータスを実装する
- スキャン・画像ベースのPDFに対するOCRサポート
- ファイル削除時に孤立したembeddingsをクリーンアップする
- 重複ファイルアップロードの処理
- ローディング／処理状態の改善（Receiving -> Extracting -> Auto-filling）
- デモ用の事前データを準備する
- AIチャット経由の申請に必須フィールドのバリデーションを追加する
- その他の小さなバグ修正
- AIチャット、File RAG、チャット経由の稟議申請のテストシナリオを文書化する（Kamil）
- AIチャットとFile RAGの信頼性改善のアイデアと実装（Kamil）

