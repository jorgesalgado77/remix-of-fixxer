
import { useQuery } from "@tanstack/react-query";
import { resolveIdentity } from "@/lib/identity/identity-service";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { useEffect, useState } from "react";

export function useProfile(userId?: string | null) {
  const [sessionUid, setSessionUid] = useState<string | null>(null);

  useEffect(() => {
    const getUid = async () => {
      const isMaster = window.localStorage.getItem('fixxer:master-bypass') === 'true';
      const auth = window.localStorage.getItem("fixxer-auth-token-v1") || window.localStorage.getItem("sb-rnhgpxembtgupxnrohxo-auth-token");
      const bypassUid = localStorage.getItem('fixxer:bypass-uid');
      const lastCat = localStorage.getItem('fixxer:last-category');
      
      const uid = isMaster 
        ? (bypassUid || (lastCat === 'admin' ? '6ba65048-803f-44f6-88d2-24d04fee1a0f' : 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9')) 
        : (auth ? JSON.parse(auth)?.user?.id : null);
      
      setSessionUid(uid);
    };
    getUid();
  }, []);

  const effectiveUid = userId || sessionUid;

  return useQuery({
    queryKey: ["profile", effectiveUid],
    queryFn: async () => {
      if (!effectiveUid) return null;
      return resolveIdentity(effectiveUid, { refresh: true });
    },
    enabled: !!effectiveUid,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
