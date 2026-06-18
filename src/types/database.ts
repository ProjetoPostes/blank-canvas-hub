// Application-facing shapes. The Caderno/Despacho interfaces match exactly
// what the RPCs get_caderno_full / get_despacho_full return — with legacy
// aliases (numos, nomecli, numcpf, nomelcd, ...) — so most UI code keeps
// working without rewrites. The `id` field is the underlying UUID PK
// (id_os / id_despacho); mutations target the real column.

export type AppRole = "admin" | "operador_chefe" | "operador" | "consultor";

export interface Despacho {
  id: string; // id_despacho UUID
  numos: number;
  dias_para_despacho: number | null;
  inconsistencia: number | null;
  nomelcd: string | null;
  regional: string | null;
  nomecli: string | null;
  numcpf: string | null;
  dth_nascimento: string | null;
  responsavel: string | null;
  tratativa: string | null;
  motivo_da_improcedencia: string | null;
  base: string | null;
  familia: string | null;
  telefone: string | null;
  email: string | null;
  complemento: string | null;
  dsclgr_os: string | null;
  criterio: string | null;
  concluida: boolean;
  data_conclusao: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  in_base_5311?: boolean;
}

export interface Caderno {
  id: string; // id_os UUID
  numos: number;
  numobra: string | null;
  status: string | null;
  nomelcd: string | null;
  regional: string | null;
  controle_os: string | null;
  origem: string | null;
  prazo: string | null;
  nomecli: string | null;
  numcpf: string | null;
  dth_nascimento: string | null;
  email: string | null;
  numtel: string | null;
  numtel2: string | null;
  complemento: string | null;
  dsclgr_os: string | null;
  datasol: string | null;
  // Legacy fields kept nullable; not present in the new schema, always null.
  datacontab: string | null;
  data_766: string | null;
  dataprev: string | null;
  datatertrab: string | null;
  dth_envio_dineng: string | null;
  dth_retorno_dineng: string | null;
  dth_impedimento: string | null;
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
  data_recebimento: string | null;
  bloco_cliente: string | null;
  data_carta: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  in_base_5311?: boolean;
}

export interface Demanda {
  id: string;
  titulo: string;
  descricao: string | null;
  // `tipo` was removed from the schema but kept here for back-compat in UI;
  // it always mirrors tipo_demanda.
  tipo: string;
  tipo_demanda: string;
  tipo_carta: string | null;
  prioridade: string | null;
  status: string | null;
  prazo_execucao: string | null;
  operador_id: string | null;
  criado_por: string;
  num_os?: number | null;
  num_obra?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  cargo: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentoCarta {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string;
  storage_path: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}
