import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClienteDuplicatas {
  despachoOS: number[];
  cadernoOS: number[];
  hasDuplicatas: boolean;
  isLoading: boolean;
}

export function useClienteDuplicatas(
  numcpf: string | null | undefined,
  currentNumos: number | null | undefined,
): ClienteDuplicatas {
  const { data, isLoading } = useQuery({
    queryKey: ["cliente-duplicatas", numcpf, currentNumos],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("find_cliente_duplicatas", {
        p_cpf: numcpf!,
        p_current_num_os: currentNumos!,
      });
      if (error) throw error;
      const result = data as unknown as {
        despachoOS: number[];
        cadernoOS: number[];
      };
      return {
        despachoOS: result?.despachoOS ?? [],
        cadernoOS: result?.cadernoOS ?? [],
      };
    },
    enabled: !!numcpf && numcpf.trim() !== "" && currentNumos != null,
    staleTime: 5 * 60 * 1000,
  });

  return {
    despachoOS: data?.despachoOS ?? [],
    cadernoOS: data?.cadernoOS ?? [],
    hasDuplicatas:
      (data?.despachoOS?.length ?? 0) > 0 || (data?.cadernoOS?.length ?? 0) > 0,
    isLoading,
  };
}
