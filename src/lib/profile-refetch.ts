/**
 * Handler puro (testável) para o refetch do perfil público disparado por
 * `fixxer:profile-updated`.
 *
 * Extraído do `LojistaPublicProfilePage` para permitir testes de
 * integração sem precisar montar o componente inteiro. O comportamento
 * é idêntico ao do listener original:
 *
 *   1. Ignora eventos cujo `detail.id` diferente do id observado.
 *   2. Executa o fetcher (que deve resolver com a linha atualizada de
 *      `profiles`).
 *   3. Se veio `data`, chama `onData` fazendo merge com o perfil anterior
 *      — garantindo que `activity_branch`, `default_radius` e `about_bio`
 *      sejam atualizados de imediato.
 */
export type ProfileLike = {
  id?: string;
  user_id?: string;
  activity_branch?: string | null;
  default_radius?: number | null;
  about_bio?: string | null;
  [k: string]: unknown;
};

export type ProfileFetcher = (id: string) => Promise<{ data: ProfileLike | null }>;

export function createProfileRefetchHandler(
  observedId: string,
  fetcher: ProfileFetcher,
  onData: (updater: (prev: ProfileLike | null) => ProfileLike) => void,
) {
  return async function handler(evt: Event) {
    const detail = (evt as CustomEvent).detail as { id?: string } | undefined;
    if (detail?.id && detail.id !== observedId) return;
    try {
      const { data } = await fetcher(observedId);
      if (data) onData((prev) => ({ ...(prev ?? {}), ...data }));
    } catch {
      /* noop */
    }
  };
}
