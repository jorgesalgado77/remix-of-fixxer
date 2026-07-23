import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/dashboard/prestador')({
  component: DashboardPrestadorRedirect,
});

function DashboardPrestadorRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: '/_authenticated/prestador' });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-muted-foreground font-bold uppercase tracking-widest animate-pulse">
        Redirecionando para o painel do prestador...
      </p>
    </div>
  );
}
