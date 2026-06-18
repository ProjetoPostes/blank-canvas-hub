import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProfile } from "@/hooks/useProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Mail } from "lucide-react";


const formSchema = z.object({
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cargo: z.string().optional(),
  username: z.string().min(3, "Login deve ter pelo menos 3 caracteres").optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ProfilePage() {
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const { roles } = useUserRole();
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { full_name: "", cargo: "", username: "" },
  });

  useEffect(() => {
    if (profile) {
      form.reset({ full_name: profile.full_name ?? "", cargo: profile.cargo ?? "", username: profile.username ?? "" });
    }
  }, [profile, form]);

  const onSubmit = async (data: FormData) => {
    await updateProfile(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userEmail = user?.email ?? "";
  const userName = profile?.full_name || user?.user_metadata?.full_name || userEmail.split("@")[0];
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials || <User className="h-8 w-8" />}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{userName}</CardTitle>
              <CardDescription className="flex items-center gap-1"><Mail className="h-3 w-3" />{userEmail}</CardDescription>
              <div className="flex gap-1 mt-2">
                {roles.map((role) => (<Badge key={role} variant="secondary">{role}</Badge>))}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Perfil</CardTitle>
          <CardDescription>Atualize suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="full_name" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="username" render={({ field }) => (<FormItem><FormLabel>Login</FormLabel><FormControl><Input placeholder="Seu login" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="cargo" render={({ field }) => (<FormItem><FormLabel>Cargo</FormLabel><FormControl><Input placeholder="Seu cargo" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" disabled={isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar Alterações</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      
    </div>
  );
}
