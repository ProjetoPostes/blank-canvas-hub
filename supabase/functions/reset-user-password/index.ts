import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://lovable.dev",
  "https://preview--sistema-operacional.lovable.dev",
  "https://id.lovable.dev",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isDev = origin?.includes("localhost") || origin?.includes("127.0.0.1");
  
  const isAllowedOrigin = origin && (
    ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed)) ||
    origin.endsWith(".lovable.dev") ||
    origin.endsWith(".lovable.app") ||
    origin.endsWith(".lovableproject.com") ||
    origin.endsWith(".vercel.app") ||
    isDev
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ✅ VALIDAÇÃO DE AUTENTICAÇÃO
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação requerido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.substring(7);
    
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ✅ VERIFICAR QUEM É O USUÁRIO
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, newPassword } = await req.json();

    // ✅ VALIDAÇÕES
    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "userId e newPassword são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter entre 8 e 128 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ AUTORIZAÇÃO: Verificar se é admin usando a função has_role
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    if (roleError || !isAdmin) {
      // Log tentativa não autorizada
      await supabaseAdmin.rpc("log_audit_action", {
        p_action: "UNAUTHORIZED_PASSWORD_RESET_ATTEMPT",
        p_table_name: "auth.users",
        p_record_id: userId,
        p_new_data: { attempted_by: user.id, target_user: userId }
      });

      return new Response(
        JSON.stringify({ error: "Apenas administradores podem resetar senhas" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ ATUALIZAR SENHA
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ LOG DE AUDITORIA
    await supabaseAdmin.rpc("log_audit_action", {
      p_action: "ADMIN_PASSWORD_RESET",
      p_table_name: "auth.users",
      p_record_id: userId,
      p_new_data: { reset_by: user.id, target_user: userId, reset_at: new Date().toISOString() }
    });

    return new Response(
      JSON.stringify({ success: true, message: "Senha atualizada com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
