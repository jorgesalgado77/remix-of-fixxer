import { describe, it, expect, vi } from "vitest";
import { resolveIdentity } from "@/lib/identity/identity-service";

describe("Identity Service Performance & Cache", () => {
  it("deve resolver identidade usando cache no segundo chamado", async () => {
    const userId = "a2e86b01-ac4b-4241-8403-babc7f152d85";
    
    // Primeiro chamado (deve ir ao Supabase)
    const t1 = performance.now();
    await resolveIdentity(userId);
    const d1 = performance.now() - t1;
    
    // Segundo chamado (deve vir do cache)
    const t2 = performance.now();
    await resolveIdentity(userId);
    const d2 = performance.now() - t2;
    
    expect(d2).toBeLessThan(d1);
    console.log(`[Identity Perf] 1st call: ${d1.toFixed(2)}ms, 2nd call: ${d2.toFixed(2)}ms`);
  });
});
