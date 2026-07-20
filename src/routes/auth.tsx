import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  component: () => (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Outlet />
    </div>
  ),
});
