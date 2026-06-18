import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Despacho } from "@/types/database";
import { toast } from "sonner";
import { mapDatabaseError } from "@/lib/errorHandler";
import { softDelete } from "./useSecurityRpc";

// Internal payload shape for inserting into the normalized schema.
type ImportRow = Record<string, unknown>;

async function upsertClienteByCpf(
  cpf: string,
  fields: { nome?: string; email?: string; telefone?: string; dt_nasc?: string | null },
): Promise<number | null> {
  const cleanCpf = cpf.replace(/\D/g, "");
  if (!cleanCpf) return null;
  const telefoneArr = fields.telefone ? [fields.telefone] : null;
  const { data, error } = await supabase
    .from("cliente")
    .upsert(
      {
        cpf: cleanCpf,
        nome: fields.nome || null,
        email: fields.email || null,
        telefone: telefoneArr,
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

export function useDespacho(showConcluidas = false) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["despacho", showConcluidas],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_despacho_full", {
        p_show_concluded: showConcluidas,
      });
      if (error) throw error;
      return (data as unknown as Despacho[]) ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (item: Partial<Despacho> & { id: string }) => {
      const { id, ...rest } = item;
      // Strip alias / read-only fields that don't exist as columns.
      const payload: Record<string, unknown> = { ...rest };
      delete payload.in_base_5311;
      delete payload.nomecli;
      delete payload.numcpf;
      delete payload.dth_nascimento;
      delete payload.telefone;
      delete payload.email;
      // Map alias → real column
      if ("numos" in payload) {
        payload.num_os = payload.numos;
        delete payload.numos;
      }
      if ("nomelcd" in payload) {
        payload.nome_lcd = payload.nomelcd;
        delete payload.nomelcd;
      }
      const { error } = await supabase
        .from("despacho")
        .update(payload)
        .eq("id_despacho", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despacho"] });
      toast.success("Registro atualizado com sucesso!");
    },
    onError: (e) => toast.error(mapDatabaseError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await softDelete("despacho", id);
      if (!result.success) throw new Error(result.error || "Erro ao deletar registro");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despacho"] });
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
        let id_cliente: number | null = null;
        if (cpf) {
          id_cliente = await upsertClienteByCpf(cpf, {
            nome: String(item["NOMECLI"] || item["nomecli"] || ""),
            email: String(item["EMAIL"] || item["email"] || ""),
            telefone: String(item["TELEFONE"] || item["telefone"] || ""),
            dt_nasc: String(item["DTH_NASCIMENTO"] || item["dth_nascimento"] || "") || null,
          });
        }
        const payload = {
          num_os,
          id_cliente,
          dias_para_despacho:
            Number(item["DIAS_PARA_DESPACHO"] || item["dias_para_despacho"]) || null,
          inconsistencia:
            Number(item["INCONSISTENCIA"] || item["inconsistencia"]) || null,
          nome_lcd: String(item["NOMELCD"] || item["nomelcd"] || "") || null,
          regional: String(item["REGIONAL"] || item["regional"] || "") || null,
          responsavel:
            String(item["RESPONSAVEL"] || item["responsavel"] || "") || null,
          tratativa: String(item["TRATATIVA"] || item["tratativa"] || "Pendente"),
          motivo_da_improcedencia:
            String(
              item["MOTIVO_DA_IMPROCEDENCIA"] || item["motivo_da_improcedencia"] || "",
            ) || null,
          base: String(item["BASE"] || item["base"] || "") || null,
          familia: String(item["FAMILIA"] || item["familia"] || "") || null,
          complemento:
            String(item["COMPLEMENTO"] || item["complemento"] || "") || null,
          dsclgr_os: String(item["DSCLGR_OS"] || item["dsclgr_os"] || "") || null,
          criterio: String(item["CRITERIO"] || item["criterio"] || "") || null,
        };
        const { error } = await supabase
          .from("despacho")
          .upsert(payload, { onConflict: "num_os" });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["despacho"] }),
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
        const cpf = String(item["NUMCPF"] || item["numcpf"] || "");
        if (cpf) {
          const id_cliente = await upsertClienteByCpf(cpf, {
            nome: String(item["NOMECLI"] || item["nomecli"] || ""),
            email: String(item["EMAIL"] || item["email"] || ""),
            telefone: String(item["TELEFONE"] || item["telefone"] || ""),
            dt_nasc:
              String(item["DTH_NASCIMENTO"] || item["dth_nascimento"] || "") || null,
          });
          if (id_cliente) update.id_cliente = id_cliente;
        }
        const setField = (k: string, v: unknown) => {
          if (v !== undefined && v !== null && v !== "") update[k] = v;
        };
        setField(
          "dias_para_despacho",
          item["DIAS_PARA_DESPACHO"] || item["dias_para_despacho"]
            ? Number(item["DIAS_PARA_DESPACHO"] || item["dias_para_despacho"])
            : undefined,
        );
        setField(
          "inconsistencia",
          item["INCONSISTENCIA"] || item["inconsistencia"]
            ? Number(item["INCONSISTENCIA"] || item["inconsistencia"])
            : undefined,
        );
        setField("nome_lcd", item["NOMELCD"] || item["nomelcd"]);
        setField("regional", item["REGIONAL"] || item["regional"]);
        setField("responsavel", item["RESPONSAVEL"] || item["responsavel"]);
        setField("tratativa", item["TRATATIVA"] || item["tratativa"]);
        setField(
          "motivo_da_improcedencia",
          item["MOTIVO_DA_IMPROCEDENCIA"] || item["motivo_da_improcedencia"],
        );
        setField("base", item["BASE"] || item["base"]);
        setField("familia", item["FAMILIA"] || item["familia"]);
        setField("complemento", item["COMPLEMENTO"] || item["complemento"]);
        setField("dsclgr_os", item["DSCLGR_OS"] || item["dsclgr_os"]);
        setField("criterio", item["CRITERIO"] || item["criterio"]);

        if (Object.keys(update).length === 0) continue;
        const { data, error } = await supabase
          .from("despacho")
          .update(update)
          .eq("num_os", num_os)
          .select("id_despacho");
        if (error) throw error;
        if (data && data.length > 0) updatedCount++;
        else notFoundCount++;
      }
      return { updatedCount, notFoundCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["despacho"] });
      if (result.notFoundCount > 0) {
        toast.warning(
          `${result.updatedCount} atualizados, ${result.notFoundCount} não encontrados`,
        );
      }
    },
    onError: (e) => toast.error(mapDatabaseError(e)),
  });

  return {
    data: data ?? [],
    isLoading,
    error,
    updateDespacho: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteDespacho: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    importDespacho: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    updateDespachoByNumos: updateByNumosMutation.mutateAsync,
    isUpdatingByNumos: updateByNumosMutation.isPending,
  };
}
