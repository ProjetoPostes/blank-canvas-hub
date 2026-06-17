import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  message: string;
  user_id: string;
}

interface WebhookResponse {
  response?: string;
  message?: string;
  output?: string;
  file?: {
    name?: string;
    type?: string;
    data?: string;
    size?: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client with user auth for validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Client with service role for saving Cúmulo responses (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;

    // Validate user role - only admin, operador_chefe, operador can use chat
    const { data: userRole, error: roleError } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'operador_chefe', 'operador'])
      .limit(1);

    if (roleError || !userRole || userRole.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Acesso não autorizado ao chat' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ChatRequest = await req.json();

    // Validate payload
    if (!body.message || typeof body.message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Mensagem inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check (simple in-memory, for production use Redis or similar)
    const messageLength = body.message.length;
    if (messageLength > 5000) {
      return new Response(
        JSON.stringify({ error: 'Mensagem muito longa (máximo 5000 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get N8N webhook URL from secrets
    const n8nWebhookUrl = Deno.env.get('N8N_CUMULO_WEBHOOK_URL');
    
    if (!n8nWebhookUrl) {
      console.error('N8N_CUMULO_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Serviço de automação não configurado' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile for context
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('full_name, cargo')
      .eq('user_id', userId)
      .single();

    // Call N8N webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: body.message,
        user_id: userId,
        user_name: profile?.full_name || 'Usuário',
        user_cargo: profile?.cargo || null,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!n8nResponse.ok) {
      console.error('N8N webhook error:', n8nResponse.status, await n8nResponse.text());
      return new Response(
        JSON.stringify({ error: 'Erro ao processar mensagem' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let n8nData = await n8nResponse.json();
    
    // Se for array, pegar primeiro elemento
    if (Array.isArray(n8nData)) {
      n8nData = n8nData[0] || {};
    }
    
    // Extrair texto - pode ser string ou objeto aninhado
    let responseText = '';
    if (typeof n8nData.response === 'string') {
      responseText = n8nData.response;
    } else if (typeof n8nData.response === 'object' && n8nData.response !== null) {
      responseText = n8nData.response.response || n8nData.response.message || '';
    } else {
      responseText = n8nData.message || n8nData.output || '';
    }
    
    const fileData = n8nData.file || null;
    
    // Only save if there's content or file
    const hasContent = responseText && responseText.trim().length > 0;
    const hasFile = fileData && fileData.data;
    
    if (hasContent || hasFile) {
      // Save Cúmulo's response to database using service role (bypass RLS)
      const { error: insertError } = await supabaseAdmin
        .from('chat_messages')
        .insert({
          sender_id: userId,
          recipient_id: 'cumulo',
          content: hasContent ? `[CUMULO_RESPONSE]${responseText}` : '[CUMULO_RESPONSE]',
          status: 'sent',
          file: hasFile ? fileData : null,
        });

      if (insertError) {
        console.error('Error saving Cúmulo response:', insertError);
        // Don't fail the request, just log the error
      }
    }

    // Return the response
    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        file: fileData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chat Cúmulo error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
