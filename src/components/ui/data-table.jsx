import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  X,
  Filter,
  Calendar,
} from "lucide-react";

function yearFilterFn(row, columnId, filterValue) {
  const val = row.getValue(columnId);
  if (!val) return false;
  return String(val).startsWith(String(filterValue));
}

function ColumnHeader({ column, title }) {
  const sorted = column.getIsSorted();
  const isFiltered = column.getFilterValue() != null && column.getFilterValue() !== "";
  const filterOptions = column.columnDef.meta?.filterOptions;
  const filterVariant = column.columnDef.meta?.filterVariant;
  const [filterOpen, setFilterOpen] = useState(false);
  const [localFilter, setLocalFilter] = useState(column.getFilterValue() ?? "");

  const isDate = filterVariant === "year";

  const uniqueYears = useMemo(() => {
    if (!isDate) return [];
    const faceted = column.getFacetedUniqueValues();
    const years = new Set();
    for (const [key] of faceted) {
      if (key) years.add(String(key).substring(0, 4));
    }
    return Array.from(years).sort().reverse();
  }, [isDate, column.getFacetedUniqueValues()]);

  const sortAscLabel = isDate ? "Oldest → Newest" : "Sort A→Z";
  const sortDescLabel = isDate ? "Newest → Oldest" : "Sort Z→A";

  return (
    <DropdownMenu
      open={filterOpen}
      onOpenChange={(open) => {
        setFilterOpen(open);
        if (open) setLocalFilter(column.getFilterValue() ?? "");
      }}
      modal={false}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
        >
          <span>{title}</span>
          {isFiltered && <Filter className="ml-1 size-3 text-primary" />}
          {sorted === "asc" ? (
            <ArrowUp className="ml-1 size-3.5" />
          ) : sorted === "desc" ? (
            <ArrowDown className="ml-1 size-3.5" />
          ) : (
            <ChevronsUpDown className="ml-1 size-3.5 text-muted-foreground/50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <ArrowUp className="mr-2 size-3.5" />
          {sortAscLabel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <ArrowDown className="mr-2 size-3.5" />
          {sortDescLabel}
        </DropdownMenuItem>
        {sorted && (
          <DropdownMenuItem onClick={() => column.clearSorting()}>
            <X className="mr-2 size-3.5" />
            Clear Sort
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {isDate ? "Filter by Year" : "Filter"}
          </p>
          {isDate ? (
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              <button
                className={`flex w-full items-center rounded-sm px-2 py-1 text-xs hover:bg-accent ${
                  !column.getFilterValue() ? "bg-accent font-medium" : ""
                }`}
                onClick={() => {
                  column.setFilterValue(undefined);
                  setFilterOpen(false);
                }}
              >
                All Years
              </button>
              {uniqueYears.map((year) => (
                <button
                  key={year}
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1 text-xs hover:bg-accent ${
                    column.getFilterValue() === year
                      ? "bg-accent font-medium"
                      : ""
                  }`}
                  onClick={() => {
                    column.setFilterValue(year);
                    setFilterOpen(false);
                  }}
                >
                  <Calendar className="size-3 text-muted-foreground" />
                  {year}
                </button>
              ))}
            </div>
          ) : filterOptions ? (
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              <button
                className={`flex w-full items-center rounded-sm px-2 py-1 text-xs hover:bg-accent ${
                  !column.getFilterValue() ? "bg-accent font-medium" : ""
                }`}
                onClick={() => {
                  column.setFilterValue(undefined);
                  setFilterOpen(false);
                }}
              >
                All
              </button>
              {filterOptions.map((opt) => (
                <button
                  key={opt}
                  className={`flex w-full items-center rounded-sm px-2 py-1 text-xs hover:bg-accent ${
                    column.getFilterValue() === opt
                      ? "bg-accent font-medium"
                      : ""
                  }`}
                  onClick={() => {
                    column.setFilterValue(opt);
                    setFilterOpen(false);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Input
                placeholder="Filter..."
                value={localFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalFilter(val);
                  column.setFilterValue(val || undefined);
                }}
                className="h-7 text-xs"
              />
              {localFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => {
                    setLocalFilter("");
                    column.setFilterValue(undefined);
                  }}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { yearFilterFn };

export function DataTable({
  columns,
  data,
  onRowClick,
  globalFilter,
  onGlobalFilterChange,
  emptyState,
}) {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const hasActiveFilters = columnFilters.length > 0;

  return (
    <div>
      {hasActiveFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {columnFilters.map((f) => {
            const col = table.getColumn(f.id);
            const label =
              col?.columnDef.meta?.title || col?.columnDef.header || f.id;
            return (
              <Button
                key={f.id}
                variant="secondary"
                size="sm"
                className="h-6 gap-1 text-xs"
                onClick={() => col?.setFilterValue(undefined)}
              >
                {label}: {String(f.value)}
                <X className="size-3" />
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setColumnFilters([])}
          >
            Clear all
          </Button>
        </div>
      )}

      {table.getRowModel().rows.length === 0 ? (
        emptyState || (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No results found
          </div>
        )
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const title =
                      header.column.columnDef.meta?.title ||
                      header.column.columnDef.header;
                    const canSort = header.column.getCanSort();
                    const align = header.column.columnDef.meta?.align;

                    return (
                      <TableHead
                        key={header.id}
                        className={align === "right" ? "text-right" : ""}
                      >
                        {header.isPlaceholder ? null : canSort &&
                          typeof title === "string" ? (
                          <ColumnHeader
                            column={header.column}
                            title={title}
                          />
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer" : ""}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const align = cell.column.columnDef.meta?.align;
                    return (
                      <TableCell
                        key={cell.id}
                        className={align === "right" ? "text-right" : ""}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
