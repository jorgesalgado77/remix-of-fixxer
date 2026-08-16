import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    // LAYOUT NEUTRO: Não interfere no roteamento.
    // O controle de acesso é feito nas páginas filhas ou no Root.
    return {};
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Outlet />
    </div>
  );
}