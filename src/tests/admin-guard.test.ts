import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub mínimo de localStorage (ambiente node do vitest).
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
};
(globalThis as any).window = globalThis;


// Mocks de dependências antes de importar o guard.
vi.mock("@tanstack/react-router", () => ({
  redirect: (opts: any) => {
    const err: any = new Error(`REDIRECT:${opts?.to}`);
    err.__isRedirect = true;
    err.to = opts?.to;
    return err;
  },
  useNavigate: () => vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const mockGetUserId = vi.fn();
const mockIsAdmin = vi.fn();
vi.mock("@/lib/current-user", () => ({
  getCurrentUserId: () => mockGetUserId(),
  isCurrentUserAdmin: (force?: boolean) => mockIsAdmin(force),
}));

import { requireAdmin, reasonForBlock, evaluateAdminAccess } from "@/lib/admin-guard";

beforeEach(() => {
  mockGetUserId.mockReset();
  mockIsAdmin.mockReset();
  try { localStorage.setItem("@fixxer:is_admin", "true"); } catch {}
});

describe("reasonForBlock (lógica pura)", () => {
  it("no-session quando não há uid", () => {
    expect(reasonForBlock(null, false)).toBe("no-session");
    expect(reasonForBlock(null, true)).toBe("no-session");
  });
  it("not-admin quando há uid mas sem role admin", () => {
    expect(reasonForBlock("uid-1", false)).toBe("not-admin");
  });
  it("null (permitido) quando há uid e role admin", () => {
    expect(reasonForBlock("uid-1", true)).toBeNull();
  });
});

describe("evaluateAdminAccess", () => {
  it("bloqueia com no-session quando o usuário não tem sessão", async () => {
    mockGetUserId.mockResolvedValue(null);
    mockIsAdmin.mockResolvedValue(false);
    const r = await evaluateAdminAccess();
    expect(r).toEqual({ ok: false, reason: "no-session" });
  });
  it("bloqueia com not-admin quando perfil está inconsistente (sem role admin)", async () => {
    mockGetUserId.mockResolvedValue("uid-1");
    mockIsAdmin.mockResolvedValue(false);
    const r = await evaluateAdminAccess();
    expect(r).toEqual({ ok: false, reason: "not-admin" });
  });
  it("libera acesso quando há sessão + role admin", async () => {
    mockGetUserId.mockResolvedValue("uid-1");
    mockIsAdmin.mockResolvedValue(true);
    const r = await evaluateAdminAccess();
    expect(r).toEqual({ ok: true, userId: "uid-1" });
  });
});

describe("requireAdmin (beforeLoad em todas as sub-rotas /admin/*)", () => {
  it("sem sessão → redirect /auth e limpa @fixxer:is_admin", async () => {
    mockGetUserId.mockResolvedValue(null);
    mockIsAdmin.mockResolvedValue(false);
    await expect(requireAdmin()).rejects.toMatchObject({ __isRedirect: true, to: "/auth" });
    expect(localStorage.getItem("@fixxer:is_admin")).toBeNull();
  });

  it("role não é admin → redirect /dashboard e limpa flag", async () => {
    mockGetUserId.mockResolvedValue("uid-1");
    mockIsAdmin.mockResolvedValue(false);
    await expect(requireAdmin()).rejects.toMatchObject({ __isRedirect: true, to: "/dashboard" });
    expect(localStorage.getItem("@fixxer:is_admin")).toBeNull();
  });

  it("perfil inconsistente (getCurrentUserId falhando silenciosamente) → redirect /auth", async () => {
    mockGetUserId.mockResolvedValue(null); // simula sessão corrompida/token expirado
    mockIsAdmin.mockResolvedValue(true);   // role antigo em cache não deve liberar
    await expect(requireAdmin()).rejects.toMatchObject({ __isRedirect: true, to: "/auth" });
  });

  it("admin válido → não lança e retorna userId", async () => {
    mockGetUserId.mockResolvedValue("uid-admin");
    mockIsAdmin.mockResolvedValue(true);
    await expect(requireAdmin()).resolves.toEqual({ userId: "uid-admin", isAdmin: true });
  });
});
