import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { SimpleTablePage } from "@/components/tables/SimpleTablePage";
import { usePrioritarios } from "@/hooks/useTabelasOperacionais";
import { maskCpf } from "@/lib/cpfMask";

export default function PrioritariosPage({ standalone = false }: { standalone?: boolean }) {
  const { data = [], isLoading } = usePrioritarios();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (p) =>
        p.cpf_corrigido?.includes(q) ||
        p.nome?.toLowerCase().includes(q) ||
        p.observacao?.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <SimpleTablePage
      standalone={standalone}
      title="Prioritários"
      subtitle="Clientes prioritários"
      icon={<Star className="h-4 w-4" />}
      isLoading={isLoading}
      rows={filtered}
      page={page}
      pageSize={20}
      onPageChange={setPage}
      search={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      onClear={() => { setSearch(""); setPage(1); }}
      searchPlaceholder="Buscar por CPF, nome ou observação..."
      rowKey={(p) => p.id}
      columns={[
        { header: "CPF", cell: (p) => <span className="font-mono text-xs">{p.cpf_corrigido ? maskCpf(p.cpf_corrigido) : "-"}</span> },
        { header: "Nome", cell: (p) => <span className="font-medium">{p.nome ?? "-"}</span> },
        { header: "Observação", cell: (p) => <span className="text-xs">{p.observacao ?? "-"}</span> },
        { header: "Cadastrado", cell: (p) => new Date(p.created_at).toLocaleDateString("pt-BR") },
      ]}
    />
  );
}
