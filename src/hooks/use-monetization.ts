import { useEffect, useState } from "react";
import {
  fetchMonetizationConfig,
  getCachedMonetization,
  subscribeMonetization,
  type MonetizationConfig,
} from "@/lib/monetization";

/** Hook reativo: assina alterações da configuração de monetização (Realtime + local). */
export function useMonetization(): MonetizationConfig {
  const [cfg, setCfg] = useState<MonetizationConfig>(() => getCachedMonetization());
  useEffect(() => {
    let mounted = true;
    fetchMonetizationConfig().then((c) => { if (mounted) setCfg(c); });
    const unsub = subscribeMonetization((c) => { if (mounted) setCfg(c); });
    return () => { mounted = false; unsub(); };
  }, []);
  return cfg;
}
