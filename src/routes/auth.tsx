import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    // LAYOUT NEUTRO: Apenas renderiza os filhos.
    return {};
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Outlet />
    </div>
  );
}