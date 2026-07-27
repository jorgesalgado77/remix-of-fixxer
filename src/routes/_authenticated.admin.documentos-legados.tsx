import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, RefreshCw, ArrowLeft, Upload, Search } from "lucide-react";
import { toast } from "sonner";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { requireAdmin, useAdminFocusRevalidation } from "@/lib/admin-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/documentos-legados")({
  beforeLoad: requireAdmin,
  component: LegacyDocumentsPage,
});

type LegacyDoc = { name?: string; url?: string; path?: string; size?: string; created_at?: string };
type Row = {
  profile_id: string;
  display_name: string | null;
  email: string | null;
  legacy_docs: LegacyDoc[];
  migrated_docs: LegacyDoc[];
};
type MigrationReport = {
  ok: boolean;
  mode?: string;
  started_at?: string;
  finished_at?: string;
  totals?: { profiles: number; docs: number; migrated: number; skipped: number; errors: number };
  profiles?: Array<{ profile_id: string; results: Array<Record<string, any>> }>;
  error?: string;
};

function LegacyDocumentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [report, setReport] = useState<MigrationReport | null>(null);

  useAdminFocusRevalidation();

  async function load() {
    setLoading(true);
    const { data, error } = await supabaseExternal
      .from("profiles")
      .select("id, display_name, email, documents")
      .not("documents", "is", null);
    if (error) {
      toast.error("Falha ao consultar profiles: " + error.message);
      setLoading(false);
      return;
    }
    const out: Row[] = [];
    for (const p of data ?? []) {
      const docs: LegacyDoc[] = Array.isArray((p as any).documents) ? (p as any).documents : [];
      const legacy = docs.filter((d) => d?.url && /^https?:\/\//i.test(d.url) && !d?.path);
      if (!legacy.length) continue;
      out.push({
        profile_id: (p as any).id,
        display_name: (p as any).display_name ?? null,
        email: (p as any).email ?? null,
        legacy_docs: legacy,
        migrated_docs: docs.filter((d) => d?.path),
      });
    }
    setRows(out);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.profile_id, r.display_name, r.email].filter(Boolean).some((x) => String(x).toLowerCase().includes(term)),
    );
  }, [rows, q]);

  const totals = useMemo(() => ({
    profiles: rows.length,
    legacyDocs: rows.reduce((s, r) => s + r.legacy_docs.length, 0),
  }), [rows]);

  async function importReport(file: File) {
    try {
      const txt = await file.text();
      const parsed: MigrationReport = JSON.parse(txt);
      setReport(parsed);
      toast.success("Relatório carregado. Falhas em destaque abaixo.");
    } catch (e: any) {
      toast.error("JSON inválido: " + e.message);
    }
  }

  const failuresByProfile = useMemo(() => {
    const map = new Map<string, Array<Record<string, any>>>();
    if (!report?.profiles) return map;
    for (const p of report.profiles) {
      const fails = p.results.filter((r) => r.error);
      if (fails.length) map.set(p.profile_id, fails);
    }
    return map;
  }, [report]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Admin
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FF9F0A]/10 text-[#FF9F0A]"><AlertTriangle className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase tracking-tight">Documentos legados</h1>
            <p className="text-xs text-gray-400">
              Perfis que ainda possuem <code>documents[*].url</code> pública sem <code>path</code> privado.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <Stat label="Perfis afetados" value={totals.profiles} />
          <Stat label="Documentos legados" value={totals.legacyDocs} />
          <Stat label="Falhas (relatório)" value={report ? [...failuresByProfile.values()].reduce((s, a) => s + a.length, 0) : "—"} />
          <Stat label="Modo do relatório" value={report?.mode ?? "—"} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por ID, nome ou email" className="pl-9" />
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Recarregar
        </Button>
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 bg-white/5 text-xs cursor-pointer hover:bg-white/10">
          <Upload className="w-4 h-4" /> Importar relatório JSON
          <input type="file" accept="application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void importReport(f); e.currentTarget.value = ""; }} />
        </label>
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhum perfil com documento legado. ✅</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((r) => {
              const fails = failuresByProfile.get(r.profile_id) ?? [];
              return (
                <div key={r.profile_id} className="p-4 md:p-5 hover:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{r.display_name || "(sem nome)"} </div>
                      <div className="text-xs text-gray-400 truncate">{r.email || "—"}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-1">{r.profile_id}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded bg-[#FF9F0A]/10 text-[#FF9F0A] border border-[#FF9F0A]/20">
                        {r.legacy_docs.length} legado(s)
                      </span>
                      <span className="px-2 py-1 rounded bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/20">
                        {r.migrated_docs.length} migrado(s)
                      </span>
                      {fails.length > 0 && (
                        <span className="px-2 py-1 rounded bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20">
                          {fails.length} falha(s)
                        </span>
                      )}
                    </div>
                  </div>

                  <ul className="mt-3 grid gap-2 md:grid-cols-2">
                    {r.legacy_docs.map((d, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate flex-1">{d.name || d.url}</span>
                        <a href={d.url} target="_blank" rel="noreferrer" className="text-[#00E5FF] hover:underline">abrir</a>
                      </li>
                    ))}
                  </ul>

                  {fails.length > 0 && (
                    <div className="mt-3 rounded-md border border-[#FF3B30]/30 bg-[#FF3B30]/5 p-3">
                      <div className="text-[11px] font-bold uppercase text-[#FF3B30] mb-1">Falhas na última migração</div>
                      <ul className="text-xs space-y-1">
                        {fails.map((f, i) => (
                          <li key={i} className="font-mono text-[11px] text-gray-300">
                            <span className="text-gray-400">{f.name ?? "(sem nome)"}: </span>{f.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-xs text-gray-400 leading-relaxed">
        <p className="font-bold text-white mb-2">Como migrar</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Rode <code className="text-[#00FF87]">npm run docs:migrate:dry</code> e importe o JSON acima para revisar.</li>
          <li>Rode <code className="text-[#00FF87]">npm run docs:migrate:apply</code> para migrar para o bucket privado.</li>
          <li>Depois de validar, rode <code className="text-[#00FF87]">npm run docs:migrate:purge</code> para apagar os arquivos públicos legados.</li>
        </ol>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">{label}</div>
    </div>
  );
}
