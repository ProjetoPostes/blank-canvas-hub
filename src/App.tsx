import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { TratativasLayout } from "@/components/TratativasLayout";
import { InactivityProvider } from "@/components/InactivityProvider";
import MainHub from "./pages/MainHub";
import Painel from "./pages/Painel";
import PainelCaderno from "./pages/PainelCaderno";
import Despacho from "./pages/Despacho";
import Caderno from "./pages/Caderno";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProfilePage from "./pages/ProfilePage";
import GestaoDemandasPage from "./pages/GestaoDemandasPage";
import MinhasDemandasPage from "./pages/MinhasDemandasPage";
import AdminUsuariosPage from "./pages/AdminUsuariosPage";
import ClientesPage from "./pages/ClientesPage";
import ImportacaoPage from "./pages/ImportacaoPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import UserApprovalPage from "./pages/UserApprovalPage";
import ObrasPage from "./pages/ObrasPage";
import LocalidadesPage from "./pages/LocalidadesPage";
import PrioritariosPage from "./pages/PrioritariosPage";
import HistoricoOsPage from "./pages/HistoricoOsPage";
// Consulta pages (read-only views from MainHub)
import DespachoConsulta from "./pages/consulta/DespachoConsulta";
import CadernoConsulta from "./pages/consulta/CadernoConsulta";
import ClientesConsulta from "./pages/consulta/ClientesConsulta";
import RelatorioCartasDashboard from "./pages/consulta/RelatorioCartasDashboard";
import DocumentosCartas from "./pages/consulta/DocumentosCartas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <InactivityProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              
              {/* Pending Approval page for users without roles */}
              <Route
                path="/pending-approval"
                element={
                  <ProtectedRoute>
                    <PendingApprovalPage />
                  </ProtectedRoute>
                }
              />
              
              {/* New Main Hub - default landing page */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <MainHub />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />

              {/* Tratativas Routes with sidebar layout - requires role */}
              <Route
                path="/tratativas"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <TratativasLayout />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              >
                {/* Default tratativas route - Painel */}
                <Route
                  index
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador"]}>
                      <Painel />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="painel-caderno"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador"]}>
                      <PainelCaderno />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="despacho"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador"]}>
                      <Despacho />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="caderno"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <Caderno />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="clientes"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <ClientesPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="obras"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <ObrasPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="localidades"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <LocalidadesPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="prioritarios"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <PrioritariosPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="documentos-cartas"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <DocumentosCartas />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="historico-os"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <HistoricoOsPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route path="perfil" element={<ProfilePage />} />
                <Route
                  path="gestao-demandas"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe"]}>
                      <GestaoDemandasPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="minhas-demandas"
                  element={
                    <RoleProtectedRoute allowedRoles={["operador"]}>
                      <MinhasDemandasPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="admin-usuarios"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin"]}>
                      <AdminUsuariosPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="importacao"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin"]}>
                      <ImportacaoPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="audit-logs"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin"]}>
                      <AuditLogsPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="aprovacao-usuarios"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin"]}>
                      <UserApprovalPage />
                    </RoleProtectedRoute>
                  }
                />
              </Route>

              {/* Consultation Routes (read-only views from MainHub) - requires role */}
              <Route
                path="/consulta/despacho"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <DespachoConsulta />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consulta/caderno"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <CadernoConsulta />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consulta/clientes"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <ClientesConsulta />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consulta/relatorio-cartas"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <RelatorioCartasDashboard />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consulta/documentos-cartas"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={["admin", "operador_chefe", "operador", "consultor"]}>
                      <DocumentosCartas />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />


              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </InactivityProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
