"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { ApprovalRequest } from "@/types/approvalRequest";
import { getApprovalRequests, getApprovalActionsForUser, ApprovalActionInfo } from "@/service/approvalRequest/approvalRequest";
import { ApprovalRequestCard } from "@/components/approval-request/ApprovalRequestCard";
import {
  ApprovalRequestFilter,
  FilterState,
  initialFilterState,
} from "@/components/approval-request/ApprovalRequestFilter";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  FileText,
  FileEdit,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { SubmissionDialog } from "@/components/approval-request/SubmissionDialog";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";

export default function SubmissionPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role as string | undefined;
  const {
    data: requests = [],
    isLoading: loading,
    refetch,
  } = useQuery<ApprovalRequest[]>({
    queryKey: ["approval-requests"],
    queryFn: async () => {
      const { data, error } = await getApprovalRequests();
      if (error) throw new Error(error);
      return data || [];
    },
  });

  // Fetch which pending requests the current user can act on
  const pendingIds = useMemo(
    () => requests.filter((r) => r.status === "pending").map((r) => r.id),
    [requests]
  );
  const { data: approvalActions = {} } = useQuery<Record<string, ApprovalActionInfo>>({
    queryKey: ["approval-actions", pendingIds],
    queryFn: async () => {
      if (pendingIds.length === 0) return {};
      const { data } = await getApprovalActionsForUser(pendingIds);
      return data;
    },
    enabled: pendingIds.length > 0,
  });

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<ApprovalRequest | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const categories = new Set<string>();
    const priorities = new Set<string>();
    const departments = new Set<string>();

    requests.forEach((req) => {
      if (req.category) categories.add(req.category);
      if (req.priority) priorities.add(req.priority);
      if (req.department) departments.add(req.department);
    });

    return {
      categories: Array.from(categories).sort(),
      priorities: Array.from(priorities).sort(),
      departments: Array.from(departments).sort(),
    };
  }, [requests]);

  const handleCreateNew = () => {
    setSelectedRequest(null);
    setIsSubmissionOpen(true);
  };

  const handleEdit = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setIsSubmissionOpen(true);
  };

  const filteredRequests = requests.filter((req) => {
    const matchesTab =
      activeTab === "all"
        ? true
        : activeTab === "escalations"
        ? req.is_escalated && req.status === "pending"
        : req.status === activeTab;
    const matchesSearch =
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase());

    // Apply additional filters
    const matchesCategory =
      !filters.category || req.category === filters.category;
    const matchesPriority =
      !filters.priority || req.priority === filters.priority;
    const matchesDepartment =
      !filters.department || req.department === filters.department;

    // Date range filtering (based on created_at) - using string dates now
    let matchesDateFrom = true;
    let matchesDateTo = true;

    if (filters.dateFrom && req.created_at) {
      const createdDate = new Date(req.created_at);
      const fromDate = new Date(filters.dateFrom);
      matchesDateFrom = createdDate >= fromDate;
    }

    if (filters.dateTo && req.created_at) {
      const createdDate = new Date(req.created_at);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      matchesDateTo = createdDate <= toDate;
    }

    return (
      matchesTab &&
      matchesSearch &&
      matchesCategory &&
      matchesPriority &&
      matchesDepartment &&
      matchesDateFrom &&
      matchesDateTo
    );
  });

  const getCount = (status: string) => {
    if (status === "all") return requests.length;
    if (status === "escalations")
      return requests.filter((r) => r.is_escalated && r.status === "pending").length;
    return requests.filter((r) => r.status === status).length;
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("dashboard.title")}
          </h1>
          <p className="text-gray-500">{t("dashboard.subtitle")}</p>
        </div>

        {/* Stats / Filters Bar */}
        <div className="bg-white p-2.5 rounded-xl border border-gray-100 overflow-x-auto">
          <Tabs
            defaultValue="all"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full min-w-max"
          >
            <TabsList className="bg-transparent h-auto p-0 flex justify-start gap-4">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2.5 h-auto gap-2.5 border border-transparent data-[state=active]:border-primary/20 transition-all"
              >
                <div
                  className={`p-1 rounded-md ${
                    activeTab === "all"
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <span className="font-medium">{t("status.all")}</span>
                <Badge
                  variant="secondary"
                  className={`rounded-md ml-1 ${
                    activeTab === "all"
                      ? "bg-primary/10 text-primary"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {getCount("all")}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="draft"
                className="data-[state=active]:bg-slate-50 data-[state=active]:text-slate-600 rounded-lg px-4 py-2.5 h-auto gap-2.5 border border-transparent data-[state=active]:border-slate-100 transition-all text-gray-500"
              >
                <div
                  className={`p-1 rounded-md ${
                    activeTab === "draft"
                      ? "bg-slate-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <FileEdit className="w-4 h-4" />
                </div>
                <span className="font-medium">{t("status.draft")}</span>
                <Badge
                  variant="secondary"
                  className={`rounded-md ml-1 ${
                    activeTab === "draft"
                      ? "bg-slate-100 text-slate-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {getCount("draft")}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="pending"
                className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 rounded-lg px-4 py-2.5 h-auto gap-2.5 border border-transparent data-[state=active]:border-orange-100 transition-all text-gray-500"
              >
                <div
                  className={`p-1 rounded-md ${
                    activeTab === "pending"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <span className="font-medium">{t("status.pending")}</span>
                <Badge
                  variant="secondary"
                  className={`rounded-md ml-1 ${
                    activeTab === "pending"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {getCount("pending")}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="approved"
                className="data-[state=active]:bg-green-50 data-[state=active]:text-green-600 rounded-lg px-4 py-2.5 h-auto gap-2.5 border border-transparent data-[state=active]:border-green-100 transition-all text-gray-500"
              >
                <div
                  className={`p-1 rounded-md ${
                    activeTab === "approved"
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="font-medium">{t("status.approved")}</span>
                <Badge
                  variant="secondary"
                  className={`rounded-md ml-1 ${
                    activeTab === "approved"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {getCount("approved")}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="rejected"
                className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 rounded-lg px-4 py-2.5 h-auto gap-2.5 border border-transparent data-[state=active]:border-red-100 transition-all text-gray-500"
              >
                <div
                  className={`p-1 rounded-md ${
                    activeTab === "rejected"
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                </div>
                <span className="font-medium">{t("status.rejected")}</span>
                <Badge
                  variant="secondary"
                  className={`rounded-md ml-1 ${
                    activeTab === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {getCount("rejected")}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="need_revision"
                className="data-[state=active]:bg-yellow-50 data-[state=active]:text-yellow-600 rounded-lg px-4 py-2.5 h-auto gap-2.5 border border-transparent data-[state=active]:border-yellow-100 transition-all text-gray-500"
              >
                <div
                  className={`p-1 rounded-md ${
                    activeTab === "need_revision"
                      ? "bg-yellow-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                </div>
                <span className="font-medium">{t("status.needRevision")}</span>
                <Badge
                  variant="secondary"
                  className={`rounded-md ml-1 ${
                    activeTab === "need_revision"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {getCount("need_revision")}
                </Badge>
              </TabsTrigger>

              {(userRole === "admin" || userRole === "platform_admin") && (
                <TabsTrigger
                  value="escalations"
                  className="data-[state=active]:bg-red-100 data-[state=active]:text-red-600 rounded-lg px-4 py-2.5 h-auto gap-2.5 border border-transparent data-[state=active]:border-red-200 transition-all text-gray-500"
                >
                  <div
                    className={`p-1 rounded-md ${
                      activeTab === "escalations"
                        ? "bg-red-500 text-white"
                        : "bg-red-100 text-red-400"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="font-medium">{t("status.escalations")}</span>
                  <Badge
                    variant="secondary"
                    className={`rounded-md ml-1 ${
                      activeTab === "escalations"
                        ? "bg-red-200 text-red-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {getCount("escalations")}
                  </Badge>
                </TabsTrigger>
              )}

              <TabsTrigger
                value="cancelled"
                className="data-[state=active]:bg-red-50 data-[state=active]:text-red-600 rounded-lg px-4 py-2.5 h-auto gap-2.5 border border-transparent data-[state=active]:border-red-100 transition-all text-gray-500"
              >
                <div
                  className={`p-1 rounded-md ${
                    activeTab === "cancelled"
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Ban className="w-4 h-4" />
                </div>
                <span className="font-medium">{t("status.cancelled")}</span>
                <Badge
                  variant="secondary"
                  className={`rounded-md ml-1 ${
                    activeTab === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {getCount("cancelled")}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search and Action Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t("dashboard.search")}
              className="pl-10 bg-white border-gray-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <ApprovalRequestFilter
              filters={filters}
              onFiltersChange={setFilters}
              filterOptions={filterOptions}
            />
            {userRole !== "platform_admin" && (
              <Button
                className="bg-primary hover:bg-primary/90 text-white gap-2"
                onClick={handleCreateNew}
              >
                <Plus className="w-4 h-4" />
                {t("dashboard.newSubmission")}
              </Button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              {t("dashboard.loading")}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              {t("dashboard.noResults")}
            </div>
          ) : (
            filteredRequests.map((request) => (
              <ApprovalRequestCard
                key={request.id}
                request={request}
                onUpdate={() => refetch()}
                approvalAction={approvalActions[request.id]}
              />
            ))
          )}
        </div>
      </div>

      <SubmissionDialog
        open={isSubmissionOpen}
        onOpenChange={setIsSubmissionOpen}
        initialData={selectedRequest}
        onSuccess={() => {
          refetch();
          setIsSubmissionOpen(false);
        }}
      />
    </MainLayout>
  );
}
