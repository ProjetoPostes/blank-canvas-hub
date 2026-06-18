import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, X, Loader2, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { useOperadores } from "@/hooks/useOperadores";
import { useDemandas, TIPOS_CARTA } from "@/hooks/useDemandas";
import { createNotification } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { readExcelFile } from "@/lib/excelUtils";

interface EnviarOsObrasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: Array<{ numos: number; numobra?: string | number | null; nomecli?: string | null }>;
  onClearSelection: () => void;
}

const PRIORIDADES = ["Baixa", "Normal", "Alta", "Urgente"];

export function EnviarOsObrasDialog({
  open,
  onOpenChange,
  selectedItems,
  onClearSelection,
}: EnviarOsObrasDialogProps) {
  const { operadores, isLoading: loadingOperadores } = useOperadores();
  const { createDemanda, isCreating } = useDemandas();
  const [tipoEnvio, setTipoEnvio] = useState<"os" | "obra">("os");
  const [tipoDemanda, setTipoDemanda] = useState<string>("Envio de carta");
  const [tipoCarta, setTipoCarta] = useState<string>("");
  const [operadorId, setOperadorId] = useState<string>("");
  const [prioridade, setPrioridade] = useState("Normal");
  const [prazo, setPrazo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [xlsxItems, setXlsxItems] = useState<Array<{ numos?: number; numobra?: number }>>([]);
  const [xlsxFileName, setXlsxFileName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"selecao" | "xlsx">("selecao");

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setXlsxFileName(file.name);

    readExcelFile(file)
      .then((jsonData) => {
        const items: Array<{ numos?: number; numobra?: number }> = [];

        jsonData.forEach((row) => {
          // Try to find NUMOS column (case insensitive)
          const numosKey = Object.keys(row).find(
            (k) => k.toLowerCase() === "numos" || k.toLowerCase() === "os"
          );
          const numObraKey = Object.keys(row).find(
            (k) => k.toLowerCase() === "numobra" || k.toLowerCase() === "obra" || k.toLowerCase() === "num_obra"
          );

          const numos = numosKey ? Number(row[numosKey]) : undefined;
          const numobra = numObraKey ? Number(row[numObraKey]) : undefined;

          if (numos || numobra) {
            items.push({ numos, numobra });
          }
        });

        if (items.length === 0) {
          toast.error("Nenhuma OS ou Obra encontrada no arquivo. Verifique se o arquivo possui colunas 'NUMOS' ou 'NUMOBRA'.");
          return;
        }

        setXlsxItems(items);
        toast.success(`${items.length} itens carregados do arquivo`);
      })
      .catch((error) => {
        toast.error("Erro ao processar arquivo Excel");
        console.error(error);
      });
  }, []);

  const clearXlsx = () => {
    setXlsxItems([]);
    setXlsxFileName("");
  };

  const getItemsToSend = () => {
    if (activeTab === "xlsx") {
      return xlsxItems;
    }
    return selectedItems;
  };

  const handleSubmit = () => {
    if (!operadorId) {
      toast.error("Selecione um responsável");
      return;
    }

    if (tipoDemanda === "Envio de carta" && !tipoCarta) {
      toast.error("Selecione o tipo de carta");
      return;
    }

    const items = getItemsToSend();
    if (items.length === 0) {
      toast.error("Nenhum item selecionado para enviar");
      return;
    }

    // Create the title based on selection
    const tipoLabel = tipoEnvio === "os" ? "OS" : "Obra";
    const itemsList =
      tipoEnvio === "os"
        ? items
            .filter((i) => "numos" in i && i.numos)
            .map((i) => ("numos" in i ? i.numos : ""))
            .slice(0, 5)
            .join(", ")
        : items
            .filter((i) => "numobra" in i && i.numobra)
            .map((i) => ("numobra" in i ? i.numobra : ""))
            .slice(0, 5)
            .join(", ");

    const suffix = items.length > 5 ? ` e mais ${items.length - 5}` : "";
    const titulo = `Tratativa de ${tipoLabel}: ${itemsList}${suffix}`;

    // Build description with all items
    const fullList =
      tipoEnvio === "os"
        ? items.filter((i) => "numos" in i && i.numos).map((i) => ("numos" in i ? i.numos : ""))
        : items.filter((i) => "numobra" in i && i.numobra).map((i) => ("numobra" in i ? i.numobra : ""));

    const descBase = `**${tipoLabel}s para tratativa:**\n${fullList.join(", ")}`;
    const fullDescricao = descricao ? `${descBase}\n\n**Observação:**\n${descricao}` : descBase;

    createDemanda({
      titulo,
      descricao: fullDescricao,
      tipo: "Caderno",
      tipo_demanda: tipoDemanda,
      tipo_carta: tipoDemanda === "Envio de carta" ? tipoCarta : null,
      prioridade,
      prazo_execucao: prazo || null,
      operador_id: operadorId,
      status: "Pendente",
    });

    // Send notification to the assigned operator
    const operadorName = operadores.find(op => op.user_id === operadorId)?.full_name || "Responsável";
    createNotification({
      userId: operadorId,
      title: "Nova Demanda Atribuída",
      message: `Você recebeu uma nova demanda: ${titulo}`,
      type: "demanda",
      data: { tipo: tipoEnvio, quantidade: items.length },
    }).catch(console.error);

    // Close dialog and clear
    onOpenChange(false);
    onClearSelection();
    setXlsxItems([]);
    setXlsxFileName("");
    setDescricao("");
    setPrazo("");
    setOperadorId("");
    setPrioridade("Normal");
    setTipoDemanda("Envio de carta");
    setTipoCarta("");
  };

  const items = getItemsToSend();
  const totalOs = items.filter((i) => "numos" in i && i.numos).length;
  const totalObras = items.filter((i) => "numobra" in i && i.numobra).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Enviar para Tratativa</DialogTitle>
          <DialogDescription>
            Selecione OSs ou Obras do Caderno para enviar ao operador responsável
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "selecao" | "xlsx")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="selecao">
              Seleção Manual ({selectedItems.length})
            </TabsTrigger>
            <TabsTrigger value="xlsx">
              Upload Excel ({xlsxItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="selecao" className="space-y-4">
            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum item selecionado.</p>
                <p className="text-sm mt-1">
                  Selecione itens na tabela marcando as checkboxes e clique em "Enviar para Tratativa"
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[200px] border rounded-md p-3">
                <div className="flex flex-wrap gap-2">
                  {selectedItems.map((item, i) => (
                    <Badge key={i} variant="secondary">
                      OS {item.numos}
                      {item.numobra && ` | Obra ${item.numobra}`}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="xlsx" className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {xlsxFileName ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">{xlsxFileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {xlsxItems.length} itens carregados
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={clearXlsx} className="ml-2">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[120px] border rounded-md p-2 mt-2">
                    <div className="flex flex-wrap gap-1">
                      {xlsxItems.slice(0, 50).map((item, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {item.numos && `OS ${item.numos}`}
                          {item.numobra && ` Obra ${item.numobra}`}
                        </Badge>
                      ))}
                      {xlsxItems.length > 50 && (
                        <Badge variant="outline" className="text-xs">
                          +{xlsxItems.length - 50} mais
                        </Badge>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-2 font-medium">Clique para selecionar arquivo Excel</p>
                  <p className="text-sm text-muted-foreground">
                    O arquivo deve conter coluna NUMOS ou NUMOBRA
                  </p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Demanda *</Label>
              <Select value={tipoDemanda} onValueChange={(v) => {
                setTipoDemanda(v);
                if (v !== "Envio de carta") setTipoCarta("");
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Envio de carta">Envio de carta</SelectItem>
                  <SelectItem value="Análise">Análise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tipoDemanda === "Envio de carta" && (
              <div className="space-y-2">
                <Label>Tipo de Carta *</Label>
                <Select value={tipoCarta} onValueChange={setTipoCarta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CARTA.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Envio</Label>
              <Select value={tipoEnvio} onValueChange={(v) => setTipoEnvio(v as "os" | "obra")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="os">Por OS ({totalOs})</SelectItem>
                  <SelectItem value="obra">Por Obra ({totalObras})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Select value={operadorId} onValueChange={setOperadorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingOperadores ? (
                    <SelectItem value="loading" disabled>
                      Carregando...
                    </SelectItem>
                  ) : (
                    operadores.map((op) => (
                      <SelectItem key={op.user_id} value={op.user_id}>
                        {op.full_name || "Sem nome"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo de Execução</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Instruções ou observações adicionais..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating || items.length === 0}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Enviar para Tratativa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
