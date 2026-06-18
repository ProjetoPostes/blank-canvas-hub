import { supabase } from "@/integrations/supabase/client";

interface SoftDeleteResult {
  success: boolean;
  error?: string;
  deleted_at?: string;
}

interface SecurityHealthResult {
  status?: string;
  checked_at?: string;
  metrics?: {
    tables_with_rls: number;
    total_policies: number;
  };
  allowed?: boolean;
  error?: string;
}

export async function softDelete(
  tableName: string,
  recordId: string,
): Promise<SoftDeleteResult> {
  const { data, error } = await supabase.rpc("soft_delete_record", {
    p_table_name: tableName,
    p_record_id: recordId,
  });
  if (error) return { success: false, error: error.message };
  return data as unknown as SoftDeleteResult;
}

export async function checkSecurityHealth(): Promise<SecurityHealthResult> {
  const { data, error } = await supabase.rpc("check_security_health");
  if (error) return { allowed: false, error: error.message };
  return data as unknown as SecurityHealthResult;
}

export function useSecurityRpc() {
  return { softDelete, checkSecurityHealth };
}
