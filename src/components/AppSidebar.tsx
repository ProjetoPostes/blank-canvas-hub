import { LayoutDashboard, Send, BookOpen, BarChart3, Users, ClipboardList, User, Shield, Upload, Home, History, UserCheck, Star, Building2, MapPin, FileEdit } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { usePendingApprovals } from "@/hooks/usePendingApprovals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const painelItems = [
  {
    title: "Painel Despacho",
    url: "/tratativas",
    icon: LayoutDashboard,
  },
  {
    title: "Painel Caderno",
    url: "/tratativas/painel-caderno",
    icon: BarChart3,
  },
];

const tabelasItems = [
  {
    title: "Despacho",
    url: "/tratativas/despacho",
    icon: Send,
  },
  {
    title: "Caderno",
    url: "/tratativas/caderno",
    icon: BookOpen,
  },
  {
    title: "Clientes",
    url: "/tratativas/clientes",
    icon: Users,
  },
  {
    title: "Obras",
    url: "/tratativas/obras",
    icon: Building2,
  },
  {
    title: "Localidades",
    url: "/tratativas/localidades",
    icon: MapPin,
  },
  {
    title: "Prioritários",
    url: "/tratativas/prioritarios",
    icon: Star,
  },
  {
    title: "Documentos / Cartas",
    url: "/tratativas/documentos-cartas",
    icon: FileEdit,
  },
  {
    title: "Histórico OS",
    url: "/tratativas/historico-os",
    icon: History,
  },
];

const chefeItems = [
  {
    title: "Gestão de Demandas",
    url: "/tratativas/gestao-demandas",
    icon: ClipboardList,
  },
];

const operadorItems = [
  {
    title: "Minhas Demandas",
    url: "/tratativas/minhas-demandas",
    icon: ClipboardList,
  },
];

const perfilItems = [
  {
    title: "Meu Perfil",
    url: "/tratativas/perfil",
    icon: User,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { canManageDemandas, isOperador, isAdmin } = useUserRole();
  const { pendingCount } = usePendingApprovals();

  const adminItems = [
    {
      title: "Usuários",
      url: "/tratativas/admin-usuarios",
      icon: Shield,
    },
    {
      title: "Aprovação de Usuários",
      url: "/tratativas/aprovacao-usuarios",
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      title: "Importação",
      url: "/tratativas/importacao",
      icon: Upload,
    },
    {
      title: "Logs de Auditoria",
      url: "/tratativas/audit-logs",
      icon: History,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate("/")}
            title="Voltar ao Início"
          >
            <Home className="h-4 w-4" />
          </Button>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Tratativas</span>
              <span className="text-xs text-muted-foreground">Gestão de OS</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Painéis */}
        <SidebarGroup>
          <SidebarGroupLabel>Painéis</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {painelItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tabelas */}
        <SidebarGroup>
          <SidebarGroupLabel>Tabelas Operacionais</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tabelasItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operador Chefe */}
        {canManageDemandas && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestão</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {chefeItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <NavLink to={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Operador */}
        {isOperador && (
          <SidebarGroup>
            <SidebarGroupLabel>Meu Trabalho</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {operadorItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <NavLink to={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <NavLink to={item.url} className="relative">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {item.badge && !isCollapsed && (
                            <Badge 
                              variant="destructive" 
                              className="ml-auto h-5 min-w-5 flex items-center justify-center text-xs px-1.5"
                            >
                              {item.badge}
                            </Badge>
                          )}
                          {item.badge && isCollapsed && (
                            <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center px-1">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Perfil */}
        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {perfilItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!isCollapsed && (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            v1.0.0 - Inteligência LPT
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
