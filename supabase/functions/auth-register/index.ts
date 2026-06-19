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

// Lista de senhas comuns para verificação
const COMMON_PASSWORDS = new Set([
  '123456', '123456789', '12345678', 'password', '12345', 
  '1234567', '1234567890', 'qwerty', 'abc123', 'monkey',
  'senha', 'senha123', 'admin', 'administrator', 'root',
  'letmein', 'welcome', 'login', 'master', 'dragon',
  'passw0rd', 'password1', 'password123', 'qwerty123',
  'admin123', 'user', 'user123', 'guest', 'guest123',
  'test', 'test123', '123qwe', 'qwe123', 'zxcvbn',
  'brasil', 'futebol', 'flamengo', 'palmeiras', 'corinthians'
]);

interface PasswordValidation {
  isValid: boolean;
  score: number;
  errors: string[];
}

function validatePasswordStrength(password: string): PasswordValidation {
  const errors: string[] = [];
  let score = 0;
  
  if (password.length < 8) {
    errors.push("Senha deve ter no mínimo 8 caracteres");
  } else {
    score++;
  }
  
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    errors.push("Senha deve conter ao menos uma letra maiúscula");
  }
  
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    errors.push("Senha deve conter ao menos uma letra minúscula");
  }
  
  if (/[0-9]/.test(password)) {
    score++;
  } else {
    errors.push("Senha deve conter ao menos um número");
  }
  
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score++;
  } else {
    errors.push("Senha deve conter ao menos um caractere especial");
  }
  
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    score = 0;
    errors.push("Esta senha é muito comum e insegura");
  }
  
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    errors.push("Evite caracteres repetidos em sequência");
  }
  
  if (/(?:abc|bcd|cde|123|234|345|456|567|678|789)/i.test(password)) {
    score = Math.max(0, score - 1);
    errors.push("Evite sequências previsíveis");
  }
  
  return {
    isValid: score >= 3 && errors.length === 0,
    score,
    errors: errors.slice(0, 3),
  };
}

// ✅ HIBP check com retry logic e fallback seguro
async function checkLeakedPassword(password: string, maxRetries = 3): Promise<{ isLeaked: boolean; error?: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  
  const prefix = hashHex.substring(0, 5);
  const suffix = hashHex.substring(5);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundo timeout
      
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: {
          'User-Agent': 'Sistema-Operacional-Security-Check',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (attempt === maxRetries - 1) {
          // Na última tentativa, rejeita por segurança
          return { isLeaked: false, error: "Não foi possível validar a segurança da senha. Tente novamente." };
        }
        // Aguarda antes de retry com backoff exponencial
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      
      const text = await response.text();
      const lines = text.split('\n');
      
      for (const line of lines) {
        const [hashSuffix] = line.split(':');
        if (hashSuffix.trim() === suffix) {
          return { isLeaked: true }; // Senha vazada encontrada
        }
      }
      
      return { isLeaked: false }; // Senha segura
    } catch (error) {
      console.error(`HIBP check attempt ${attempt + 1} failed:`, error);
      
      if (attempt === maxRetries - 1) {
        // Na última falha, rejeita por segurança em vez de permitir
        return { isLeaked: false, error: "Não foi possível validar a segurança da senha. Tente novamente." };
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  return { isLeaked: false, error: "Não foi possível validar a segurança da senha. Tente novamente." };
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
    // Rate limiting with exponential backoff
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
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

    const { username, password, fullName, captchaToken } = await req.json();

    // Mandatory captcha for registration (when HCaptcha is configured)
    const hcaptchaSecret = Deno.env.get("HCAPTCHA_SECRET_KEY");
    if (hcaptchaSecret) {
      if (!captchaToken || typeof captchaToken !== "string") {
        return new Response(
          JSON.stringify({ error: "Captcha obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const captchaRes = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(hcaptchaSecret)}&response=${encodeURIComponent(captchaToken)}`,
      });
      const captchaData = await captchaRes.json();
      if (!captchaData.success) {
        return new Response(
          JSON.stringify({ error: "Verificação captcha falhou. Tente novamente." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!username || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input lengths
    if (typeof username !== "string" || username.length > 50) {
      return new Response(
        JSON.stringify({ error: "Username inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof password !== "string" || password.length > 128) {
      return new Response(
        JSON.stringify({ error: "Senha inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof fullName !== "string" || fullName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Nome inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate username format with regex whitelist
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return new Response(
        JSON.stringify({ error: "Username deve ter 3-20 caracteres alfanuméricos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar força da senha (SERVER-SIDE)
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: passwordValidation.errors[0] || "Senha não atende aos requisitos de segurança",
          passwordErrors: passwordValidation.errors,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ Verificar se senha foi vazada com retry e fallback seguro
    const leakCheck = await checkLeakedPassword(password);
    
    if (leakCheck.error) {
      return new Response(
        JSON.stringify({ error: leakCheck.error }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (leakCheck.isLeaked) {
      return new Response(
        JSON.stringify({ 
          error: "Esta senha foi encontrada em vazamentos de dados. Por segurança, escolha outra senha.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if username already exists (case-insensitive)
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "Este username já está em uso" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also check if the internal email already exists in auth to prevent collision
    const internalEmail = `${username.toLowerCase()}@internal.sistema.local`;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === internalEmail);
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "Este username já está em uso" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email already defined above
    // const internalEmail = `${username.toLowerCase()}@internal.sistema.local`;

    // Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username: username,
      },
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with username
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ username: username })
      .eq("user_id", authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Sign in the user immediately
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: session, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: internalEmail,
      password: password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ error: "Conta criada. Faça login para continuar." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        session: session.session,
        user: session.user,
        message: "Conta criada com sucesso!"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Register error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
