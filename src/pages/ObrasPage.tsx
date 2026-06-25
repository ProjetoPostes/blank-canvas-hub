import { useState, useMemo } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimpleTablePage, type SortDir } from "@/components/tables/SimpleTablePage";
import { useObras, useObraOsCounts, useObraOsList } from "@/hooks/useTabelasOperacionais";
import { maskCpf } from "@/lib/cpfMask";
import type { Obra } from "@/types/database";

const PAGE_SIZE = 20;

export default function ObrasPage({ standalone = false }: { standalone?: boolean }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState("num_obra");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useObras({ page, pageSize: PAGE_SIZE, search, sortField, sortDir, filters });
  const rows = data?.rows ?? [];
  const idObras = useMemo(() => rows.map((o) => o.id_obra), [rows]);
  const { data: counts } = useObraOsCounts(idObras);

  const [selected, setSelected] = useState<Obra | null>(null);
  const { data: osList, isLoading: loadingOsList } = useObraOsList(selected?.id_obra ?? null);

  return (
    <>
      <SimpleTablePage<Obra>
        standalone={standalone}
        title="Obras"
        subtitle="Tabela de obras"
        icon={<Building2 className="h-4 w-4" />}
        isLoading={isLoading}
        rows={rows}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Buscar por número ou status..."
        columnFilters={[
          { field: "num_obra", label: "Num Obra" },
          { field: "status", label: "Status" },
        ]}
        filterValues={filters}
        onFilterChange={(f, v) => { setFilters((p) => ({ ...p, [f]: v })); setPage(1); }}
        sortField={sortField}
        sortDir={sortDir}
        onSortChange={(f, d) => { setSortField(f); setSortDir(d); }}
        onClear={() => { setSearch(""); setFilters({}); setPage(1); }}
        onRowClick={(o) => setSelected(o)}
        rowKey={(o) => o.id_obra}
        columns={[
          { header: "Num Obra", sortField: "num_obra", className: "text-xs", cell: (o) => <span className="font-mono text-xs">{o.num_obra ?? "-"}</span> },
          { header: "Status", sortField: "status", className: "text-xs", cell: (o) => <Badge variant="outline" className="text-xs">{o.status ?? "-"}</Badge> },
          { header: "SIGCO", sortField: "sigco", className: "text-xs", cell: (o) => <span className="text-xs">{o.sigco ?? "-"}</span> },
          { header: "OSs", className: "text-xs text-center", cell: (o) => (
            <div className="text-center">
              <Badge variant={(counts?.[o.id_obra] ?? 0) > 0 ? "default" : "outline"} className="text-xs">
                {counts?.[o.id_obra] ?? 0}
              </Badge>
            </div>
          )},
        ]}
      />

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Obra {selected?.num_obra ?? "-"}
            </DialogTitle>
            <DialogDescription>
              Status: {selected?.status ?? "-"} · SIGCO: {selected?.sigco ?? "-"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="mb-2 text-xs text-muted-foreground">
              {loadingOsList ? "Carregando..." : `${osList?.length ?? 0} OS(s) vinculada(s)`}
            </div>
            <ScrollArea className="h-[60vh] border rounded">
              {loadingOsList ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">NUMOS</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">CPF</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Controle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(osList ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-xs">
                          Nenhuma OS para esta obra
                        </TableCell>
                      </TableRow>
                    ) : (
                      (osList ?? []).map((os) => (
                        <TableRow key={os.id_os}>
                          <TableCell className="font-mono text-xs">{os.num_os}</TableCell>
                          <TableCell className="text-xs">{os.cliente?.nome ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{os.cliente?.cpf ? maskCpf(os.cliente.cpf) : "-"}</TableCell>
                          <TableCell className="text-xs">{os.status ?? "-"}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-xs">{os.controle_os ?? "-"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
