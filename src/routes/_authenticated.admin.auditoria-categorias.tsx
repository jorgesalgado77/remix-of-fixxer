import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Palette, RefreshCw } from "lucide-react";
import {
  auditProfileCategories,
  summarizeAudit,
  type AuditReport,
} from "@/lib/category-audit";
import { CATEGORY_COLORS, CATEGORY_LABEL } from "@/lib/category-colors";

import { requireAdmin, useAdminFocusRevalidation } from "@/lib/admin-guard";

export const Route = createFileRoute("/_authenticated/admin/auditoria-categorias")({
  beforeLoad: requireAdmin,
  component: AuditCategoriesPage,
});

function AuditCategoriesPage() {
  useAdminFocusRevalidation();

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);

  async function run(refresh: boolean) {
    setRunning(true);
    setReport(null);
    setProgress({ done: 0, total: 0 });
    try {
      const result = await auditProfileCategories({
        refresh,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setReport(result);
      toast.success("Auditoria concluída", {
        description: `${result.scanned} perfis · ${result.mismatches.length} divergências`,
      });
    } catch (e: any) {
      toast.error("Falha ao auditar categorias", { description: e?.message || String(e) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Palette className="w-6 h-6 text-cyan-400" />
        <h1 className="text-xl font-black">Auditoria de Categorias & Cores</h1>
      </div>

      <p className="text-sm text-white/60 mb-4">
        Percorre todos os perfis (tabelas especializadas + <code>profiles</code>) e valida se a
        categoria/cor exibida no chat e nos perfis públicos é a esperada.
      </p>

      <div className="flex gap-2 mb-6">
        <Button disabled={running} onClick={() => run(false)} className="bg-cyan-500 text-black hover:bg-cyan-400">
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Executar auditoria
        </Button>
        <Button
          disabled={running}
          onClick={() => run(true)}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Ignorar cache
        </Button>
      </div>

      {running && progress ? (
        <div className="mb-6 text-sm text-white/70">
          Processando {progress.done}/{progress.total}…
        </div>
      ) : null}

      {report ? (
        <div className="space-y-6">
          <pre className="text-xs bg-white/5 border border-white/10 rounded-lg p-3 whitespace-pre-wrap">
            {summarizeAudit(report)}
          </pre>

          <div>
            <h2 className="text-sm font-bold mb-2">
              Divergências ({report.mismatches.length})
            </h2>
            {report.mismatches.length === 0 ? (
              <p className="text-sm text-emerald-400">
                ✓ Todos os perfis estão classificados corretamente.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-white/10">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left p-2">Usuário</th>
                      <th className="text-left p-2">Esperado</th>
                      <th className="text-left p-2">Resolvido</th>
                      <th className="text-left p-2">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.mismatches.map((m) => (
                      <tr key={m.userId} className="border-t border-white/10">
                        <td className="p-2">
                          <div className="font-medium">{m.displayName || "—"}</div>
                          <div className="text-white/40 text-[10px]">{m.userId}</div>
                        </td>
                        <td className="p-2">
                          {m.expected ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded"
                              style={{
                                color: m.expectedColor ?? "#fff",
                                borderColor: m.expectedColor ?? "#fff",
                                border: "1px solid",
                              }}
                            >
                              {CATEGORY_LABEL[m.expected]}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-2">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded"
                            style={{
                              color: m.resolvedColor,
                              borderColor: m.resolvedColor,
                              border: "1px solid",
                            }}
                          >
                            {CATEGORY_LABEL[m.resolved]}
                          </span>
                        </td>
                        <td className="p-2 text-white/60">{m.expectedSource}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {report.errors.length > 0 ? (
            <div>
              <h2 className="text-sm font-bold mb-2 text-red-400">
                Erros ({report.errors.length})
              </h2>
              <ul className="text-xs space-y-1">
                {report.errors.map((e) => (
                  <li key={e.userId} className="text-white/60">
                    <span className="text-white/40">{e.userId}</span> — {e.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Placeholder para uso futuro do CATEGORY_COLORS na legenda */}
          <div className="hidden">{JSON.stringify(CATEGORY_COLORS)}</div>
        </div>
      ) : null}
    </div>
  );
}
