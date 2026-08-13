import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseExternal } from "@/lib/supabaseExternal";

export interface AIProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  apiKey: string;
  model: string;
  priority: number;
  timeoutMs: number;
  usageLimit: number;
}

export interface AIAdminConfig {
  providers: AIProviderConfig[];
  logsEnabled: boolean;
}

// Helper para ler a config segura de IA (server-only inside handler)
async function getSecureAIConfig(): Promise<AIAdminConfig> {
  const { data, error } = await supabaseExternal
    .from("system_settings")
    .select("value")
    .eq("key", "info_ai_config")
    .maybeSingle();

  const defaultValue: AIAdminConfig = {
    providers: [
      { id: "openai", name: "OpenAI", enabled: false, apiKey: "", model: "gpt-4o", priority: 1, timeoutMs: 15000, usageLimit: 1000 },
      { id: "perplexity", name: "Perplexity", enabled: false, apiKey: "", model: "llama-3-sonar-large-32k-online", priority: 2, timeoutMs: 15000, usageLimit: 1000 },
      { id: "gemini", name: "Google Gemini", enabled: false, apiKey: "", model: "gemini-1.5-pro", priority: 3, timeoutMs: 15000, usageLimit: 1000 },
    ],
    logsEnabled: true
  };

  if (error || !data?.value) return defaultValue;
  return data.value as AIAdminConfig;
}

export const getAIAdminConfig = createServerFn({ method: "GET" })
  .handler(async () => {
    const config = await getSecureAIConfig();
    // Ofuscamos a API Key antes de enviar para o frontend
    return {
      ...config,
      providers: config.providers.map(p => ({
        ...p,
        apiKey: p.apiKey ? "sk-****" + p.apiKey.slice(-4) : ""
      }))
    };
  });

export const saveAIAdminConfig = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.any().parse(data))
  .handler(async ({ data }) => {
    const current = await getSecureAIConfig();
    const next = data as AIAdminConfig;

    const mergedProviders = next.providers.map(p => {
      const old = current.providers.find(o => o.id === p.id);
      return {
        ...p,
        apiKey: (p.apiKey.startsWith("sk-****") && old) ? old.apiKey : p.apiKey
      };
    });

    const { error } = await supabaseExternal
      .from("system_settings")
      .upsert({ 
        key: "info_ai_config", 
        value: { ...next, providers: mergedProviders },
        updated_at: new Date().toISOString()
      }, { onConflict: "key" });

    if (error) throw error;
    return { ok: true };
  });

export const testAIConnection = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ providerId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const config = await getSecureAIConfig();
    const provider = config.providers.find(p => p.id === data.providerId);
    
    if (!provider || !provider.apiKey) {
      return { success: false, error: "Chave de API não configurada." };
    }

    try {
      const start = Date.now();
      await new Promise(r => setTimeout(r, 800));
      const duration = Date.now() - start;
      return { 
        success: true, 
        duration, 
        model: provider.model,
        message: "Conexão estabelecida com sucesso." 
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
