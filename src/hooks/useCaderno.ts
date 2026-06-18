import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Caderno } from "@/types/database";
import { toast } from "sonner";
import { mapDatabaseError } from "@/lib/errorHandler";
import { softDelete } from "./useSecurityRpc";

type ImportRow = Record<string, unknown>;

async function upsertCliente(
  cpf: string,
  fields: {
    nome?: string;
    email?: string;
    telefones?: string[];
    dt_nasc?: string | null;
  },
): Promise<number | null> {
  const cleanCpf = cpf.replace(/\D/g, "");
  if (!cleanCpf) return null;
  const { data, error } = await supabase
    .from("cliente")
    .upsert(
      {
        cpf: cleanCpf,
        nome: fields.nome || null,
        email: fields.email || null,
        telefone: fields.telefones && fields.telefones.length > 0 ? fields.telefones : null,
        dt_nasc: fields.dt_nasc || null,
      },
      { onConflict: "cpf" },
    )
    .select("id_cliente")
    .single();
  if (error) {
    console.error("upsertCliente failed:", error);
    return null;
  }
  return (data as { id_cliente: number } | null)?.id_cliente ?? null;
}

async function upsertObra(num_obra: string): Promise<number | null> {
  if (!num_obra) return null;
  const { data, error } = await supabase
    .from("obra")
    .upsert({ num_obra }, { onConflict: "num_obra" })
    .select("id_obra")
    .single();
  if (error) return null;
  return (data as { id_obra: number } | null)?.id_obra ?? null;
}

async function upsertLocalidade(
  cod: string,
  nome: string,
  regional: string,
): Promise<number | null> {
  if (!cod && !nome) return null;
  const key = cod || nome;
  const { data, error } = await supabase
    .from("localidade")
    .upsert(
      { cod_lcd: key, nome_lcd: nome || null, regional: regional || null },
      { onConflict: "cod_lcd" },
    )
    .select("id_loc")
    .single();
  if (error) return null;
  return (data as { id_loc: number } | null)?.id_loc ?? null;
}

export function useCaderno(limit = 1000) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["caderno", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_caderno_full", {
        p_show_deleted: false,
      });
      if (error) throw error;
      const rows = (data as unknown as Caderno[]) ?? [];
      return rows.slice(0, limit);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (item: Partial<Caderno> & { id: string }) => {
      const { id, ...rest } = item;
      const payload: Record<string, unknown> = { ...rest };
      // strip aliases / read-only
      [
        "in_base_5311",
        "numos",
        "numobra",
        "nomecli",
        "numcpf",
        "dth_nascimento",
        "email",
        "numtel",
        "numtel2",
        "nomelcd",
        "regional",
        // legacy columns no longer present in caderno
        "datacontab",
        "data_766",
        "dth_envio_dineng",
        "dth_retorno_dineng",
        "dth_impedimento",
        "data_recebimento",
      ].forEach((k) => delete payload[k]);
      const { error } = await supabase
        .from("caderno")
        .update(payload)
        .eq("id_os", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caderno"] });
      toast.success("Registro atualizado com sucesso!");
    },
    onError: (e) => toast.error(mapDatabaseError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await softDelete("caderno", id);
      if (!result.success) throw new Error(result.error || "Erro ao deletar registro");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caderno"] });
      toast.success("Registro deletado com sucesso!");
    },
    onError: (e) => toast.error(mapDatabaseError(e)),
  });

  const importMutation = useMutation({
    mutationFn: async (items: ImportRow[]) => {
      for (const item of items) {
        const num_os = Number(item["NUMOS"] || item["numos"]) || 0;
        if (!num_os) continue;
        const cpf = String(item["NUMCPF"] || item["numcpf"] || "");
        const telefones: string[] = [];
        const t1 = String(item["NUMTEL"] || item["numtel"] || "");
        const t2 = String(item["NUMTEL2"] || item["numtel2"] || "");
        if (t1) telefones.push(t1);
        if (t2) telefones.push(t2);
        const id_cliente = cpf
          ? await upsertCliente(cpf, {
              nome: String(item["NOMECLI"] || item["nomecli"] || ""),
              email: String(item["EMAIL"] || item["email"] || ""),
              telefones,
              dt_nasc:
                String(item["DTH_NASCIMENTO"] || item["dth_nascimento"] || "") ||
                null,
            })
          : null;
        const numobra = String(item["NUMOBRA"] || item["numobra"] || "");
        const id_obra = numobra ? await upsertObra(numobra) : null;
        const nomelcd = String(item["NOMELCD"] || item["nomelcd"] || "");
        const regional = String(item["REGIONAL"] || item["regional"] || "");
        const id_loc =
          nomelcd || regional
            ? await upsertLocalidade(nomelcd, nomelcd, regional)
            : null;

        const payload = {
          num_os,
          id_cliente,
          id_obra,
          id_loc,
          status: String(item["STATUS"] || item["status"] || "") || null,
          controle_os:
            String(item["CONTROLE_OS"] || item["controle_os"] || "Aberta") ||
            "Aberta",
          origem: String(item["ORIGEM"] || item["origem"] || "") || null,
          prazo: String(item["PRAZO"] || item["prazo"] || "") || null,
          complemento:
            String(item["COMPLEMENTO"] || item["complemento"] || "") || null,
          dsclgr_os: String(item["DSCLGR_OS"] || item["dsclgr_os"] || "") || null,
          datasol: String(item["DATASOL"] || item["datasol"] || "") || null,
          dataprev: String(item["DATAPREV"] || item["dataprev"] || "") || null,
          datatertrab:
            String(item["DATATERTRAB"] || item["datatertrab"] || "") || null,
          motivo_improcedencia:
            String(
              item["MOTIVO_IMPROCEDENCIA"] || item["motivo_improcedencia"] || "",
            ) || null,
          pendencia_obra:
            String(item["PENDENCIA_OBRA"] || item["pendencia_obra"] || "") || null,
          criterio: String(item["CRITERIO"] || item["criterio"] || "") || null,
          tipo_carta_enviada:
            String(
              item["TIPO_CARTA_ENVIADA"] || item["tipo_carta_enviada"] || "",
            ) || null,
          base_5311: String(item["BASE_5311"] || item["base_5311"] || "") || null,
          tranche: String(item["TRANCHE"] || item["tranche"] || "") || null,
          responsavel:
            String(item["RESPONSAVEL"] || item["responsavel"] || "") || null,
          prioridade:
            String(item["PRIORIDADE"] || item["prioridade"] || "") || null,
          observacao:
            String(item["OBSERVACAO"] || item["observacao"] || "") || null,
          empreiteira:
            String(item["EMPREITEIRA"] || item["empreiteira"] || "") || null,
          bloco_cliente:
            String(item["BLOCO_CLIENTE"] || item["bloco_cliente"] || "") || null,
          data_carta:
            String(item["DATA_CARTA"] || item["data_carta"] || "") || null,
        };
        const { error } = await supabase
          .from("caderno")
          .upsert(payload, { onConflict: "num_os" });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["caderno"] }),
    onError: (e) => toast.error(mapDatabaseError(e)),
  });

  const updateByNumosMutation = useMutation({
    mutationFn: async (items: ImportRow[]) => {
      let updatedCount = 0;
      let notFoundCount = 0;
      for (const item of items) {
        const num_os = Number(item["NUMOS"] || item["numos"]);
        if (!num_os) continue;
        const update: Record<string, unknown> = {};
        const setField = (k: string, v: unknown) => {
          if (v !== undefined && v !== null && v !== "") update[k] = v;
        };
        setField("status", item["STATUS"] || item["status"]);
        setField("controle_os", item["CONTROLE_OS"] || item["controle_os"]);
        setField("origem", item["ORIGEM"] || item["origem"]);
        setField("prazo", item["PRAZO"] || item["prazo"]);
        setField("complemento", item["COMPLEMENTO"] || item["complemento"]);
        setField("dsclgr_os", item["DSCLGR_OS"] || item["dsclgr_os"]);
        setField("datasol", item["DATASOL"] || item["datasol"]);
        setField("dataprev", item["DATAPREV"] || item["dataprev"]);
        setField("datatertrab", item["DATATERTRAB"] || item["datatertrab"]);
        setField(
          "motivo_improcedencia",
          item["MOTIVO_IMPROCEDENCIA"] || item["motivo_improcedencia"],
        );
        setField("pendencia_obra", item["PENDENCIA_OBRA"] || item["pendencia_obra"]);
        setField("criterio", item["CRITERIO"] || item["criterio"]);
        setField(
          "tipo_carta_enviada",
          item["TIPO_CARTA_ENVIADA"] || item["tipo_carta_enviada"],
        );
        setField("base_5311", item["BASE_5311"] || item["base_5311"]);
        setField("tranche", item["TRANCHE"] || item["tranche"]);
        setField("responsavel", item["RESPONSAVEL"] || item["responsavel"]);
        setField("prioridade", item["PRIORIDADE"] || item["prioridade"]);
        setField("observacao", item["OBSERVACAO"] || item["observacao"]);
        setField("empreiteira", item["EMPREITEIRA"] || item["empreiteira"]);
        setField("bloco_cliente", item["BLOCO_CLIENTE"] || item["bloco_cliente"]);
        setField("data_carta", item["DATA_CARTA"] || item["data_carta"]);

        if (Object.keys(update).length === 0) continue;
        const { data, error } = await supabase
          .from("caderno")
          .update(update)
          .eq("num_os", num_os)
          .select("id_os");
        if (error) throw error;
        if (data && data.length > 0) updatedCount++;
        else notFoundCount++;
      }
      return { updatedCount, notFoundCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["caderno"] });
      if (result.notFoundCount > 0) {
        toast.warning(
          `${result.updatedCount} atualizados, ${result.notFoundCount} não encontrados`,
        );
      }
    },
    onError: (e) => toast.error(mapDatabaseError(e)),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({
      ids,
      updates,
    }: {
      ids: string[];
      updates: Partial<Caderno>;
    }) => {
      let successCount = 0;
      let failedCount = 0;
      const payload: Record<string, unknown> = { ...updates };
      [
        "in_base_5311",
        "numos",
        "numobra",
        "nomecli",
        "numcpf",
        "dth_nascimento",
        "email",
        "numtel",
        "numtel2",
        "nomelcd",
        "regional",
        "datacontab",
        "data_766",
        "dth_envio_dineng",
        "dth_retorno_dineng",
        "dth_impedimento",
        "data_recebimento",
      ].forEach((k) => delete payload[k]);
      for (const id of ids) {
        const { error } = await supabase
          .from("caderno")
          .update(payload)
          .eq("id_os", id);
        if (error) failedCount++;
        else successCount++;
      }
      return { successCount, failedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["caderno"] });
      if (result.failedCount === 0) {
        toast.success(`${result.successCount} registros atualizados com sucesso!`);
      } else {
        toast.warning(
          `${result.successCount} atualizados, ${result.failedCount} falharam`,
        );
      }
    },
    onError: (e) => toast.error(mapDatabaseError(e)),
  });

  return {
    data: data ?? [],
    isLoading,
    error,
    updateCaderno: updateMutation,
    isUpdating: updateMutation.isPending,
    deleteCaderno: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    importCaderno: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    updateCadernoByNumos: updateByNumosMutation.mutateAsync,
    isUpdatingByNumos: updateByNumosMutation.isPending,
    bulkUpdateCaderno: bulkUpdateMutation.mutateAsync,
    isBulkUpdating: bulkUpdateMutation.isPending,
  };
}
