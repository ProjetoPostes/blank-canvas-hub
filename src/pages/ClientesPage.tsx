import { useState, useMemo } from "react";
import { useCaderno } from "@/hooks/useCaderno";
import { useDespacho } from "@/hooks/useDespacho";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyableInput } from "@/components/CopyableInput";
import { Loader2, Search, X, Users, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { maskCpf } from "@/lib/cpfMask";

interface Cliente {
  cpf: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  regional: string | null;
  inBase5311: boolean;
  osCaderno: Array<{ numos: number; numobra: string | null; status: string | null; controle_os: string | null }>;
  osDespacho: Array<{ numos: number; tratativa: string | null; dias_para_despacho: number | null }>;
}

const ITEMS_PER_PAGE = 20;

export default function ClientesPage() {
  const { data: cadernoData, isLoading: isLoadingCaderno } = useCaderno(1000);
  const { data: despachoData, isLoading: isLoadingDespacho } = useDespacho(false);
  const [search, setSearch] = useState("");
  const [filterRegional, setFilterRegional] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Group by CPF to create unique clients
  const clientes = useMemo(() => {
    const clienteMap = new Map<string, Cliente>();

    // Process Caderno records
    cadernoData.forEach((item) => {
      if (!item.numcpf) return;
      
      const existing = clienteMap.get(item.numcpf) || {
        cpf: item.numcpf,
        nome: item.nomecli ?? "Sem nome",
        email: item.email,
        telefone: item.numtel,
        regional: item.regional,
        inBase5311: false,
        osCaderno: [],
        osDespacho: [],
      };

      existing.osCaderno.push({
        numos: item.numos,
        numobra: item.numobra,
        status: item.status,
        controle_os: item.controle_os,
      });

      if (item.nomecli) existing.nome = item.nomecli;
      if (item.email) existing.email = item.email;
      if (item.numtel) existing.telefone = item.numtel;
      if (item.regional) existing.regional = item.regional;
      if (item.in_base_5311) existing.inBase5311 = true;

      clienteMap.set(item.numcpf, existing);
    });

    // Process Despacho records
    despachoData.forEach((item) => {
      if (!item.numcpf) return;

      const existing = clienteMap.get(item.numcpf) || {
        cpf: item.numcpf,
        nome: item.nomecli ?? "Sem nome",
        email: item.email,
        telefone: item.telefone,
        regional: item.regional,
        inBase5311: false,
        osCaderno: [],
        osDespacho: [],
      };

      existing.osDespacho.push({
        numos: item.numos,
        tratativa: item.tratativa,
        dias_para_despacho: item.dias_para_despacho,
      });

      if (item.nomecli) existing.nome = item.nomecli;
      if (item.email) existing.email = item.email;
      if (item.telefone) existing.telefone = item.telefone;
      if (item.regional) existing.regional = item.regional;
      if (item.in_base_5311) existing.inBase5311 = true;

      clienteMap.set(item.numcpf, existing);
    });

    return Array.from(clienteMap.values());
  }, [cadernoData, despachoData]);

  const regionais = useMemo(() => {
    return [...new Set(clientes.map((c) => c.regional).filter(Boolean))];
  }, [clientes]);

  const filteredClientes = useMemo(() => {
    let result = [...clientes];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.cpf.includes(search) ||
          c.nome.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower)
      );
    }

    if (filterRegional !== "all") {
      result = result.filter((c) => c.regional === filterRegional);
    }

    // Sort by name
    result.sort((a, b) => a.nome.localeCompare(b.nome));

    return result;
  }, [clientes, search, filterRegional]);

  const paginatedClientes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClientes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClientes, currentPage]);

  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearch("");
    setFilterRegional("all");
    setCurrentPage(1);
  };

  const handleViewCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setDetailDialogOpen(true);
  };

  const isLoading = isLoadingCaderno || isLoadingDespacho;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clientes no Caderno</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {clientes.filter((c) => c.osCaderno.length > 0).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clientes no Despacho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {clientes.filter((c) => c.osDespacho.length > 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por CPF, Nome ou E-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterRegional} onValueChange={setFilterRegional}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Regional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Regionais</SelectItem>
                  {regionais.map((r) => (
                    <SelectItem key={r} value={r!}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Ações</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Regional</TableHead>
                  <TableHead className="text-center">Base 5311</TableHead>
                  <TableHead className="text-center">OS Caderno</TableHead>
                  <TableHead className="text-center">OS Despacho</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedClientes.map((cliente) => (
                    <TableRow key={cliente.cpf}>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleViewCliente(cliente)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{maskCpf(cliente.cpf)}</TableCell>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell className="text-xs">{cliente.email ?? "-"}</TableCell>
                      <TableCell className="text-xs">{cliente.telefone ?? "-"}</TableCell>
                      <TableCell>{cliente.regional ?? "-"}</TableCell>
                      <TableCell className="text-center">
                        {cliente.inBase5311 ? (
                          <Badge variant="destructive">SIM</Badge>
                        ) : (
                          <Badge variant="outline">NÃO</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={cliente.osCaderno.length > 0 ? "default" : "outline"}>
                          {cliente.osCaderno.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={cliente.osDespacho.length > 0 ? "secondary" : "outline"}>
                          {cliente.osDespacho.length}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {filteredClientes.length > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredClientes.length)} de {filteredClientes.length} clientes
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Detalhes do Cliente
            </DialogTitle>
          </DialogHeader>

          {selectedCliente && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Client Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Informações do Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">CPF</Label>
                      <CopyableInput value={selectedCliente.cpf} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Nome</Label>
                      <CopyableInput value={selectedCliente.nome} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">E-mail</Label>
                      <CopyableInput value={selectedCliente.email} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Telefone</Label>
                      <CopyableInput value={selectedCliente.telefone} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Regional</Label>
                      <CopyableInput value={selectedCliente.regional} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Base 5311</Label>
                      <div>
                        {selectedCliente.inBase5311 ? (
                          <Badge variant="destructive">SIM — Cliente prioritário</Badge>
                        ) : (
                          <Badge variant="outline">NÃO</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* OS Tabs */}
              <Tabs defaultValue="caderno" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="caderno">
                    Caderno ({selectedCliente.osCaderno.length})
                  </TabsTrigger>
                  <TabsTrigger value="despacho">
                    Despacho ({selectedCliente.osDespacho.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="caderno" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>NUMOS</TableHead>
                          <TableHead>Num Obra</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Controle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCliente.osCaderno.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Nenhuma OS no Caderno
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedCliente.osCaderno.map((os) => (
                            <TableRow key={os.numos}>
                              <TableCell className="font-mono">{os.numos}</TableCell>
                              <TableCell className="font-mono">{os.numobra ?? "-"}</TableCell>
                              <TableCell>{os.status ?? "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{os.controle_os ?? "-"}</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="despacho" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>NUMOS</TableHead>
                          <TableHead>Tratativa</TableHead>
                          <TableHead>Dias p/ Despacho</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCliente.osDespacho.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              Nenhuma OS no Despacho
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedCliente.osDespacho.map((os) => (
                            <TableRow key={os.numos}>
                              <TableCell className="font-mono">{os.numos}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{os.tratativa ?? "-"}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={(os.dias_para_despacho ?? 0) > 15 ? "destructive" : "outline"}>
                                  {os.dias_para_despacho ?? 0} dias
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
