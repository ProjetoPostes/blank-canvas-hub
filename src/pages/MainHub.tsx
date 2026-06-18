import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import {
  FileText,
  Search,
  Mail,
  Building2,
  AlertTriangle,
  MessageSquareWarning,
  FileCheck,
  BarChart3,
  Clock,
  XCircle,
  BookOpen,
  Users,
  FileEdit,
  FolderOpen,
  Gavel,
  Shield,
  Briefcase,
  Calendar,
  Clipboard,
  PieChart,
  MessageCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CategoryItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SubItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  route?: string;
}

const categories: CategoryItem[] = [
  { id: "despacho", label: "Despacho", icon: <FileText className="h-6 w-6" /> },
  { id: "analise", label: "Análise", icon: <Search className="h-6 w-6" /> },
  { id: "cartas", label: "Cartas", icon: <Mail className="h-6 w-6" /> },
  { id: "obras", label: "Obras", icon: <Building2 className="h-6 w-6" /> },
  { id: "prioridades", label: "Prioridades", icon: <AlertTriangle className="h-6 w-6" /> },
  { id: "reclamacoes", label: "Reclamações", icon: <MessageSquareWarning className="h-6 w-6" /> },
  { id: "oficios", label: "Ofícios", icon: <FileCheck className="h-6 w-6" /> },
  { id: "relatorios", label: "Relatórios", icon: <BarChart3 className="h-6 w-6" /> },
];

const subItems: Record<string, SubItem[]> = {
  despacho: [
    {
      id: "pendente",
      label: "Pendente",
      icon: <Clock className="h-5 w-5" />,
      route: "/consulta/despacho?filtro=Pendente",
    },
    {
      id: "inconsistencia",
      label: "Inconsistência",
      icon: <XCircle className="h-5 w-5" />,
      route: "/consulta/despacho?filtro=Inconsistencia",
    },
  ],
  analise: [
    { id: "caderno", label: "Caderno", icon: <BookOpen className="h-5 w-5" />, route: "/consulta/caderno" },
    { id: "cliente", label: "Cliente", icon: <Users className="h-5 w-5" />, route: "/consulta/clientes" },
    { id: "cartas", label: "Cartas", icon: <Mail className="h-5 w-5" />, route: "/consulta/caderno?modo=cartas" },
  ],
  cartas: [
    { id: "mod-cartas", label: "Mod. Cartas", icon: <FileEdit className="h-5 w-5" />, route: "/consulta/documentos-cartas" },
    { id: "outros-doc", label: "Outros Doc", icon: <FolderOpen className="h-5 w-5" /> },
  ],
  obras: [
    { id: "pendente", label: "Pendente", icon: <Clock className="h-5 w-5" /> },
    { id: "analisada", label: "Analisada", icon: <Search className="h-5 w-5" /> },
    { id: "contratada", label: "Contratada", icon: <Briefcase className="h-5 w-5" /> },
    { id: "suspensa", label: "Suspensa", icon: <XCircle className="h-5 w-5" /> },
    { id: "encerrada", label: "Encerrada", icon: <FileCheck className="h-5 w-5" /> },
    { id: "prazo-construcao", label: "Prazo Construção", icon: <Calendar className="h-5 w-5" /> },
  ],
  prioridades: [
    {
      id: "diretoria",
      label: "Diretoria",
      icon: <Briefcase className="h-5 w-5" />,
      route: "/consulta/caderno?modo=prioridade&prioridade=Diretoria",
    },
    {
      id: "reclamacoes",
      label: "Reclamações",
      icon: <MessageSquareWarning className="h-5 w-5" />,
      route: "/consulta/caderno?modo=prioridade&prioridade=Reclamações",
    },
    {
      id: "aneel-mme-judicial",
      label: "Aneel / MME / Judicial",
      icon: <Gavel className="h-5 w-5" />,
      route: "/consulta/caderno?modo=prioridade&prioridade=Aneel / MME / Judicial",
    },
    {
      id: "quilombolas",
      label: "Quilombolas",
      icon: <Shield className="h-5 w-5" />,
      route: "/consulta/caderno?modo=prioridade&prioridade=Quilombolas",
    },
    {
      id: "indigenas",
      label: "Indígenas",
      icon: <Shield className="h-5 w-5" />,
      route: "/consulta/caderno?modo=prioridade&prioridade=Indígenas",
    },
    {
      id: "outros",
      label: "Outros",
      icon: <FolderOpen className="h-5 w-5" />,
      route: "/consulta/caderno?modo=prioridade&prioridade=Outros",
    },
  ],
  reclamacoes: [
    { id: "controle", label: "Controle", icon: <Clipboard className="h-5 w-5" /> },
    { id: "prazos", label: "Prazos", icon: <Calendar className="h-5 w-5" /> },
  ],
  oficios: [{ id: "controle", label: "Controle", icon: <Clipboard className="h-5 w-5" /> }],
  relatorios: [
    { id: "diretoria", label: "Diretoria", icon: <Briefcase className="h-5 w-5" /> },
    { id: "cartas", label: "Cartas", icon: <Mail className="h-5 w-5" />, route: "/consulta/relatorio-cartas" },
    { id: "projetos", label: "Projetos", icon: <PieChart className="h-5 w-5" /> },
    { id: "obras", label: "Obras", icon: <Building2 className="h-5 w-5" /> },
  ],
};

export default function MainHub() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isOperadorChefe, isOperador } = useUserRole();
  const canAccessTratativas = isAdmin || isOperadorChefe || isOperador;
  const canAccessChat = isAdmin || isOperadorChefe || isOperador;

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleSubItemClick = (item: SubItem) => {
    if (item.route) {
      navigate(item.route);
    }
  };

  const goToTratativas = () => {
    navigate("/tratativas");
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-primary/5 flex flex-col">
      {/* Header */}
      <header className="border-b border-primary/20 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">Inteligência</h1>
                <span className="text-xs text-secondary font-semibold">LPT</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <TooltipProvider>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    onClick={goToTratativas}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    disabled={!canAccessTratativas}
                  >
                    Acessar Tratativas
                  </Button>
                </TooltipTrigger>
                {!canAccessTratativas && (
                  <TooltipContent>
                    <p>Este recurso é exclusivo para operadores, supervisores e administradores</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center p-8 pt-12">
        <div className="w-full max-w-6xl flex gap-12">
          {/* Primary Column */}
          <div className="w-72 flex-shrink-0">
            <div className="space-y-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={cn(
                    "w-full group relative flex items-center gap-3 px-5 py-4 rounded-xl border transition-all duration-200",
                    "shadow-sm hover:shadow-md",
                    selectedCategory === category.id
                      ? "bg-secondary text-secondary-foreground border-secondary shadow-lg"
                      : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-accent/20",
                  )}
                >
                  <div
                    className={cn(
                      "transition-colors",
                      selectedCategory === category.id ? "text-secondary-foreground" : "text-primary",
                    )}
                  >
                    {category.icon}
                  </div>
                  <span className="font-medium text-left">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Column */}
          <div
            className={cn(
              "flex-1 transition-all duration-300",
              selectedCategory ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none",
            )}
          >
            {selectedCategory && (
              <>
                <h2 className="text-lg font-semibold text-primary mb-6 flex items-center gap-2">
                  {categories.find((c) => c.id === selectedCategory)?.icon}
                  {categories.find((c) => c.id === selectedCategory)?.label}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                  {subItems[selectedCategory]?.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSubItemClick(item)}
                      className={cn(
                        "group flex flex-col items-center justify-center gap-4 p-6 rounded-xl border-2 transition-all duration-200",
                        "bg-card shadow-md hover:shadow-xl min-h-[140px]",
                        item.route
                          ? "cursor-pointer border-primary/30 hover:border-primary hover:bg-primary/5"
                          : "opacity-60 cursor-not-allowed border-border",
                      )}
                    >
                      <div
                        className={cn(
                          "w-16 h-16 rounded-lg flex items-center justify-center transition-all",
                          item.route
                            ? "bg-gradient-to-br from-primary to-accent text-primary-foreground group-hover:scale-110"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.icon}
                      </div>
                      <span
                        className={cn(
                          "font-medium text-sm text-center transition-colors",
                          item.route ? "text-foreground group-hover:text-primary" : "text-muted-foreground",
                        )}
                      >
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/20 bg-card/30 py-4">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          Sistema de Consulta e Atribuição de Demandas • <span className="text-primary">Inteligência LPT</span>
        </div>
      </footer>
    </div>
  );
}
