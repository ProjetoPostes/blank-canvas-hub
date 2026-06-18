## Objetivo

Adaptar o codebase ao novo schema normalizado (snake_case, cliente/obra/localidade como FK, sem criptografia, sem chat/MFA/base5311/RPCs antigas) já aplicado no Supabase externo `iizfjjxfjpzfmylecfwj`.

## 1. Infraestrutura Supabase

- Regenerar `src/integrations/supabase/types.ts` manualmente com o schema novo (cliente, obra, localidade, profiles, user_roles, caderno, despacho, demandas, prioritario, historico_os, documentos_cartas, notifications, audit_logs, masked_audit_logs + RPCs `has_role`, `soft_delete_record`, `check_security_health`, `find_cliente_duplicatas`, `is_in_prioritario`, `list_operadores`, `log_audit_action`, `get_caderno_full`, `get_despacho_full`).
- Reescrever `src/types/database.ts` para refletir o shape retornado pelas RPCs `get_caderno_full` / `get_despacho_full` (campos achatados com aliases legados: `numos`, `nomecli`, `numcpf`, etc.) para minimizar mudanças nas páginas.

## 2. Remover features mortas

Deletar arquivos:

```text
src/components/chat/*                     (toda a pasta)
src/components/MfaEnrollDialog.tsx
src/components/MfaEnrollRequiredDialog.tsx
src/components/MfaRequirementsSettings.tsx
src/components/MfaSettings.tsx
src/components/MfaVerifyDialog.tsx
src/hooks/useChat.ts
src/hooks/useChatUsers.ts
src/hooks/useMfa.ts
src/hooks/useMfaRequirements.ts
src/hooks/useBase5311.ts
src/pages/ChatPage.tsx
src/pages/Base5311Page.tsx
src/types/chat.ts
supabase/functions/chat-cumulo/
supabase/functions/auth-login/
supabase/functions/auth-register/
supabase/functions/reset-user-password/
```

Manter `UserApprovalPage` e `usePendingApprovals` adaptados: "pendente" = usuário em `profiles` sem nenhuma linha em `user_roles`. Aprovar = inserir role.

## 3. Adaptar hooks (substituir RPCs antigas)

- `useSecurityRpc.ts` → remover `validateAccess`, `secureDelete`, `validateOperadorAssignment` (não existem mais). Manter só `softDelete` e `checkSecurityHealth`.
- `useDespacho.ts` → remover toda chamada a `validateAccess` e `secureDelete`; usar `get_despacho_full` para leitura; UPDATE direto em `despacho` por `id_despacho`; importação Excel grava via upsert em `cliente` (por CPF) + insert em `despacho` ligando `id_cliente`.
- `useCaderno.ts` → análogo, com `get_caderno_full`, upsert `cliente`/`obra`/`localidade`, insert `caderno`.
- `useClienteDuplicatas.ts` → trocar parâmetro `p_numcpf` → `p_cpf` e `p_current_numos` → `p_current_num_os` (RPC `find_cliente_duplicatas`).
- `useDemandas.ts` → remover campo `tipo` (só `tipo_demanda`).
- `useDocumentosCartas.ts` → renomear `nome`→`titulo`, `criado_por`→`uploaded_by`, remover `categoria`.
- `useUserRole.ts` → enum continua igual, ok.
- `useNotifications.ts`, `useProfile.ts`, `useOperadores.ts`, `usePendingApprovals.ts`, `useCadernoStats.ts`, `useDespachoStats.ts` → revisar nomes de colunas.

## 4. Adaptar páginas

`Despacho.tsx`, `Caderno.tsx`, `consulta/DespachoConsulta.tsx`, `consulta/CadernoConsulta.tsx`, `ClientesPage.tsx`, `consulta/ClientesConsulta.tsx`, `GestaoDemandasPage.tsx`, `MinhasDemandasPage.tsx`, `Painel.tsx`, `PainelCaderno.tsx`, `ImportacaoPage.tsx`, `AdminUsuariosPage.tsx`, `AuditLogsPage.tsx`, `consulta/DocumentosCartas.tsx`, `consulta/RelatorioCartasDashboard.tsx`, `UserApprovalPage.tsx`, `ProfilePage.tsx`, `Auth.tsx`, `MainHub.tsx`.

Como o shape retornado pelas RPCs `get_*_full` usa os aliases antigos (`numos`, `nomecli`, etc.), a maior parte das páginas pode permanecer quase igual — só ajustar:
- `id` → `id_despacho` / `id_os` ao chamar mutations.
- Remover referências a colunas mortas (`datacontab`, `data_766`, `dth_envio_dineng`, `dth_retorno_dineng`, `dth_impedimento`, `data_recebimento` em `caderno`; `dth_nascimento` continua via cliente).
- Remover toda referência a `base_5311` enquanto tabela (campo virou TEXT em `caderno`; usar `in_base_5311` calculado).
- Remover botões/menus de Chat, MFA, Base5311.

## 5. Limpar rotas e sidebar

- `src/routes/*`, `src/router.tsx`, `src/App.tsx`, `src/components/AppSidebar.tsx`, `src/components/UserMenu.tsx`, `src/components/AppLayout.tsx`, `src/components/SecurityHealthPanel.tsx` → remover links/rotas de Chat, MFA, Base5311.
- `routeTree.gen.ts` → regenerar (ou manter manual).

## 6. Auth

- `src/contexts/AuthContext.tsx`, `src/pages/Auth.tsx` → manter login/cadastro nativo do Supabase (email/senha). Sem MFA. Trigger `handle_new_user` já cria profile no banco automaticamente.

## 7. Limpeza

- Apagar `src/data/mockData.ts` se só era usado por features removidas.
- Apagar `docs/supabase-schema.sql` antigo e substituir pelo SQL novo.
- Apagar `src/components/SecurityHealthPanel.tsx` ou mantê-lo simplificado (só `check_security_health`).

## 8. Validação

- Build limpo (`tsc` sem erros).
- Login → Hub → Despacho → Caderno carregam sem erro de rede/RLS.
- Importação Excel insere em `cliente` + `despacho` corretamente.

## Detalhes técnicos relevantes

- `caderno.id_os` é UUID PK; `caderno.num_os` é BIGINT UNIQUE — pra UI usar `num_os` como número visível.
- `despacho.id_despacho` é UUID PK; mesma lógica.
- `cliente.telefone` é `TEXT[]`; RPC achata pegando `[1]` e `[2]`.
- `documentos` bucket criado no storage; policies já aplicadas (read auth, write admin/operador_chefe).
- `audit_logs` agora tem `id UUID` (antes era bigint) — `AuditLogsPage` deve tratar como string.

## Escopo NÃO incluído (confirmar depois)

- Reescrever as edge functions deletadas em novas funções (auth nativo do Supabase resolve login/cadastro/reset sem edge function).
- Rebuild visual / mudanças de design.
- Migrar dados antigos para o novo schema (assumindo banco vazio ou já populado fora).
