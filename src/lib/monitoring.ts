import { supabaseExternal } from "./supabaseExternal";

/**
 * Sistema de Auditoria e Métricas de Qualidade de Dados
 */
export const dataMonitor = {
  /**
   * Registra uma falha de carregamento ou inconsistência de esquema
   */
  logError: async (context: string, error: any, metadata: Record<string, any> = {}) => {
    console.error(`[DataMonitor][${context}]`, error, metadata);
    
    try {
      // Tenta persistir log de erro se a tabela existir
      const { error: logErr } = await supabaseExternal
        .from('system_logs')
        .insert([{
          level: 'error',
          module: 'frontend_data_integrity',
          context,
          message: error?.message || String(error),
          metadata: {
            ...metadata,
            ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            url: typeof window !== 'undefined' ? window.location.href : 'unknown',
            timestamp: new Date().toISOString()
          }
        }]);
        
      if (logErr) console.warn("[DataMonitor] Falha ao persistir log no banco:", logErr.message);
    } catch (e) {
      // Fail silent para não quebrar a UI
    }
  },

  /**
   * Incrementa métrica de qualidade
   */
  trackMetric: (name: string, value: number = 1) => {
    // Aqui integraria com Google Analytics, Mixpanel ou endpoint interno
    console.log(`[Metric][${name}]`, value);
  }
};
