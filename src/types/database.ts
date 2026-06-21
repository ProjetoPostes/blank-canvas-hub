// Application-facing shapes. Caderno/Despacho mirror exactly what the RPCs
// get_caderno_full / get_despacho_full return — flattened with legacy aliases
// (id, numos, nomecli, numcpf, nomelcd, numobra, numtel, ...). This keeps the
// existing UI working without rewrites. Mutations resolve back to the real
// columns (id_os, id_despacho, num_os, ...) inside the hooks.

export type AppRole = "admin" | "operador_chefe" | "operador" | "consultor";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Despacho {
  // identity (UUID PK exposed as `id`)
  id: string;
  numos: number;
  // cliente (joined)
  nomecli: string | null;
  numcpf: string | null;
  dth_nascimento: string | null;
  email: string | null;
  telefone: string | null;
  // localidade
  nomelcd: string | null;
  regional: string | null;
  // despacho fields
  dias_para_despacho: number | null;
  inconsistencia: number | null;
  responsavel: string | null;
  tratativa: string | null;
  motivo_da_improcedencia: string | null;
  base: string | null;
  familia: string | null;
  complemento: string | null;
  dsclgr_os: string | null;
  criterio: string | null;
  concluida: boolean | null;
  data_conclusao: string | null;
  in_base_5311: boolean | null;
  // soft delete / timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface Caderno {
  // identity (UUID PK exposed as `id`)
  id: string;
  numos: number;
  numobra: string | null;
  // localidade
  nomelcd: string | null;
  regional: string | null;
  // cliente (joined)
  nomecli: string | null;
  numcpf: string | null;
  dth_nascimento: string | null;
  email: string | null;
  numtel: string | null;
  numtel2: string | null;
  // caderno fields
  status: string | null;
  controle_os: string | null;
  origem: string | null;
  prazo: string | null;
  complemento: string | null;
  dsclgr_os: string | null;
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
  data_carta: string | null;
  datasol: string | null;
  dataprev: string | null;
  datatertrab: string | null;
  // legacy/optional date columns returned by the RPC (may be null/absent)
  datacontab: string | null;
  data_766: string | null;
  dth_envio_dineng: string | null;
  dth_retorno_dineng: string | null;
  dth_impedimento: string | null;
  data_recebimento: string | null;
  in_base_5311: boolean | null;
  // soft delete / timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface Demanda {
  created_at: string;
  criado_por: string;
  deleted_at: string | null;
  deleted_by: string | null;
  descricao: string | null;
  id: string;
  num_obra: string | null;
  num_os: number | null;
  operador_id: string | null;
  prazo_execucao: string | null;
  prioridade: string | null;
  status: string | null;
  tipo_carta: string | null;
  tipo_demanda: string;
  titulo: string;
  updated_at: string;
}

export interface UserRole {
  created_at: string;
  id: string;
  role: AppRole;
  user_id: string;
}

export interface Profile {
  avatar_url: string | null;
  cargo: string | null;
  created_at: string;
  full_name: string | null;
  id: string;
  updated_at: string;
  user_id: string;
  username: string | null;
}

export interface DocumentoCarta {
  created_at: string;
  descricao: string | null;
  id: string;
  storage_path: string | null;
  titulo: string;
  updated_at: string;
  uploaded_by: string | null;
  url: string;
}

export interface Localidade {
  cod_lcd: string | null;
  created_at: string;
  id_loc: number;
  nome_lcd: string | null;
  regional: string | null;
  updated_at: string;
}

export interface Notifications {
  created_at: string;
  data: Json | null;
  id: string;
  message: string;
  read: boolean;
  title: string;
  type: string;
  user_id: string;
}

export interface Obra {
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  id_obra: number;
  num_obra: string | null;
  sigco: number | null;
  status: string | null;
  updated_at: string;
}

export interface Prioritario {
  cpf_corrigido: string | null;
  created_at: string;
  id: string;
  id_cliente: number | null;
  nome: string | null;
  observacao: string | null;
  updated_at: string;
}

export interface historico_os {
  campo: string | null;
  created_at: string;
  id: string;
  num_os: number;
  user_id: string | null;
  valor_new: string | null;
  valor_old: string | null;
}

export interface cliente {
  cpf: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  dt_nasc: string | null;
  email: string | null;
  id_cliente: number;
  nome: string | null;
  telefone: string[] | null;
  updated_at: string;
}
