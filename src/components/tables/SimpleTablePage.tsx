import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, Search, Home, X, ChevronLeft, ChevronRight, Plus, ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  sortField?: string;
}

export interface ColumnFilter {
  field: string;
  label: string;
  placeholder?: string;
}

interface Props<T> {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  standalone?: boolean;
  isLoading: boolean;
  rows: T[];
  columns: Column<T>[];

  // search
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;

  // column filters
  columnFilters?: ColumnFilter[];
  filterValues?: Record<string, string>;
  onFilterChange?: (field: string, value: string) => void;

  // sort
  sortField?: string;
  sortDir?: SortDir;
  onSortChange?: (field: string, dir: SortDir) => void;

  // pagination (server-driven)
  page: number;
  pageSize: number;
  total?: number;
  onPageChange: (p: number) => void;

  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;

  // new button
  onNew?: () => void;
  newLabel?: string;

  extraFilters?: ReactNode;
  onClear?: () => void;
  summary?: ReactNode;
}

export function SimpleTablePage<T>({
  title, subtitle, icon, standalone, isLoading, rows, columns,
  search, onSearchChange, searchPlaceholder,
  columnFilters, filterValues, onFilterChange,
  sortField, sortDir, onSortChange,
  page, pageSize, total, onPageChange,
  rowKey, onRowClick, onNew, newLabel = "Novo",
  extraFilters, onClear, summary,
}: Props<T>) {
  const navigate = useNavigate();
  const totalRows = total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const start = totalRows === 0 ? 0 : (page - 1) * pageSize;

  const handleHeaderClick = (col: Column<T>) => {
    if (!col.sortField || !onSortChange) return;
    if (sortField !== col.sortField) onSortChange(col.sortField, "asc");
    else onSortChange(col.sortField, sortDir === "asc" ? "desc" : "asc");
  };

  const content = (
    <div className="space-y-4">
      {summary}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            Filtros
          </CardTitle>
          {onNew && (
            <Button size="sm" onClick={onNew}>
              <Plus className="h-4 w-4 mr-1" /> {newLabel}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder ?? "Buscar..."}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8"
              />
            </div>
            {extraFilters}
            {onClear && (
              <Button variant="outline" size="icon" onClick={onClear} title="Limpar filtros">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {columnFilters && columnFilters.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {columnFilters.map((f) => (
                <Input
                  key={f.field}
                  placeholder={f.placeholder ?? f.label}
                  value={filterValues?.[f.field] ?? ""}
                  onChange={(e) => onFilterChange?.(f.field, e.target.value)}
                  className="h-8 text-sm"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  {columns.map((c) => {
                    const sortable = !!c.sortField && !!onSortChange;
                    const active = sortable && sortField === c.sortField;
                    return (
                      <TableHead
                        key={c.header}
                        className={cn(c.className, sortable && "cursor-pointer select-none")}
                        onClick={() => sortable && handleHeaderClick(c)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {c.header}
                          {sortable && (active
                            ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                            : <ArrowUpDown className="h-3 w-3 opacity-40" />)}
                        </span>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={rowKey(row)}
                      className={onRowClick ? "cursor-pointer" : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((c) => (
                        <TableCell key={c.header} className={c.className}>{c.cell(row)}</TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              {totalRows > 0
                ? `Mostrando ${start + 1} a ${Math.min(start + pageSize, totalRows)} de ${totalRows}`
                : "0 registros"}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (!standalone) return content;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <Home className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-primary">{title}</h1>
              {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="flex-1 px-6 py-4 overflow-auto min-h-0">{content}</main>
    </div>
  );
}
