import { useState } from "react";
import { Star } from "lucide-react";
import { SimpleTablePage, type SortDir } from "@/components/tables/SimpleTablePage";
import { RowDetailDrawer } from "@/components/tables/RowDetailDrawer";
import { EntityFormDialog } from "@/components/tables/EntityFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePrioritarios, usePrioritarioMutations } from "@/hooks/useTabelasOperacionais";
import { useUserRole } from "@/hooks/useUserRole";
import { prioritarioSchema, type PrioritarioFormData } from "@/lib/schemas/operacionais";
import { maskCpf } from "@/lib/cpfMask";
import type { Prioritario } from "@/types/database";

const PAGE_SIZE = 20;

export default function PrioritariosPage({ standalone = false }: { standalone?: boolean }) {
  const { canEdit } = useUserRole();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePrioritarios({ page, pageSize: PAGE_SIZE, search, sortField, sortDir, filters });
  const { create, update, remove } = usePrioritarioMutations();

  const [selected, setSelected] = useState<Prioritario | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Prioritario | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const submit = async (values: PrioritarioFormData) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...values });
    else await create.mutateAsync(values);
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <>
      <SimpleTablePage<Prioritario>
        standalone={standalone}
        title="Prioritários"
        subtitle="Clientes prioritários"
        icon={<Star className="h-4 w-4" />}
        isLoading={isLoading}
        rows={data?.rows ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Buscar por CPF, nome ou observação..."
        columnFilters={[
          { field: "nome", label: "Nome" },
          { field: "cpf_corrigido", label: "CPF" },
        ]}
        filterValues={filters}
        onFilterChange={(f, v) => { setFilters((p) => ({ ...p, [f]: v })); setPage(1); }}
        sortField={sortField}
        sortDir={sortDir}
        onSortChange={(f, d) => { setSortField(f); setSortDir(d); }}
        onClear={() => { setSearch(""); setFilters({}); setPage(1); }}
        onRowClick={(p) => setSelected(p)}
        onNew={canEdit ? () => { setEditing(null); setFormOpen(true); } : undefined}
        newLabel="Novo Prioritário"
        rowKey={(p) => p.id}
        columns={[
          { header: "CPF", sortField: "cpf_corrigido", cell: (p) => <span className="font-mono text-xs">{p.cpf_corrigido ? maskCpf(p.cpf_corrigido) : "-"}</span> },
          { header: "Nome", sortField: "nome", cell: (p) => <span className="font-medium">{p.nome ?? "-"}</span> },
          { header: "Observação", cell: (p) => <span className="text-xs">{p.observacao ?? "-"}</span> },
          { header: "Cadastrado", sortField: "created_at", cell: (p) => new Date(p.created_at).toLocaleDateString("pt-BR") },
        ]}
      />

      <RowDetailDrawer
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={selected?.nome ?? "Prioritário"}
        subtitle={selected?.cpf_corrigido ? maskCpf(selected.cpf_corrigido) : ""}
        canEdit={canEdit}
        canDelete={canEdit}
        onEdit={() => { if (selected) { setEditing(selected); setFormOpen(true); setSelected(null); } }}
        onDelete={() => { if (selected) { setDeleteId(selected.id); setSelected(null); } }}
        fields={selected ? [
          { label: "Nome", value: selected.nome },
          { label: "CPF", value: selected.cpf_corrigido ? maskCpf(selected.cpf_corrigido) : null },
          { label: "Observação", value: selected.observacao, full: true },
          { label: "Cadastrado", value: new Date(selected.created_at).toLocaleString("pt-BR") },
        ] : []}
      />

      <EntityFormDialog<PrioritarioFormData>
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        title={editing ? "Editar Prioritário" : "Novo Prioritário"}
        schema={prioritarioSchema}
        defaultValues={{
          nome: editing?.nome ?? "",
          cpf_corrigido: editing?.cpf_corrigido ?? "",
          observacao: editing?.observacao ?? "",
          endereco: "",
        }}
        fields={[
          { name: "nome", label: "Nome" },
          { name: "cpf_corrigido", label: "CPF", placeholder: "000.000.000-00" },
          { name: "observacao", label: "Observação", type: "textarea" },
          { name: "endereco", label: "Endereço" },
        ]}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prioritário?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { if (deleteId) { await remove.mutateAsync(deleteId); setDeleteId(null); } }}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
