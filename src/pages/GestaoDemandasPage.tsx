import { useState, useMemo } from "react";
import { useDemandas } from "@/hooks/useDemandas";
import { useOperadores } from "@/hooks/useOperadores";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Pencil, Trash2, Users, Filter } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Demanda } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { createNotification } from "@/hooks/useNotifications";

import { toast } from "sonner";

const formSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  tipo_demanda: z.string().min(1, "Tipo de demanda é obrigatório"),
  tipo_carta: z.string().optional(),
  prioridade: z.string().default("Normal"),
  prazo_execucao: z.string().optional(),
  operador_id: z.string().optional(),
}).refine((data) => {
  if (data.tipo_demanda === "Envio de carta") {
    return !!data.tipo_carta && data.tipo_carta.length > 0;
  }
  return true;
}, {
  message: "Tipo de carta é obrigatório para envio de carta",
  path: ["tipo_carta"],
});

type FormData = z.infer<typeof formSchema>;

const TIPOS_DEMANDA_LEGACY = ["Despacho", "Caderno", "Análise", "Relatório", "Vistoria", "Outros"];
const PRIORIDADES = ["Baixa", "Normal", "Alta", "Urgente"];
const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  "Pendente": "outline",
  "Em Andamento": "secondary",
  "Concluída": "default",
  "Cancelada": "destructive",
};
const STATUS_OPTIONS = ["Todas", "Pendente", "Em Andamento", "Concluída", "Cancelada"];

export default function GestaoDemandasPage() {
  const { data: demandas, isLoading, createDemanda, updateDemanda, deleteDemanda, concluirDemanda, isCreating } = useDemandas();
  const { operadores } = useOperadores();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDemanda, setEditingDemanda] = useState<Demanda | null>(null);
  const [selectedOperador, setSelectedOperador] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("Todas");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      tipo: "",
      tipo_demanda: "Análise",
      tipo_carta: "",
      prioridade: "Normal",
      prazo_execucao: "",
      operador_id: "",
    },
  });

  const tipoDemandaWatch = form.watch("tipo_demanda");

  const onSubmit = async (data: FormData) => {


    if (editingDemanda) {
      updateDemanda({
        id: editingDemanda.id,
        titulo: data.titulo,
        tipo: data.tipo,
        tipo_demanda: data.tipo_demanda,
        tipo_carta: data.tipo_demanda === "Envio de carta" ? (data.tipo_carta || null) : null,
        prioridade: data.prioridade,
        descricao: data.descricao || null,
        operador_id: data.operador_id || null,
        prazo_execucao: data.prazo_execucao || null,
      });
    } else {
      createDemanda({
        titulo: data.titulo,
        tipo: data.tipo,
        tipo_demanda: data.tipo_demanda,
        tipo_carta: data.tipo_demanda === "Envio de carta" ? (data.tipo_carta || null) : null,
        prioridade: data.prioridade,
        status: "Pendente",
        operador_id: data.operador_id || null,
        prazo_execucao: data.prazo_execucao || null,
        descricao: data.descricao || null,
      });
      
      // Send notification to assigned operator
      if (data.operador_id) {
        try {
          await createNotification({
            userId: data.operador_id,
            title: "Nova Demanda Atribuída",
            message: `Você recebeu uma nova demanda: ${data.titulo}`,
            type: "demanda",
            data: { titulo: data.titulo, tipo: data.tipo, prioridade: data.prioridade },
          });
        } catch (error) {
          console.error("Error sending notification:", error);
        }
      }
    }
    setDialogOpen(false);
    setEditingDemanda(null);
    form.reset();
  };

  const handleEdit = (demanda: Demanda) => {
    setEditingDemanda(demanda);
    form.reset({
      titulo: demanda.titulo,
      descricao: demanda.descricao ?? "",
      tipo: demanda.tipo,
      tipo_demanda: demanda.tipo_demanda ?? "Análise",
      tipo_carta: demanda.tipo_carta ?? "",
      prioridade: demanda.prioridade ?? "Normal",
      prazo_execucao: demanda.prazo_execucao ?? "",
      operador_id: demanda.operador_id ?? "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteDemanda(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const openNewDialog = () => {
    setEditingDemanda(null);
    form.reset();
    setDialogOpen(true);
  };

  // Group demandas by operador
  const demandasByOperador = useMemo(() => {
    return demandas.reduce((acc, d) => {
      const key = d.operador_id ?? "sem_atribuicao";
      if (!acc[key]) acc[key] = [];
      acc[key].push(d);
      return acc;
    }, {} as Record<string, Demanda[]>);
  }, [demandas]);

  // Get filtered demandas for table view
  const filteredDemandas = useMemo(() => {
    let result = [...demandas];
    
    if (selectedOperador !== "all") {
      if (selectedOperador === "sem_atribuicao") {
        result = result.filter(d => !d.operador_id);
      } else {
        result = result.filter(d => d.operador_id === selectedOperador);
      }
    }
    
    if (statusFilter !== "Todas") {
      result = result.filter(d => d.status === statusFilter);
    }
    
    return result;
  }, [demandas, selectedOperador, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Demandas por Operador</h2>
            <p className="text-sm text-muted-foreground">
              Distribua e gerencie as atividades da equipe
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Demanda
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDemanda ? "Editar Demanda" : "Nova Demanda"}</DialogTitle>
                <DialogDescription>
                  Preencha as informações para {editingDemanda ? "atualizar a" : "criar uma nova"} demanda
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="titulo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIPOS_DEMANDA_LEGACY.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tipo_demanda"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Demanda</FormLabel>
                          <Select onValueChange={(val) => {
                            field.onChange(val);
                            if (val !== "Envio de carta") {
                              form.setValue("tipo_carta", "");
                            }
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Envio de carta">Envio de carta</SelectItem>
                              <SelectItem value="Análise">Análise</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {tipoDemandaWatch === "Envio de carta" && (
                    <FormField
                      control={form.control}
                      name="tipo_carta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Carta</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de carta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["Futuro Pleito", "Sem casa", "Sem documento de posse", "Sem critério", "Orçamento", "Suspensão de Obra", "Retomada de Obra"].map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="prioridade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridade</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PRIORIDADES.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="prazo_execucao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo de Execução</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="operador_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {operadores.map((op) => (
                                <SelectItem key={op.user_id} value={op.user_id}>
                                  {op.full_name || "Sem nome"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingDemanda ? "Salvar" : "Criar"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards - Updated to use filteredDemandas */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredDemandas.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {filteredDemandas.filter(d => d.status === "Pendente").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary-foreground">
                {filteredDemandas.filter(d => d.status === "Em Andamento").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {filteredDemandas.filter(d => d.status === "Concluída").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="todas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="todas">Todas as Demandas</TabsTrigger>
            <TabsTrigger value="por-pessoa">Por Pessoa</TabsTrigger>
          </TabsList>

          <TabsContent value="todas" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="operador-filter" className="text-sm text-muted-foreground whitespace-nowrap">
                      Responsável:
                    </Label>
                    <Select value={selectedOperador} onValueChange={setSelectedOperador}>
                      <SelectTrigger className="w-[200px]" id="operador-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="sem_atribuicao">Sem atribuição</SelectItem>
                        {operadores.map((op) => (
                          <SelectItem key={op.user_id} value={op.user_id}>
                            {op.full_name || "Sem nome"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="status-filter" className="text-sm text-muted-foreground whitespace-nowrap">
                      Status:
                    </Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]" id="status-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>Demandas ({filteredDemandas.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDemandas.map((demanda) => {
                      const operador = operadores.find(o => o.user_id === demanda.operador_id);
                      return (
                        <TableRow key={demanda.id}>
                          <TableCell className="font-medium">{demanda.titulo}</TableCell>
                          <TableCell>{demanda.tipo}</TableCell>
                          <TableCell>
                            <Badge variant={demanda.prioridade === "Urgente" ? "destructive" : "secondary"}>
                              {demanda.prioridade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_COLORS[demanda.status ?? "Pendente"]}>
                              {demanda.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {demanda.prazo_execucao 
                              ? format(new Date(demanda.prazo_execucao), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell>{operador?.full_name ?? "Não atribuído"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(demanda)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(demanda.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredDemandas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma demanda encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="por-pessoa" className="space-y-4">
            {/* Demandas agrupadas por pessoa */}
            {operadores.map((operador) => {
              const demandasOperador = demandasByOperador[operador.user_id] ?? [];
              if (demandasOperador.length === 0) return null;
              
              return (
                <Card key={operador.user_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {operador.full_name || "Sem nome"}
                    </CardTitle>
                    <CardDescription>
                      {demandasOperador.length} demanda(s) - 
                      {demandasOperador.filter(d => d.status === "Pendente").length} pendente(s), 
                      {demandasOperador.filter(d => d.status === "Em Andamento").length} em andamento,
                      {demandasOperador.filter(d => d.status === "Concluída").length} concluída(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Prioridade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Prazo</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {demandasOperador.map((demanda) => (
                          <TableRow key={demanda.id}>
                            <TableCell className="font-medium">{demanda.titulo}</TableCell>
                            <TableCell>{demanda.tipo}</TableCell>
                            <TableCell>
                              <Badge variant={demanda.prioridade === "Urgente" ? "destructive" : "secondary"}>
                                {demanda.prioridade}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={STATUS_COLORS[demanda.status ?? "Pendente"]}>
                                {demanda.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {demanda.prazo_execucao 
                                ? format(new Date(demanda.prazo_execucao), "dd/MM/yyyy", { locale: ptBR })
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(demanda)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(demanda.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}

            {/* Demandas sem atribuição */}
            {demandasByOperador["sem_atribuicao"]?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-5 w-5" />
                    Sem atribuição
                  </CardTitle>
                  <CardDescription>
                    {demandasByOperador["sem_atribuicao"].length} demanda(s) não atribuída(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prazo</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demandasByOperador["sem_atribuicao"].map((demanda) => (
                        <TableRow key={demanda.id}>
                          <TableCell className="font-medium">{demanda.titulo}</TableCell>
                          <TableCell>{demanda.tipo}</TableCell>
                          <TableCell>
                            <Badge variant={demanda.prioridade === "Urgente" ? "destructive" : "secondary"}>
                              {demanda.prioridade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_COLORS[demanda.status ?? "Pendente"]}>
                              {demanda.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {demanda.prazo_execucao 
                              ? format(new Date(demanda.prazo_execucao), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(demanda)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(demanda.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
      </Tabs>
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
