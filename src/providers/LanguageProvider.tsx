"use client";

import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Language = "en" | "ja";

export type TranslationKey = keyof typeof translations;

export type TranslationFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationFn;
};

const translations = {
  "language.label": {
    en: "Language",
    ja: "言語",
  },
  "language.english": {
    en: "English",
    ja: "英語",
  },
  "language.japanese": {
    en: "Japanese",
    ja: "日本語",
  },
  "app.title": {
    en: "AI File Manager",
    ja: "AIファイルマネージャー",
  },
  "nav.myFiles": {
    en: "My Files",
    ja: "マイファイル",
  },
  "nav.settings": {
    en: "Settings",
    ja: "設定",
  },
  "nav.logout": {
    en: "Logout",
    ja: "ログアウト",
  },
  "sidebar.conversations": {
    en: "Conversations",
    ja: "会話一覧",
  },
  "sidebar.subtitle": {
    en: "Keep track of your AI threads",
    ja: "AIとのスレッドを管理します",
  },
  "sidebar.new": {
    en: "New",
    ja: "新規",
  },
  "sidebar.loading": {
    en: "Loading threads...",
    ja: "スレッドを読み込み中...",
  },
  "sidebar.empty": {
    en: "No conversations yet. Start your first chat!",
    ja: "まだ会話がありません。最初のチャットを始めましょう！",
  },
  "sidebar.untitled": {
    en: "Untitled chat",
    ja: "無題のチャット",
  },
  "chat.loading": {
    en: "Loading...",
    ja: "読み込み中...",
  },
  "chat.thinking": {
    en: "Thinking...",
    ja: "考え中...",
  },
  "chat.empty": {
    en: "No messages yet. Say hi to your copilot!",
    ja: "まだメッセージがありません。コパイロットに挨拶しましょう！",
  },
  "chat.placeholder": {
    en: "Ask about your files or type a command...",
    ja: "ファイルについて質問するか、コマンドを入力してください...",
  },
  "chat.send": {
    en: "Send",
    ja: "送信",
  },
  "chat.stop": {
    en: "Stop",
    ja: "停止",
  },
  "chat.threadsButton": {
    en: "Threads",
    ja: "スレッド",
  },
  "chat.close": {
    en: "Close",
    ja: "閉じる",
  },
  "chat.welcome": {
    en: "Hi there! I'm your AI File Management Assistant.\n\nDrop a file, describe your task, and I'll keep the conversation organized for you.",
    ja: "こんにちは、AIファイル管理アシスタントです。\n\nファイルをアップロードして作業内容を教えてください。会話を整理してお手伝いします。",
  },
  "chat.newChatTitle": {
    en: "New chat",
    ja: "新規チャット",
  },
  "chat.uploadedSummary": {
    en: "Uploading {count} file(s): {files}",
    ja: "{count}件のファイルをアップロード中: {files}",
  },
  "chat.pendingSubmissions": {
    en: "{{count}} Pending Submissions",
    ja: "{{count}}件の保留中の申請",
  },
  "chat.uploadAssistantResponse": {
    en: "Successfully uploaded {count} file(s)!",
    ja: "{count}件のファイルを正常にアップロードしました！",
  },
  "chat.uploadAssistantResponseAllDuplicate": {
    en: "{count} file(s) already exist in your storage — nothing new was uploaded.",
    ja: "{count}件のファイルはすでにストレージに存在しています。新しいファイルはアップロードされませんでした。",
  },
  "chat.uploadAssistantResponseMixed": {
    en: "Uploaded {newCount} new file(s). {dupeCount} file(s) already existed and were skipped.",
    ja: "{newCount}件の新しいファイルをアップロードしました。{dupeCount}件はすでに存在するためスキップされました。",
  },
  "chat.uploadAssistantResponsePartial": {
    en: "{successCount} file(s) uploaded successfully. {failCount} file(s) failed: {failedFiles}",
    ja: "{successCount}件のファイルをアップロードしました。{failCount}件が失敗しました: {failedFiles}",
  },
  "toast.filesUploaded.title": {
    en: "Files uploaded to secure storage",
    ja: "ファイルを安全に保存しました",
  },
  "toast.filesUploaded.description": {
    en: "{count} file(s) uploaded",
    ja: "{count}件のファイルをアップロードしました",
  },
  "toast.duplicateFiles.title": {
    en: "File already exists",
    ja: "ファイルが既に存在します",
  },
  "toast.duplicateFiles.description": {
    en: "{count} file(s) already uploaded before — skipped",
    ja: "{count}件のファイルは以前にアップロード済みのため、スキップされました",
  },
  "toast.fileChunksPrepared.title": {
    en: "File chunks prepared",
    ja: "ファイルの処理が完了しました",
  },
  "toast.fileChunksPrepared.description": {
    en: "{processed} processed, {skipped} skipped",
    ja: "{processed}件を処理、{skipped}件をスキップしました",
  },
  "toast.noDocumentsProcessed": {
    en: "No documents processed",
    ja: "処理されたドキュメントはありません",
  },
  "toast.ragIngestionFailed": {
    en: "RAG ingestion failed",
    ja: "RAG処理に失敗しました",
  },
  "toast.ragIngestionFailed.description": {
    en: "Unable to extract text and create embeddings",
    ja: "テキスト抽出とベクトル化に失敗しました",
  },
  "toast.uploadLoggedError": {
    en: "Unable to log upload",
    ja: "アップロードを記録できませんでした",
  },
  "toast.uploadFailed": {
    en: "Upload failed",
    ja: "アップロードに失敗しました",
  },
  "toast.uploadPartialSuccess": {
    en: "{successCount} success and {failCount} failed",
    ja: "{successCount}件成功、{failCount}件失敗",
  },
  "generic.somethingWrong": {
    en: "Something went wrong.",
    ja: "問題が発生しました。",
  },
  "toast.assistantFailed": {
    en: "Assistant response failed",
    ja: "アシスタントの応答に失敗しました",
  },
  "toast.sendMessageFailed": {
    en: "Unable to send message",
    ja: "メッセージを送信できませんでした",
  },
  "upload.invalidFiles.title": {
    en: "Invalid files",
    ja: "無効なファイル",
  },
  "upload.invalidFiles.description": {
    en: "{count} file(s) exceeded 20MB or have unsupported format",
    ja: "{count}件のファイルが20MBを超過、または非対応の形式です",
  },
  "upload.tooMany.title": {
    en: "Too many files",
    ja: "ファイルが多すぎます",
  },
  "upload.tooMany.description": {
    en: "Maximum 10 files can be uploaded at once",
    ja: "一度にアップロードできるのは最大10件です",
  },
  "upload.dropIdle": {
    en: "Drag & drop files here",
    ja: "ここにファイルをドラッグ＆ドロップ",
  },
  "upload.dropActive": {
    en: "Drop files here",
    ja: "ここにファイルをドロップ",
  },
  "upload.subtitle": {
    en: "or click to browse - Max 20MB per file - Up to 10 files",
    ja: "またはクリックして選択 - 最大20MB/ファイル - 最大10件",
  },
  "upload.supported": {
    en: "Supported: PDF, DOCX, XLSX, PPTX, CSV, TXT, MD, JPG, PNG, HEIC, ZIP",
    ja: "対応形式: PDF, DOCX, XLSX, PPTX, CSV, TXT, MD, JPG, PNG, HEIC, ZIP",
  },
  // Files Page
  "files.header.subtitle": {
    en: "Your chat uploads",
    ja: "チャットアップロード",
  },
  "files.header.title": {
    en: "My Files",
    ja: "マイファイル",
  },
  "files.header.itemCount": {
    en: "{count} Total Item",
    ja: "{count} 件",
  },
  "files.header.itemCountPlural": {
    en: "{count} Total Items",
    ja: "{count} 件",
  },
  "files.header.newFolder": {
    en: "New Folder",
    ja: "新規フォルダ",
  },
  "files.search.placeholder": {
    en: "Search",
    ja: "検索",
  },
  "files.filter.button": {
    en: "Filter",
    ja: "フィルター",
  },
  "files.filter.title": {
    en: "Filters",
    ja: "フィルター",
  },
  "files.filter.clear": {
    en: "Clear all",
    ja: "すべてクリア",
  },
  "files.filter.fileType": {
    en: "File Type",
    ja: "ファイルの種類",
  },
  "files.filter.dateRange": {
    en: "Date Modified",
    ja: "更新日",
  },
  "files.filter.sizeRange": {
    en: "File Size",
    ja: "ファイルサイズ",
  },
  "files.noResults": {
    en: "No files match your search",
    ja: "検索に一致するファイルがありません",
  },
  "files.table.name": {
    en: "Name",
    ja: "名前",
  },
  "files.table.type": {
    en: "Type",
    ja: "種類",
  },
  "files.table.fileFormat": {
    en: "File Format",
    ja: "ファイル形式",
  },
  "files.table.size": {
    en: "Size",
    ja: "サイズ",
  },
  "files.table.modified": {
    en: "Modified",
    ja: "更新日",
  },
  "files.table.lastModified": {
    en: "Last Modified",
    ja: "最終更新日",
  },
  "files.table.actions": {
    en: "Actions",
    ja: "操作",
  },
  "files.loading": {
    en: "Loading...",
    ja: "読み込み中...",
  },
  "files.empty": {
    en: "This folder is empty",
    ja: "このフォルダは空です",
  },
  "files.emptyHint": {
    en: "Please submit through chat to upload files",
    ja: "ファイルをアップロードするには、チャットから送信してください",
  },
  "files.section.folders": {
    en: "Folders List",
    ja: "フォルダ一覧",
  },
  "files.section.files": {
    en: "Files List",
    ja: "ファイル一覧",
  },
  "files.noFolders": {
    en: "No folders",
    ja: "フォルダがありません",
  },
  "files.noFiles": {
    en: "No files",
    ja: "ファイルがありません",
  },
  // Folder
  "folder.type": {
    en: "Folder",
    ja: "フォルダ",
  },
  "folder.menu.view": {
    en: "View",
    ja: "開く",
  },
  "folder.menu.rename": {
    en: "Rename",
    ja: "名前を変更",
  },
  "folder.menu.move": {
    en: "Move",
    ja: "移動",
  },
  "folder.menu.delete": {
    en: "Delete",
    ja: "削除",
  },
  "folder.deleting": {
    en: "Deleting...",
    ja: "削除中...",
  },
  // Selection Toolbar
  "selection.count": {
    en: "{count} selected",
    ja: "{count} 件選択中",
  },
  "selection.clear": {
    en: "Clear selection",
    ja: "選択解除",
  },
  "selection.view": {
    en: "View",
    ja: "開く",
  },
  "selection.open": {
    en: "Open",
    ja: "開く",
  },
  "selection.rename": {
    en: "Rename",
    ja: "名前を変更",
  },
  "selection.move": {
    en: "Move",
    ja: "移動",
  },
  "selection.delete": {
    en: "Delete",
    ja: "削除",
  },
  "selection.delete.confirm": {
    en: "Delete {count} items?",
    ja: "{count}件のアイテムを削除しますか？",
  },
  // Create Folder Dialog
  "folder.create.title": {
    en: "Create New Folder",
    ja: "新規フォルダ作成",
  },
  "folder.create.label": {
    en: "Folder name",
    ja: "フォルダ名",
  },
  "folder.create.placeholder": {
    en: "Enter folder name",
    ja: "フォルダ名を入力",
  },
  "folder.create.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "folder.create.submit": {
    en: "Create",
    ja: "作成",
  },
  "folder.create.submitting": {
    en: "Creating...",
    ja: "作成中...",
  },
  // Move Folder Dialog
  "folder.move.title": {
    en: "Move Folder",
    ja: "フォルダを移動",
  },
  "folder.move.moving": {
    en: 'Moving "{name}"',
    ja: "「{name}」を移動",
  },
  "folder.move.selectDestination": {
    en: "Select destination:",
    ja: "移動先を選択:",
  },
  "folder.move.sectionLabel": {
    en: "My Files",
    ja: "マイファイル",
  },
  "folder.move.root": {
    en: "My Files (Root)",
    ja: "マイファイル (ルート)",
  },
  "folder.move.noFolders": {
    en: "No folders available",
    ja: "利用可能なフォルダがありません",
  },
  "folder.move.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "folder.move.submit": {
    en: "Move Here",
    ja: "ここに移動",
  },
  "folder.move.submitting": {
    en: "Moving...",
    ja: "移動中...",
  },
  // Rename Dialog
  "rename.title": {
    en: "Rename {type}",
    ja: "{type}の名前を変更",
  },
  "rename.label": {
    en: "New name",
    ja: "新しい名前",
  },
  "rename.placeholder": {
    en: "Enter name",
    ja: "名前を入力",
  },
  "rename.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "rename.submit": {
    en: "Rename",
    ja: "変更",
  },
  "rename.submitting": {
    en: "Renaming...",
    ja: "変更中...",
  },
  // Delete confirmations
  "folder.delete.confirm": {
    en: 'Delete "{name}"? Files inside will be moved to the current folder.',
    ja: "「{name}」を削除しますか？中のファイルは現在のフォルダに移動されます。",
  },
  "file.delete.confirm": {
    en: 'Delete "{name}"?',
    ja: "「{name}」を削除しますか？",
  },
  // Delete dialog
  "delete.folder.title": {
    en: "Are you sure you want to delete this folder?",
    ja: "このフォルダを削除してもよろしいですか？",
  },
  "delete.file.title": {
    en: "Are you sure you want to delete this file?",
    ja: "このファイルを削除してもよろしいですか？",
  },
  "delete.body": {
    en: "This will delete {name}",
    ja: "「{name}」を削除します",
  },
  "delete.warning": {
    en: "This action cannot be undone.",
    ja: "この操作は元に戻せません。",
  },
  "delete.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "delete.submit": {
    en: "Delete",
    ja: "削除",
  },
  "delete.submitting": {
    en: "Deleting...",
    ja: "削除中...",
  },
  // File
  "file.type": {
    en: "File",
    ja: "ファイル",
  },
  "file.type.unknown": {
    en: "Unknown",
    ja: "不明",
  },
  "file.menu.open": {
    en: "Open",
    ja: "開く",
  },
  "file.menu.download": {
    en: "Download",
    ja: "ダウンロード",
  },
  "file.menu.rename": {
    en: "Rename",
    ja: "名前を変更",
  },
  "file.menu.move": {
    en: "Move",
    ja: "移動",
  },
  // Toast messages for files
  "toast.fileDeleted": {
    en: "File deleted",
    ja: "ファイルを削除しました",
  },
  "toast.sessionMissing": {
    en: "Missing session token",
    ja: "セッショントークンがありません",
  },
  "toast.deleteFileFailed": {
    en: "Unable to delete file",
    ja: "ファイルを削除できませんでした",
  },
  "toast.fileLinkedToRingi": {
    en: "Cannot delete: this file is attached to the following approval request(s): {ringiTitles}",
    ja: "削除できません。このファイルは以下の稟議書に添付されています：{ringiTitles}",
  },
  // Move Items (bulk move)
  "move.file.title": {
    en: "Move File",
    ja: "ファイルを移動",
  },
  "move.items.title": {
    en: "Move Items",
    ja: "アイテムを移動",
  },
  "move.items.moving": {
    en: "Moving {count} items",
    ja: "{count}件のアイテムを移動",
  },
  // Toast messages for file/folder operations
  "toast.folderRenamed": {
    en: "Folder renamed",
    ja: "フォルダ名を変更しました",
  },
  "toast.folderCreated": {
    en: "Folder created",
    ja: "フォルダを作成しました",
  },
  "toast.folderMoved": {
    en: "Folder moved",
    ja: "フォルダを移動しました",
  },
  "toast.folderDeleted": {
    en: "Folder deleted",
    ja: "フォルダを削除しました",
  },
  "toast.fileRenamed": {
    en: "File renamed",
    ja: "ファイル名を変更しました",
  },
  "toast.fileMoved": {
    en: "File moved",
    ja: "ファイルを移動しました",
  },
  "toast.movedItems": {
    en: "Moved {count} item(s)",
    ja: "{count}件を移動しました",
  },
  "toast.moveItemsFailed": {
    en: "Failed to move items",
    ja: "移動に失敗しました",
  },
  "toast.undo": {
    en: "Undo",
    ja: "元に戻す",
  },
  "toast.downloadFailed": {
    en: "Download failed",
    ja: "ダウンロードに失敗しました",
  },
  // Processing steps
  "chat.processing.receiving": {
    en: "Receiving uploaded document...",
    ja: "ドキュメントを受信中...",
  },
  "chat.processing.extracting": {
    en: "Ingesting the data...",
    ja: "データを取り込み中...",
  },
  // Navigation
  "nav.quickCreate": {
    en: "Quick Create",
    ja: "クイック作成",
  },
  "nav.inbox": {
    en: "Inbox",
    ja: "受信トレイ",
  },
  // Dashboard
  "dashboard.title": {
    en: "Dashboard",
    ja: "ダッシュボード",
  },
  "dashboard.subtitle": {
    en: "Track and manage your submissions",
    ja: "申請の追跡と管理",
  },
  "dashboard.loading": {
    en: "Loading request...",
    ja: "リクエストを読み込み中...",
  },
  "dashboard.noResults": {
    en: "No requests found",
    ja: "リクエストが見つかりません",
  },
  "dashboard.search": {
    en: "Search",
    ja: "検索",
  },
  "dashboard.filter": {
    en: "Filter",
    ja: "フィルター",
  },
  "dashboard.filterOptions": {
    en: "Filter Options",
    ja: "フィルターオプション",
  },
  "dashboard.resetFilters": {
    en: "Reset",
    ja: "リセット",
  },
  "dashboard.selectCategory": {
    en: "All Categories",
    ja: "すべてのカテゴリ",
  },
  "dashboard.selectPriority": {
    en: "All Priorities",
    ja: "すべての優先度",
  },
  "dashboard.selectDepartment": {
    en: "All Departments",
    ja: "すべての部署",
  },
  "dashboard.dateRange": {
    en: "Date Range",
    ja: "日付範囲",
  },
  "dashboard.from": {
    en: "From",
    ja: "開始日",
  },
  "dashboard.to": {
    en: "To",
    ja: "終了日",
  },
  "fields.category": {
    en: "Category",
    ja: "カテゴリ",
  },
  "fields.priority": {
    en: "Priority",
    ja: "優先度",
  },
  "fields.department": {
    en: "Department",
    ja: "部署",
  },
  "dashboard.newSubmission": {
    en: "New Submission",
    ja: "新規申請",
  },
  // Status labels
  "status.all": {
    en: "All",
    ja: "すべて",
  },
  "status.pending": {
    en: "Pending",
    ja: "保留中",
  },
  "status.approved": {
    en: "Approved",
    ja: "承認済み",
  },
  "status.rejected": {
    en: "Rejected",
    ja: "却下",
  },
  "status.needRevision": {
    en: "Need Revision",
    ja: "要修正",
  },
  "status.cancelled": {
    en: "Cancelled",
    ja: "キャンセル",
  },
  "status.draft": {
    en: "Draft",
    ja: "下書き",
  },
  // Approval Request Card
  "approval.vendor": {
    en: "Vendor",
    ja: "ベンダー",
  },
  "approval.amount": {
    en: "Amount",
    ja: "金額",
  },
  "approval.category": {
    en: "Category",
    ja: "カテゴリ",
  },
  "approval.priority": {
    en: "Priority",
    ja: "優先度",
  },
  "approval.description": {
    en: "Description",
    ja: "説明",
  },
  "approval.noDescription": {
    en: "No description provided.",
    ja: "説明がありません。",
  },
  "approval.filesAttached": {
    en: "{count} files attached",
    ja: "{count}件のファイルが添付されています",
  },
  "approval.viewDetails": {
    en: "View Details",
    ja: "詳細を見る",
  },
  // Priority labels
  "priority.low": {
    en: "Low",
    ja: "低",
  },
  "priority.medium": {
    en: "Medium",
    ja: "中",
  },
  "priority.high": {
    en: "High",
    ja: "高",
  },
  "priority.critical": {
    en: "Critical",
    ja: "緊急",
  },
  // Approval Actions
  "action.approve": {
    en: "Approve",
    ja: "承認",
  },
  "action.reject": {
    en: "Reject",
    ja: "却下",
  },
  "action.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "action.approveRequest": {
    en: "Approve Request",
    ja: "リクエストを承認",
  },
  "action.rejectRequest": {
    en: "Reject Request",
    ja: "リクエストを却下",
  },
  "action.approveConfirm": {
    en: "Are you sure you want to approve the following request?",
    ja: "このリクエストを承認しますか？",
  },
  "action.rejectConfirm": {
    en: "Are you sure you want to reject the following request?",
    ja: "このリクエストを却下しますか？",
  },
  "action.commentLabel": {
    en: "Comment",
    ja: "コメント",
  },
  "action.commentOptional": {
    en: "(Optional)",
    ja: "（任意）",
  },
  "action.commentPlaceholder": {
    en: "Enter any comment",
    ja: "コメントを入力してください",
  },
  "action.cannotUndo": {
    en: "This action cannot be undone.",
    ja: "この操作は元に戻せません。",
  },
  "action.rejectReasonRequired": {
    en: "Please provide a reason for rejection",
    ja: "却下の理由を入力してください",
  },
  "action.approveSuccess": {
    en: "Request approved successfully",
    ja: "リクエストが承認されました",
  },
  "action.rejectSuccess": {
    en: "Request rejected successfully",
    ja: "リクエストが却下されました",
  },
  "action.needRevisionSuccess": {
    en: "Revision requested successfully",
    ja: "修正依頼が送信されました",
  },
  "action.needRevisionRequest": {
    en: "Request Revision",
    ja: "修正を依頼",
  },
  "action.needRevisionConfirm": {
    en: "Are you sure you want to request revision for this request? The submitter will need to update and resubmit.",
    ja: "この申請に修正を依頼しますか？申請者は内容を更新して再提出する必要があります。",
  },
  "action.step": {
    en: "Step",
    ja: "ステップ",
  },
  // Submission Dialog
  "submission.title": {
    en: "Submission Request",
    ja: "申請リクエスト",
  },
  "submission.editTitle": {
    en: "Edit Submission",
    ja: "申請を編集",
  },
  "submission.description": {
    en: "Submit a purchase request or Ringi for approval",
    ja: "購入依頼または稟議を承認のために提出",
  },
  "submission.editDescription": {
    en: "Update the details of your submission.",
    ja: "申請の詳細を更新してください。",
  },
  "submission.categoryLabel": {
    en: "Submission Category",
    ja: "申請カテゴリ",
  },
  "submission.titleLabel": {
    en: "Submission Title",
    ja: "申請タイトル",
  },
  "submission.titlePlaceholder": {
    en: "e.g. 20251220_PurchaseRequest_SoftwareLicenses",
    ja: "例: 20251220_購入依頼_ソフトウェアライセンス",
  },
  "submission.titleRequired": {
    en: "Submission Title is required",
    ja: "申請タイトルは必須です",
  },
  "submission.validationError": {
    en: "Please fix the errors before submitting.",
    ja: "送信前にエラーを修正してください。",
  },
  "submission.noRoute.title": {
    en: "No Approval Route Configured",
    ja: "承認ルートが設定されていません",
  },
  "submission.noRoute.description": {
    en: "No approval route matches this submission. Please contact your administrator to configure an approval route before submitting.",
    ja: "この申請に一致する承認ルートがありません。提出前に管理者に承認ルートの設定を依頼してください。",
  },
  // Category options
  "category.purchasing": {
    en: "Purchasing",
    ja: "購入",
  },
  "category.purchasingSub": {
    en: "Service/Goods Purchase",
    ja: "サービス/商品購入",
  },
  "category.contract": {
    en: "Contract",
    ja: "契約",
  },
  "category.contractSub": {
    en: "Legal & Partnerships",
    ja: "法務・パートナーシップ",
  },
  "category.expense": {
    en: "Expense",
    ja: "経費",
  },
  "category.expenseSub": {
    en: "Reimbursements",
    ja: "精算",
  },
  "category.other": {
    en: "Other",
    ja: "その他",
  },
  "category.otherSub": {
    en: "Miscellaneous Requests",
    ja: "その他のリクエスト",
  },
  // Form fields
  "form.priority": {
    en: "Priority",
    ja: "優先度",
  },
  "form.selectPriority": {
    en: "Select Priority",
    ja: "優先度を選択",
  },
  "form.department": {
    en: "Department",
    ja: "部署",
  },
  "form.departmentPlaceholder": {
    en: "Department ABC",
    ja: "部署名",
  },
  "form.departmentRequired": {
    en: "Department is required",
    ja: "部署は必須です",
  },
  "form.itemsServices": {
    en: "Items & Services",
    ja: "商品・サービス",
  },
  "form.itemsServicesSub": {
    en: "Itemized list of products or services",
    ja: "商品またはサービスの明細リスト",
  },
  "form.addItem": {
    en: "Add Item",
    ja: "項目を追加",
  },
  "form.itemName": {
    en: "Item Name",
    ja: "項目名",
  },
  "form.quantity": {
    en: "Qty",
    ja: "数量",
  },
  "form.price": {
    en: "Price",
    ja: "価格",
  },
  "form.itemNamePlaceholder": {
    en: "Item name",
    ja: "項目名",
  },
  "form.itemsMinOne": {
    en: "At least 1 item is required",
    ja: "1件以上の項目が必要です",
  },
  "form.itemNameRequired": {
    en: "Item name is required",
    ja: "項目名は必須です",
  },
  "form.quantityMin": {
    en: "Quantity must be at least 1",
    ja: "数量は1以上である必要があります",
  },
  "form.pricePositive": {
    en: "Price must be positive",
    ja: "価格は正の数である必要があります",
  },
  // Tax
  "tax.enable": {
    en: "ENABLE TAX CALCULATION",
    ja: "税計算を有効にする",
  },
  "tax.enableSub": {
    en: "Check to include VAT/Sales tax in the total",
    ja: "合計に消費税を含める場合はチェック",
  },
  "tax.label": {
    en: "TAX",
    ja: "税金",
  },
  "tax.included": {
    en: "Tax Included",
    ja: "税込",
  },
  "tax.excluded": {
    en: "Tax Excluded",
    ja: "税抜",
  },
  "tax.rate": {
    en: "TAX RATE (%)",
    ja: "税率 (%)",
  },
  "tax.subtotal": {
    en: "Subtotal (Before TAX)",
    ja: "小計（税抜）",
  },
  "tax.amount": {
    en: "TAX Amount ({rate}%)",
    ja: "税額 ({rate}%)",
  },
  "tax.calculatedTotal": {
    en: "Calculated Total",
    ja: "計算合計",
  },
  // Vendor & Payment
  "form.vendorName": {
    en: "Vendor Name",
    ja: "ベンダー名",
  },
  "form.vendorNamePlaceholder": {
    en: "Company Inc.",
    ja: "会社名",
  },
  "form.vendorNameRequired": {
    en: "Vendor Name is required",
    ja: "ベンダー名は必須です",
  },
  "form.paymentScheduleDate": {
    en: "Payment Schedule Date",
    ja: "支払予定日",
  },
  "form.paymentScheduleDateRequired": {
    en: "Payment Schedule Date is required",
    ja: "支払予定日は必須です",
  },
  "form.paymentMethod": {
    en: "Payment Method",
    ja: "支払方法",
  },
  "form.paymentMethodRequired": {
    en: "Payment Method is required",
    ja: "支払方法は必須です",
  },
  "payment.bankTransfer": {
    en: "Bank Transfer",
    ja: "銀行振込",
  },
  "payment.creditCard": {
    en: "Credit Card",
    ja: "クレジットカード",
  },
  "payment.cash": {
    en: "Cash",
    ja: "現金",
  },
  "payment.other": {
    en: "Other",
    ja: "その他",
  },
  // Date & Reason
  "form.requiredByDate": {
    en: "Required by Date",
    ja: "必要日",
  },
  "form.requiredByDateRequired": {
    en: "Required by Date is required",
    ja: "必要日は必須です",
  },
  "form.reasonForPurchase": {
    en: "Reason for Purchase",
    ja: "購入理由",
  },
  "form.reasonForPurchasePlaceholder": {
    en: "Explain why this purchase is necessary...",
    ja: "この購入が必要な理由を説明してください...",
  },
  "form.reasonForPurchaseRequired": {
    en: "Reason for Purchase is required",
    ja: "購入理由は必須です",
  },
  "form.purpose": {
    en: "Purpose",
    ja: "目的",
  },
  "form.purposePlaceholder": {
    en: "Enter Purpose of The Submission",
    ja: "申請の目的を入力",
  },
  "form.purposeRequired": {
    en: "Purpose is required",
    ja: "目的は必須です",
  },
  "form.remarks": {
    en: "Remarks/Additional Notes",
    ja: "備考・追加メモ",
  },
  "form.remarksPlaceholder": {
    en: "Enter Other Context or References",
    ja: "その他のコンテキストや参照を入力",
  },
  // Attachments
  "attachment.title": {
    en: "Attachment File",
    ja: "添付ファイル",
  },
  "attachment.uploading": {
    en: "Uploading files...",
    ja: "ファイルをアップロード中...",
  },
  "attachment.uploadSuccess": {
    en: "Files uploaded successfully",
    ja: "ファイルのアップロードに成功しました",
  },
  "attachment.uploadFailed": {
    en: "Failed to upload files",
    ja: "ファイルのアップロードに失敗しました",
  },
  "attachment.loginRequired": {
    en: "You must be logged in to upload files",
    ja: "ファイルをアップロードするにはログインが必要です",
  },
  // Submit buttons
  "submit.create": {
    en: "Create Submission",
    ja: "申請を作成",
  },
  "submit.update": {
    en: "Update Submission",
    ja: "申請を更新",
  },
  "submit.createSuccess": {
    en: "Submission created successfully",
    ja: "申請が正常に作成されました",
  },
  "submit.updateSuccess": {
    en: "Submission updated successfully",
    ja: "申請が正常に更新されました",
  },
  "submit.createFailed": {
    en: "Failed to create submission",
    ja: "申請の作成に失敗しました",
  },
  "submit.updateFailed": {
    en: "Failed to update submission",
    ja: "申請の更新に失敗しました",
  },
  // Approval Request Detail
  "detail.title": {
    en: "Detail Information",
    ja: "詳細情報",
  },
  "detail.submissionTitle": {
    en: "Submission Title",
    ja: "申請タイトル",
  },
  "detail.priority": {
    en: "Priority",
    ja: "優先度",
  },
  "detail.department": {
    en: "Department",
    ja: "部署",
  },
  "detail.vendorName": {
    en: "Vendor Name",
    ja: "ベンダー名",
  },
  "detail.category": {
    en: "Category",
    ja: "カテゴリ",
  },
  "detail.totalAmount": {
    en: "Total Amount",
    ja: "合計金額",
  },
  "detail.paymentScheduleDate": {
    en: "Payment Schedule Date",
    ja: "支払予定日",
  },
  "detail.paymentMethod": {
    en: "Payment Method",
    ja: "支払方法",
  },
  "detail.requiredByDate": {
    en: "Required by Date",
    ja: "必要日",
  },
  "detail.submittedBy": {
    en: "Submitted By",
    ja: "申請者",
  },
  "detail.reasonForPurchase": {
    en: "Reason for Purchase",
    ja: "購入理由",
  },
  "detail.purpose": {
    en: "Purpose",
    ja: "目的",
  },
  // Validation messages
  "validation.required": {
    en: "Required",
    ja: "必須",
  },
  "validation.amountRequired": {
    en: "Amount is required",
    ja: "金額は必須です",
  },
  "validation.amountPositive": {
    en: "Amount must be positive",
    ja: "金額は正の数である必要があります",
  },
  "validation.categoryRequired": {
    en: "Category is required",
    ja: "カテゴリは必須です",
  },
  "validation.priorityRequired": {
    en: "Priority is required",
    ja: "優先度は必須です",
  },
  // Activity Log Page
  "activityLog.teamTitle": {
    en: "Team Activity Log",
    ja: "チームアクティビティログ",
  },
  "activityLog.teamSubtitle": {
    en: "Track all actions and changes on all team workspace",
    ja: "チームワークスペースのすべてのアクションと変更を追跡",
  },
  "activityLog.myTitle": {
    en: "My Activity Log",
    ja: "マイアクティビティログ",
  },
  "activityLog.mySubtitle": {
    en: "Track all actions and changes on your workspace",
    ja: "あなたのワークスペースのすべてのアクションと変更を追跡",
  },
  "activityLog.search": {
    en: "Search",
    ja: "検索",
  },
  "activityLog.allTypes": {
    en: "All Types",
    ja: "すべてのタイプ",
  },
  "activityLog.allUsers": {
    en: "All Users",
    ja: "すべてのユーザー",
  },
  "activityLog.selected": {
    en: "{count} selected",
    ja: "{count}人選択中",
  },
  "activityLog.filterName": {
    en: "Filter name",
    ja: "名前でフィルター",
  },
  "activityLog.searchEmployee": {
    en: "Search Employee",
    ja: "従業員を検索",
  },
  "activityLog.noUsers": {
    en: "No users found",
    ja: "ユーザーが見つかりません",
  },
  // Date Range Options
  "dateRange.7days": {
    en: "Last 7 days",
    ja: "過去7日間",
  },
  "dateRange.30days": {
    en: "Last 30 days",
    ja: "過去30日間",
  },
  "dateRange.90days": {
    en: "Last 90 days",
    ja: "過去90日間",
  },
  "dateRange.all": {
    en: "All time",
    ja: "すべての期間",
  },
  // Action Types
  "action.upload": {
    en: "Upload",
    ja: "アップロード",
  },
  "action.edited": {
    en: "Edited",
    ja: "編集済み",
  },
  "action.changedRole": {
    en: "Changed Role",
    ja: "役割変更",
  },
  "action.folderCreated": {
    en: "Folder Created",
    ja: "フォルダ作成",
  },
  "action.shared": {
    en: "Shared",
    ja: "共有済み",
  },
  "action.userInvited": {
    en: "User Invited",
    ja: "ユーザー招待",
  },
  "action.userApproved": {
    en: "User Approved",
    ja: "ユーザー承認",
  },
  "action.userRemoved": {
    en: "User Removed",
    ja: "ユーザー削除",
  },
  "action.submission": {
    en: "Submission",
    ja: "申請",
  },
  "action.pending": {
    en: "Pending",
    ja: "保留中",
  },
  // File/Folder Actions
  "action.fileUpload": {
    en: "File Upload",
    ja: "ファイルアップロード",
  },
  "action.fileDelete": {
    en: "File Delete",
    ja: "ファイル削除",
  },
  "action.fileRename": {
    en: "File Rename",
    ja: "ファイル名変更",
  },
  "action.fileMove": {
    en: "File Move",
    ja: "ファイル移動",
  },
  "action.fileShare": {
    en: "File Share",
    ja: "ファイル共有",
  },
  "action.folderCreate": {
    en: "Folder Create",
    ja: "フォルダ作成",
  },
  "action.folderRename": {
    en: "Folder Rename",
    ja: "フォルダ名変更",
  },
  "action.folderDelete": {
    en: "Folder Delete",
    ja: "フォルダ削除",
  },
  "action.folderMove": {
    en: "Folder Move",
    ja: "フォルダ移動",
  },
  "action.userInvite": {
    en: "User Invite",
    ja: "ユーザー招待",
  },
  "action.roleChange": {
    en: "Role Change",
    ja: "役割変更",
  },
  "action.userDelete": {
    en: "User Delete",
    ja: "ユーザー削除",
  },
  "action.submissionApprove": {
    en: "Submission Approve",
    ja: "申請承認",
  },
  "action.submissionReject": {
    en: "Submission Reject",
    ja: "申請却下",
  },
  "action.needRevision": {
    en: "Need Revision",
    ja: "要修正",
  },
  // Stats Cards
  "stats.usersApproved": {
    en: "Users Approved",
    ja: "承認されたユーザー",
  },
  "stats.usersRejected": {
    en: "Users Rejected",
    ja: "却下されたユーザー",
  },
  "stats.filesUploaded": {
    en: "Files Uploaded",
    ja: "アップロードされたファイル",
  },
  "stats.filesDeleted": {
    en: "Files Deleted",
    ja: "削除されたファイル",
  },
  "stats.filesShared": {
    en: "Files Shared",
    ja: "共有されたファイル",
  },
  "stats.approvedSubmissions": {
    en: "Approved Submissions",
    ja: "承認された申請",
  },
  "stats.rejectedSubmissions": {
    en: "Rejected Submissions",
    ja: "却下された申請",
  },
  "stats.pendingSubmissions": {
    en: "Pending Submissions",
    ja: "保留中の申請",
  },
  "stats.needRevisionSubmissions": {
    en: "Need Revisions Submissions",
    ja: "要修正の申請",
  },
  "stats.totalFormSubmissions": {
    en: "Total Form Submissions",
    ja: "フォーム申請合計",
  },
  // Filter Shows Dropdown
  "activityLog.filterShows": {
    en: "Filter Shows",
    ja: "表示フィルター",
  },
  "filterShows.submission": {
    en: "Submission",
    ja: "申請",
  },
  "filterShows.users": {
    en: "Users",
    ja: "ユーザー",
  },
  "filterShows.files": {
    en: "Files",
    ja: "ファイル",
  },
  "activityLog.noActivity": {
    en: "No activity logs found",
    ja: "アクティビティログが見つかりません",
  },
  "activityLog.noActivityDescription": {
    en: "Activity logs will appear here once there are actions to track.",
    ja: "追跡するアクションがあると、アクティビティログがここに表示されます。",
  },
  // Activity Log Action Titles
  "actionTitle.file_upload": {
    en: "File Upload",
    ja: "ファイルアップロード",
  },
  "actionTitle.file_delete": {
    en: "File Deleted",
    ja: "ファイル削除",
  },
  "actionTitle.file_rename": {
    en: "File Renamed",
    ja: "ファイル名変更",
  },
  "actionTitle.file_move": {
    en: "File Moved",
    ja: "ファイル移動",
  },
  "actionTitle.file_share": {
    en: "Shared file",
    ja: "ファイル共有",
  },
  "actionTitle.folder_create": {
    en: "Folder Created",
    ja: "フォルダ作成",
  },
  "actionTitle.folder_rename": {
    en: "Folder Renamed",
    ja: "フォルダ名変更",
  },
  "actionTitle.folder_delete": {
    en: "Folder Deleted",
    ja: "フォルダ削除",
  },
  "actionTitle.folder_move": {
    en: "Folder Moved",
    ja: "フォルダ移動",
  },
  "actionTitle.bulk_move": {
    en: "Bulk Move",
    ja: "一括移動",
  },
  "actionTitle.rag_ingest": {
    en: "Document Ingested",
    ja: "ドキュメント取込",
  },
  "actionTitle.thread_create": {
    en: "Thread Created",
    ja: "スレッド作成",
  },
  "actionTitle.message_insert": {
    en: "Message Sent",
    ja: "メッセージ送信",
  },
  "actionTitle.user_invite": {
    en: "Invited User",
    ja: "ユーザー招待",
  },
  "actionTitle.user_approve": {
    en: "Approved User",
    ja: "ユーザー承認",
  },
  "actionTitle.user_reject": {
    en: "Rejected User",
    ja: "ユーザー却下",
  },
  "actionTitle.user_role_change": {
    en: "Changed Role",
    ja: "役割変更",
  },
  "actionTitle.user_delete": {
    en: "Removed User",
    ja: "ユーザー削除",
  },
  "actionTitle.submission_approve": {
    en: "Approved Submission",
    ja: "申請承認",
  },
  "actionTitle.submission_reject": {
    en: "Rejected Submission",
    ja: "申請却下",
  },
  "actionTitle.submission_need_revision": {
    en: "Requested Revision",
    ja: "修正依頼",
  },
  "actionTitle.submission_step_approve": {
    en: "Step Approved",
    ja: "ステップ承認",
  },
  "actionTitle.submission_step_reject": {
    en: "Step Rejected",
    ja: "ステップ却下",
  },
  "actionTitle.approval_route_create": {
    en: "Approval Route Created",
    ja: "承認ルート作成",
  },
  "actionTitle.approval_route_update": {
    en: "Approval Route Updated",
    ja: "承認ルート更新",
  },
  "actionTitle.approval_route_delete": {
    en: "Approval Route Deleted",
    ja: "承認ルート削除",
  },
  "actionTitle.department_create": {
    en: "Department Created",
    ja: "部署作成",
  },
  "actionTitle.department_update": {
    en: "Department Updated",
    ja: "部署更新",
  },
  "actionTitle.department_delete": {
    en: "Department Deleted",
    ja: "部署削除",
  },
  "actionTitle.position_create": {
    en: "Position Created",
    ja: "役職作成",
  },
  "actionTitle.position_update": {
    en: "Position Updated",
    ja: "役職更新",
  },
  "actionTitle.position_delete": {
    en: "Position Deleted",
    ja: "役職削除",
  },
  "actionTitle.permission_update": {
    en: "Permission Updated",
    ja: "権限更新",
  },
  "actionTitle.submission_resubmit": {
    en: "Resubmitted",
    ja: "再提出",
  },
  "actionTitle.submission_comment": {
    en: "Comment on",
    ja: "コメント",
  },
  "actionTitle.submission_proxy_approve": {
    en: "Proxy Approved",
    ja: "代理承認",
  },
  "actionTitle.submission_reassign_approver": {
    en: "Reassigned Approver",
    ja: "承認者を再割当",
  },
  "actionTitle.knowledge_entry_create": {
    en: "Knowledge Entry Created",
    ja: "ナレッジエントリ作成",
  },
  "actionTitle.knowledge_entry_update": {
    en: "Knowledge Entry Updated",
    ja: "ナレッジエントリ更新",
  },
  "actionTitle.knowledge_entry_delete": {
    en: "Knowledge Entry Deleted",
    ja: "ナレッジエントリ削除",
  },
  "actionTitle.unknown": {
    en: "Unknown Action",
    ja: "不明なアクション",
  },
  "actionTitle.items": {
    en: "items",
    ja: "件",
  },
  // Chat Page
  "chat.greeting": {
    en: "Hi, there",
    ja: "こんにちは",
  },
  "chat.howCanIHelp": {
    en: "How can I help you?",
    ja: "どのようにお手伝いできますか？",
  },
  "chat.createSubmissionFromDocs": {
    en: "Create Submission Request from Documents",
    ja: "ドキュメントから申請リクエストを作成",
  },
  "chat.findApprovalEvidence": {
    en: 'Find Existing Files as "Approval Evidence" on Specific Folder',
    ja: "特定のフォルダ内で「承認エビデンス」としてファイルを検索",
  },
  "chat.reviewSubmissionStatus": {
    en: "Review and Check Submissions Status",
    ja: "申請ステータスの確認とレビュー",
  },
  "chat.removeFile": {
    en: "Remove file",
    ja: "ファイルを削除",
  },
  "chat.attachFile": {
    en: "Attach file",
    ja: "ファイルを添付",
  },
  "chat.createDraft": {
    en: "Create Draft/Submission",
    ja: "下書き/申請を作成",
  },
  // Admin Dashboard
  "admin.dashboard.manageUsers": {
    en: "Manage Users",
    ja: "ユーザー管理",
  },
  "admin.dashboard.users": {
    en: "Users",
    ja: "ユーザー",
  },
  "admin.dashboard.viewEditManageUsers": {
    en: "View, edit, and manage system users",
    ja: "システムユーザーの表示、編集、管理",
  },
  "admin.dashboard.settings": {
    en: "Settings",
    ja: "設定",
  },
  "admin.dashboard.systemContent": {
    en: "System Content",
    ja: "システムコンテンツ",
  },
  "admin.dashboard.configureSettings": {
    en: "Configure system settings (Coming Soon)",
    ja: "システム設定の構成（近日公開）",
  },
  // Admin Users Page
  "admin.users.title": {
    en: "Users",
    ja: "ユーザー",
  },
  "admin.users.subtitle": {
    en: "Manage team members and their roles.",
    ja: "チームメンバーとその役割を管理します。",
  },
  "admin.users.error": {
    en: "Error",
    ja: "エラー",
  },
  "admin.users.failedToLoad": {
    en: "Failed to load users",
    ja: "ユーザーの読み込みに失敗しました",
  },
  // Approval Routes Page
  "approvalRoute.title": {
    en: "Approval Route Configuration",
    ja: "承認ルート設定",
  },
  "approvalRoute.subtitle": {
    en: "Define and manage approval steps based on request criteria.",
    ja: "申請条件に基づいた承認ステップを定義・管理します。",
  },
  "approvalRoute.importCsv": {
    en: "Import from CSV",
    ja: "CSVからインポート",
  },
  "approvalRoute.newRoute": {
    en: "New Route",
    ja: "新規ルート",
  },
  "approvalRoute.failedToLoad": {
    en: "Failed to load approval routes.",
    ja: "承認ルートの読み込みに失敗しました。",
  },
  "approvalRoute.noRouteSelected": {
    en: "No route selected",
    ja: "ルートが選択されていません",
  },
  "approvalRoute.noRouteSelectedDesc": {
    en: "Select a route from the list or create a new one.",
    ja: "リストからルートを選択するか、新規作成してください。",
  },
  // Approval Route List
  "approvalRoute.list.searchPlaceholder": {
    en: "Search routes...",
    ja: "ルートを検索...",
  },
  "approvalRoute.list.noMatch": {
    en: "No routes match your search.",
    ja: "検索に一致するルートがありません。",
  },
  "approvalRoute.list.empty": {
    en: "No approval routes yet.",
    ja: "承認ルートがまだありません。",
  },
  "approvalRoute.list.off": {
    en: "Off",
    ja: "無効",
  },
  "approvalRoute.list.noConditions": {
    en: "No conditions set",
    ja: "条件未設定",
  },
  "approvalRoute.list.forDept": {
    en: "For {depts} Dept",
    ja: "{depts}部門向け",
  },
  // Approval Route Detail Form
  "approvalRoute.form.routeDetails": {
    en: "Route Details",
    ja: "ルート詳細",
  },
  "approvalRoute.form.routeName": {
    en: "Route Name",
    ja: "ルート名",
  },
  "approvalRoute.form.routeNamePlaceholder": {
    en: "e.g. Standard IT Purchase",
    ja: "例: 標準ITシステム購入",
  },
  "approvalRoute.form.routeNameRequired": {
    en: "Route name is required",
    ja: "ルート名は必須です",
  },
  "approvalRoute.form.description": {
    en: "Description (Optional)",
    ja: "説明（任意）",
  },
  "approvalRoute.form.descriptionPlaceholder": {
    en: "Describe when this route should be applied...",
    ja: "このルートを適用する条件を説明してください...",
  },
  "approvalRoute.form.status": {
    en: "Status",
    ja: "ステータス",
  },
  "approvalRoute.form.active": {
    en: "Active",
    ja: "有効",
  },
  "approvalRoute.form.inactive": {
    en: "Inactive",
    ja: "無効",
  },
  "approvalRoute.form.createRoute": {
    en: "Create Route",
    ja: "ルートを作成",
  },
  "approvalRoute.form.saveChanges": {
    en: "Save Changes",
    ja: "変更を保存",
  },
  "approvalRoute.form.createSuccess": {
    en: "Approval route created successfully",
    ja: "承認ルートを作成しました",
  },
  "approvalRoute.form.updateSuccess": {
    en: "Approval route updated successfully",
    ja: "承認ルートを更新しました",
  },
  "approvalRoute.form.createFailed": {
    en: "Failed to create approval route",
    ja: "承認ルートの作成に失敗しました",
  },
  "approvalRoute.form.updateFailed": {
    en: "Failed to update approval route",
    ja: "承認ルートの更新に失敗しました",
  },
  // Approval Route Conditions Editor
  "approvalRoute.conditions.title": {
    en: "Conditions",
    ja: "条件",
  },
  "approvalRoute.conditions.subtitle": {
    en: "Apply this route when the following conditions are met:",
    ja: "以下の条件を満たす場合にこのルートを適用します：",
  },
  "approvalRoute.conditions.department": {
    en: "Department",
    ja: "部門",
  },
  "approvalRoute.conditions.amount": {
    en: "Amount",
    ja: "金額",
  },
  "approvalRoute.conditions.category": {
    en: "Category",
    ja: "カテゴリー",
  },
  "approvalRoute.conditions.is": {
    en: "is",
    ja: "が",
  },
  "approvalRoute.conditions.isNot": {
    en: "is not",
    ja: "でない",
  },
  "approvalRoute.conditions.isGreaterThan": {
    en: "is greater than",
    ja: "より大きい",
  },
  "approvalRoute.conditions.isGreaterThanOrEqual": {
    en: "is greater than or equal to",
    ja: "以上",
  },
  "approvalRoute.conditions.isLessThan": {
    en: "is less than",
    ja: "より小さい",
  },
  "approvalRoute.conditions.isLessThanOrEqual": {
    en: "is less than or equal to",
    ja: "以下",
  },
  "approvalRoute.conditions.warning.impossible": {
    en: "This amount range is impossible — no value can satisfy both conditions.",
    ja: "この金額範囲は不可能です — 両方の条件を満たす値はありません。",
  },
  "approvalRoute.conditions.warning.exactMatch": {
    en: "This range only matches the exact amount. Is this intentional?",
    ja: "この範囲は正確な金額のみに一致します。意図的ですか？",
  },
  "approvalRoute.conditions.purchasing": {
    en: "Purchasing",
    ja: "購買",
  },
  "approvalRoute.conditions.contracts": {
    en: "Contracts",
    ja: "契約",
  },
  "approvalRoute.conditions.expenses": {
    en: "Expenses",
    ja: "経費",
  },
  "approvalRoute.conditions.misc": {
    en: "Misc",
    ja: "その他",
  },
  "approvalRoute.conditions.other": {
    en: "Other",
    ja: "その他",
  },
  "approvalRoute.conditions.if": {
    en: "If",
    ja: "もし",
  },
  "approvalRoute.conditions.and": {
    en: "And",
    ja: "かつ",
  },
  "approvalRoute.conditions.deptPlaceholder": {
    en: "e.g. IT",
    ja: "例: IT",
  },
  "approvalRoute.conditions.noConditions": {
    en: "No conditions set. This route will apply to all requests.",
    ja: "条件が設定されていません。このルートはすべての申請に適用されます。",
  },
  "approvalRoute.conditions.addCondition": {
    en: "Add Condition",
    ja: "条件を追加",
  },
  // Approval Route Steps Editor
  "approvalRoute.steps.title": {
    en: "Approval Steps",
    ja: "承認ステップ",
  },
  "approvalRoute.steps.addStep": {
    en: "Add Step",
    ja: "ステップを追加",
  },
  "approvalRoute.steps.empty": {
    en: "No steps added. Click \"Add Step\" to define the approval chain.",
    ja: "ステップが追加されていません。「ステップを追加」をクリックして承認チェーンを定義してください。",
  },
  "approvalRoute.steps.step": {
    en: "Step {n}",
    ja: "ステップ {n}",
  },
  "approvalRoute.steps.stepName": {
    en: "Step Name",
    ja: "ステップ名",
  },
  "approvalRoute.steps.stepNamePlaceholder": {
    en: "e.g. Manager Approval",
    ja: "例: マネージャー承認",
  },
  "approvalRoute.steps.approverRole": {
    en: "Approver Role",
    ja: "承認者の役割",
  },
  "approvalRoute.steps.selectRole": {
    en: "Select role",
    ja: "役割を選択",
  },
  "approvalRoute.steps.required": {
    en: "Required",
    ja: "必須",
  },
  "approvalRoute.steps.optional": {
    en: "Optional",
    ja: "任意",
  },
  "approvalRoute.steps.approver": {
    en: "Approver",
    ja: "承認者",
  },
  "approvalRoute.steps.accounting": {
    en: "Accounting",
    ja: "経理担当者",
  },
  "approvalRoute.steps.admin": {
    en: "Admin",
    ja: "管理者",
  },
  "approvalRoute.steps.platform_admin": {
    en: "Platform Admin",
    ja: "プラットフォーム管理者",
  },
  "approvalRoute.steps.position": {
    en: "Position",
    ja: "役職",
  },
  "approvalRoute.steps.selectPosition": {
    en: "Select position",
    ja: "役職を選択",
  },
  "approvalRoute.steps.department": {
    en: "Department",
    ja: "部署",
  },
  "approvalRoute.steps.selectDepartment": {
    en: "Select department",
    ja: "部署を選択",
  },
  "approvalRoute.steps.subtitle": {
    en: "Add stages in order. Drag to reorder.",
    ja: "順番にステージを追加してください。ドラッグで並び替えできます。",
  },
  "approvalRoute.steps.assignedType": {
    en: "Assigned Type",
    ja: "割り当てタイプ",
  },
  "approvalRoute.steps.assignee": {
    en: "Assignee",
    ja: "担当者",
  },
  "approvalRoute.steps.byMember": {
    en: "By Member",
    ja: "メンバーで",
  },
  "approvalRoute.steps.bulkAssign": {
    en: "Bulk Assign",
    ja: "一括割り当て",
  },
  "approvalRoute.steps.searchMember": {
    en: "Search by name or department",
    ja: "名前または部署で検索",
  },
  "approvalRoute.steps.selectAll": {
    en: "Select All",
    ja: "全て選択",
  },
  "approvalRoute.steps.deselectAll": {
    en: "Deselect All",
    ja: "全て解除",
  },
  "approvalRoute.steps.maxAssignees": {
    en: "Max 10 members",
    ja: "最大10名まで",
  },
  "approvalRoute.steps.assignmentFilters": {
    en: "Assignment Filters",
    ja: "割り当てフィルター",
  },
  "approvalRoute.steps.addFilter": {
    en: "Add Filter",
    ja: "フィルター追加",
  },
  "approvalRoute.steps.noFilters": {
    en: "No filters added. Click \"Add Filter\" to specify who can approve this step.",
    ja: "フィルターが追加されていません。「フィルター追加」をクリックして承認者を指定してください。",
  },
  "approvalRoute.steps.orAssignMembers": {
    en: "Or assign to specific members",
    ja: "または特定のメンバーに割り当て",
  },
  "approvalRoute.steps.specificMembers": {
    en: "Specific Members",
    ja: "特定のメンバー",
  },
  "approvalRoute.steps.switchToFilters": {
    en: "Switch to filters",
    ja: "フィルターに切り替え",
  },
  "approvalRoute.conditions.conditionLogic": {
    en: "Condition Logic",
    ja: "条件ロジック",
  },
  "approvalRoute.conditions.matchAll": {
    en: "Match all conditions (AND)",
    ja: "全ての条件を満たす (AND)",
  },
  "approvalRoute.conditions.matchAny": {
    en: "Match any condition (OR)",
    ja: "いずれかの条件を満たす (OR)",
  },
  "approvalRoute.conditions.or": {
    en: "Or",
    ja: "または",
  },
  // Approval Route Import CSV
  "approvalRoute.import.title": {
    en: "Import from CSV",
    ja: "CSVからインポート",
  },
  "approvalRoute.import.description": {
    en: "Upload a CSV file to bulk-create approval routes. Download the template to see the expected format.",
    ja: "CSVファイルをアップロードして承認ルートを一括作成します。テンプレートをダウンロードして期待する形式を確認してください。",
  },
  "approvalRoute.import.downloadTemplate": {
    en: "Download Template",
    ja: "テンプレートをダウンロード",
  },
  "approvalRoute.import.uploadLabel": {
    en: "Choose CSV file",
    ja: "CSVファイルを選択",
  },
  "approvalRoute.import.uploadHint": {
    en: "or drag and drop",
    ja: "またはドラッグ＆ドロップ",
  },
  "approvalRoute.import.preview": {
    en: "Preview",
    ja: "プレビュー",
  },
  "approvalRoute.import.routesFound": {
    en: "{n} route(s) found",
    ja: "{n}件のルートが見つかりました",
  },
  "approvalRoute.import.stepsTotal": {
    en: "{n} step(s) total",
    ja: "合計{n}ステップ",
  },
  "approvalRoute.import.importBtn": {
    en: "Import",
    ja: "インポート",
  },
  "approvalRoute.import.importing": {
    en: "Importing {current} / {total}...",
    ja: "{current} / {total} をインポート中...",
  },
  "approvalRoute.import.importSuccess": {
    en: "Successfully imported {n} route(s)",
    ja: "{n}件のルートをインポートしました",
  },
  "approvalRoute.import.importFailed": {
    en: "Failed to import some routes",
    ja: "一部のルートのインポートに失敗しました",
  },
  "approvalRoute.import.parseError": {
    en: "CSV parse errors found",
    ja: "CSVの解析エラーが見つかりました",
  },
  "approvalRoute.import.back": {
    en: "Back",
    ja: "戻る",
  },
  "approvalRoute.import.noFile": {
    en: "No file selected",
    ja: "ファイルが選択されていません",
  },
  "approvalRoute.import.templateFilename": {
    en: "approval_routes_template.csv",
    ja: "approval_routes_template.csv",
  },
  "approvalRoute.import.colRouteName": {
    en: "Route Name",
    ja: "ルート名",
  },
  "approvalRoute.import.colSteps": {
    en: "Steps",
    ja: "ステップ数",
  },
  "approvalRoute.import.colConditions": {
    en: "Conditions",
    ja: "条件",
  },
  "approvalRoute.import.colActive": {
    en: "Active",
    ja: "有効",
  },
  "approvalRoute.import.yes": {
    en: "Yes",
    ja: "はい",
  },
  "approvalRoute.import.no": {
    en: "No",
    ja: "いいえ",
  },
  "approvalRoute.import.noConditions": {
    en: "None",
    ja: "なし",
  },
  // User Table
  "userTable.search": {
    en: "Search",
    ja: "検索",
  },
  "userTable.filter": {
    en: "Filter",
    ja: "フィルター",
  },
  "userTable.filterByRole": {
    en: "Filter by Role",
    ja: "役割でフィルター",
  },
  "userTable.name": {
    en: "Name",
    ja: "名前",
  },
  "userTable.email": {
    en: "Email",
    ja: "メールアドレス",
  },
  "userTable.role": {
    en: "Role",
    ja: "役割",
  },
  "userTable.department": {
    en: "Department",
    ja: "部署",
  },
  "userTable.position": {
    en: "Position",
    ja: "役職",
  },
  "userTable.createdAt": {
    en: "Created At",
    ja: "作成日",
  },
  "userTable.status": {
    en: "Status",
    ja: "ステータス",
  },
  "userTable.noUsersFound": {
    en: "No users found.",
    ja: "ユーザーが見つかりません。",
  },
  "userTable.active": {
    en: "Active",
    ja: "アクティブ",
  },
  "userTable.inactive": {
    en: "Inactive",
    ja: "非アクティブ",
  },
  "userTable.deleteSuccess": {
    en: "User deleted successfully",
    ja: "ユーザーを正常に削除しました",
  },
  "userTable.deleteFailed": {
    en: "Failed to delete user",
    ja: "ユーザーの削除に失敗しました",
  },
  "userTable.resendInvite": {
    en: "Resend invitation email",
    ja: "招待メールを再送信",
  },
  "userTable.resendSuccess": {
    en: "Invitation email resent successfully",
    ja: "招待メールを再送信しました",
  },
  "userTable.resendFailed": {
    en: "Failed to resend invitation",
    ja: "招待メールの再送信に失敗しました",
  },
  "userTable.deleteConfirmTitle": {
    en: "Are you absolutely sure?",
    ja: "本当によろしいですか？",
  },
  "userTable.deleteConfirmDescription": {
    en: "This action cannot be undone. This will permanently delete the user account and remove their data from our servers.",
    ja: "この操作は元に戻せません。ユーザーアカウントが完全に削除され、サーバーからデータが削除されます。",
  },
  "userTable.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "userTable.delete": {
    en: "Delete",
    ja: "削除",
  },
  // User Roles
  "role.platform_admin": {
    en: "Platform Admin",
    ja: "プラットフォーム管理者",
  },
  "role.admin": {
    en: "Admin",
    ja: "管理者",
  },
  "role.approver": {
    en: "Approver",
    ja: "承認者",
  },
  "role.requester": {
    en: "Requester",
    ja: "申請者",
  },
  "role.accounting": {
    en: "Accounting",
    ja: "経理担当",
  },
  // Edit User Sheet
  "editUser.title": {
    en: "Edit User",
    ja: "ユーザーを編集",
  },
  "editUser.description": {
    en: "Make changes to user profile here. Click save when you're done.",
    ja: "ユーザープロフィールを変更します。完了したら保存をクリックしてください。",
  },
  "editUser.firstName": {
    en: "First Name",
    ja: "名",
  },
  "editUser.lastName": {
    en: "Last Name",
    ja: "姓",
  },
  "editUser.role": {
    en: "Role",
    ja: "役割",
  },
  "editUser.selectRole": {
    en: "Select a role",
    ja: "役割を選択",
  },
  "editUser.accountStatus": {
    en: "Account Status",
    ja: "アカウントステータス",
  },
  "editUser.accountActive": {
    en: "User account is active",
    ja: "ユーザーアカウントはアクティブです",
  },
  "editUser.accountInactive": {
    en: "User account is inactive",
    ja: "ユーザーアカウントは非アクティブです",
  },
  "editUser.saveChanges": {
    en: "Save changes",
    ja: "変更を保存",
  },
  "editUser.firstNameRequired": {
    en: "First Name is required",
    ja: "名は必須です",
  },
  "editUser.lastNameRequired": {
    en: "Last Name is required",
    ja: "姓は必須です",
  },
  "editUser.roleRequired": {
    en: "Role is required",
    ja: "役割は必須です",
  },
  "editUser.updateSuccess": {
    en: "User updated successfully",
    ja: "ユーザーを正常に更新しました",
  },
  "editUser.updateFailed": {
    en: "Failed to update user",
    ja: "ユーザーの更新に失敗しました",
  },
  "editUser.firstNamePlaceholder": {
    en: "John",
    ja: "太郎",
  },
  "editUser.lastNamePlaceholder": {
    en: "Doe",
    ja: "山田",
  },
  "editUser.department": {
    en: "Department",
    ja: "部署",
  },
  "editUser.selectDepartment": {
    en: "Select a department",
    ja: "部署を選択",
  },
  "editUser.position": {
    en: "Position",
    ja: "役職",
  },
  "editUser.selectPosition": {
    en: "Select a position",
    ja: "役職を選択",
  },
  "editUser.none": {
    en: "None",
    ja: "なし",
  },
  // Invite User Dialog
  "inviteUser.title": {
    en: "Invite User",
    ja: "ユーザーを招待",
  },
  "inviteUser.description": {
    en: "Send an invitation to a new team member.",
    ja: "新しいチームメンバーに招待状を送信します。",
  },
  "inviteUser.email": {
    en: "Email",
    ja: "メールアドレス",
  },
  "inviteUser.emailPlaceholder": {
    en: "name@example.com",
    ja: "name@example.com",
  },
  "inviteUser.firstName": {
    en: "First Name",
    ja: "名",
  },
  "inviteUser.lastName": {
    en: "Last Name",
    ja: "姓",
  },
  "inviteUser.role": {
    en: "Role",
    ja: "役割",
  },
  "inviteUser.selectRole": {
    en: "Select a role",
    ja: "役割を選択",
  },
  "inviteUser.invite": {
    en: "Invite",
    ja: "招待",
  },
  "inviteUser.inviteButton": {
    en: "Invite User",
    ja: "ユーザーを招待",
  },
  "inviteUser.emailInvalid": {
    en: "Invalid email",
    ja: "無効なメールアドレス",
  },
  "inviteUser.emailRequired": {
    en: "Email is required",
    ja: "メールアドレスは必須です",
  },
  "inviteUser.firstNameRequired": {
    en: "First Name is required",
    ja: "名は必須です",
  },
  "inviteUser.lastNameRequired": {
    en: "Last Name is required",
    ja: "姓は必須です",
  },
  "inviteUser.roleRequired": {
    en: "Role is required",
    ja: "役割は必須です",
  },
  "inviteUser.success": {
    en: "User invited successfully",
    ja: "ユーザーを正常に招待しました",
  },
  "inviteUser.failed": {
    en: "Failed to invite user",
    ja: "ユーザーの招待に失敗しました",
  },
  "inviteUser.firstNamePlaceholder": {
    en: "John",
    ja: "太郎",
  },
  "inviteUser.lastNamePlaceholder": {
    en: "Doe",
    ja: "山田",
  },
  "inviteUser.department": {
    en: "Department",
    ja: "部署",
  },
  "inviteUser.selectDepartment": {
    en: "Select a department",
    ja: "部署を選択",
  },
  "inviteUser.position": {
    en: "Position",
    ja: "役職",
  },
  "inviteUser.selectPosition": {
    en: "Select a position",
    ja: "役職を選択",
  },
  "inviteUser.none": {
    en: "None",
    ja: "なし",
  },
  // Pending Users List
  "pendingUsers.title": {
    en: "Pending Registration",
    ja: "保留中の登録",
  },
  // Approval Request Page
  "approval.details": {
    en: "Details",
    ja: "詳細",
  },
  "approval.files": {
    en: "Files",
    ja: "ファイル",
  },
  "approval.timeline": {
    en: "Timeline",
    ja: "タイムライン",
  },
  "approval.statusLabel": {
    en: "Status: {status}",
    ja: "ステータス: {status}",
  },
  "approval.status.draft": {
    en: "Draft",
    ja: "下書き",
  },
  "approval.status.pending": {
    en: "Pending Approval",
    ja: "承認待ち",
  },
  "approval.status.approved": {
    en: "Approved",
    ja: "承認済み",
  },
  "approval.status.rejected": {
    en: "Rejected",
    ja: "却下",
  },
  "approval.status.need_revision": {
    en: "Need Revision",
    ja: "要修正",
  },
  "approval.status.cancelled": {
    en: "Cancelled",
    ja: "キャンセル済み",
  },
  "timeline.status.needRevisionSource": {
    en: "REVISION REQUIRED",
    ja: "修正要求",
  },
  "approval.waitingManager": {
    en: "Waiting for approver approval",
    ja: "承認者の承認待ち",
  },
  "approval.draftNotSubmitted": {
    en: "This draft has not been submitted yet",
    ja: "この下書きはまだ申請されていません",
  },
  "approval.processedBy": {
    en: "Processed by {name}",
    ja: "{name}によって処理済み",
  },
  "approval.approver": {
    en: "Approver",
    ja: "承認者",
  },
  "approval.attachedFiles.title": {
    en: "Attached Files",
    ja: "添付ファイル",
  },
  "approval.noFiles": {
    en: "No files attached.",
    ja: "添付ファイルはありません。",
  },
  "approval.timeline.title": {
    en: "Approval Timeline",
    ja: "承認タイムライン",
  },
  "approval.dashboard": {
    en: "Dashboard",
    ja: "ダッシュボード",
  },
  "approval.error": {
    en: "Error",
    ja: "エラー",
  },
  "approval.notFound": {
    en: "Approval request not found",
    ja: "承認リクエストが見つかりません",
  },
  "pendingUsers.name": {
    en: "Name",
    ja: "名前",
  },
  "pendingUsers.email": {
    en: "Email",
    ja: "メールアドレス",
  },
  "pendingUsers.requestedDate": {
    en: "Requested Date",
    ja: "申請日",
  },
  "pendingUsers.approve": {
    en: "Approve",
    ja: "承認",
  },
  "pendingUsers.reject": {
    en: "Reject",
    ja: "却下",
  },
  "pendingUsers.approveSuccess": {
    en: "User approved successfully",
    ja: "ユーザーを正常に承認しました",
  },
  "pendingUsers.approveFailed": {
    en: "Failed to approve user",
    ja: "ユーザーの承認に失敗しました",
  },
  "pendingUsers.rejectSuccess": {
    en: "User rejected successfully",
    ja: "ユーザーを正常に却下しました",
  },
  "pendingUsers.rejectFailed": {
    en: "Failed to reject user",
    ja: "ユーザーの却下に失敗しました",
  },
  "pendingUsers.resend": {
    en: "Resend",
    ja: "再送信",
  },
  "pendingUsers.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "pendingUsers.rejectConfirmTitle": {
    en: "Reject this user?",
    ja: "このユーザーを却下しますか？",
  },
  "pendingUsers.rejectConfirmDescription": {
    en: "This user will be rejected and will not be able to access the system. This action can be reversed by an administrator.",
    ja: "このユーザーは却下され、システムにアクセスできなくなります。管理者によって取り消すことができます。",
  },
  "pendingUsers.resendConfirmTitle": {
    en: "Resend invitation?",
    ja: "招待メールを再送信しますか？",
  },
  "pendingUsers.resendConfirmDescription": {
    en: "A new invitation email will be sent to this user. The previous invitation will be invalidated.",
    ja: "新しい招待メールがこのユーザーに送信されます。以前の招待は無効になります。",
  },
  "pendingUsers.approveDialogTitle": {
    en: "Approve User",
    ja: "ユーザーを承認",
  },
  "pendingUsers.approveDialogDescription": {
    en: "Set the role and assignment for this user before approving.",
    ja: "承認前にこのユーザーの役割と所属を設定してください。",
  },
  // Submission Dialog
  "submission.title.new": {
    en: "Submission Request",
    ja: "新規申請",
  },
  "submission.title.edit": {
    en: "Edit Submission",
    ja: "申請を編集",
  },
  "submission.description.new": {
    en: "Submit a purchase request or Ringi for approval",
    ja: "購入依頼や稟議を申請します",
  },
  "submission.description.edit": {
    en: "Update the details of your submission.",
    ja: "申請内容を更新します。",
  },
  "submission.category.label": {
    en: "Submission Category",
    ja: "申請カテゴリ",
  },
  "submission.category.purchasing": {
    en: "Purchasing",
    ja: "購買",
  },
  "submission.category.purchasing.sub": {
    en: "Service/Goods Purchase",
    ja: "サービス・物品購入",
  },
  "submission.category.contract": {
    en: "Contract",
    ja: "契約",
  },
  "submission.category.contract.sub": {
    en: "Legal & Partnerships",
    ja: "法務・提携",
  },
  "submission.category.expense": {
    en: "Expense",
    ja: "経費",
  },
  "submission.category.expense.sub": {
    en: "Reimbursements",
    ja: "経費精算",
  },
  "submission.category.other": {
    en: "Other",
    ja: "その他",
  },
  "submission.category.other.sub": {
    en: "Miscellaneous Requests",
    ja: "その他の依頼",
  },
  "submission.field.subCategory": {
    en: "Sub-Category",
    ja: "サブカテゴリ",
  },
  "submission.field.subCategory.placeholder": {
    en: "Select sub-category (optional)",
    ja: "サブカテゴリを選択（任意）",
  },
  "submission.field.title": {
    en: "Submission Title",
    ja: "件名",
  },
  "submission.field.title.placeholder": {
    en: "e.g. 20251220_PurchaseRequest_SoftwareLicenses",
    ja: "例: 20251220_ソフトウェアライセンス購入依頼",
  },
  "submission.field.priority": {
    en: "Priority",
    ja: "優先度",
  },
  "submission.field.priority.placeholder": {
    en: "Select Priority",
    ja: "優先度を選択",
  },
  "submission.field.department": {
    en: "Department",
    ja: "部署",
  },
  "submission.field.department.placeholder": {
    en: "Select a department",
    ja: "部署を選択",
  },
  "submission.items.label": {
    en: "Items & Services",
    ja: "品目・サービス",
  },
  "submission.items.sublabel": {
    en: "Itemized list of products or services",
    ja: "製品またはサービスの内訳",
  },
  "submission.items.add": {
    en: "Add Item",
    ja: "品目を追加",
  },
  "submission.items.header.name": {
    en: "Item Name",
    ja: "品名",
  },
  "submission.items.header.qty": {
    en: "Qty",
    ja: "数量",
  },
  "submission.items.header.price": {
    en: "Price",
    ja: "単価",
  },
  "submission.items.header.total": {
    en: "Total",
    ja: "合計",
  },
  "submission.items.header.unitPrice": {
    en: "Unit Price",
    ja: "単価",
  },
  "submission.tax.enable": {
    en: "ENABLE TAX CALCULATION",
    ja: "税計算を有効にする",
  },
  "submission.tax.enable.sub": {
    en: "Check to include VAT/Sales tax in the total",
    ja: "合計に消費税を含める場合はチェックしてください",
  },
  "submission.tax.label": {
    en: "TAX",
    ja: "税",
  },
  "submission.tax.included": {
    en: "Tax Included",
    ja: "税込",
  },
  "submission.tax.excluded": {
    en: "Tax Excluded",
    ja: "税抜",
  },
  "submission.tax.rate": {
    en: "TAX RATE (%)",
    ja: "税率 (%)",
  },
  "submission.total.subtotal": {
    en: "Subtotal (Before TAX)",
    ja: "小計 (税抜)",
  },
  "submission.total.taxAmount": {
    en: "TAX Amount",
    ja: "税額",
  },
  "submission.total.calculated": {
    en: "Calculated Total",
    ja: "合計金額",
  },
  "submission.total.grand": {
    en: "Grand Total",
    ja: "総合計",
  },
  "submission.field.vendor": {
    en: "Vendor Name",
    ja: "取引先名",
  },
  "submission.field.vendor.placeholder": {
    en: "Company Inc.",
    ja: "株式会社〇〇",
  },
  "submission.field.paymentDate": {
    en: "Payment Schedule Date",
    ja: "支払予定日",
  },
  "submission.field.paymentMethod": {
    en: "Payment Method",
    ja: "支払方法",
  },
  "submission.field.paymentMethod.placeholder": {
    en: "Bank Transfer",
    ja: "銀行振込",
  },
  "submission.payment.bank": {
    en: "Bank Transfer",
    ja: "銀行振込",
  },
  "submission.payment.credit": {
    en: "Credit Card",
    ja: "クレジットカード",
  },
  "submission.payment.cash": {
    en: "Cash",
    ja: "現金",
  },
  "submission.payment.other": {
    en: "Other",
    ja: "その他",
  },
  "submission.field.requiredDate": {
    en: "Required by Date",
    ja: "希望納期",
  },
  "submission.field.reason": {
    en: "Reason for Purchase",
    ja: "購入理由",
  },
  "submission.field.reason.placeholder": {
    en: "Explain why this purchase is necessary...",
    ja: "購入が必要な理由を説明してください...",
  },
  "submission.field.purpose": {
    en: "Purpose",
    ja: "目的",
  },
  "submission.field.purpose.placeholder": {
    en: "Enter Purpose of The Submission",
    ja: "申請の目的を入力してください",
  },
  "submission.field.remarks": {
    en: "Remarks/Additional Notes",
    ja: "備考",
  },
  "submission.attachment.header": {
    en: "Attachments",
    ja: "添付ファイル",
  },
  "submission.attachment.dropzone": {
    en: "Click to upload or drag and drop",
    ja: "クリックしてアップロード、またはドラッグ＆ドロップ",
  },
  "submission.attachment.maxSize": {
    en: "Max. File Size: 10MB",
    ja: "最大ファイルサイズ: 10MB",
  },
  "submission.attachment.addLink": {
    en: "Add Link",
    ja: "リンクを追加",
  },
  "submission.attachment.pasteLink": {
    en: "Paste link here...",
    ja: "リンクを貼り付けてください...",
  },
  "submission.attachment.add": {
    en: "Add",
    ja: "追加",
  },
  "submission.attachment.chooseFile": {
    en: "Choose File",
    ja: "ファイルを選択",
  },
  "submission.submit.create": {
    en: "Create Submission",
    ja: "申請する",
  },
  "submission.submit.update": {
    en: "Update Submission",
    ja: "更新する",
  },
  "submission.submit.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "submission.submit.saveDraft": {
    en: "Save as Draft",
    ja: "下書き保存",
  },
  "submission.processing.upload": {
    en: "Uploading...",
    ja: "アップロード中...",
  },
  "submission.processing.submit": {
    en: "Submitting...",
    ja: "送信中...",
  },
  "submission.toast.createSuccess": {
    en: "Submission created successfully",
    ja: "申請を作成しました",
  },
  "submission.toast.updateSuccess": {
    en: "Submission updated successfully",
    ja: "申請を更新しました",
  },
  "submission.toast.createError": {
    en: "Failed to create submission",
    ja: "申請の作成に失敗しました",
  },
  "submission.toast.updateError": {
    en: "Failed to update submission",
    ja: "申請の更新に失敗しました",
  },
  "submission.toast.uploadError": {
    en: "Failed to upload files",
    ja: "ファイルのアップロードに失敗しました",
  },
  "submission.toast.loginRequired": {
    en: "You must be logged in to upload files",
    ja: "ファイルをアップロードするにはログインが必要です",
  },
  "submission.toast.uploadSuccess": {
    en: "Files uploaded successfully",
    ja: "ファイルをアップロードしました",
  },
  "submission.toast.draftSaveSuccess": {
    en: "Draft saved successfully",
    ja: "下書きを保存しました",
  },
  "submission.toast.draftSaveError": {
    en: "Failed to save draft",
    ja: "下書きの保存に失敗しました",
  },

  "validation.requiredField": {
    en: "{field} is required",
    ja: "{field}は必須です",
  },
  "validation.positive": {
    en: "{field} must be positive",
    ja: "{field}は正の数である必要があります",
  },
  "table.noItems": {
    en: "No items found.",
    ja: "品目がありません。",
  },
  "timeline.title": {
    en: "Estimated Approval Route",
    ja: "承認ルート（予定）",
  },
  "timeline.description": {
    en: "Automated approval flow based on company policies",
    ja: "社内規定に基づいた自動承認フロー",
  },
  "timeline.step.requester": {
    en: "Requester",
    ja: "申請者",
  },
  "timeline.step.approver": {
    en: "Approver",
    ja: "承認者",
  },
  "timeline.step.accounting": {
    en: "Accounting",
    ja: "経理担当",
  },
  "timeline.status.you": {
    en: "YOU",
    ja: "あなた",
  },
  "timeline.status.pending": {
    en: "PENDING",
    ja: "承認待ち",
  },
  "timeline.status.approved": {
    en: "APPROVED",
    ja: "承認済み",
  },
  "timeline.status.rejected": {
    en: "REJECTED",
    ja: "却下",
  },
  "timeline.status.needRevision": {
    en: "NEED REVISION",
    ja: "修正待ち",
  },
  "timeline.status.cancelled": {
    en: "CANCELLED",
    ja: "キャンセル",
  },
  "timeline.status.skipped": {
    en: "SKIPPED",
    ja: "スキップ",
  },
  "timeline.status.draft": {
    en: "DRAFT",
    ja: "下書き",
  },
  "timeline.status.completed": {
    en: "COMPLETED",
    ja: "完了",
  },
  "timeline.activityLog.title": {
    en: "Activity Log",
    ja: "アクティビティログ",
  },
  "timeline.activityLog.empty": {
    en: "No activity recorded yet",
    ja: "まだアクティビティがありません",
  },
  "timeline.activityLog.changesInRevision": {
    en: "Changes in this revision",
    ja: "この修正における変更点",
  },
  "timeline.action.submitted": {
    en: "SUBMITTED",
    ja: "提出済み",
  },
  "timeline.action.approved": {
    en: "COMPLETED",
    ja: "承認済み",
  },
  "timeline.action.rejected": {
    en: "REJECTED",
    ja: "却下",
  },
  "timeline.action.sentBack": {
    en: "SENT BACK",
    ja: "差戻し",
  },
  "approval.needRevision.title": {
    en: "Need Revision",
    ja: "修正が必要",
  },
  "approval.needRevision.description": {
    en: "This submission requires revisions based on the {name} feedback.",
    ja: "この申請は{name}のフィードバックに基づき修正が必要です。",
  },
  "approval.needRevision.resubmit": {
    en: "Resubmit",
    ja: "再提出",
  },
  "approval.needRevision.revise": {
    en: "Revise",
    ja: "修正する",
  },
  "approval.needRevision.commentFrom": {
    en: "Comment from {name}",
    ja: "{name}からのコメント",
  },
  "approval.needRevision.restartFromFirst": {
    en: "Restart approval from step 1",
    ja: "承認をステップ1からやり直す",
  },
  "approval.needRevision.replyComment": {
    en: "Reply Comment",
    ja: "返信する",
  },
  "approval.needRevision.revisionComment": {
    en: "Revision Comment",
    ja: "修正コメント",
  },
  "timeline.action.resubmitted": {
    en: "RESUBMITTED",
    ja: "再提出",
  },
  "timeline.action.comment": {
    en: "COMMENT",
    ja: "コメント",
  },
  "notifications.title": {
    en: "Notifications",
    ja: "通知",
  },
  "notifications.markAllRead": {
    en: "Mark all as read",
    ja: "すべて既読にする",
  },
  "notifications.all": {
    en: "All",
    ja: "すべて",
  },
  "notifications.unread": {
    en: "Unread",
    ja: "未読",
  },
  "notifications.needsAction": {
    en: "Needs Action",
    ja: "要対応",
  },
  "notifications.viewDetails": {
    en: "View Details",
    ja: "詳細を表示",
  },
  "notifications.empty": {
    en: "No notifications",
    ja: "通知はありません",
  },
  // Departments Page
  "departments.title": {
    en: "Departments",
    ja: "部署",
  },
  "departments.subtitle": {
    en: "Manage departments in your organization.",
    ja: "組織の部署を管理します。",
  },
  "departments.create": {
    en: "Create Department",
    ja: "部署を作成",
  },
  "departments.name": {
    en: "Name",
    ja: "名前",
  },
  "departments.description": {
    en: "Description",
    ja: "説明",
  },
  "departments.status": {
    en: "Status",
    ja: "ステータス",
  },
  "departments.actions": {
    en: "Actions",
    ja: "操作",
  },
  "departments.edit": {
    en: "Edit Department",
    ja: "部署を編集",
  },
  "departments.editDescription": {
    en: "Make changes to the department. Click save when you're done.",
    ja: "部署を変更します。完了したら保存をクリックしてください。",
  },
  "departments.delete": {
    en: "Delete",
    ja: "削除",
  },
  "departments.createSuccess": {
    en: "Department created successfully",
    ja: "部署を正常に作成しました",
  },
  "departments.updateSuccess": {
    en: "Department updated successfully",
    ja: "部署を正常に更新しました",
  },
  "departments.deleteSuccess": {
    en: "Department deleted successfully",
    ja: "部署を正常に削除しました",
  },
  "departments.createFailed": {
    en: "Failed to create department",
    ja: "部署の作成に失敗しました",
  },
  "departments.updateFailed": {
    en: "Failed to update department",
    ja: "部署の更新に失敗しました",
  },
  "departments.deleteFailed": {
    en: "Failed to delete department",
    ja: "部署の削除に失敗しました",
  },
  "departments.confirmDelete": {
    en: "Are you sure you want to delete this department? This action cannot be undone.",
    ja: "この部署を削除してもよろしいですか？この操作は元に戻せません。",
  },
  "departments.confirmDeleteTitle": {
    en: "Delete Department",
    ja: "部署を削除",
  },
  "departments.checkingUsers": {
    en: "Checking for assigned users...",
    ja: "割り当てられたユーザーを確認中...",
  },
  "departments.confirmDeleteWithUsers": {
    en: "This department is currently assigned to {count} user(s). Deleting it will remove the department from those users. This action cannot be undone.",
    ja: "この部署は現在 {count} 人のユーザーに割り当てられています。削除すると、それらのユーザーから部署が解除されます。この操作は元に戻せません。",
  },
  "departments.noResults": {
    en: "No departments found.",
    ja: "部署が見つかりません。",
  },
  "departments.search": {
    en: "Search departments...",
    ja: "部署を検索...",
  },
  "departments.namePlaceholder": {
    en: "e.g. Engineering",
    ja: "例: エンジニアリング",
  },
  "departments.descriptionPlaceholder": {
    en: "Optional description",
    ja: "任意の説明",
  },
  "departments.nameRequired": {
    en: "Department name is required",
    ja: "部署名は必須です",
  },
  "departments.active": {
    en: "Active",
    ja: "アクティブ",
  },
  "departments.inactive": {
    en: "Inactive",
    ja: "非アクティブ",
  },
  "departments.accountStatus": {
    en: "Status",
    ja: "ステータス",
  },
  "departments.statusActive": {
    en: "Department is active",
    ja: "部署はアクティブです",
  },
  "departments.statusInactive": {
    en: "Department is inactive",
    ja: "部署は非アクティブです",
  },
  "departments.saveChanges": {
    en: "Save changes",
    ja: "変更を保存",
  },
  "departments.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "departments.createDialog.title": {
    en: "Create Department",
    ja: "部署を作成",
  },
  "departments.createDialog.description": {
    en: "Add a new department to your organization.",
    ja: "組織に新しい部署を追加します。",
  },
  "departments.error": {
    en: "Error",
    ja: "エラー",
  },
  "departments.failedToLoad": {
    en: "Failed to load departments",
    ja: "部署の読み込みに失敗しました",
  },
  // Positions Page
  "positions.title": {
    en: "Positions",
    ja: "役職",
  },
  "positions.subtitle": {
    en: "Manage positions in your organization.",
    ja: "組織の役職を管理します。",
  },
  "positions.create": {
    en: "Create Position",
    ja: "役職を作成",
  },
  "positions.name": {
    en: "Name",
    ja: "名前",
  },
  "positions.level": {
    en: "Level",
    ja: "レベル",
  },
  "positions.description": {
    en: "Description",
    ja: "説明",
  },
  "positions.status": {
    en: "Status",
    ja: "ステータス",
  },
  "positions.actions": {
    en: "Actions",
    ja: "操作",
  },
  "positions.edit": {
    en: "Edit Position",
    ja: "役職を編集",
  },
  "positions.editDescription": {
    en: "Make changes to the position. Click save when you're done.",
    ja: "役職を変更します。完了したら保存をクリックしてください。",
  },
  "positions.delete": {
    en: "Delete",
    ja: "削除",
  },
  "positions.createSuccess": {
    en: "Position created successfully",
    ja: "役職を正常に作成しました",
  },
  "positions.updateSuccess": {
    en: "Position updated successfully",
    ja: "役職を正常に更新しました",
  },
  "positions.deleteSuccess": {
    en: "Position deleted successfully",
    ja: "役職を正常に削除しました",
  },
  "positions.createFailed": {
    en: "Failed to create position",
    ja: "役職の作成に失敗しました",
  },
  "positions.updateFailed": {
    en: "Failed to update position",
    ja: "役職の更新に失敗しました",
  },
  "positions.deleteFailed": {
    en: "Failed to delete position",
    ja: "役職の削除に失敗しました",
  },
  "positions.confirmDelete": {
    en: "Are you sure you want to delete this position? This action cannot be undone.",
    ja: "この役職を削除してもよろしいですか？この操作は元に戻せません。",
  },
  "positions.confirmDeleteTitle": {
    en: "Delete Position",
    ja: "役職を削除",
  },
  "positions.noResults": {
    en: "No positions found.",
    ja: "役職が見つかりません。",
  },
  "positions.search": {
    en: "Search positions...",
    ja: "役職を検索...",
  },
  "positions.namePlaceholder": {
    en: "e.g. Manager",
    ja: "例: マネージャー",
  },
  "positions.levelPlaceholder": {
    en: "e.g. 1",
    ja: "例: 1",
  },
  "positions.descriptionPlaceholder": {
    en: "Optional description",
    ja: "任意の説明",
  },
  "positions.nameRequired": {
    en: "Position name is required",
    ja: "役職名は必須です",
  },
  "positions.levelRequired": {
    en: "Level is required",
    ja: "レベルは必須です",
  },
  "positions.levelMin": {
    en: "Level must be at least 1",
    ja: "レベルは1以上である必要があります",
  },
  "positions.levelMax": {
    en: "Level must be at most 99",
    ja: "レベルは99以下である必要があります",
  },
  "pagination.showing": {
    en: "Showing {from} to {to} of {total} items",
    ja: "{total}件中 {from}〜{to}件を表示",
  },
  "pagination.previous": {
    en: "Previous",
    ja: "前へ",
  },
  "pagination.next": {
    en: "Next",
    ja: "次へ",
  },
  "positions.active": {
    en: "Active",
    ja: "アクティブ",
  },
  "positions.inactive": {
    en: "Inactive",
    ja: "非アクティブ",
  },
  "positions.accountStatus": {
    en: "Status",
    ja: "ステータス",
  },
  "positions.statusActive": {
    en: "Position is active",
    ja: "役職はアクティブです",
  },
  "positions.statusInactive": {
    en: "Position is inactive",
    ja: "役職は非アクティブです",
  },
  "positions.saveChanges": {
    en: "Save changes",
    ja: "変更を保存",
  },
  "positions.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "positions.createDialog.title": {
    en: "Create Position",
    ja: "役職を作成",
  },
  "positions.createDialog.description": {
    en: "Add a new position to your organization.",
    ja: "組織に新しい役職を追加します。",
  },
  "positions.error": {
    en: "Error",
    ja: "エラー",
  },
  "positions.failedToLoad": {
    en: "Failed to load positions",
    ja: "役職の読み込みに失敗しました",
  },
  "positions.checkingUsers": {
    en: "Checking for assigned users...",
    ja: "割り当てられたユーザーを確認中...",
  },
  "positions.confirmDeleteWithUsers": {
    en: "This position is currently assigned to {count} user(s). Deleting it will remove the position from those users. This action cannot be undone.",
    ja: "この役職は現在 {count} 人のユーザーに割り当てられています。削除すると、それらのユーザーから役職が解除されます。この操作は元に戻せません。",
  },
  // Permissions Page
  "permissions.title": {
    en: "Permission Matrix",
    ja: "権限マトリックス",
  },
  "permissions.subtitle": {
    en: "Configure role-based permissions for each action.",
    ja: "各アクションに対するロールベースの権限を設定します。",
  },
  "permissions.action": {
    en: "Action",
    ja: "アクション",
  },
  "permissions.error": {
    en: "Error",
    ja: "エラー",
  },
  "permissions.failedToLoad": {
    en: "Failed to load permission matrix",
    ja: "権限マトリックスの読み込みに失敗しました",
  },
  "permissions.updateSuccess": {
    en: "Permission updated successfully",
    ja: "権限を更新しました",
  },
  "permissions.updateError": {
    en: "Failed to update permission",
    ja: "権限の更新に失敗しました",
  },
  // Settings Sidebar
  "settings.title": {
    en: "Settings",
    ja: "設定",
  },
  "settings.subtitle": {
    en: "System configuration",
    ja: "システム設定",
  },
  "settings.approvalRoutes": {
    en: "Approval Routes",
    ja: "承認ルート",
  },
  "settings.categoriesType": {
    en: "Categories Type",
    ja: "カテゴリタイプ",
  },
  "settings.securityAudit": {
    en: "Security & Audit",
    ja: "セキュリティ＆監査",
  },
  "settings.notifications": {
    en: "Notifications",
    ja: "通知",
  },
  // Settings Notifications Page
  "settingsNotifications.title": {
    en: "Notifications",
    ja: "通知",
  },
  "settingsNotifications.subtitle": {
    en: "Configure delivery channels, reminders, and escalation rules.",
    ja: "配信チャネル、リマインダー、エスカレーションルールを設定します。",
  },
  "settingsNotifications.deliveryChannels": {
    en: "Delivery Channels",
    ja: "配信チャネル",
  },
  "settingsNotifications.emailNotifications": {
    en: "Email Notifications",
    ja: "メール通知",
  },
  "settingsNotifications.emailNotificationsDesc": {
    en: "Send alerts to user email addresses",
    ja: "ユーザーのメールアドレスにアラートを送信",
  },
  "settingsNotifications.slackDm": {
    en: "Slack DM",
    ja: "Slack DM",
  },
  "settingsNotifications.slackDmDesc": {
    en: "Send direct messages via Slack integration",
    ja: "Slack連携でダイレクトメッセージを送信",
  },
  "settingsNotifications.notificationEvents": {
    en: "Notifications Events",
    ja: "通知イベント",
  },
  "settingsNotifications.event": {
    en: "EVENT",
    ja: "イベント",
  },
  "settingsNotifications.description": {
    en: "DESCRIPTION",
    ja: "説明",
  },
  "settingsNotifications.email": {
    en: "EMAIL",
    ja: "メール",
  },
  "settingsNotifications.slack": {
    en: "SLACK",
    ja: "SLACK",
  },
  "settingsNotifications.newSubmission": {
    en: "New Submission",
    ja: "新規申請",
  },
  "settingsNotifications.newSubmissionDesc": {
    en: "Notify approver when new ringi is submitted",
    ja: "新しい稟議が提出されたら承認者に通知",
  },
  "settingsNotifications.approvalRequired": {
    en: "Approval Required",
    ja: "承認が必要",
  },
  "settingsNotifications.approvalRequiredDesc": {
    en: "Sent to current stage approver",
    ja: "現在のステージの承認者に送信",
  },
  "settingsNotifications.approved": {
    en: "Approved",
    ja: "承認済み",
  },
  "settingsNotifications.approvedDesc": {
    en: "Notify requester when approved",
    ja: "承認されたら申請者に通知",
  },
  "settingsNotifications.sentForRevision": {
    en: "Sent for Revision",
    ja: "差し戻し",
  },
  "settingsNotifications.sentForRevisionDesc": {
    en: "Notify requester with revision notes",
    ja: "修正メモ付きで申請者に通知",
  },
  "settingsNotifications.rejected": {
    en: "Rejected",
    ja: "却下",
  },
  "settingsNotifications.rejectedDesc": {
    en: "Notify requester of rejection reason",
    ja: "却下理由を申請者に通知",
  },
  "settingsNotifications.escalation": {
    en: "Escalation",
    ja: "エスカレーション",
  },
  "settingsNotifications.escalationDesc": {
    en: "Notify admin when approval is overdue",
    ja: "承認が期限超過の場合に管理者に通知",
  },
  "settingsNotifications.remindersEscalation": {
    en: "Reminders & Escalation",
    ja: "リマインダー＆エスカレーション",
  },
  "settingsNotifications.reminder24h": {
    en: "24-hour reminder",
    ja: "24時間リマインダー",
  },
  "settingsNotifications.reminder24hDesc": {
    en: "Send reminder 24h before deadline",
    ja: "締め切りの24時間前にリマインダーを送信",
  },
  "settingsNotifications.reminder72h": {
    en: "72-hour reminder",
    ja: "72時間リマインダー",
  },
  "settingsNotifications.reminder72hDesc": {
    en: "Send reminder 72h before deadline",
    ja: "締め切りの72時間前にリマインダーを送信",
  },
  "settingsNotifications.autoEscalation": {
    en: "Auto-Escalation to Administrator",
    ja: "管理者への自動エスカレーション",
  },
  "settingsNotifications.autoEscalationDesc": {
    en: "Escalate if no action taken within the configured period",
    ja: "設定期間内にアクションがない場合にエスカレーション",
  },
  // Escalation & Proxy Approval
  "status.escalations": {
    en: "Escalations",
    ja: "エスカレーション",
  },
  "escalation.badge": {
    en: "Escalation",
    ja: "エスカレーション",
  },
  "escalation.approvalTimeout": {
    en: "Escalation Approval Timeout",
    ja: "エスカレーション承認タイムアウト",
  },
  "escalation.timeoutMessage": {
    en: "This submission has exceeded the approval window and has been automatically escalated.",
    ja: "この申請は承認期間を超過し、自動的にエスカレーションされました。",
  },
  "escalation.waitingManagerApproval": {
    en: "Waiting for manager approval",
    ja: "管理者の承認待ち",
  },
  "escalation.takeAction": {
    en: "Take Action",
    ja: "アクションを実行",
  },
  "escalation.takeAction.title": {
    en: "Escalation: Approval timeout",
    ja: "エスカレーション：承認タイムアウト",
  },
  "escalation.takeAction.chooseAction": {
    en: "Choose an action",
    ja: "アクションを選択",
  },
  "escalation.originalAssignee": {
    en: "Original Assignee",
    ja: "元の担当者",
  },
  "escalation.noActionSince": {
    en: "No action taken",
    ja: "アクションなし",
  },
  "escalation.proxyApprove": {
    en: "Proxy Approve",
    ja: "代理承認",
  },
  "escalation.proxyApprove.desc": {
    en: "Approve on their behalf",
    ja: "代理として承認",
  },
  "escalation.proxyApprove.actingOnBehalf": {
    en: "Acting on behalf of the original assignee",
    ja: "元の担当者に代わって行動します",
  },
  "escalation.proxyApprove.comment": {
    en: "Proxy Approval Comment",
    ja: "代理承認コメント",
  },
  "escalation.proxyApprove.commentPlaceholder": {
    en: "Approving on behalf of assignee who is currently unavailable",
    ja: "現在不在の担当者に代わって承認します",
  },
  "escalation.proxyApprove.success": {
    en: "Submission approved successfully as proxy approver.",
    ja: "代理承認者として申請が正常に承認されました。",
  },
  "escalation.proxyApprover": {
    en: "Proxy Approver",
    ja: "代理承認者",
  },
  "escalation.reassignApprover": {
    en: "Re-assign Approver",
    ja: "承認者を再割当",
  },
  "escalation.reassignApprover.desc": {
    en: "Route to someone else",
    ja: "他の人にルーティング",
  },
  "escalation.reassign.replaceAt": {
    en: "Replace at current stage",
    ja: "現在のステージで交代",
  },
  "escalation.reassign.newAssignee": {
    en: "New Assignee",
    ja: "新しい担当者",
  },
  "escalation.reassign.pendingSubmission": {
    en: "Pending Submission",
    ja: "保留中の申請",
  },
  "escalation.reassign.reason": {
    en: "Reason for Re-assignment",
    ja: "再割当の理由",
  },
  "escalation.reassign.reasonPlaceholder": {
    en: "Approving on behalf of assignee who is currently unavailable",
    ja: "現在不在の担当者に代わって承認します",
  },
  "escalation.reassign.removing": {
    en: "Removing",
    ja: "解除",
  },
  "escalation.reassign.assigning": {
    en: "Assigning",
    ja: "割当",
  },
  "escalation.reassign.success": {
    en: "Submission approver has been reassigned successfully.",
    ja: "申請の承認者が正常に再割当されました。",
  },
  "escalation.viewSubmissionDetail": {
    en: "View Submission Detail",
    ja: "申請の詳細を表示",
  },
  "escalation.summary": {
    en: "Summary",
    ja: "概要",
  },
  "escalation.summary.submissionTitle": {
    en: "Submission Title",
    ja: "申請タイトル",
  },
  "escalation.summary.action": {
    en: "Action",
    ja: "アクション",
  },
  "escalation.summary.stage": {
    en: "Stage",
    ja: "ステージ",
  },
  "escalation.summary.performedBy": {
    en: "Performed by",
    ja: "実行者",
  },
  "escalation.summary.comment": {
    en: "Comment",
    ja: "コメント",
  },
  "escalation.back": {
    en: "Back",
    ja: "戻る",
  },
  "escalation.next": {
    en: "Next",
    ja: "次へ",
  },
  "escalation.confirm": {
    en: "Confirm",
    ja: "確認",
  },
  "escalation.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "escalation.continue": {
    en: "Continue",
    ja: "続行",
  },
  // Category Types Page
  "categoryTypes.title": {
    en: "Categories Type",
    ja: "カテゴリタイプ",
  },
  "categoryTypes.subtitle": {
    en: "Manage category types for approval requests.",
    ja: "承認申請のカテゴリタイプを管理します。",
  },
  "categoryTypes.name": {
    en: "Category Type Name",
    ja: "カテゴリタイプ名",
  },
  "categoryTypes.maxAmount": {
    en: "Max Amount",
    ja: "上限金額",
  },
  "categoryTypes.attachment": {
    en: "Attachment",
    ja: "添付",
  },
  "categoryTypes.notes": {
    en: "Notes",
    ja: "備考",
  },
  "categoryTypes.addType": {
    en: "Add Type",
    ja: "タイプ追加",
  },
  "categoryTypes.required": {
    en: "Required",
    ja: "必須",
  },
  "categoryTypes.optional": {
    en: "Optional",
    ja: "任意",
  },
  "categoryTypes.nameRequired": {
    en: "Category type name is required",
    ja: "カテゴリタイプ名は必須です",
  },
  "categoryTypes.createSuccess": {
    en: "Category type created successfully",
    ja: "カテゴリタイプを正常に作成しました",
  },
  "categoryTypes.updateSuccess": {
    en: "Category type updated successfully",
    ja: "カテゴリタイプを正常に更新しました",
  },
  "categoryTypes.deleteSuccess": {
    en: "Category type deleted successfully",
    ja: "カテゴリタイプを正常に削除しました",
  },
  "categoryTypes.confirmDeleteTitle": {
    en: "Delete Category Type",
    ja: "カテゴリタイプを削除",
  },
  "categoryTypes.confirmDelete": {
    en: "Are you sure you want to delete this category type? This action cannot be undone.",
    ja: "このカテゴリタイプを削除してもよろしいですか？この操作は元に戻せません。",
  },
  "categoryTypes.cannotDeleteDefault": {
    en: "Cannot delete the default Unspecified type",
    ja: "デフォルトの「未指定」タイプは削除できません",
  },
  "categoryTypes.edit": {
    en: "Edit Category Type",
    ja: "カテゴリタイプを編集",
  },
  "categoryTypes.editDescription": {
    en: "Make changes to the category type. Click save when you're done.",
    ja: "カテゴリタイプを変更します。完了したら保存をクリックしてください。",
  },
  "categoryTypes.contract": {
    en: "Contract",
    ja: "契約",
  },
  "categoryTypes.contractSubtitle": {
    en: "Legal & Partnerships",
    ja: "法務・パートナーシップ",
  },
  "categoryTypes.purchasing": {
    en: "Purchasing",
    ja: "購入",
  },
  "categoryTypes.purchasingSubtitle": {
    en: "Service/Goods Purchase",
    ja: "サービス/商品購入",
  },
  "categoryTypes.expenses": {
    en: "Expenses",
    ja: "経費",
  },
  "categoryTypes.expensesSubtitle": {
    en: "Reimbursements",
    ja: "精算",
  },
  "categoryTypes.other": {
    en: "Other",
    ja: "その他",
  },
  "categoryTypes.otherSubtitle": {
    en: "Miscellaneous",
    ja: "その他",
  },
  "categoryTypes.unlimited": {
    en: "Unlimited",
    ja: "無制限",
  },
  "categoryTypes.createDialog.title": {
    en: "Add Category Type",
    ja: "カテゴリタイプを追加",
  },
  "categoryTypes.createDialog.description": {
    en: "Add a new category type to this group.",
    ja: "このグループに新しいカテゴリタイプを追加します。",
  },
  "categoryTypes.createFailed": {
    en: "Failed to create category type",
    ja: "カテゴリタイプの作成に失敗しました",
  },
  "categoryTypes.updateFailed": {
    en: "Failed to update category type",
    ja: "カテゴリタイプの更新に失敗しました",
  },
  "categoryTypes.deleteFailed": {
    en: "Failed to delete category type",
    ja: "カテゴリタイプの削除に失敗しました",
  },
  "categoryTypes.namePlaceholder": {
    en: "e.g. Software License",
    ja: "例: ソフトウェアライセンス",
  },
  "categoryTypes.maxAmountPlaceholder": {
    en: "e.g. 100000",
    ja: "例: 100000",
  },
  "categoryTypes.notesPlaceholder": {
    en: "Optional notes",
    ja: "任意の備考",
  },
  "categoryTypes.noResults": {
    en: "No category types found.",
    ja: "カテゴリタイプが見つかりません。",
  },
  "categoryTypes.error": {
    en: "Error",
    ja: "エラー",
  },
  "categoryTypes.failedToLoad": {
    en: "Failed to load category types",
    ja: "カテゴリタイプの読み込みに失敗しました",
  },
  "categoryTypes.saveChanges": {
    en: "Save changes",
    ja: "変更を保存",
  },
  "categoryTypes.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "categoryTypes.delete": {
    en: "Delete",
    ja: "削除",
  },
  "categoryTypes.accountStatus": {
    en: "Status",
    ja: "ステータス",
  },
  "categoryTypes.statusActive": {
    en: "Category type is active",
    ja: "カテゴリタイプはアクティブです",
  },
  "categoryTypes.statusInactive": {
    en: "Category type is inactive",
    ja: "カテゴリタイプは非アクティブです",
  },

  // ── Mgapp (AI Support) ──
  "mgapp.greeting": {
    en: "AI Business Support",
    ja: "AI業務サポート",
  },
  "mgapp.howCanIHelp": {
    en: "How can I help you today?",
    ja: "何かお手伝いできることはありますか？",
  },
  "mgapp.placeholder": {
    en: "Ask a question about work procedures...",
    ja: "業務手続きについて質問してください...",
  },
  "mgapp.example.documentRetention": {
    en: "What is the document retention period?",
    ja: "書類の保管期間は？",
  },
  "mgapp.example.cannotConnectKKB": {
    en: "I can't connect to KKB",
    ja: "KKBに接続できません",
  },
  "mgapp.example.ptoApplication": {
    en: "How do I apply for paid time off?",
    ja: "有給休暇の申請方法は？",
  },

  // ── Knowledge Base Admin ──
  "knowledgeBase.title": {
    en: "Knowledge Base",
    ja: "ナレッジベース",
  },
  "knowledgeBase.subtitle": {
    en: "Manage AI support knowledge entries",
    ja: "AIサポートのナレッジエントリを管理",
  },
  "knowledgeBase.search": {
    en: "Search entries...",
    ja: "エントリを検索...",
  },
  "knowledgeBase.category": {
    en: "Category",
    ja: "カテゴリ",
  },
  "knowledgeBase.question": {
    en: "Question",
    ja: "質問",
  },
  "knowledgeBase.answer": {
    en: "Answer",
    ja: "回答",
  },
  "knowledgeBase.solvability": {
    en: "Solvability",
    ja: "AI対応度",
  },
  "knowledgeBase.status": {
    en: "Status",
    ja: "ステータス",
  },
  "knowledgeBase.actions": {
    en: "Actions",
    ja: "操作",
  },
  "knowledgeBase.active": {
    en: "Active",
    ja: "有効",
  },
  "knowledgeBase.inactive": {
    en: "Inactive",
    ja: "無効",
  },
  "knowledgeBase.noResults": {
    en: "No knowledge entries found.",
    ja: "ナレッジエントリが見つかりません。",
  },
  "knowledgeBase.error": {
    en: "Error",
    ja: "エラー",
  },
  "knowledgeBase.failedToLoad": {
    en: "Failed to load knowledge entries",
    ja: "ナレッジエントリの読み込みに失敗しました",
  },
  "knowledgeBase.create": {
    en: "Add Entry",
    ja: "エントリ追加",
  },
  "knowledgeBase.createDialog.title": {
    en: "Add Knowledge Entry",
    ja: "ナレッジエントリの追加",
  },
  "knowledgeBase.createDialog.description": {
    en: "Add a new entry to the knowledge base.",
    ja: "ナレッジベースに新しいエントリを追加します。",
  },
  "knowledgeBase.createSuccess": {
    en: "Knowledge entry created",
    ja: "ナレッジエントリを作成しました",
  },
  "knowledgeBase.createFailed": {
    en: "Failed to create knowledge entry",
    ja: "ナレッジエントリの作成に失敗しました",
  },
  "knowledgeBase.edit": {
    en: "Edit Entry",
    ja: "エントリ編集",
  },
  "knowledgeBase.editDescription": {
    en: "Update the knowledge entry details.",
    ja: "ナレッジエントリの詳細を更新します。",
  },
  "knowledgeBase.updateSuccess": {
    en: "Knowledge entry updated",
    ja: "ナレッジエントリを更新しました",
  },
  "knowledgeBase.updateFailed": {
    en: "Failed to update knowledge entry",
    ja: "ナレッジエントリの更新に失敗しました",
  },
  "knowledgeBase.confirmDeleteTitle": {
    en: "Delete Knowledge Entry",
    ja: "ナレッジエントリの削除",
  },
  "knowledgeBase.confirmDelete": {
    en: "Are you sure you want to delete this knowledge entry? This action cannot be undone.",
    ja: "このナレッジエントリを削除してもよろしいですか？この操作は取り消せません。",
  },
  "knowledgeBase.deleteSuccess": {
    en: "Knowledge entry deleted",
    ja: "ナレッジエントリを削除しました",
  },
  "knowledgeBase.deleteFailed": {
    en: "Failed to delete knowledge entry",
    ja: "ナレッジエントリの削除に失敗しました",
  },
  "knowledgeBase.cancel": {
    en: "Cancel",
    ja: "キャンセル",
  },
  "knowledgeBase.delete": {
    en: "Delete",
    ja: "削除",
  },
  "knowledgeBase.saveChanges": {
    en: "Save changes",
    ja: "変更を保存",
  },
  "knowledgeBase.categoryRequired": {
    en: "Category is required",
    ja: "カテゴリは必須です",
  },
  "knowledgeBase.questionRequired": {
    en: "Question is required",
    ja: "質問は必須です",
  },
  "knowledgeBase.answerRequired": {
    en: "Answer is required",
    ja: "回答は必須です",
  },
  "knowledgeBase.solvabilityRequired": {
    en: "Solvability is required",
    ja: "AI対応度は必須です",
  },
  "knowledgeBase.categoryPlaceholder": {
    en: "Select a category",
    ja: "カテゴリを選択",
  },
  "knowledgeBase.questionPlaceholder": {
    en: "Enter the question",
    ja: "質問を入力",
  },
  "knowledgeBase.answerPlaceholder": {
    en: "Enter the answer",
    ja: "回答を入力",
  },
  "knowledgeBase.routingContact": {
    en: "Contact",
    ja: "担当者",
  },
  "knowledgeBase.routingContactPlaceholder": {
    en: "e.g. Kato-san",
    ja: "例：加藤さん",
  },
  "knowledgeBase.routingChannel": {
    en: "Channel",
    ja: "連絡手段",
  },
  "knowledgeBase.routingChannelPlaceholder": {
    en: "e.g. KKB, Email",
    ja: "例：KKB、メール",
  },
  "knowledgeBase.routingDepartment": {
    en: "Department",
    ja: "部署",
  },
  "knowledgeBase.routingDepartmentPlaceholder": {
    en: "e.g. HR Dept",
    ja: "例：人事部",
  },
  "knowledgeBase.accountStatus": {
    en: "Status",
    ja: "ステータス",
  },
  "knowledgeBase.statusActive": {
    en: "Entry is active",
    ja: "エントリは有効です",
  },
  "knowledgeBase.statusInactive": {
    en: "Entry is inactive",
    ja: "エントリは無効です",
  },
  "knowledgeBase.allCategories": {
    en: "All Categories",
    ja: "全カテゴリ",
  },
  "knowledgeBase.allSolvability": {
    en: "All Solvability",
    ja: "全AI対応度",
  },
  "knowledgeBase.allStatus": {
    en: "All Status",
    ja: "全ステータス",
  },
  "knowledgeBase.filter": {
    en: "Filter",
    ja: "フィルター",
  },
  "knowledgeBase.filterOptions": {
    en: "Filter Options",
    ja: "フィルターオプション",
  },
  "knowledgeBase.resetFilters": {
    en: "Reset",
    ja: "リセット",
  },
} as const;

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

const formatTemplate = (
  template: string,
  vars?: Record<string, string | number>,
) =>
  template.replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars ?? {}, key)
      ? String(vars?.[key])
      : `{${key}}`,
  );

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const stored = localStorage.getItem("language") as Language | null;
    if (stored === "en" || stored === "ja") {
      // SSR-safe: must hydrate as "en" then sync from localStorage in effect
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguageState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language === "ja" ? "ja" : "en";
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("language", language);
    }
  }, [language]);

  const translate = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const entry = translations[key];
      if (!entry) return key;
      const template = entry[language] ?? entry.en ?? key;
      return formatTemplate(template, vars);
    },
    [language],
  );

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next === "ja" ? "ja" : "en");
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translate,
    }),
    [language, setLanguage, translate],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
