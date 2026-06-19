// Application-facing shapes. The Caderno/Despacho interfaces match exactly
// what the RPCs get_caderno_full / get_despacho_full return — with legacy
// aliases (numos, nomecli, numcpf, nomelcd, ...) — so most UI code keeps
// working without rewrites. The `id` field is the underlying UUID PK
// (id_os / id_despacho); mutations target the real column.

export type AppRole = "admin" | "operador_chefe" | "operador" | "consultor";

export interface Despacho {
  base: string | null;
  complemento: string | null;
  concluida: boolean | null;
  created_at: string;
  criterio: string | null;
  data_conclusao: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  dias_para_despacho: number | null;
  dsclgr_os: string | null;
  familia: string | null;
  id_cliente: number | null;
  id_despacho: string;
  inconsistencia: number | null;
  motivo_da_improcedencia: string | null;
  nome_lcd: string | null;
  num_os: number;
  regional: string | null;
  responsavel: string | null;
  tratativa: string | null;
  updated_at: string;
}

export interface Caderno {
 base_5311: string | null;
  bloco_cliente: string | null;
  complemento: string | null;
  controle_os: string | null;
  created_at: string;
  criterio: string | null;
  data_carta: string | null;
  dataprev: string | null;
  datasol: string | null;
  datatertrab: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  dsclgr_os: string | null;
  empreiteira: string | null;
  id_cliente: number | null;
  id_loc: number | null;
  id_obra: number | null;
  id_os: string;
  motivo_improcedencia: string | null;
  num_os: number;
  observacao: string | null;
  origem: string | null;
  pendencia_obra: string | null;
  prazo: string | null;
  prioridade: string | null;
  responsavel: string | null;
  status: string | null;
  tipo_carta_enviada: string | null;
  tranche: string | null;
  updated_at: string;
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
  role: Database["public"]["Enums"]["app_role"];
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
  created_at: string
  descricao: string | null
  id: string
  storage_path: string | null
  titulo: string
  updated_at: string
  uploaded_by: string | null
  url: string
}

export interface Localidade {
  cod_lcd: string | null;
  created_at: string;
  id_loc: number;
  nome_lcd: string | null;
  regional: string | null;
  updated_at: string;
}

export interface Notifications{
  created_at: string;
  data: Json | null;
  id: string;
  message: string;
  read: boolean;
  title: string;
  type: string;
  user_id: string;
}

export interface Obra{
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
  cpf_corrigido: string | null
  created_at: string
  id: string
  id_cliente: number | null
  nome: string | null
  observacao: string | null
  updated_at: string
}

export interface historico_os{
  campo: string | null;
  created_at: string;
  id: string;
  num_os: number;
  user_id: string | null;
  valor_new: string | null;
  valor_old: string | null;
}

export interface cliente{
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
