import { useState } from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SimpleTablePage, type SortDir } from "@/components/tables/SimpleTablePage";
import { RowDetailDrawer } from "@/components/tables/RowDetailDrawer";
import { useHistoricoOs } from "@/hooks/useTabelasOperacionais";
import type { historico_os } from "@/types/database";

const PAGE_SIZE = 25;

export default function HistoricoOsPage({ standalone = false }: { standalone?: boolean }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<historico_os | null>(null);

  const { data, isLoading } = useHistoricoOs({ page, pageSize: PAGE_SIZE, search, sortField, sortDir, filters });

  return (
    <>
      <SimpleTablePage<historico_os>
        standalone={standalone}
        title="Histórico OS"
        subtitle="Alterações em ordens de serviço"
        icon={<History className="h-4 w-4" />}
        isLoading={isLoading}
        rows={data?.rows ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Buscar por NUMOS, campo ou valor..."
        columnFilters={[
          { field: "campo", label: "Campo" },
          { field: "valor_new", label: "Novo valor" },
        ]}
        filterValues={filters}
        onFilterChange={(f, v) => { setFilters((p) => ({ ...p, [f]: v })); setPage(1); }}
        sortField={sortField}
        sortDir={sortDir}
        onSortChange={(f, d) => { setSortField(f); setSortDir(d); }}
        onClear={() => { setSearch(""); setFilters({}); setPage(1); }}
        onRowClick={(h) => setSelected(h)}
        rowKey={(h) => h.id}
        columns={[
          { header: "Data", sortField: "created_at", cell: (h) => new Date(h.created_at).toLocaleString("pt-BR") },
          { header: "NUMOS", sortField: "num_os", cell: (h) => <span className="font-mono">{h.num_os}</span> },
          { header: "Campo", sortField: "campo", cell: (h) => <Badge variant="outline">{h.campo ?? "-"}</Badge> },
          { header: "Valor Anterior", cell: (h) => <span className="text-xs text-muted-foreground line-clamp-1">{h.valor_old ?? "-"}</span> },
          { header: "Novo Valor", cell: (h) => <span className="text-xs line-clamp-1">{h.valor_new ?? "-"}</span> },
        ]}
      />

      <RowDetailDrawer
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={`OS ${selected?.num_os ?? ""}`}
        subtitle={selected ? new Date(selected.created_at).toLocaleString("pt-BR") : ""}
        fields={selected ? [
          { label: "NUMOS", value: selected.num_os },
          { label: "Campo", value: selected.campo },
          { label: "Valor anterior", value: <pre className="whitespace-pre-wrap text-xs">{selected.valor_old ?? "-"}</pre>, full: true },
          { label: "Novo valor", value: <pre className="whitespace-pre-wrap text-xs">{selected.valor_new ?? "-"}</pre>, full: true },
          { label: "Usuário", value: selected.user_id ?? "-" },
        ] : []}
      />
    </>
  );
}
