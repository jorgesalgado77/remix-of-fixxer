import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/push/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Valida autenticação do chamador (usa o token do usuário para consultar RPC)
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
          if (!token) {
            return Response.json({ error: "unauthorized" }, { status: 401 });
          }

          // 2. Payload
          const payload = await request.json().catch(() => null) as
            | { userId: string; title: string; body: string; url?: string; tag?: string }
            | null;
          if (!payload || !payload.userId || !payload.title || !payload.body) {
            return Response.json({ error: "payload inválido" }, { status: 400 });
          }

          // 3. Busca subscriptions do destinatário via RPC SECURITY DEFINER
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
          if (!supabaseUrl || !anonKey) {
            return Response.json({ error: "supabase não configurado" }, { status: 500 });
          }

          const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_push_subs`, {
            method: "POST",
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ target_user_id: payload.userId }),
          });

          if (!rpcRes.ok) {
            const errText = await rpcRes.text();
            console.error("[push.dispatch] RPC falhou:", rpcRes.status, errText);
            return Response.json({ error: "não autorizado ou usuário sem subscriptions" }, { status: rpcRes.status });
          }

          const subs = (await rpcRes.json()) as Array<{
            endpoint: string;
            p256dh: string;
            auth: string;
          }>;

          if (!subs || subs.length === 0) {
            return Response.json({ sent: 0, note: "nenhuma subscription" });
          }

          // 4. Envia via web-push
          const webpush = (await import("web-push")).default;
          const vapidPublic = process.env.VAPID_PUBLIC_KEY;
          const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
          const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contato@fixxerhub.lovable.app";
          if (!vapidPublic || !vapidPrivate) {
            return Response.json({ error: "VAPID não configurado" }, { status: 500 });
          }
          webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

          const notif = JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || "/dashboard",
            tag: payload.tag || "fixxer-notif",
          });

          const results = await Promise.allSettled(
            subs.map((s) =>
              webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                notif,
              ),
            ),
          );

          // 5. Limpeza de endpoints inválidos (410/404)
          const staleEndpoints: string[] = [];
          results.forEach((r, i) => {
            if (r.status === "rejected") {
              const err: any = r.reason;
              if (err?.statusCode === 404 || err?.statusCode === 410) {
                staleEndpoints.push(subs[i].endpoint);
              } else {
                console.warn("[push.dispatch] erro envio:", err?.statusCode, err?.body);
              }
            }
          });

          if (staleEndpoints.length > 0) {
            // Best-effort cleanup — usa service role se disponível, senão ignora
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (serviceKey) {
              await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?endpoint=in.(${staleEndpoints.map((e) => `"${e}"`).join(",")})`, {
                method: "DELETE",
                headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
              }).catch(() => {});
            }
          }

          const sent = results.filter((r) => r.status === "fulfilled").length;
          return Response.json({ sent, failed: results.length - sent, cleaned: staleEndpoints.length });
        } catch (e: any) {
          console.error("[push.dispatch] fatal:", e);
          return Response.json({ error: e?.message || "erro interno" }, { status: 500 });
        }
      },

      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "authorization, content-type",
          },
        }),
    },
  },
});
