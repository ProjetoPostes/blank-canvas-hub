import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rate limiting store with exponential backoff
interface RateLimitEntry {
  count: number;
  resetTime: number;
  attempts: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_WINDOW: 60 * 1000, // 1 minuto
  MAX_BACKOFF: 24 * 60 * 60 * 1000, // 24 horas
};

// Tempo mínimo de resposta para prevenir timing attacks
const MIN_RESPONSE_TIME = 1500;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://lovable.dev",
  "https://preview--sistema-operacional.lovable.dev",
  "https://id.lovable.dev",
];

// Regex para validação de username (whitelist)
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,50}$/;

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

function getClientIP(req: Request): string {
  return req.headers.get("cf-connecting-ip") || 
         req.headers.get("x-forwarded-for")?.split(",")[0] || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  
  // Cleanup old entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime && (!value.blockedUntil || now > value.blockedUntil)) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  // No entry exists
  if (!entry || (now > entry.resetTime && (!entry.blockedUntil || now > entry.blockedUntil))) {
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.BASE_WINDOW,
      attempts: 1,
    });
    return { allowed: true };
  }
  
  // User is blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Reached attempt limit - apply exponential backoff
  if (entry.count >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
    const backoffMultiplier = Math.pow(2, Math.min(entry.attempts, 6));
    const backoffMs = Math.min(
      backoffMultiplier * RATE_LIMIT_CONFIG.BASE_WINDOW,
      RATE_LIMIT_CONFIG.MAX_BACKOFF
    );
    
    entry.blockedUntil = now + backoffMs;
    entry.attempts += 1;
    entry.resetTime = now + backoffMs;
    
    const retryAfter = Math.ceil(backoffMs / 1000);
    return { allowed: false, retryAfter };
  }
  
  entry.count++;
  return { allowed: true };
}

// Função para garantir tempo mínimo de resposta (previne timing attacks)
async function ensureMinResponseTime(startTime: number): Promise<void> {
  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_RESPONSE_TIME) {
    await new Promise(resolve => setTimeout(resolve, MIN_RESPONSE_TIME - elapsed));
  }
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Rate limiting with exponential backoff
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      await ensureMinResponseTime(startTime);
      return new Response(
        JSON.stringify({ 
          error: "Muitas tentativas. Tente novamente mais tarde." 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfter)
          } 
        }
      );
    }

    const { username, password, captchaToken } = await req.json();

    // Captcha enforcement: required when the IP has prior attempts in the current window
    const hcaptchaSecret = Deno.env.get("HCAPTCHA_SECRET_KEY");
    const ipEntry = rateLimitStore.get(clientIP);
    const captchaRequired = !!hcaptchaSecret && !!ipEntry && ipEntry.count > 1;

    if (captchaRequired && !captchaToken) {
      await ensureMinResponseTime(startTime);
      return new Response(
        JSON.stringify({ error: "Captcha obrigatório. Recarregue a página e complete o desafio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (captchaToken && hcaptchaSecret) {
      const captchaRes = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(hcaptchaSecret)}&response=${encodeURIComponent(captchaToken)}`,
      });
      const captchaData = await captchaRes.json();
      if (!captchaData.success) {
        await ensureMinResponseTime(startTime);
        return new Response(
          JSON.stringify({ error: "Verificação captcha falhou. Tente novamente." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (captchaRequired) {
      // Defensive: captcha required but no secret configured — fail closed
      await ensureMinResponseTime(startTime);
      return new Response(
        JSON.stringify({ error: "Captcha não configurado no servidor." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation
    if (!username || !password) {
      await ensureMinResponseTime(startTime);
      return new Response(
        JSON.stringify({ error: "Credenciais inválidas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ Validação de username com regex whitelist
    if (typeof username !== "string" || !USERNAME_REGEX.test(username)) {
      await ensureMinResponseTime(startTime);
      return new Response(
        JSON.stringify({ error: "Credenciais inválidas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (typeof password !== "string" || password.length > 128) {
      await ensureMinResponseTime(startTime);
      return new Response(
        JSON.stringify({ error: "Credenciais inválidas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find user by username in profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("username", username.trim())
      .single();

    if (profileError || !profile) {
      await ensureMinResponseTime(startTime);
      return new Response(
        JSON.stringify({ error: "Credenciais inválidas" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email from auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      profile.user_id
    );

    if (authError || !authUser.user) {
      await ensureMinResponseTime(startTime);
      return new Response(
        JSON.stringify({ error: "Credenciais inválidas" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Attempt login with email and password
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: session, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: authUser.user.email!,
      password: password,
    });

    if (signInError) {
      await ensureMinResponseTime(startTime);
      return new Response(
        JSON.stringify({ error: "Credenciais inválidas" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear rate limit on successful login
    rateLimitStore.delete(clientIP);

    await ensureMinResponseTime(startTime);
    return new Response(
      JSON.stringify({ 
        session: session.session,
        user: session.user
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Auth error:", error);
    await ensureMinResponseTime(startTime);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
