// Hand-written types for the external Supabase project (not Lovable Cloud).
// types.ts is locked by the platform migration system; we route the typed
// client through this file instead.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "admin" | "operador_chefe" | "operador" | "consultor";

type Timestamps = { created_at: string; updated_at: string };
type Soft = { deleted_at: string | null; deleted_by: string | null };

export interface ClienteRow extends Timestamps, Soft {
  id_cliente: number;
  cpf: string | null;
  nome: string | null;
  email: string | null;
  telefone: string[] | null;
  dt_nasc: string | null;
}
export interface ObraRow extends Timestamps, Soft {
  id_obra: number;
  num_obra: string | null;
  status: string | null;
  sigco: number | null;
}
export interface LocalidadeRow extends Timestamps {
  id_loc: number;
  cod_lcd: string | null;
  nome_lcd: string | null;
  regional: string | null;
}
export interface ProfileRow extends Timestamps {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  cargo: string | null;
}
export interface UserRoleRow {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}
export interface CadernoRow extends Timestamps, Soft {
  id_os: string;
  num_os: number;
  id_obra: number | null;
  id_loc: number | null;
  id_cliente: number | null;
  status: string | null;
  controle_os: string | null;
  origem: string | null;
  prazo: string | null;
  complemento: string | null;
  dsclgr_os: string | null;
  datasol: string | null;
  dataprev: string | null;
  datatertrab: string | null;
  data_carta: string | null;
  motivo_improcedencia: string | null;
  pendencia_obra: string | null;
  criterio: string | null;
  tipo_carta_enviada: string | null;
  base_5311: string | null;
  tranche: string | null;
  responsavel: string | null;
  prioridade: string | null;
  observacao: string | null;
  empreiteira: string | null;
  bloco_cliente: string | null;
}
export interface DespachoRow extends Timestamps, Soft {
  id_despacho: string;
  num_os: number;
  id_cliente: number | null;
  dias_para_despacho: number | null;
  inconsistencia: number | null;
  nome_lcd: string | null;
  regional: string | null;
  responsavel: string | null;
  tratativa: string | null;
  concluida: boolean | null;
  data_conclusao: string | null;
  motivo_da_improcedencia: string | null;
  base: string | null;
  familia: string | null;
  complemento: string | null;
  dsclgr_os: string | null;
  criterio: string | null;
}
export interface DemandaRow extends Timestamps, Soft {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo_demanda: string;
  tipo_carta: string | null;
  prioridade: string | null;
  status: string | null;
  prazo_execucao: string | null;
  operador_id: string | null;
  criado_por: string;
  num_os: number | null;
  num_obra: string | null;
}
export interface PrioritarioRow extends Timestamps {
  id: string;
  cpf_corrigido: string | null;
  nome: string | null;
  observacao: string | null;
  id_cliente: number | null;
}
export interface HistoricoOsRow {
  id: string;
  num_os: number;
  user_id: string | null;
  campo: string | null;
  valor_old: string | null;
  valor_new: string | null;
  created_at: string;
}
export interface DocumentoCartaRow extends Timestamps {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string;
  storage_path: string | null;
  uploaded_by: string | null;
}
export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  data: Json | null;
  created_at: string;
}
export interface AuditLogRow {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type AppDatabase = {
  public: {
    Tables: {
      cliente: Table<ClienteRow>;
      obra: Table<ObraRow>;
      localidade: Table<LocalidadeRow>;
      profiles: Table<ProfileRow>;
      user_roles: Table<UserRoleRow>;
      caderno: Table<CadernoRow>;
      despacho: Table<DespachoRow>;
      demandas: Table<DemandaRow>;
      prioritario: Table<PrioritarioRow>;
      historico_os: Table<HistoricoOsRow>;
      documentos_cartas: Table<DocumentoCartaRow>;
      notifications: Table<NotificationRow>;
      audit_logs: Table<AuditLogRow>;
      masked_audit_logs: Table<AuditLogRow>;
    };
    Views: Record<string, never>;
    Functions: {
      has_role: { Args: { _user_id: string; _role: AppRole }; Returns: boolean };
      soft_delete_record: {
        Args: { p_table_name: string; p_record_id: string };
        Returns: Json;
      };
      check_security_health: { Args: Record<string, never>; Returns: Json };
      find_cliente_duplicatas: {
        Args: { p_cpf: string; p_current_num_os: number };
        Returns: Json;
      };
      is_in_prioritario: { Args: { p_cpf: string }; Returns: boolean };
      list_operadores: {
        Args: Record<string, never>;
        Returns: { user_id: string; full_name: string | null; cargo: string | null }[];
      };
      log_audit_action: {
        Args: {
          p_action: string;
          p_table_name: string;
          p_record_id?: string | null;
          p_old_data?: Json | null;
          p_new_data?: Json | null;
        };
        Returns: string;
      };
      get_caderno_full: { Args: { p_show_deleted?: boolean }; Returns: Json };
      get_despacho_full: { Args: { p_show_concluded?: boolean }; Returns: Json };
    };
    Enums: { app_role: AppRole };
    CompositeTypes: Record<string, never>;
  };
};
