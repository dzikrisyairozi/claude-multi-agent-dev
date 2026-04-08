import {
  ActivityAction,
  ActionFilterOption,
  StatCardConfig,
  StatCategoryConfig,
  DateRange,
  ActivityLogPageConfig,
} from "@/types/activityLog";
import { TranslationKey } from "@/providers/LanguageProvider";
import {
  Upload,
  FileEdit,
  ArrowRightLeft,
  FolderPlus,
  Share2,
  UserPlus,
  CheckCircle,
  XCircle,
  UserMinus,
  Square,
  Trash2,
  FileCheck,
  FileX,
  Clock,
  FileWarning,
} from "lucide-react";

export const GENERAL_ACTION_OPTIONS: ActionFilterOption[] = [
  { value: "file_upload", labelKey: "action.upload", icon: Upload },
  { value: "file_rename", labelKey: "action.edited", icon: FileEdit },
  {
    value: "user_role_change",
    labelKey: "action.changedRole",
    icon: ArrowRightLeft,
  },
  {
    value: "folder_create",
    labelKey: "action.folderCreated",
    icon: FolderPlus,
  },
  { value: "file_share", labelKey: "action.shared", icon: Share2 },
  { value: "user_invite", labelKey: "action.userInvited", icon: UserPlus },
  { value: "user_approve", labelKey: "action.userApproved", icon: CheckCircle },
  { value: "user_reject", labelKey: "action.userRemoved", icon: XCircle },
  {
    value: "user_delete",
    labelKey: "action.userRemoved",
    icon: UserMinus,
    className: "text-red-500",
  },
];

export const SUBMISSION_ACTION_OPTIONS: ActionFilterOption[] = [
  { value: "submission_approve", labelKey: "action.pending", icon: Square },
];

export const DEFAULT_PAGE_SIZE = 10;

export const DATE_RANGE_OPTIONS: {
  value: DateRange;
  labelKey: TranslationKey;
  days: number | null;
}[] = [
  { value: "7days", labelKey: "dateRange.7days", days: 7 },
  { value: "30days", labelKey: "dateRange.30days", days: 30 },
  { value: "90days", labelKey: "dateRange.90days", days: 90 },
  { value: "all", labelKey: "dateRange.all", days: null },
];

export const ACTION_OPTIONS: { value: ActivityAction; labelKey: TranslationKey }[] = [
  { value: "file_upload", labelKey: "action.fileUpload" },
  { value: "file_delete", labelKey: "action.fileDelete" },
  { value: "file_rename", labelKey: "action.fileRename" },
  { value: "file_move", labelKey: "action.fileMove" },
  { value: "file_share", labelKey: "action.fileShare" },
  { value: "folder_create", labelKey: "action.folderCreate" },
  { value: "folder_rename", labelKey: "action.folderRename" },
  { value: "folder_delete", labelKey: "action.folderDelete" },
  { value: "folder_move", labelKey: "action.folderMove" },
  { value: "user_invite", labelKey: "action.userInvite" },
  { value: "user_approve", labelKey: "action.userApproved" },
  { value: "user_reject", labelKey: "action.userRemoved" },
  { value: "user_role_change", labelKey: "action.roleChange" },
  { value: "user_delete", labelKey: "action.userDelete" },
  { value: "submission_approve", labelKey: "action.submissionApprove" },
  { value: "submission_reject", labelKey: "action.submissionReject" },
  { value: "submission_need_revision", labelKey: "action.needRevision" },
];

export function getDateRangeValues(range: DateRange): {
  from?: string;
  to?: string;
} {
  const option = DATE_RANGE_OPTIONS.find((o) => o.value === range);

  if (!option || option.days === null) {
    return {};
  }

  const now = new Date();
  const to = now.toISOString();
  const from = new Date(
    now.getTime() - option.days * 24 * 60 * 60 * 1000,
  ).toISOString();

  return { from, to };
}

// Stat card configurations grouped by category
export const SUBMISSIONS_STATS: StatCardConfig[] = [
  {
    key: "submissions_approved",
    labelKey: "stats.approvedSubmissions",
    icon: FileCheck,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-100",
  },
  {
    key: "submissions_rejected",
    labelKey: "stats.rejectedSubmissions",
    icon: FileX,
    iconColor: "text-red-600",
    iconBgColor: "bg-red-100",
  },
  {
    key: "submissions_pending",
    labelKey: "stats.pendingSubmissions",
    icon: Clock,
    iconColor: "text-orange-600",
    iconBgColor: "bg-orange-100",
  },
  {
    key: "submissions_need_revision",
    labelKey: "stats.needRevisionSubmissions",
    icon: FileWarning,
    iconColor: "text-yellow-600",
    iconBgColor: "bg-yellow-100",
  },
];

export const USERS_STATS: StatCardConfig[] = [
  {
    key: "users_approved",
    labelKey: "stats.usersApproved",
    icon: CheckCircle,
    iconColor: "text-green-600",
    iconBgColor: "bg-green-100",
  },
  {
    key: "users_rejected",
    labelKey: "stats.usersRejected",
    icon: XCircle,
    iconColor: "text-red-600",
    iconBgColor: "bg-red-100",
  },
];

export const FILES_STATS: StatCardConfig[] = [
  {
    key: "files_uploaded",
    labelKey: "stats.filesUploaded",
    icon: Upload,
    iconColor: "text-orange-600",
    iconBgColor: "bg-orange-100",
  },
  {
    key: "files_deleted",
    labelKey: "stats.filesDeleted",
    icon: Trash2,
    iconColor: "text-red-600",
    iconBgColor: "bg-red-100",
  },
  {
    key: "files_shared",
    labelKey: "stats.filesShared",
    icon: Share2,
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-100",
  },
];

// Category configurations
export const STAT_CATEGORIES: StatCategoryConfig[] = [
  {
    category: "submissions",
    labelKey: "filterShows.submission",
    cards: SUBMISSIONS_STATS,
  },
  {
    category: "users",
    labelKey: "filterShows.users",
    cards: USERS_STATS,
  },
  {
    category: "files",
    labelKey: "filterShows.files",
    cards: FILES_STATS,
  },
];

// Page configurations for activity log variants
export const ACTIVITY_LOG_PAGE_CONFIG: Record<
  "admin" | "employee",
  ActivityLogPageConfig
> = {
  admin: {
    titleKey: "activityLog.teamTitle",
    subtitleKey: "activityLog.teamSubtitle",
    statCategories: STAT_CATEGORIES,
    defaultVisibleStats: [
      "submissions_approved",
      "submissions_rejected",
      "submissions_pending",
      "submissions_need_revision",
    ],
  },
  employee: {
    titleKey: "activityLog.myTitle",
    subtitleKey: "activityLog.mySubtitle",
    statCategories: STAT_CATEGORIES,
    defaultVisibleStats: [
      "submissions_approved",
      "submissions_rejected",
      "submissions_pending",
      "submissions_need_revision",
    ],
  },
};
