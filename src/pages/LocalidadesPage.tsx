import { useState } from "react";
import { MapPin } from "lucide-react";
import { SimpleTablePage, type SortDir } from "@/components/tables/SimpleTablePage";
import { RowDetailDrawer } from "@/components/tables/RowDetailDrawer";
import { EntityFormDialog } from "@/components/tables/EntityFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocalidades, useLocalidadeMutations } from "@/hooks/useTabelasOperacionais";
import { useUserRole } from "@/hooks/useUserRole";
import { localidadeSchema, type LocalidadeFormData } from "@/lib/schemas/operacionais";
import type { Localidade } from "@/types/database";

const PAGE_SIZE = 20;

export default function LocalidadesPage({ standalone = false }: { standalone?: boolean }) {
  const { canEdit } = useUserRole();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState("nome_lcd");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useLocalidades({ page, pageSize: PAGE_SIZE, search, sortField, sortDir, filters });
  const { create, update, remove } = useLocalidadeMutations();

  const [selected, setSelected] = useState<Localidade | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Localidade | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const submit = async (values: LocalidadeFormData) => {
    if (editing) await update.mutateAsync({ id_loc: editing.id_loc, ...values });
    else await create.mutateAsync(values);
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <>
      <SimpleTablePage<Localidade>
        standalone={standalone}
        title="Localidades"
        subtitle="Tabela de localidades"
        icon={<MapPin className="h-4 w-4" />}
        isLoading={isLoading}
        rows={data?.rows ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Buscar por código, nome ou regional..."
        columnFilters={[
          { field: "cod_lcd", label: "Código" },
          { field: "nome_lcd", label: "Nome" },
          { field: "regional", label: "Regional" },
        ]}
        filterValues={filters}
        onFilterChange={(f, v) => { setFilters((p) => ({ ...p, [f]: v })); setPage(1); }}
        sortField={sortField}
        sortDir={sortDir}
        onSortChange={(f, d) => { setSortField(f); setSortDir(d); }}
        onClear={() => { setSearch(""); setFilters({}); setPage(1); }}
        onRowClick={(l) => setSelected(l)}
        onNew={canEdit ? () => { setEditing(null); setFormOpen(true); } : undefined}
        newLabel="Nova Localidade"
        rowKey={(l) => l.id_loc}
        columns={[
          { header: "ID", sortField: "id_loc", cell: (l) => <span className="font-mono text-xs">{l.id_loc}</span> },
          { header: "Código", sortField: "cod_lcd", cell: (l) => <span className="font-mono">{l.cod_lcd ?? "-"}</span> },
          { header: "Nome", sortField: "nome_lcd", cell: (l) => l.nome_lcd ?? "-" },
          { header: "Regional", sortField: "regional", cell: (l) => l.regional ?? "-" },
        ]}
      />

      <RowDetailDrawer
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={selected?.nome_lcd ?? "Localidade"}
        subtitle={selected?.cod_lcd ?? ""}
        canEdit={canEdit}
        canDelete={canEdit}
        onEdit={() => { if (selected) { setEditing(selected); setFormOpen(true); setSelected(null); } }}
        onDelete={() => { if (selected) { setDeleteId(selected.id_loc); setSelected(null); } }}
        fields={selected ? [
          { label: "Código", value: selected.cod_lcd },
          { label: "Nome", value: selected.nome_lcd },
          { label: "Regional", value: selected.regional },
          { label: "Criado em", value: new Date(selected.created_at).toLocaleString("pt-BR") },
        ] : []}
      />

      <EntityFormDialog<LocalidadeFormData>
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        title={editing ? "Editar Localidade" : "Nova Localidade"}
        schema={localidadeSchema}
        defaultValues={{
          cod_lcd: editing?.cod_lcd ?? "",
          nome_lcd: editing?.nome_lcd ?? "",
          regional: editing?.regional ?? "",
        }}
        fields={[
          { name: "cod_lcd", label: "Código", placeholder: "ex: 0123" },
          { name: "nome_lcd", label: "Nome" },
          { name: "regional", label: "Regional" },
        ]}
        onSubmit={submit}
        submitting={create.isPending || update.isPending}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir localidade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription>
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
