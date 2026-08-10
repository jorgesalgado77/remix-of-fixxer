import { createFileRoute } from "@tanstack/react-router";
import { AdminMonetizationSettings } from "@/components/AdminMonetizationSettings";
import { requireAdmin } from "@/lib/admin-guard";

export const Route = createFileRoute("/_authenticated/admin/monetizacao")({
  beforeLoad: requireAdmin,
  component: AdminMonetizationPage,
});

function AdminMonetizationPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 md:pl-72">
      <AdminMonetizationSettings />
    </div>
  );
}
