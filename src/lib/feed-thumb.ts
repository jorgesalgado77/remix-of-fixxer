/**
 * Otimização de miniaturas para o Feed (mobile-first).
 *
 * - Reduz o payload de imagens externas (Unsplash / Supabase render) usadas em
 *   cards resumidos, mantendo o original apenas no Lightbox.
 * - No-op para URLs desconhecidas (data:, blob:, storage sem render endpoint).
 */
export function thumbSrc(url: string | undefined | null, width = 640): string {
  if (!url) return "";
  try {
    const u = new URL(url, "https://x");
    // Unsplash: aceita w/q/auto=format
    if (u.hostname.endsWith("unsplash.com")) {
      u.searchParams.set("w", String(width));
      u.searchParams.set("q", "55");
      u.searchParams.set("auto", "format");
      return u.toString();
    }
    // Supabase Image Transform (/storage/v1/render/image/...)
    if (u.pathname.includes("/storage/v1/render/image/")) {
      u.searchParams.set("width", String(width));
      u.searchParams.set("quality", "60");
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}
