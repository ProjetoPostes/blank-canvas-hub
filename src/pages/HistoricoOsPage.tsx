import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SimpleTablePage } from "@/components/tables/SimpleTablePage";
import { useHistoricoOs } from "@/hooks/useTabelasOperacionais";

export default function HistoricoOsPage({ standalone = false }: { standalone?: boolean }) {
  const { data = [], isLoading } = useHistoricoOs(2000);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (h) =>
        String(h.num_os).includes(q) ||
        h.campo?.toLowerCase().includes(q) ||
        h.valor_old?.toLowerCase().includes(q) ||
        h.valor_new?.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <SimpleTablePage
      standalone={standalone}
      title="Histórico OS"
      subtitle="Alterações em ordens de serviço"
      icon={<History className="h-4 w-4" />}
      isLoading={isLoading}
      rows={filtered}
      page={page}
      pageSize={25}
      onPageChange={setPage}
      search={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      onClear={() => { setSearch(""); setPage(1); }}
      searchPlaceholder="Buscar por NUMOS, campo ou valor..."
      rowKey={(h) => h.id}
      columns={[
        { header: "Data", cell: (h) => new Date(h.created_at).toLocaleString("pt-BR") },
        { header: "NUMOS", cell: (h) => <span className="font-mono">{h.num_os}</span> },
        { header: "Campo", cell: (h) => <Badge variant="outline">{h.campo ?? "-"}</Badge> },
        { header: "Valor Anterior", cell: (h) => <span className="text-xs text-muted-foreground">{h.valor_old ?? "-"}</span> },
        { header: "Novo Valor", cell: (h) => <span className="text-xs">{h.valor_new ?? "-"}</span> },
      ]}
    />
  );
}
