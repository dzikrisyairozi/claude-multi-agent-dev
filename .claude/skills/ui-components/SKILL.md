---
name: ui-components
description: Reference for using shadcn/ui components correctly in this project. Use this skill when implementing dropdowns, selects, modals, or any UI component to ensure consistency and avoid known issues.
---

# UI Component Implementation Guide

## Dropdown / Select Components

### Standard Select (short lists, no scroll needed)
Use `SelectContentScrollable` — NOT `SelectContent`.

`SelectContent` uses Radix's `position="item-aligned"` which causes scroll trapping in long forms. Always use `SelectContentScrollable` which uses `position="popper"` with a proper `ScrollArea` wrapper.

```tsx
import {
  Select,
  SelectContentScrollable,  // ← ALWAYS use this, never SelectContent
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="h-[45px] rounded-[8px]">
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContentScrollable>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContentScrollable>
</Select>
```

### Searchable Multi-Select (user pickers, multi-checkbox)
Use `Popover` + `ScrollArea` + `Checkbox` pattern (see ActivityFilters.tsx):

```tsx
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      {selectedCount === 0 ? "All Users" : `${selectedCount} selected`}
      <ChevronDown className="ml-auto h-4 w-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[220px] p-0" align="start">
    <div className="p-3 pb-2">
      <Input placeholder="Search..." className="h-8" />
    </div>
    <ScrollArea className="h-[200px]">
      {items.map((item) => (
        <div key={item.id} className="flex items-center px-3 py-1.5 hover:bg-accent rounded-sm cursor-pointer">
          <Checkbox checked={selected.includes(item.id)} />
          <span className="ml-2 text-sm">{item.name}</span>
        </div>
      ))}
    </ScrollArea>
  </PopoverContent>
</Popover>
```

### Reference: `src/components/activity-log/ActivityFilters.tsx`
This file demonstrates both patterns working correctly in production.

## Modal / Dialog Components

### Centered Modal (forms, confirmations)
Use `Dialog` — for create/edit forms and confirmations:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
```

### Side Sheet (complex editing, settings)
Use `Sheet` — only when significant vertical content needs a slide-in panel:

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
```

### Delete Confirmation
Use `AlertDialog`:

```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
```

## Common Gotchas

1. **NEVER use `SelectContent`** — always `SelectContentScrollable`. The default causes scroll trapping.
2. **Modals inside `overflow-y-auto` containers** — Radix portals handle this, but avoid nesting scrollable areas.
3. **Form containers** — Don't use `h-full` + `overflow-y-auto` on form wrappers. Let the page scroll naturally.
4. **Icons** — Use `@tabler/icons-react` for feature icons, `lucide-react` for UI chrome (chevrons, X, etc.)

## Available shadcn/ui Components

Located in `src/components/ui/`:
alert-dialog, alert, avatar, badge, breadcrumb, button, calendar, card, chart, checkbox, dialog, drawer, dropdown-menu, input, label, pagination, popover, scroll-area, select, separator, sheet, sidebar, skeleton, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip
