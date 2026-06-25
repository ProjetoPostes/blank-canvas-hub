import { useState } from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SimpleTablePage, type SortDir } from "@/components/tables/SimpleTablePage";
import { RowDetailDrawer } from "@/components/tables/RowDetailDrawer";
import { usePrioritarios } from "@/hooks/useTabelasOperacionais";
import { maskCpf } from "@/lib/cpfMask";
import type { Prioritario } from "@/types/database";

const PAGE_SIZE = 20;

// Extended row — DB has more columns than the typed schema reveals
type PrioritarioRowExt = Prioritario & {
  controle?: string | null;
  tranche?: string | null;
  identificacao?: string | null;
  alocacao?: string | null;
  check_po?: string | null;
  criterio?: string | null;
  motivo_impedimento?: string | null;
};

export default function PrioritariosPage({ standalone = false }: { standalone?: boolean }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePrioritarios({ page, pageSize: PAGE_SIZE, search, sortField, sortDir, filters });
  const rows = (data?.rows ?? []) as PrioritarioRowExt[];
  const [selected, setSelected] = useState<PrioritarioRowExt | null>(null);

  const cell = (v?: string | null) => <span className="text-xs">{v ?? "-"}</span>;

  return (
    <>
      <SimpleTablePage<PrioritarioRowExt>
        standalone={standalone}
        title="Prioritários"
        subtitle="Clientes prioritários"
        icon={<Star className="h-4 w-4" />}
        isLoading={isLoading}
        rows={rows}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Buscar..."
        columnFilters={[
          { field: "controle", label: "Controle" },
          { field: "tranche", label: "Tranche" },
          { field: "identificacao", label: "Identificação" },
          { field: "alocacao", label: "Alocação" },
          { field: "nome", label: "Nome" },
          { field: "cpf_corrigido", label: "CPF Corrigido" },
          { field: "check_po", label: "Check PO" },
          { field: "criterio", label: "Critério" },
          { field: "motivo_impedimento", label: "Motivo Impedimento" },
        ]}
        filterValues={filters}
        onFilterChange={(f, v) => { setFilters((p) => ({ ...p, [f]: v })); setPage(1); }}
        sortField={sortField}
        sortDir={sortDir}
        onSortChange={(f, d) => { setSortField(f); setSortDir(d); }}
        onClear={() => { setSearch(""); setFilters({}); setPage(1); }}
        onRowClick={(p) => setSelected(p)}
        rowKey={(p) => p.id}
        columns={[
          { header: "Controle", sortField: "controle", className: "text-xs", cell: (p) => cell(p.controle) },
          { header: "Tranche", sortField: "tranche", className: "text-xs", cell: (p) => cell(p.tranche) },
          { header: "Identificação", sortField: "identificacao", className: "text-xs", cell: (p) => cell(p.identificacao) },
          { header: "Alocação", sortField: "alocacao", className: "text-xs", cell: (p) => cell(p.alocacao) },
          { header: "Nome", sortField: "nome", className: "text-xs", cell: (p) => <span className="text-xs font-medium">{p.nome ?? "-"}</span> },
          { header: "CPF Corrigido", sortField: "cpf_corrigido", className: "text-xs", cell: (p) => <span className="font-mono text-xs">{p.cpf_corrigido ? maskCpf(p.cpf_corrigido) : "-"}</span> },
          { header: "Check PO", sortField: "check_po", className: "text-xs", cell: (p) => p.check_po ? <Badge variant="outline" className="text-xs">{p.check_po}</Badge> : <span className="text-xs">-</span> },
          { header: "Critério", sortField: "criterio", className: "text-xs", cell: (p) => cell(p.criterio) },
          { header: "Motivo Impedimento", sortField: "motivo_impedimento", className: "text-xs", cell: (p) => cell(p.motivo_impedimento) },
        ]}
      />

      <RowDetailDrawer
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={selected?.nome ?? "Prioritário"}
        subtitle={selected?.cpf_corrigido ? maskCpf(selected.cpf_corrigido) : ""}
        canEdit={false}
        canDelete={false}
        fields={selected ? [
          { label: "Controle", value: selected.controle ?? null },
          { label: "Tranche", value: selected.tranche ?? null },
          { label: "Identificação", value: selected.identificacao ?? null },
          { label: "Alocação", value: selected.alocacao ?? null },
          { label: "Nome", value: selected.nome },
          { label: "CPF Corrigido", value: selected.cpf_corrigido ? maskCpf(selected.cpf_corrigido) : null },
          { label: "Check PO", value: selected.check_po ?? null },
          { label: "Critério", value: selected.criterio ?? null },
          { label: "Motivo Impedimento", value: selected.motivo_impedimento ?? null, full: true },
          { label: "Observação", value: selected.observacao, full: true },
          { label: "Cadastrado", value: new Date(selected.created_at).toLocaleString("pt-BR") },
        ] : []}
      />
    </>
  );
}
