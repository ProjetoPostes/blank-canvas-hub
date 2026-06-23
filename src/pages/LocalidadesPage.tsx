import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { SimpleTablePage } from "@/components/tables/SimpleTablePage";
import { useLocalidades } from "@/hooks/useTabelasOperacionais";

export default function LocalidadesPage({ standalone = false }: { standalone?: boolean }) {
  const { data = [], isLoading } = useLocalidades();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (l) =>
        l.cod_lcd?.toLowerCase().includes(q) ||
        l.nome_lcd?.toLowerCase().includes(q) ||
        l.regional?.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <SimpleTablePage
      standalone={standalone}
      title="Localidades"
      subtitle="Tabela de localidades"
      icon={<MapPin className="h-4 w-4" />}
      isLoading={isLoading}
      rows={filtered}
      page={page}
      pageSize={20}
      onPageChange={setPage}
      search={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      onClear={() => { setSearch(""); setPage(1); }}
      searchPlaceholder="Buscar por código, nome ou regional..."
      rowKey={(l) => l.id_loc}
      columns={[
        { header: "ID", cell: (l) => <span className="font-mono text-xs">{l.id_loc}</span> },
        { header: "Código", cell: (l) => <span className="font-mono">{l.cod_lcd ?? "-"}</span> },
        { header: "Nome", cell: (l) => l.nome_lcd ?? "-" },
        { header: "Regional", cell: (l) => l.regional ?? "-" },
      ]}
    />
  );
}
