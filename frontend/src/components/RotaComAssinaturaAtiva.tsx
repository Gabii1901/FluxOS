import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function RotaComAssinaturaAtiva() {
  const { usuario } = useAuth();

  // "desenvolvedor" é a conta interna da plataforma: sempre acessa tudo,
  // independente do plano/assinatura da empresa (mesma regra do backend).
  if (usuario && usuario.papel !== "desenvolvedor" && usuario.statusAssinatura !== "ativo") {
    return <Navigate to="/escolher-plano" replace />;
  }

  return <Outlet />;
}
