#!/usr/bin/env node
/**
 * Migração de documentos legados de `profiles.documents` (URLs públicas no bucket
 * `media/documents/…`) para o bucket privado `documents-private/<profile_id>/…`.
 *
 * Uso:
 *   node scripts/migrate-documents.mjs --dry-run [--json]   # simula, não altera nada
 *   node scripts/migrate-documents.mjs           [--json]   # aplica migração
 *   node scripts/migrate-documents.mjs --purge   [--json]   # aplica + apaga arquivo público legado
 *
 * ENV obrigatórias:
 *   SUPABASE_URL                 (ou VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY    (nunca a anon key)
 *
 * Saída:
 *   - modo normal: logs humanos por linha
 *   - --json: um único objeto JSON no stdout com o relatório completo para auditoria
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

const argv = new Set(process.argv.slice(2));
const DRY = argv.has("--dry-run");
const PURGE = argv.has("--purge");
const JSON_OUT = argv.has("--json");

function loadEnvFile() {
  if (!existsSync(".env")) return;
  const txt = readFileSync(".env", "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  const err = { ok: false, error: "missing_env", need: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] };
  if (JSON_OUT) process.stdout.write(JSON.stringify(err) + "\n");
  else console.error("[migrate-documents] ENV ausentes:", err.need.join(", "));
  process.exit(2);
}

const log = (...a) => { if (!JSON_OUT) console.log(...a); };
const warn = (...a) => { if (!JSON_OUT) console.warn(...a); };

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const PUBLIC_BUCKET = "media";
const PRIVATE_BUCKET = "documents-private";

function extractPublicPath(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(new RegExp(`/object/(?:public|sign|authenticated)/${PUBLIC_BUCKET}/(.+)$`));
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

async function migrateOne(profile, doc) {
  const url = doc?.url;
  if (!url || !/^https?:\/\//i.test(url)) return { skipped: "not_public_url" };
  const legacyPath = extractPublicPath(url);
  if (!legacyPath) return { skipped: "unparseable_url" };

  // baixa arquivo do bucket público
  const dl = await supabase.storage.from(PUBLIC_BUCKET).download(legacyPath);
  if (dl.error || !dl.data) return { error: `download_failed: ${dl.error?.message ?? "unknown"}` };

  const safeName = (doc.name || legacyPath.split("/").pop() || "arquivo").replace(/[^\w.\-]+/g, "_");
  const newPath = `${profile.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safeName}`;

  if (DRY) return { from: legacyPath, to: newPath, size: dl.data.size ?? null, dryRun: true };

  const buf = Buffer.from(await dl.data.arrayBuffer());
  const up = await supabase.storage.from(PRIVATE_BUCKET).upload(newPath, buf, {
    upsert: false,
    contentType: dl.data.type || "application/octet-stream",
  });
  if (up.error) return { error: `upload_failed: ${up.error.message}` };

  if (PURGE) {
    const rm = await supabase.storage.from(PUBLIC_BUCKET).remove([legacyPath]);
    if (rm.error) warn(`  purge falhou: ${rm.error.message}`);
  }
  return { from: legacyPath, to: newPath, size: buf.byteLength, purged: PURGE };
}

async function main() {
  const started = new Date().toISOString();
  log(`[migrate-documents] mode=${DRY ? "dry-run" : (PURGE ? "apply+purge" : "apply")}`);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, documents")
    .not("documents", "is", null);

  if (error) {
    const out = { ok: false, error: `query_failed: ${error.message}` };
    if (JSON_OUT) process.stdout.write(JSON.stringify(out) + "\n"); else console.error(out);
    process.exit(1);
  }

  const report = {
    ok: true,
    mode: DRY ? "dry-run" : (PURGE ? "apply+purge" : "apply"),
    started_at: started,
    finished_at: null,
    totals: { profiles: 0, docs: 0, migrated: 0, skipped: 0, errors: 0 },
    profiles: [],
  };

  for (const profile of profiles ?? []) {
    const docs = Array.isArray(profile.documents) ? profile.documents : [];
    if (!docs.length) continue;
    report.totals.profiles += 1;

    const results = [];
    const nextDocs = [];
    let touched = false;

    for (const doc of docs) {
      report.totals.docs += 1;
      // já migrado
      if (doc?.path && !doc?.url) { nextDocs.push(doc); results.push({ name: doc.name, skipped: "already_private" }); report.totals.skipped += 1; continue; }
      const r = await migrateOne(profile, doc);
      if (r.error) { report.totals.errors += 1; results.push({ name: doc?.name, ...r }); nextDocs.push(doc); continue; }
      if (r.skipped) { report.totals.skipped += 1; results.push({ name: doc?.name, ...r }); nextDocs.push(doc); continue; }
      report.totals.migrated += 1;
      results.push({ name: doc?.name, ...r });
      if (DRY) { nextDocs.push(doc); }
      else { nextDocs.push({ name: doc.name, type: "document", path: r.to, size: doc.size, created_at: doc.created_at || new Date().toISOString() }); touched = true; }
    }

    if (!DRY && touched) {
      const upd = await supabase.from("profiles").update({ documents: nextDocs }).eq("id", profile.id);
      if (upd.error) { report.totals.errors += 1; results.push({ error: `profile_update_failed: ${upd.error.message}` }); }
    }
    report.profiles.push({ profile_id: profile.id, results });
  }

  report.finished_at = new Date().toISOString();
  if (JSON_OUT) process.stdout.write(JSON.stringify(report) + "\n");
  else log(`[migrate-documents] concluído`, report.totals);
  process.exit(report.totals.errors > 0 ? 1 : 0);
}

main().catch((e) => {
  const out = { ok: false, error: `fatal: ${e?.message ?? String(e)}` };
  if (JSON_OUT) process.stdout.write(JSON.stringify(out) + "\n"); else console.error(out);
  process.exit(1);
});
