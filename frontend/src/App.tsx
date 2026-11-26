import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { RotaAdminOuDev } from "./components/RotaAdminOuDev";
import { RotaComAssinaturaAtiva } from "./components/RotaComAssinaturaAtiva";
import { RotaComPermissao } from "./components/RotaComPermissao";
import { RotaProtegida } from "./components/RotaProtegida";
import { RotaSomenteDev } from "./components/RotaSomenteDev";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminEmpresasPage } from "./pages/AdminEmpresasPage";
import { CadastroPage } from "./pages/CadastroPage";
import { CalhaMateriaisPage } from "./pages/CalhaMateriaisPage";
import { CalhaOrcamentoDetalhePage } from "./pages/CalhaOrcamentoDetalhePage";
import { CalhaOrcamentoImpressaoPage } from "./pages/CalhaOrcamentoImpressaoPage";
import { CalhaOrcamentosPage } from "./pages/CalhaOrcamentosPage";
import { ClientesPage } from "./pages/ClientesPage";
import { ConfirmarEmailPage } from "./pages/ConfirmarEmailPage";
import { ContasPagarPage } from "./pages/ContasPagarPage";
import { DadosEmpresaPage } from "./pages/DadosEmpresaPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EscolherPlanoPage } from "./pages/EscolherPlanoPage";
import { EstoquePage } from "./pages/EstoquePage";
import { ImportarNotaPage } from "./pages/ImportarNotaPage";
import { LoginPage } from "./pages/LoginPage";
import { NotasEntradaPage } from "./pages/NotasEntradaPage";
import { PagamentoRetornoPage } from "./pages/PagamentoRetornoPage";
import { OrcamentoImpressaoPage } from "./pages/OrcamentoImpressaoPage";
import { OrdemServicoDetalhePage } from "./pages/OrdemServicoDetalhePage";
import { OrdemServicoImpressaoPage } from "./pages/OrdemServicoImpressaoPage";
import { OrdensServicoPage } from "./pages/OrdensServicoPage";
import { OrcamentosPage } from "./pages/OrcamentosPage";
import { PagamentosPendentesPage } from "./pages/PagamentosPendentesPage";
import { PecaDetalhePage } from "./pages/PecaDetalhePage";
import { PermissoesPage } from "./pages/PermissoesPage";
import { RelatoriosPage } from "./pages/RelatoriosPage";
import { ReciboImpressaoPage } from "./pages/ReciboImpressaoPage";
import { UsuariosPage } from "./pages/UsuariosPage";

function App() {
  return (
    <BrowserRouter basename="/app">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
          <Route path="/confirmar-email" element={<ConfirmarEmailPage />} />

          <Route element={<RotaProtegida />}>
            <Route path="/escolher-plano" element={<EscolherPlanoPage />} />
            <Route path="/pagamento/retorno" element={<PagamentoRetornoPage />} />

            <Route element={<RotaComAssinaturaAtiva />}>
              <Route
                path="/ordens-servico/:id/imprimir"
                element={
                  <RotaComPermissao modulo="ordens_servico">
                    <OrdemServicoImpressaoPage />
                  </RotaComPermissao>
                }
              />
              <Route
                path="/orcamento-calhas/:id/imprimir"
                element={
                  <RotaComPermissao modulo="orcamento_calhas">
                    <CalhaOrcamentoImpressaoPage />
                  </RotaComPermissao>
                }
              />
              <Route
                path="/recibos/:id"
                element={
                  <RotaComPermissao modulo="financeiro">
                    <ReciboImpressaoPage />
                  </RotaComPermissao>
                }
              />
              <Route
                path="/orcamentos/:id/imprimir"
                element={
                  <RotaComPermissao modulo="orcamentos">
                    <OrcamentoImpressaoPage />
                  </RotaComPermissao>
                }
              />

              <Route element={<AppLayout />}>
                <Route
                  path="/"
                  element={
                    <RotaComPermissao modulo="dashboard">
                      <DashboardPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/ordens-servico"
                  element={
                    <RotaComPermissao modulo="ordens_servico">
                      <OrdensServicoPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/ordens-servico/:id"
                  element={
                    <RotaComPermissao modulo="ordens_servico">
                      <OrdemServicoDetalhePage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/orcamentos"
                  element={
                    <RotaComPermissao modulo="orcamentos">
                      <OrcamentosPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/orcamento-calhas"
                  element={
                    <RotaComPermissao modulo="orcamento_calhas">
                      <CalhaOrcamentosPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/orcamento-calhas/:id"
                  element={
                    <RotaComPermissao modulo="orcamento_calhas">
                      <CalhaOrcamentoDetalhePage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/orcamento-calhas-materiais"
                  element={
                    <RotaComPermissao modulo="orcamento_calhas">
                      <CalhaMateriaisPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/pagamentos-pendentes"
                  element={
                    <RotaComPermissao modulo="financeiro">
                      <PagamentosPendentesPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/contas-pagar"
                  element={
                    <RotaComPermissao modulo="financeiro">
                      <ContasPagarPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/clientes"
                  element={
                    <RotaComPermissao modulo="clientes">
                      <ClientesPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/relatorios"
                  element={
                    <RotaComPermissao modulo="financeiro">
                      <RelatoriosPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/estoque"
                  element={
                    <RotaComPermissao modulo="estoque">
                      <EstoquePage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/estoque/notas"
                  element={
                    <RotaComPermissao modulo="estoque">
                      <NotasEntradaPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/estoque/notas/importar"
                  element={
                    <RotaComPermissao modulo="estoque">
                      <ImportarNotaPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/estoque/:id"
                  element={
                    <RotaComPermissao modulo="estoque">
                      <PecaDetalhePage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <RotaComPermissao modulo="usuarios">
                      <UsuariosPage />
                    </RotaComPermissao>
                  }
                />
                <Route
                  path="/permissoes"
                  element={
                    <RotaAdminOuDev>
                      <PermissoesPage />
                    </RotaAdminOuDev>
                  }
                />
                <Route
                  path="/minha-empresa"
                  element={
                    <RotaAdminOuDev>
                      <DadosEmpresaPage />
                    </RotaAdminOuDev>
                  }
                />
                <Route
                  path="/admin/empresas/:empresaId"
                  element={
                    <RotaSomenteDev>
                      <DadosEmpresaPage />
                    </RotaSomenteDev>
                  }
                />
                <Route
                  path="/admin/empresas"
                  element={
                    <RotaSomenteDev>
                      <AdminEmpresasPage />
                    </RotaSomenteDev>
                  }
                />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
