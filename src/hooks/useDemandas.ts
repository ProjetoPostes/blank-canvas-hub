import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Demanda } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { mapDatabaseError } from "@/lib/errorHandler";
import { softDelete } from "./useSecurityRpc";

export type CreateDemandaInput = Omit<
  Demanda,
  "id" | "created_at" | "updated_at" | "criado_por" | "deleted_at" | "deleted_by"
>;

export const TIPOS_DEMANDA = ["Envio de carta", "Análise"];
export const TIPOS_CARTA = [
  "Futuro Pleito",
  "Sem casa",
  "Sem documento de posse",
  "Sem critério",
  "Orçamento",
  "Suspensão de Obra",
  "Retomada de Obra",
];

export const extractNumos = (descricao: string): number[] => {
  const match = descricao.match(/\*{0,2}OSs? para tratativa:\*{0,2}\s*([\d,\s]+)/i);
  if (match) {
    return match[1]
      .split(",")
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));
  }
  const allNumbers = descricao.match(/\b\d{1,9}\b/g);
  if (allNumbers) return allNumbers.map((n) => parseInt(n)).filter((n) => !isNaN(n));
  return [];
};

// Strip the legacy `tipo` alias when sending to the DB (column doesn't exist)
function stripDb(d: Partial<Demanda>): Record<string, unknown> {
  const { tipo: _tipo, ...rest } = d;
  return rest as Record<string, unknown>;
}

export function useDemandas() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["demandas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandas")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Demanda[]).map((d) => ({
        ...d,
        tipo: d.tipo_demanda, // alias for back-compat in UI
      }));
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (demanda: CreateDemandaInput) => {
      const payload = stripDb({ ...demanda, criado_por: user!.id } as Partial<Demanda>);
      const { error } = await supabase.from("demandas").insert(payload);
      if (error) throw error;
      return demanda;
    },
    onSuccess: (_, demanda) => {
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
      toast.success("Demanda criada", {
        description: `"${demanda.titulo}" foi adicionada ao sistema.`,
      });
    },
    onError: (error) =>
      toast.error("Erro ao criar demanda", { description: mapDatabaseError(error) }),
  });

  const updateMutation = useMutation({
    mutationFn: async (demanda: Partial<Demanda> & { id: string }) => {
      const { id, ...rest } = demanda;
      const payload = stripDb(rest);
      const { error } = await supabase.from("demandas").update(payload).eq("id", id);
      if (error) throw error;
      return demanda;
    },
    onSuccess: (_, demanda) => {
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
      toast.success("Demanda atualizada", {
        description: demanda.titulo
          ? `"${demanda.titulo}" foi atualizada.`
          : "As alterações foram salvas.",
      });
    },
    onError: (error) =>
      toast.error("Erro ao atualizar demanda", {
        description: mapDatabaseError(error),
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await softDelete("demandas", id);
      if (!result.success) throw new Error(result.error || "Erro ao deletar demanda");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
      toast.success("Demanda removida");
    },
    onError: (error) =>
      toast.error("Erro ao remover demanda", { description: mapDatabaseError(error) }),
  });

  const concluirDemandaMutation = useMutation({
    mutationFn: async (demanda: Demanda) => {
      let cadernoCount = 0;
      let cadernoError = false;

      if (
        demanda.tipo_demanda === "Envio de carta" &&
        demanda.tipo_carta &&
        demanda.descricao
      ) {
        const numos = extractNumos(demanda.descricao);
        if (numos.length > 0) {
          const { error: cadErr } = await supabase
            .from("caderno")
            .update({
              tipo_carta_enviada: demanda.tipo_carta,
              data_carta: new Date().toISOString().split("T")[0],
            })
            .in("num_os", numos);
          if (cadErr) {
            console.error("Erro ao atualizar caderno:", cadErr);
            cadernoError = true;
          } else {
            cadernoCount = numos.length;
          }
        }
      }

      const { error } = await supabase
        .from("demandas")
        .update({ status: "Concluída" })
        .eq("id", demanda.id);
      if (error) throw error;

      return { demanda, cadernoCount, cadernoError };
    },
    onSuccess: ({ demanda, cadernoCount, cadernoError }) => {
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
      queryClient.invalidateQueries({ queryKey: ["caderno"] });
      if (cadernoError) {
        toast.warning("Demanda concluída com ressalvas", {
          description: `"${demanda.titulo}" foi concluída, mas houve erro ao atualizar o Caderno.`,
        });
      } else {
        toast.success("Demanda concluída", {
          description: `"${demanda.titulo}" foi marcada como concluída.${
            cadernoCount > 0 ? ` Caderno atualizado para ${cadernoCount} OS(s).` : ""
          }`,
        });
      }
    },
    onError: (error) =>
      toast.error("Erro ao concluir demanda", { description: mapDatabaseError(error) }),
  });

  return {
    data: data ?? [],
    isLoading,
    error,
    createDemanda: createMutation.mutate as (demanda: CreateDemandaInput) => void,
    updateDemanda: updateMutation.mutate,
    deleteDemanda: deleteMutation.mutate,
    concluirDemanda: concluirDemandaMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isConcluindo: concluirDemandaMutation.isPending,
  };
}
