import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DocumentoCarta {
  id: string;
  // UI keeps `nome` and `categoria` aliases for back-compat.
  nome: string;
  titulo: string;
  descricao: string | null;
  categoria: string;
  url: string;
  storage_path: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentoCartaInput {
  nome: string;
  descricao?: string;
  categoria: string;
  url: string;
}

// Persist `categoria` inside descricao prefix since the new schema has no
// dedicated column.
function packDescricao(categoria: string, descricao?: string): string {
  return `[${categoria}] ${descricao ?? ""}`.trim();
}
function unpackDescricao(d: string | null): { categoria: string; descricao: string } {
  if (!d) return { categoria: "Geral", descricao: "" };
  const m = d.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (m) return { categoria: m[1], descricao: m[2] };
  return { categoria: "Geral", descricao: d };
}

export function useDocumentosCartas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: documentos, isLoading, error } = useQuery({
    queryKey: ["documentos-cartas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_cartas")
        .select("*")
        .order("titulo", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as Array<{
        id: string;
        titulo: string;
        descricao: string | null;
        url: string;
        storage_path: string | null;
        uploaded_by: string | null;
        created_at: string;
        updated_at: string;
      }>).map((d) => {
        const { categoria, descricao } = unpackDescricao(d.descricao);
        return {
          ...d,
          nome: d.titulo,
          categoria,
          descricao,
        } as DocumentoCarta;
      });
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (input: DocumentoCartaInput) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("documentos_cartas")
        .insert({
          titulo: input.nome,
          descricao: packDescricao(input.categoria, input.descricao),
          url: input.url,
          uploaded_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-cartas"] });
      toast.success("Documento adicionado com sucesso!");
    },
    onError: (error: Error) => {
      console.error(error);
      toast.error("Erro ao adicionar documento. Verifique suas permissões.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: DocumentoCartaInput & { id: string }) => {
      const { data, error } = await supabase
        .from("documentos_cartas")
        .update({
          titulo: input.nome,
          descricao: packDescricao(input.categoria, input.descricao),
          url: input.url,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-cartas"] });
      toast.success("Documento atualizado com sucesso!");
    },
    onError: (error: Error) => {
      console.error(error);
      toast.error("Erro ao atualizar documento. Verifique suas permissões.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("documentos_cartas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-cartas"] });
      toast.success("Documento removido com sucesso!");
    },
    onError: (error: Error) => {
      console.error(error);
      toast.error("Erro ao remover documento. Verifique suas permissões.");
    },
  });

  const categorias = documentos
    ? [...new Set(documentos.map((d) => d.categoria))].sort()
    : [];

  return {
    documentos: documentos ?? [],
    categorias,
    isLoading,
    error,
    addDocumento: addMutation.mutateAsync,
    updateDocumento: updateMutation.mutateAsync,
    deleteDocumento: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
