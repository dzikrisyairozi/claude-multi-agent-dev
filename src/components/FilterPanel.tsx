import { Search, Calendar, FileType, User, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterPanelProps {
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: any) => void;
  activeFilters?: any;
}

export const FilterPanel = ({
  onSearch,
  onFilterChange,
  activeFilters,
}: FilterPanelProps) => {
  return (
    <div className="space-y-4 p-4 bg-card rounded-xl border shadow-soft">
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search files with natural language..."
          onChange={(e) => onSearch?.(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select>
          <SelectTrigger className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-full">
            <FileType className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="meeting">Meeting Notes</SelectItem>
            <SelectItem value="specification">Specification</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-full">
            <User className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="me">Me</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-full">
            <Tag className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sensitivity" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeFilters && Object.keys(activeFilters).length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {Object.entries(activeFilters).map(([key, value]) => (
            <Badge key={key} variant="secondary" className="gap-1">
              {key}: {String(value)}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
