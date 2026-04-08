"use client";

import {
  Upload,
  Trash2,
  FileEdit,
  FolderInput,
  Share2,
  FolderPlus,
  Folder,
  FolderMinus,
  Move,
  FileText,
  MessageSquare,
  UserPlus,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  UserMinus,
  FileCheck,
  FileX,
  FileWarning,
  GitBranchPlus,
  BookOpen,
} from "lucide-react";
import { ActivityAction } from "@/types/activityLog";

type ActivityIconProps = {
  action: ActivityAction;
};

type IconConfig = {
  icon: React.ReactNode;
  bgColor: string;
};

function getIconConfig(action: ActivityAction): IconConfig {
  const iconClass = "w-5 h-5";

  const configs: Record<ActivityAction, IconConfig> = {
    file_upload: {
      icon: <Upload className={`${iconClass} text-orange-600`} />,
      bgColor: "bg-orange-100",
    },
    file_delete: {
      icon: <Trash2 className={`${iconClass} text-red-600`} />,
      bgColor: "bg-red-100",
    },
    file_rename: {
      icon: <FileEdit className={`${iconClass} text-blue-600`} />,
      bgColor: "bg-blue-100",
    },
    file_move: {
      icon: <FolderInput className={`${iconClass} text-purple-600`} />,
      bgColor: "bg-purple-100",
    },
    file_share: {
      icon: <Share2 className={`${iconClass} text-blue-600`} />,
      bgColor: "bg-blue-100",
    },
    folder_create: {
      icon: <FolderPlus className={`${iconClass} text-orange-600`} />,
      bgColor: "bg-orange-100",
    },
    folder_rename: {
      icon: <Folder className={`${iconClass} text-blue-600`} />,
      bgColor: "bg-blue-100",
    },
    folder_delete: {
      icon: <FolderMinus className={`${iconClass} text-red-600`} />,
      bgColor: "bg-red-100",
    },
    folder_move: {
      icon: <Move className={`${iconClass} text-purple-600`} />,
      bgColor: "bg-purple-100",
    },
    bulk_move: {
      icon: <Move className={`${iconClass} text-purple-600`} />,
      bgColor: "bg-purple-100",
    },
    rag_ingest: {
      icon: <FileText className={`${iconClass} text-teal-600`} />,
      bgColor: "bg-teal-100",
    },
    thread_create: {
      icon: <MessageSquare className={`${iconClass} text-indigo-600`} />,
      bgColor: "bg-indigo-100",
    },
    message_insert: {
      icon: <MessageSquare className={`${iconClass} text-indigo-600`} />,
      bgColor: "bg-indigo-100",
    },
    user_invite: {
      icon: <UserPlus className={`${iconClass} text-blue-600`} />,
      bgColor: "bg-blue-100",
    },
    user_approve: {
      icon: <CheckCircle className={`${iconClass} text-green-600`} />,
      bgColor: "bg-green-100",
    },
    user_reject: {
      icon: <XCircle className={`${iconClass} text-red-600`} />,
      bgColor: "bg-red-100",
    },
    user_role_change: {
      icon: <ArrowRightLeft className={`${iconClass} text-gray-600`} />,
      bgColor: "bg-gray-100",
    },
    user_delete: {
      icon: <UserMinus className={`${iconClass} text-red-600`} />,
      bgColor: "bg-red-100",
    },
    submission_approve: {
      icon: <FileCheck className={`${iconClass} text-green-600`} />,
      bgColor: "bg-green-100",
    },
    submission_reject: {
      icon: <FileX className={`${iconClass} text-red-600`} />,
      bgColor: "bg-red-100",
    },
    submission_need_revision: {
      icon: <FileWarning className={`${iconClass} text-yellow-600`} />,
      bgColor: "bg-yellow-100",
    },
    submission_step_approve: {
      icon: <FileCheck className={`${iconClass} text-green-600`} />,
      bgColor: "bg-green-100",
    },
    submission_step_reject: {
      icon: <FileX className={`${iconClass} text-red-600`} />,
      bgColor: "bg-red-100",
    },
    approval_route_create: {
      icon: <GitBranchPlus className={`${iconClass} text-green-600`} />,
      bgColor: "bg-green-100",
    },
    approval_route_update: {
      icon: <GitBranchPlus className={`${iconClass} text-blue-600`} />,
      bgColor: "bg-blue-100",
    },
    approval_route_delete: {
      icon: <GitBranchPlus className={`${iconClass} text-red-600`} />,
      bgColor: "bg-red-100",
    },
    department_create: {
      icon: <FileCheck className={`${iconClass} text-green-600`} />,
      bgColor: "bg-green-100",
    },
    department_update: {
      icon: <FileEdit className={`${iconClass} text-blue-600`} />,
      bgColor: "bg-blue-100",
    },
    department_delete: {
      icon: <Trash2 className={`${iconClass} text-red-600`} />,
      bgColor: "bg-red-100",
    },
    position_create: {
      icon: <FileCheck className={`${iconClass} text-green-600`} />,
      bgColor: "bg-green-100",
    },
    position_update: {
      icon: <FileEdit className={`${iconClass} text-blue-600`} />,
      bgColor: "bg-blue-100",
    },
    position_delete: {
      icon: <Trash2 className={`${iconClass} text-red-600`} />,
      bgColor: "bg-red-100",
    },
    permission_update: {
      icon: <ArrowRightLeft className={`${iconClass} text-purple-600`} />,
      bgColor: "bg-purple-100",
    },
    submission_resubmit: {
      icon: <FileCheck className={`${iconClass} text-blue-600`} />,
      bgColor: "bg-blue-100",
    },
    submission_comment: {
      icon: <MessageSquare className={`${iconClass} text-indigo-600`} />,
      bgColor: "bg-indigo-100",
    },
    submission_proxy_approve: {
      icon: <FileCheck className={`${iconClass} text-amber-600`} />,
      bgColor: "bg-amber-100",
    },
    submission_reassign_approver: {
      icon: <FileCheck className={`${iconClass} text-sky-600`} />,
      bgColor: "bg-sky-100",
    },
    knowledge_entry_create: {
      icon: <BookOpen className={`${iconClass} text-emerald-600`} />,
      bgColor: "bg-emerald-100",
    },
    knowledge_entry_update: {
      icon: <BookOpen className={`${iconClass} text-blue-600`} />,
      bgColor: "bg-blue-100",
    },
    knowledge_entry_delete: {
      icon: <BookOpen className={`${iconClass} text-red-600`} />,
      bgColor: "bg-red-100",
    },
  };

  return configs[action] || {
    icon: <FileText className={`${iconClass} text-gray-600`} />,
    bgColor: "bg-gray-100",
  };
}

export function ActivityIcon({ action }: ActivityIconProps) {
  const { icon, bgColor } = getIconConfig(action);

  return (
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bgColor}`}
    >
      {icon}
    </div>
  );
}
