import { describe, it, expect, vi } from "vitest";
import { createProfileRefetchHandler, type ProfileLike } from "@/lib/profile-refetch";

/**
 * Testes de integração para o listener `fixxer:profile-updated` usado
 * pelo LojistaPublicProfilePage. Verificam que ao receber o evento o
 * componente refaz o SELECT em `profiles` e atualiza os campos
 * `activity_branch`, `default_radius` e `about_bio` no estado local.
 */

function makeFetcher(row: ProfileLike | null) {
  return vi.fn(async (_id: string) => ({ data: row }));
}

describe("createProfileRefetchHandler — refetch após 'fixxer:profile-updated'", () => {
  it("refaz SELECT e atualiza activity_branch, default_radius e about_bio", async () => {
    const observedId = "user-42";
    const fresh: ProfileLike = {
      id: observedId,
      activity_branch: "Manutenção Técnica",
      default_radius: 25,
      about_bio: "Nova biografia atualizada.",
    };
    const fetcher = makeFetcher(fresh);
    let state: ProfileLike | null = {
      id: observedId,
      activity_branch: "Antigo",
      default_radius: 10,
      about_bio: "Antiga",
    };
    const setState = (updater: (prev: ProfileLike | null) => ProfileLike) => {
      state = updater(state);
    };
    const handler = createProfileRefetchHandler(observedId, fetcher, setState);

    const evt = new CustomEvent("fixxer:profile-updated", { detail: { id: observedId } });
    await handler(evt);

    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(observedId);
    expect(state?.activity_branch).toBe("Manutenção Técnica");
    expect(state?.default_radius).toBe(25);
    expect(state?.about_bio).toBe("Nova biografia atualizada.");
  });

  it("ignora eventos direcionados a outro perfil", async () => {
    const fetcher = makeFetcher({ id: "user-1", about_bio: "novo" });
    const setState = vi.fn();
    const handler = createProfileRefetchHandler("user-1", fetcher, setState);

    const evt = new CustomEvent("fixxer:profile-updated", { detail: { id: "user-99" } });
    await handler(evt);

    expect(fetcher).not.toHaveBeenCalled();
    expect(setState).not.toHaveBeenCalled();
  });

  it("aceita eventos sem 'detail' (broadcast global)", async () => {
    const fetcher = makeFetcher({ id: "user-1", default_radius: 50 });
    const setState = vi.fn();
    const handler = createProfileRefetchHandler("user-1", fetcher, setState);

    await handler(new CustomEvent("fixxer:profile-updated"));
    expect(fetcher).toHaveBeenCalledOnce();
    expect(setState).toHaveBeenCalledOnce();
  });

  it("não quebra quando fetcher falha", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network");
    });
    const setState = vi.fn();
    const handler = createProfileRefetchHandler("user-1", fetcher, setState);

    await expect(handler(new CustomEvent("fixxer:profile-updated"))).resolves.toBeUndefined();
    expect(setState).not.toHaveBeenCalled();
  });

  it("faz merge — mantém campos anteriores não presentes na resposta", async () => {
    const fetcher = makeFetcher({ id: "u", about_bio: "nova" });
    let state: ProfileLike | null = { id: "u", activity_branch: "Estética", default_radius: 10, about_bio: "antiga" };
    const setState = (updater: (prev: ProfileLike | null) => ProfileLike) => {
      state = updater(state);
    };
    const handler = createProfileRefetchHandler("u", fetcher, setState);
    await handler(new CustomEvent("fixxer:profile-updated", { detail: { id: "u" } }));
    expect(state?.about_bio).toBe("nova");
    expect(state?.activity_branch).toBe("Estética");
    expect(state?.default_radius).toBe(10);
  });
});
