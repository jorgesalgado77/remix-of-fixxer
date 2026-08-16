import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    // SEM BLOQUEIO: Deixa entrar no layout de auth sempre.
    // O redirecionamento só deve acontecer se o usuário pedir explicitamente ou via página interna.
    return { isRedirecting: false };
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