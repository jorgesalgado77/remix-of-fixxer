import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Search, Award } from 'lucide-react';
import { validateCertificate } from '@/lib/info-products/v2-monetization';

export const Route = createFileRoute('/certificados/validar')({
  component: ValidateCertificatePage,
});

function ValidateCertificatePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await validateCertificate(code);
      if (data) {
        setResult(data);
      } else {
        setError('Certificado não encontrado ou inválido.');
      }
    } catch (err: any) {
      setError('Erro ao validar certificado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white/[0.03] border border-white/10 p-8 rounded-[40px] backdrop-blur-xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Award className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Validador Fixxer</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Autenticidade de Certificados Digitais</p>
        </div>

        <form onSubmit={handleValidate} className="space-y-4">
          <div className="relative">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Digite o código único..."
              className="bg-white/5 border-white/10 rounded-2xl h-14 pl-12 text-white font-bold"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-black h-14 rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-[1.02] transition-all uppercase tracking-widest text-xs"
          >
            {loading ? 'Validando...' : 'Verificar Autenticidade'}
          </Button>
        </form>

        {result && (
          <div className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 text-emerald-400 mb-4">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-black uppercase tracking-widest text-sm italic">Certificado Válido</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-bold uppercase">Aluno</span>
                <span className="text-white font-black italic">{result.student_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-bold uppercase">Curso</span>
                <span className="text-white font-black italic">{result.course_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-bold uppercase">Emissor</span>
                <span className="text-white font-black italic">{result.creator_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-bold uppercase">Carga Horária</span>
                <span className="text-white font-black italic">{result.workload_hours}h</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl animate-in shake-1 duration-300">
            <div className="flex items-center gap-3 text-red-400">
              <XCircle className="w-6 h-6" />
              <span className="font-black uppercase tracking-widest text-sm italic">{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
