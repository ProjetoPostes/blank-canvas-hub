import { useState, useMemo } from "react";
import { useCaderno } from "@/hooks/useCaderno";
import { useUserRole } from "@/hooks/useUserRole";
import { Caderno as CadernoType } from "@/types/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Search, X, ChevronLeft, ChevronRight, Download, Loader2, Eye, Send } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { exportToExcel } from "@/lib/excelUtils";
import { toast } from "sonner";
import { DemandaDetailDialog } from "@/components/DemandaDetailDialog";
import { OsSelectionDialog } from "@/components/OsSelectionDialog";
import { EnviarOsObrasDialog } from "@/components/EnviarOsObrasDialog";
import { BulkEditCadernoDialog } from "@/components/BulkEditCadernoDialog";
import { maskCpf } from "@/lib/cpfMask";
import { Caderno as CadernoDBType } from "@/types/database";

const formSchema = z.object({
  numos: z.number(),
  numobra: z.string().nullable(),
  status: z.string().nullable(),
  nomelcd: z.string().nullable(),
  regional: z.string().nullable(),
  controle_os: z.string().nullable(),
  origem: z.string().nullable(),
  prazo: z.string().nullable(),
  nomecli: z.string().nullable(),
  numcpf: z.string().nullable(),
  dth_nascimento: z.string().nullable(),
  email: z.string().nullable(),
  numtel: z.string().nullable(),
  numtel2: z.string().nullable(),
  complemento: z.string().nullable(),
  dsclgr_os: z.string().nullable(),
  datasol: z.string().nullable(),
  datacontab: z.string().nullable(),
  data_766: z.string().nullable(),
  dataprev: z.string().nullable(),
  datatertrab: z.string().nullable(),
  dth_envio_dineng: z.string().nullable(),
  dth_retorno_dineng: z.string().nullable(),
  dth_impedimento: z.string().nullable(),
  motivo_improcedencia: z.string().nullable(),
  pendencia_obra: z.string().nullable(),
  criterio: z.string().nullable(),
  tipo_carta_enviada: z.string().nullable(),
  base_5311: z.string().nullable(),
  tranche: z.string().nullable(),
  responsavel: z.string().nullable(),
  prioridade: z.string().nullable(),
  observacao: z.string().nullable(),
  empreiteira: z.string().nullable(),
  data_recebimento: z.string().nullable(),
  bloco_cliente: z.string().nullable(),
  data_carta: z.string().nullable(),
});

type FormData = z.infer<typeof formSchema>;

const ITEMS_PER_PAGE = 20;

export default function Caderno() {
  const { data, isLoading, updateCaderno, bulkUpdateCaderno, isBulkUpdating } = useCaderno(1000);
  const { canEdit, isAdmin, isOperadorChefe } = useUserRole();
  const canEditPrioridade = isAdmin || isOperadorChefe;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRegional, setFilterRegional] = useState<string>("all");
  const [filterTranche, setFilterTranche] = useState<string>("all");
  const [filterTipoCarta, setFilterTipoCarta] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CadernoType | null>(null);
  const [selectedItems, setSelectedItems] = useState<CadernoType[]>([]);
  const [enviarDialogOpen, setEnviarDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);

  const handleBulkUpdate = async (updates: Partial<CadernoDBType>) => {
    const ids = selectedItems.map((item) => item.id);
    return await bulkUpdateCaderno({ ids, updates });
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const filteredData = useMemo(() => {
    let result = [...data];
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.numos.toString().includes(search) ||
          item.nomecli?.toLowerCase().includes(searchLower) ||
          item.numcpf?.includes(search)
      );
    }
    if (filterStatus !== "all") {
      result = result.filter((item) => item.status === filterStatus);
    }
    if (filterRegional !== "all") {
      result = result.filter((item) => item.regional === filterRegional);
    }
    if (filterTranche !== "all") {
      result = result.filter((item) => item.tranche === filterTranche);
    }
    if (filterTipoCarta !== "all") {
      result = result.filter((item) => item.tipo_carta_enviada === filterTipoCarta);
    }
    return result;
  }, [data, search, filterStatus, filterRegional, filterTranche, filterTipoCarta]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterRegional("all");
    setFilterTranche("all");
    setFilterTipoCarta("all");
    setCurrentPage(1);
  };

  const handleEdit = (item: CadernoType) => {
    setSelectedItem(item);
    form.reset({
      numos: item.numos,
      numobra: item.numobra,
      status: item.status,
      nomelcd: item.nomelcd,
      regional: item.regional,
      controle_os: item.controle_os,
      origem: item.origem,
      prazo: item.prazo,
      nomecli: item.nomecli,
      numcpf: item.numcpf,
      dth_nascimento: item.dth_nascimento,
      email: item.email,
      numtel: item.numtel,
      numtel2: item.numtel2,
      complemento: item.complemento,
      dsclgr_os: item.dsclgr_os,
      datasol: item.datasol,
      datacontab: item.datacontab,
      data_766: item.data_766,
      dataprev: item.dataprev,
      datatertrab: item.datatertrab,
      dth_envio_dineng: item.dth_envio_dineng,
      dth_retorno_dineng: item.dth_retorno_dineng,
      dth_impedimento: item.dth_impedimento,
      motivo_improcedencia: item.motivo_improcedencia,
      pendencia_obra: item.pendencia_obra,
      criterio: item.criterio,
      tipo_carta_enviada: item.tipo_carta_enviada,
      base_5311: item.base_5311,
      tranche: item.tranche,
      responsavel: item.responsavel,
      prioridade: item.prioridade,
      observacao: item.observacao,
      empreiteira: item.empreiteira,
      data_recebimento: item.data_recebimento,
      bloco_cliente: item.bloco_cliente,
      data_carta: item.data_carta,
    });
    setEditDrawerOpen(true);
  };

  const onSubmit = async (formData: FormData) => {
    if (!selectedItem || !canEdit) return;
    // Only send editable fields
    const updateData: Record<string, unknown> = {
      motivo_improcedencia: formData.motivo_improcedencia,
      criterio: formData.criterio,
      tipo_carta_enviada: formData.tipo_carta_enviada,
      base_5311: formData.base_5311,
      tranche: formData.tranche,
      responsavel: formData.responsavel,
      observacao: formData.observacao,
      data_carta: formData.data_carta,
    };
    if (canEditPrioridade) {
      updateData.prioridade = formData.prioridade;
    }
    await updateCaderno.mutateAsync({ id: selectedItem.id, ...updateData });
    setEditDrawerOpen(false);
  };

  const handleExport = () => {
    const exportData = filteredData.map((item) => ({
      NUMOS: item.numos,
      NUMOBRA: item.numobra,
      STATUS: item.status,
      REGIONAL: item.regional,
      NOMECLI: item.nomecli,
      NUMCPF: item.numcpf,
      EMAIL: item.email,
      NUMTEL: item.numtel,
      RESPONSAVEL: item.responsavel,
      TRANCHE: item.tranche,
    }));
    exportToExcel(exportData, "Caderno", `caderno_${new Date().toISOString().split("T")[0]}.xlsx`)
      .then(() => toast.success("Dados exportados com sucesso!"))
      .catch((err) => toast.error(`Erro ao exportar: ${err.message}`));
  };

  const handleSelectItem = (item: CadernoType, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, item]);
    } else {
      setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(paginatedData);
    } else {
      setSelectedItems([]);
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const statuses = [...new Set(data.map((d) => d.status).filter(Boolean))];
  const regionais = [...new Set(data.map((d) => d.regional).filter(Boolean))];
  const tranches = [...new Set(data.map((d) => d.tranche).filter(Boolean))];
  const tiposCartas = [...new Set(data.map((d) => d.tipo_carta_enviada).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por OS, Nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  {statuses.map((s) => (<SelectItem key={s} value={s!}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterRegional} onValueChange={setFilterRegional}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Regional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Regionais</SelectItem>
                  {regionais.map((r) => (<SelectItem key={r} value={r!}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterTranche} onValueChange={setFilterTranche}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tranche" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Tranches</SelectItem>
                  {tranches.map((t) => (<SelectItem key={t} value={t!}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterTipoCarta} onValueChange={setFilterTipoCarta}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo Carta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos Carta</SelectItem>
                  {tiposCartas.map((t) => (<SelectItem key={t} value={t!}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={clearFilters}><X className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Exportar</Button>
              {selectedItems.length > 0 && (
                <>
                  {canEdit && (
                    <Button variant="secondary" onClick={() => setBulkEditDialogOpen(true)}>
                      <Pencil className="h-4 w-4 mr-2" />Editar ({selectedItems.length})
                    </Button>
                  )}
                  <Button onClick={() => setEnviarDialogOpen(true)}><Send className="h-4 w-4 mr-2" />Enviar ({selectedItems.length})</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[2400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox checked={paginatedData.length > 0 && paginatedData.every((item) => selectedItems.some((s) => s.id === item.id))} onCheckedChange={handleSelectAll} />
                      </TableHead>
                      <TableHead className="w-[50px]">Ações</TableHead>
                      <TableHead>NUMOS</TableHead>
                      <TableHead>NUMOBRA</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>LCD</TableHead>
                      <TableHead>Regional</TableHead>
                      <TableHead>Controle OS</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Nome Cliente</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Nascimento</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Telefone 2</TableHead>
                      <TableHead>Complemento</TableHead>
                      <TableHead>Logradouro</TableHead>
                      <TableHead>Data Sol</TableHead>
                      <TableHead>Data Ter Trab</TableHead>
                      <TableHead>Data Impedimento</TableHead>
                      <TableHead>Motivo Improcedência</TableHead>
                      <TableHead>Pendência Obra</TableHead>
                      <TableHead>Critério</TableHead>
                      <TableHead>Tipo Carta</TableHead>
                      <TableHead>Base 5311</TableHead>
                      <TableHead>Tranche</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead>Empreiteira</TableHead>
                      <TableHead>Data Carta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow><TableCell colSpan={32} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
                    ) : (
                      paginatedData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell><Checkbox checked={selectedItems.some((s) => s.id === item.id)} onCheckedChange={(checked) => handleSelectItem(item, !!checked)} /></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                              {canEdit ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.numos}</TableCell>
                          <TableCell className="font-mono text-xs">{item.numobra ?? "-"}</TableCell>
                          <TableCell><Badge variant="outline">{item.status ?? "-"}</Badge></TableCell>
                          <TableCell className="text-xs">{item.nomelcd ?? "-"}</TableCell>
                          <TableCell>{item.regional ?? "-"}</TableCell>
                          <TableCell><Badge variant="secondary">{item.controle_os ?? "-"}</Badge></TableCell>
                          <TableCell>{item.origem ?? "-"}</TableCell>
                          <TableCell>{item.prazo ?? "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.nomecli ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{maskCpf(item.numcpf)}</TableCell>
                          <TableCell className="text-xs">{item.dth_nascimento ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.email ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.numtel ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.numtel2 ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.complemento ?? "-"}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{item.dsclgr_os ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.datasol ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.datatertrab ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.dth_impedimento ?? "-"}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{item.motivo_improcedencia ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.pendencia_obra ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.criterio ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.tipo_carta_enviada ?? "-"}</TableCell>
                          <TableCell>{item.base_5311 ?? "-"}</TableCell>
                          <TableCell>{item.tranche ?? "-"}</TableCell>
                          <TableCell>{item.responsavel ?? "-"}</TableCell>
                          <TableCell>{item.prioridade ?? "-"}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{item.observacao ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.empreiteira ?? "-"}</TableCell>
                          <TableCell className="text-xs">{item.data_carta ?? "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">Mostrando {filteredData.length > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de {filteredData.length}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm">Página {currentPage} de {totalPages || 1}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

      <Dialog open={editDrawerOpen} onOpenChange={setEditDrawerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{canEdit ? "Editar Caderno" : "Visualizar Caderno"}</DialogTitle>
            <DialogDescription>{canEdit ? "Campos editáveis destacados abaixo" : "Visualize as informações (somente leitura)"}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                {/* Read-only fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="numos" render={({ field }) => (<FormItem><FormLabel>NUMOS</FormLabel><FormControl><Input {...field} disabled /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="numobra" render={({ field }) => (<FormItem><FormLabel>NUMOBRA</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled /></FormControl></FormItem>)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="controle_os" render={({ field }) => (<FormItem><FormLabel>Controle OS</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled /></FormControl></FormItem>)} />
                </div>
                <FormField control={form.control} name="nomecli" render={({ field }) => (<FormItem><FormLabel>Nome Cliente</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled /></FormControl></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="regional" render={({ field }) => (<FormItem><FormLabel>Regional</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="nomelcd" render={({ field }) => (<FormItem><FormLabel>LCD</FormLabel><FormControl><Input {...field} value={field.value ?? ""} disabled /></FormControl></FormItem>)} />
                </div>

                {/* Editable fields */}
                {canEdit && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Campos Editáveis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="motivo_improcedencia" render={({ field }) => (<FormItem><FormLabel>Motivo Improcedência</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="criterio" render={({ field }) => (<FormItem><FormLabel>Critério</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="tipo_carta_enviada" render={({ field }) => (<FormItem><FormLabel>Tipo Carta</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="base_5311" render={({ field }) => (<FormItem><FormLabel>Base 5311</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="tranche" render={({ field }) => (<FormItem><FormLabel>Tranche</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="responsavel" render={({ field }) => (<FormItem><FormLabel>Responsável</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="observacao" render={({ field }) => (<FormItem><FormLabel>Observação</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="data_carta" render={({ field }) => (<FormItem><FormLabel>Data Carta</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      {canEditPrioridade && (
                        <FormField control={form.control} name="prioridade" render={({ field }) => (<FormItem><FormLabel>Prioridade (Admin/Chefe)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      )}
                    </CardContent>
                  </Card>
                )}

                {canEdit && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="submit" disabled={updateCaderno.isPending}>{updateCaderno.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
                    <Button type="button" variant="outline" onClick={() => setEditDrawerOpen(false)}>Cancelar</Button>
                  </div>
                )}
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      <EnviarOsObrasDialog open={enviarDialogOpen} onOpenChange={setEnviarDialogOpen} selectedItems={selectedItems} onClearSelection={clearSelection} />
      
      <BulkEditCadernoDialog
        open={bulkEditDialogOpen}
        onOpenChange={setBulkEditDialogOpen}
        selectedItems={selectedItems}
        onBulkUpdate={handleBulkUpdate}
        isUpdating={isBulkUpdating}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
