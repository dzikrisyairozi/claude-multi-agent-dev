import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { useLanguage } from "@/providers/LanguageProvider";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  setCurrentPage: (page: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function TablePagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  goToPreviousPage,
  goToNextPage,
  setCurrentPage,
  canGoPrevious,
  canGoNext,
}: TablePaginationProps) {
  const { t } = useLanguage();
  const from = startIndex + 1;
  const to = Math.min(endIndex, totalItems);
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {t("pagination.showing")
          .replace("{from}", String(from))
          .replace("{to}", String(to))
          .replace("{total}", String(totalItems))}
      </div>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationLink
              onClick={goToPreviousPage}
              aria-disabled={!canGoPrevious}
              aria-label={t("pagination.previous")}
              size="default"
              className={`gap-1 px-2.5 sm:pl-2.5 ${
                !canGoPrevious ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <ChevronLeftIcon />
              <span className="hidden sm:block">
                {t("pagination.previous")}
              </span>
            </PaginationLink>
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={currentPage === page}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationLink
              onClick={goToNextPage}
              aria-disabled={!canGoNext}
              aria-label={t("pagination.next")}
              size="default"
              className={`gap-1 px-2.5 sm:pr-2.5 ${
                !canGoNext ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <span className="hidden sm:block">{t("pagination.next")}</span>
              <ChevronRightIcon />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

