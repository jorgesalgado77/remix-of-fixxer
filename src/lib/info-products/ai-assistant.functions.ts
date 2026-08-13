import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { AIAdminConfig } from "./ai-admin.functions";

export const AISuggestionTypeSchema = z.enum([
  'title',
  'description',
  'description_short',
  'course_structure',
  'modules',
  'lessons',
  'faq',
  'tags',
  'category',
  'sales_copy',
  'price_recommendation'
]);

export type AISuggestionType = z.infer<typeof AISuggestionTypeSchema>;

const AISuggestionInputSchema = z.object({
  type: AISuggestionTypeSchema,
  context: z.object({
    currentValue: z.string().optional(),
    productType: z.enum(['ebook', 'video', 'course']).optional(),
    keywords: z.string().optional(),
    targetAudience: z.string().optional(),
    contentSummary: z.string().optional(),
    category: z.string().optional(),
  })
});

// Helper para ler a config segura de IA
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

// Implementação básica de chamada de IA (Mock real que será substituído por chamadas reais via Fetch)
async function callAIProvider(provider: any, prompt: string) {
  // Em produção, isso usaria fetch para as APIs da OpenAI, Perplexity ou Google
  // Por enquanto, implementamos o fluxo de fallback
  
  if (!provider.apiKey) {
    throw new Error(`API Key para ${provider.name} não configurada`);
  }

  // Simulação de chamada real
  // console.log(`Chamando ${provider.name} (${provider.model})...`);
  
  // Exemplo de resposta baseada no tipo (em um cenário real, o prompt seria enviado ao LLM)
  await new Promise(r => setTimeout(r, 1000)); // Simula latência
  
  return {
    content: "Sugestão gerada pela IA baseada no seu contexto.",
    usage: { prompt_tokens: 100, completion_tokens: 50 }
  };
}

// Cache simples em memória (server-side) para evitar chamadas idênticas em curto intervalo
const aiCache = new Map<string, { result: any, expires: number }>();

export const getAICreatorStats = createServerFn({ method: "GET" })
  .handler(async () => {
    // Em um cenário real, buscaríamos o userId do contexto de auth
    // Por enquanto, simulamos ou buscamos do Supabase se houvesse sessão
    return {
      limit: 1000,
      used: 42,
      resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
    };
  });

export const generateAISuggestion = createServerFn({ method: "POST" })
  .validator((data: unknown) => AISuggestionInputSchema.parse(data))
  .handler(async ({ data }) => {
    const cacheKey = JSON.stringify(data);
    const cached = aiCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }

    const config = await getSecureAIConfig();
    const sortedProviders = [...config.providers]
      .filter(p => p.enabled && p.apiKey)
      .sort((a, b) => a.priority - b.priority);

    if (sortedProviders.length === 0) {
      throw new Error("Nenhum provedor de IA configurado ou habilitado pelo administrador.");
    }

    const promptMap: Record<AISuggestionType, string> = {
      title: "Sugira um título atraente para um info produto...",
      description: "Escreva uma descrição detalhada para um info produto...",
      description_short: "Escreva uma descrição curta e impactante...",
      course_structure: "Sugira a estrutura completa de módulos e aulas (módulos, aulas, duração estimada)...",
      modules: "Sugira os módulos principais para este curso...",
      lessons: "Sugira os nomes das aulas para este módulo...",
      faq: "Crie uma lista de perguntas frequentes (FAQ) com respostas para este produto...",
      tags: "Sugira 5 a 10 tags relevantes e otimizadas para SEO...",
      category: "Recomende a melhor categoria do marketplace para este conteúdo...",
      sales_copy: "Escreva um texto de vendas persuasivo (copywriting) usando técnicas de gatilhos mentais...",
      price_recommendation: "Recomende um preço justo baseado no valor percebido e mercado..."
    };

    const prompt = `${promptMap[data.type]} Contexto: ${JSON.stringify(data.context)}`;

    let lastError: any = null;
    for (const provider of sortedProviders) {
      try {
        const result = await callAIProvider(provider, prompt);
        
        const response = {
          suggestion: result.content,
          provider: provider.name,
          timestamp: new Date().toISOString()
        };

        // Salvar no cache (10 minutos)
        aiCache.set(cacheKey, { 
          result: response, 
          expires: Date.now() + 10 * 60 * 1000 
        });

        // Log de uso no Supabase
        await supabaseExternal.from('info_ai_usage').insert({
          provider_id: provider.id,
          suggestion_type: data.type,
          tokens_used: result.usage.prompt_tokens + result.usage.completion_tokens,
          creator_id: '00000000-0000-0000-0000-000000000000' // Placeholder para o criador logado
        });

        return response;
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    throw new Error(`Todos os provedores de IA falharam. Último erro: ${lastError?.message}`);
  });
