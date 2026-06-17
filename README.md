# Sistema Operacional

Sistema de gestão operacional com autenticação segura, controle de demandas e gerenciamento de dados.

## Deploy no Vercel

### Configuração de Variáveis de Ambiente

Para que o deploy funcione corretamente, você precisa configurar as seguintes variáveis de ambiente no Vercel:

1. Acesse seu projeto no [Vercel Dashboard](https://vercel.com)
2. Vá em **Settings** > **Environment Variables**
3. Adicione as seguintes variáveis (obtenha os valores do painel Lovable Cloud):

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anônima (publishable) do Supabase |

4. Faça **redeploy** do projeto após adicionar as variáveis

### Comandos de Build

O projeto está configurado para usar:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Segurança

### Autenticação
- Login por username (não email)
- Validação de força de senha (8+ caracteres, maiúscula, minúscula, número, caractere especial)
- Verificação contra senhas vazadas (Have I Been Pwned API)
- Autenticação processada server-side via Edge Functions
- Rate limiting para prevenir força bruta (5 tentativas a cada 15 minutos)

### Headers de Segurança
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

### Log de Auditoria
- Todas as operações CRUD são registradas automaticamente
- Logs incluem: usuário, ação, tabela, dados antigos/novos
- Apenas admins podem visualizar logs de auditoria
- Logs não podem ser editados ou deletados

### Row Level Security (RLS)
- Todas as tabelas possuem RLS habilitado
- Acesso a dados sensíveis restrito por role (admin, operador_chefe, operador)
- Usuários só podem ver/editar seus próprios perfis

### CORS
- Origens permitidas restritas a domínios autorizados
- Proteção contra requisições cross-origin maliciosas

## Primeiro Acesso

Após o deploy, você precisará criar o primeiro usuário admin diretamente no banco de dados através do painel Lovable Cloud.

## Stack Tecnológica

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase (Auth + Database + Edge Functions)
- React Query (TanStack Query)

## Desenvolvimento Local

```sh
# Clonar repositório
git clone <YOUR_GIT_URL>

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```
