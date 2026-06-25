import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Obra, Localidade, Prioritario, historico_os } from "@/types/database";
import type {
  ObraFormData,
  LocalidadeFormData,
  PrioritarioFormData,
} from "@/lib/schemas/operacionais";

export type SortDir = "asc" | "desc";
export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortField?: string;
  sortDir?: SortDir;
  filters?: Record<string, string | undefined>;
}

interface Paged<T> {
  rows: T[];
  total: number;
}

function applyFilters(
  q: ReturnType<typeof supabase.from> extends infer R ? any : any,
  filters?: Record<string, string | undefined>,
) {
  if (!filters) return q;
  for (const [k, v] of Object.entries(filters)) {
    if (v && v.trim()) q = q.ilike(k, `%${v.trim()}%`);
  }
  return q;
}

// ---------- OBRA ----------
export function useObras(params: ListParams = {}) {
  const { page = 1, pageSize = 20, search = "", sortField = "num_obra", sortDir = "asc", filters } = params;
  return useQuery({
    queryKey: ["obras", { page, pageSize, search, sortField, sortDir, filters }],
    queryFn: async (): Promise<Paged<Obra>> => {
      let q = supabase
        .from("obra")
        .select("*", { count: "exact" })
        .is("deleted_at", null);
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`num_obra.ilike.%${s}%,status.ilike.%${s}%`);
      }
      q = applyFilters(q, filters);
      q = q.order(sortField, { ascending: sortDir === "asc" }).range((page - 1) * pageSize, page * pageSize - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Obra[], total: count ?? 0 };
    },
  });
}

export function useObraMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["obras"] });

  const create = useMutation({
    mutationFn: async (input: ObraFormData) => {
      const { data, error } = await supabase
        .from("obra")
        .insert({ num_obra: input.num_obra, status: input.status || null, sigco: input.sigco })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Obra criada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id_obra, ...input }: ObraFormData & { id_obra: number }) => {
      const { data, error } = await supabase
        .from("obra")
        .update({ num_obra: input.num_obra, status: input.status || null, sigco: input.sigco })
        .eq("id_obra", id_obra)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Obra atualizada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id_obra: number) => {
      const { error } = await supabase
        .from("obra")
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
        .eq("id_obra", id_obra);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Obra excluída"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { create, update, remove };
}

// ---------- LOCALIDADE ----------
export function useLocalidades(params: ListParams = {}) {
  const { page = 1, pageSize = 20, search = "", sortField = "nome_lcd", sortDir = "asc", filters } = params;
  return useQuery({
    queryKey: ["localidades", { page, pageSize, search, sortField, sortDir, filters }],
    queryFn: async (): Promise<Paged<Localidade>> => {
      let q = supabase.from("localidade").select("*", { count: "exact" });
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`cod_lcd.ilike.%${s}%,nome_lcd.ilike.%${s}%,regional.ilike.%${s}%`);
      }
      q = applyFilters(q, filters);
      q = q.order(sortField, { ascending: sortDir === "asc" }).range((page - 1) * pageSize, page * pageSize - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Localidade[], total: count ?? 0 };
    },
  });
}

export function useLocalidadeMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["localidades"] });

  const create = useMutation({
    mutationFn: async (input: LocalidadeFormData) => {
      const { data, error } = await supabase
        .from("localidade")
        .insert({ cod_lcd: input.cod_lcd, nome_lcd: input.nome_lcd, regional: input.regional || null })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Localidade criada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id_loc, ...input }: LocalidadeFormData & { id_loc: number }) => {
      const { data, error } = await supabase
        .from("localidade")
        .update({ cod_lcd: input.cod_lcd, nome_lcd: input.nome_lcd, regional: input.regional || null })
        .eq("id_loc", id_loc).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Localidade atualizada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id_loc: number) => {
      const { error } = await supabase.from("localidade").delete().eq("id_loc", id_loc);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Localidade excluída"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { create, update, remove };
}

// ---------- PRIORITARIO ----------
export function usePrioritarios(params: ListParams = {}) {
  const { page = 1, pageSize = 20, search = "", sortField = "nome", sortDir = "asc", filters } = params;
  return useQuery({
    queryKey: ["prioritarios", { page, pageSize, search, sortField, sortDir, filters }],
    queryFn: async (): Promise<Paged<Prioritario>> => {
      let q = supabase.from("prioritario").select("*", { count: "exact" });
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`nome.ilike.%${s}%,cpf_corrigido.ilike.%${s}%,observacao.ilike.%${s}%`);
      }
      q = applyFilters(q, filters);
      q = q.order(sortField, { ascending: sortDir === "asc" }).range((page - 1) * pageSize, page * pageSize - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Prioritario[], total: count ?? 0 };
    },
  });
}

export function usePrioritarioMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["prioritarios"] });

  const normalizeCpf = (v?: string) => (v ? v.replace(/\D/g, "") || null : null);

  const create = useMutation({
    mutationFn: async (input: PrioritarioFormData) => {
      const { data, error } = await supabase
        .from("prioritario")
        .insert({
          nome: input.nome,
          cpf_corrigido: normalizeCpf(input.cpf_corrigido),
          observacao: input.observacao || null,
          endereco: input.endereco || null,
        })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Prioritário criado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: PrioritarioFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("prioritario")
        .update({
          nome: input.nome,
          cpf_corrigido: normalizeCpf(input.cpf_corrigido),
          observacao: input.observacao || null,
          endereco: input.endereco || null,
        })
        .eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Prioritário atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prioritario").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Prioritário excluído"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { create, update, remove };
}

// ---------- OBRA: counts and OS list ----------
export function useObraOsCounts(idObras: number[]) {
  return useQuery({
    queryKey: ["obra-os-counts", idObras.slice().sort()],
    enabled: idObras.length > 0,
    queryFn: async (): Promise<Record<number, number>> => {
      const results = await Promise.all(
        idObras.map(async (id) => {
          const { count } = await supabase
            .from("caderno")
            .select("id_os", { count: "exact", head: true })
            .is("deleted_at", null)
            .eq("id_obra", id);
          return [id, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(results);
    },
  });
}

export function useObraOsList(idObra: number | null) {
  return useQuery({
    queryKey: ["obra-os-list", idObra],
    enabled: idObra !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caderno")
        .select("id_os,num_os,status,controle_os,id_cliente,cliente:id_cliente(nome,cpf)")
        .is("deleted_at", null)
        .eq("id_obra", idObra!)
        .order("num_os", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id_os: string;
        num_os: number;
        status: string | null;
        controle_os: string | null;
        cliente: { nome: string | null; cpf: string | null } | null;
      }>;
    },
  });
}

// ---------- HISTORICO OS (read-only) ----------
export function useHistoricoOs(params: ListParams = {}) {
  const { page = 1, pageSize = 25, search = "", sortField = "created_at", sortDir = "desc", filters } = params;
  return useQuery({
    queryKey: ["historico-os", { page, pageSize, search, sortField, sortDir, filters }],
    queryFn: async (): Promise<Paged<historico_os>> => {
      let q = supabase.from("historico_os").select("*", { count: "exact" });
      if (search.trim()) {
        const s = search.trim();
        const asNum = Number(s);
        if (Number.isFinite(asNum)) {
          q = q.or(`num_os.eq.${asNum},campo.ilike.%${s}%,valor_old.ilike.%${s}%,valor_new.ilike.%${s}%`);
        } else {
          q = q.or(`campo.ilike.%${s}%,valor_old.ilike.%${s}%,valor_new.ilike.%${s}%`);
        }
      }
      q = applyFilters(q, filters);
      q = q.order(sortField, { ascending: sortDir === "asc" }).range((page - 1) * pageSize, page * pageSize - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as historico_os[], total: count ?? 0 };
    },
  });
}
