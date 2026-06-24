import { useState } from "react";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SimpleTablePage, type SortDir } from "@/components/tables/SimpleTablePage";
import { RowDetailDrawer } from "@/components/tables/RowDetailDrawer";
import { EntityFormDialog } from "@/components/tables/EntityFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useObras, useObraMutations } from "@/hooks/useTabelasOperacionais";
import { useUserRole } from "@/hooks/useUserRole";
import { obraSchema, type ObraFormData } from "@/lib/schemas/operacionais";
import type { Obra } from "@/types/database";

const PAGE_SIZE = 20;

export default function ObrasPage({ standalone = false }: { standalone?: boolean }) {
  const { canEdit } = useUserRole();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState("num_obra");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useObras({ page, pageSize: PAGE_SIZE, search, sortField, sortDir, filters });
  const { create, update, remove } = useObraMutations();

  const [selected, setSelected] = useState<Obra | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Obra | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const submit = async (values: ObraFormData) => {
    if (editing) await update.mutateAsync({ id_obra: editing.id_obra, ...values });
    else await create.mutateAsync(values);
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <>
      <SimpleTablePage<Obra>
        standalone={standalone}
        title="Obras"
        subtitle="Tabela de obras"
        icon={<Building2 className="h-4 w-4" />}
        isLoading={isLoading}
        rows={data?.rows ?? []}
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
        onNew={canEdit ? () => { setEditing(null); setFormOpen(true); } : undefined}
        newLabel="Nova Obra"
        rowKey={(o) => o.id_obra}
        columns={[
          { header: "ID", sortField: "id_obra", cell: (o) => <span className="font-mono text-xs">{o.id_obra}</span> },
          { header: "Num Obra", sortField: "num_obra", cell: (o) => <span className="font-mono">{o.num_obra ?? "-"}</span> },
          { header: "Status", sortField: "status", cell: (o) => <Badge variant="outline">{o.status ?? "-"}</Badge> },
          { header: "SIGCO", sortField: "sigco", cell: (o) => o.sigco ?? "-" },
          { header: "Atualizado", sortField: "updated_at", cell: (o) => new Date(o.updated_at).toLocaleDateString("pt-BR") },
        ]}
      />

      <RowDetailDrawer
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={selected?.num_obra ?? "Obra"}
        subtitle={`ID ${selected?.id_obra ?? ""}`}
        canEdit={canEdit}
        canDelete={canEdit}
        onEdit={() => { if (selected) { setEditing(selected); setFormOpen(true); setSelected(null); } }}
        onDelete={() => { if (selected) { setDeleteId(selected.id_obra); setSelected(null); } }}
        fields={selected ? [
          { label: "Num Obra", value: selected.num_obra },
          { label: "Status", value: selected.status },
          { label: "SIGCO", value: selected.sigco },
          { label: "Criado em", value: new Date(selected.created_at).toLocaleString("pt-BR") },
          { label: "Atualizado em", value: new Date(selected.updated_at).toLocaleString("pt-BR") },
        ] : []}
      />

      <EntityFormDialog<ObraFormData>
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        title={editing ? "Editar Obra" : "Nova Obra"}
        schema={obraSchema}
        defaultValues={{
          num_obra: editing?.num_obra ?? "",
          status: editing?.status ?? "",
          sigco: (editing?.sigco ?? "") as unknown as number,
        }}
        fields={[
          { name: "num_obra", label: "Número da Obra", placeholder: "ex: 123456" },
          { name: "status", label: "Status", placeholder: "ex: Pendente" },
          { name: "sigco", label: "SIGCO", type: "number" },
        ]}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir obra?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação fará uma exclusão lógica do registro.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { if (deleteId !== null) { await remove.mutateAsync(deleteId); setDeleteId(null); } }}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
