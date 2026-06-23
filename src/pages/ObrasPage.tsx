import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SimpleTablePage } from "@/components/tables/SimpleTablePage";
import { useObras } from "@/hooks/useTabelasOperacionais";

export default function ObrasPage({ standalone = false }: { standalone?: boolean }) {
  const { data = [], isLoading } = useObras();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (o) =>
        o.num_obra?.toLowerCase().includes(q) ||
        o.status?.toLowerCase().includes(q) ||
        String(o.sigco ?? "").includes(q),
    );
  }, [data, search]);

  return (
    <SimpleTablePage
      standalone={standalone}
      title="Obras"
      subtitle="Tabela de obras"
      icon={<Building2 className="h-4 w-4" />}
      isLoading={isLoading}
      rows={filtered}
      page={page}
      pageSize={20}
      onPageChange={setPage}
      search={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      onClear={() => { setSearch(""); setPage(1); }}
      searchPlaceholder="Buscar por número, status ou SIGCO..."
      rowKey={(o) => o.id_obra}
      columns={[
        { header: "ID", cell: (o) => <span className="font-mono text-xs">{o.id_obra}</span> },
        { header: "Num Obra", cell: (o) => <span className="font-mono">{o.num_obra ?? "-"}</span> },
        { header: "Status", cell: (o) => <Badge variant="outline">{o.status ?? "-"}</Badge> },
        { header: "SIGCO", cell: (o) => o.sigco ?? "-" },
        { header: "Atualizado", cell: (o) => new Date(o.updated_at).toLocaleDateString("pt-BR") },
      ]}
    />
  );
}
