import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Menu, Shield, AlertTriangle } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { isCommonPassword } from "@/lib/passwordValidation";
import { sanitizeInput } from "@/lib/inputValidation";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Rate limiting constants
const RATE_LIMIT_DELAY_MS = 1000; // 1 second minimum between attempts
const MAX_ATTEMPTS_BEFORE_CAPTCHA = 3; // Show captcha after 3 failed attempts
const MAX_ATTEMPTS = 10; // Hard limit

// hCaptcha site key (public, safe to expose)
const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001";

const loginSchema = z.object({
  username: z.string().min(3, "Login deve ter no mínimo 3 caracteres"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  enterTratativas: z.boolean().default(false),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  username: z.string()
    .min(3, "Login deve ter no mínimo 3 caracteres")
    .max(20, "Login deve ter no máximo 20 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Login deve conter apenas letras, números e underscore"),
  password: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .refine((val) => /[A-Z]/.test(val), "Senha deve conter ao menos uma letra maiúscula")
    .refine((val) => /[a-z]/.test(val), "Senha deve conter ao menos uma letra minúscula")
    .refine((val) => /[0-9]/.test(val), "Senha deve conter ao menos um número")
    .refine((val) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val), "Senha deve conter ao menos um caractere especial")
    .refine((val) => !isCommonPassword(val), "Esta senha é muito comum")
    .refine((val) => !/(.)\1{2,}/.test(val), "Evite caracteres repetidos em sequência")
    .refine((val) => !/(?:abc|bcd|cde|123|234|345|456|567|678|789)/i.test(val), "Evite sequências previsíveis"),
  confirmPassword: z.string().min(8, "Confirme a senha"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Rate limiting and CAPTCHA state
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const lastAttemptRef = useRef<number>(0);

  // Signup captcha (always required)
  const [signupCaptchaToken, setSignupCaptchaToken] = useState<string | null>(null);
  const signupCaptchaRef = useRef<HCaptcha>(null);
  
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const showCaptcha = loginAttempts >= MAX_ATTEMPTS_BEFORE_CAPTCHA;

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      enterTratativas: false,
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    captchaRef.current?.resetCaptcha();
  }, []);

  const getLoginErrorMessage = (error: string): string => {
    const errorMessages: Record<string, string> = {
      "Credenciais inválidas": "Usuário ou senha incorretos. Verifique seus dados e tente novamente.",
      "Username e senha são obrigatórios": "Por favor, preencha o usuário e a senha.",
      "Erro interno do servidor": "Ocorreu um erro no servidor. Tente novamente em alguns minutos.",
    };
    
    if (error.includes("Muitas tentativas")) {
      return error;
    }
    
    return errorMessages[error] || error;
  };

  const handleLogin = async (data: LoginFormData) => {
    // Prevent duplicate submissions
    if (isSubmitting) return;
    
    // Frontend rate limiting
    const now = Date.now();
    if (now - lastAttemptRef.current < RATE_LIMIT_DELAY_MS) {
      toast.error("Aguarde antes de tentar novamente");
      return;
    }
    
    if (loginAttempts >= MAX_ATTEMPTS) {
      toast.error("Muitas tentativas. Tente novamente mais tarde.");
      return;
    }

    // Require captcha after threshold
    if (showCaptcha && !captchaToken) {
      toast.error("Complete o captcha para continuar");
      return;
    }
    
    lastAttemptRef.current = now;
    setLoginAttempts(prev => prev + 1);
    setIsLoading(true);
    setIsSubmitting(true);
    
    try {
      const sanitizedUsername = sanitizeInput(data.username.trim()).toLowerCase();
      const email = `${sanitizedUsername}@app.local`;

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });

      if (error) {
        resetCaptcha();
        toast.error("Falha no login", {
          description: getLoginErrorMessage(error.message) || "Usuário ou senha incorretos.",
        });
        return;
      }

      if (authData?.session) {
        const targetPath = data.enterTratativas ? "/tratativas" : "/";
        setLoginAttempts(0);
        resetCaptcha();
        toast.success("Login realizado com sucesso!");
        navigate(targetPath);
      }
    } catch (error) {
      resetCaptcha();
      if (import.meta.env.DEV) console.error("Login error:", error);
      toast.error("Erro inesperado", {
        description: "Ocorreu um erro ao fazer login. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const getSignupErrorMessage = (error: string): string => {
    const errorMessages: Record<string, string> = {
      "Username já está em uso": "Este nome de usuário já existe. Escolha outro.",
      "Erro interno do servidor": "Ocorreu um erro no servidor. Tente novamente em alguns minutos.",
      "Dados inválidos": "Por favor, verifique os dados informados.",
    };
    
    if (error.includes("senha")) {
      return error;
    }
    
    return errorMessages[error] || error;
  };

  const handleSignup = async (data: SignupFormData) => {
    // Prevent duplicate submissions
    if (isSubmitting) return;

    if (!signupCaptchaToken) {
      toast.error("Complete o captcha para continuar");
      return;
    }

    setIsLoading(true);
    setIsSubmitting(true);
    
    try {
      const sanitizedUsername = sanitizeInput(data.username.trim()).toLowerCase();
      const sanitizedFullName = sanitizeInput(data.fullName.trim());
      const email = `${sanitizedUsername}@app.local`;

      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: sanitizedUsername,
            full_name: sanitizedFullName,
          },
        },
      });

      if (error) {
        setSignupCaptchaToken(null);
        signupCaptchaRef.current?.resetCaptcha();
        toast.error("Falha no cadastro", {
          description: getSignupErrorMessage(error.message) || error.message,
        });
        return;
      }

      if (authData?.session) {
        toast.success("Conta criada com sucesso!");
        navigate("/");
      } else {
        toast.success("Conta criada!", {
          description: "Faça login para continuar.",
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Signup error:", error);
      toast.error("Erro inesperado", {
        description: "Ocorreu um erro ao criar a conta. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Menu className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Caderno de Demandas</span>
          </div>
          <CardTitle>Acesso ao Sistema</CardTitle>
          <CardDescription>
            Entre com suas credenciais ou crie uma nova conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Login</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Seu login"
                            autoComplete="username"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••"
                            autoComplete="current-password"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="enterTratativas"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-muted/30">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Entrar em Tratativas
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {/* CAPTCHA after failed attempts */}
                  {showCaptcha && (
                    <div className="space-y-3">
                      <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          Muitas tentativas detectadas. Complete o captcha abaixo.
                        </AlertDescription>
                      </Alert>
                      <div className="flex justify-center p-4 bg-muted/30 rounded-lg border">
                        <HCaptcha
                          ref={captchaRef}
                          sitekey={HCAPTCHA_SITE_KEY}
                          onVerify={handleCaptchaVerify}
                          onExpire={handleCaptchaExpire}
                          theme="light"
                        />
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || isSubmitting || (showCaptcha && !captchaToken)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Seu nome"
                            autoComplete="name"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Login</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="seu_login"
                            autoComplete="username"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => {
                      const passwordValue = signupForm.watch("password");
                      return (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Senha
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              autoComplete="new-password"
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <PasswordStrengthIndicator password={passwordValue || ""} />
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••"
                            autoComplete="new-password"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-center p-4 bg-muted/30 rounded-lg border">
                    <HCaptcha
                      ref={signupCaptchaRef}
                      sitekey={HCAPTCHA_SITE_KEY}
                      onVerify={(token) => setSignupCaptchaToken(token)}
                      onExpire={() => setSignupCaptchaToken(null)}
                      theme="light"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || isSubmitting || !signupCaptchaToken}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      "Criar Conta"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
