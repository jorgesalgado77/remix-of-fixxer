import { useEffect } from "react";
import { thumbSrc } from "@/lib/feed-thumb";

/**
 * Faz o pré-carregamento das próximas thumbnails do feed em segundo plano,
 * antes do usuário atingir o fim da lista renderizada.
 *
 * Usa `Image()` com `decoding=async` e `fetchPriority=low` para não competir
 * com o LCP nem com a rolagem. É seguro em celulares de entrada porque só
 * antecipa o próximo lote (nunca a lista inteira).
 */
export function useFeedPreload<T>(
  items: T[],
  visibleCount: number,
  batchSize: number,
  getImage: (item: T) => string | null | undefined,
  width = 640,
) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const start = visibleCount;
    const end = Math.min(items.length, visibleCount + batchSize);
    if (start >= end) return;
    const preloaded: HTMLImageElement[] = [];
    for (let i = start; i < end; i++) {
      const raw = getImage(items[i]);
      if (!raw) continue;
      const url = thumbSrc(raw, width);
      if (!url) continue;
      try {
        const img = new Image();
        img.decoding = "async";
        (img as any).fetchPriority = "low";
        img.loading = "eager";
        img.src = url;
        preloaded.push(img);
      } catch {
        // ignore
      }
    }
    return () => {
      // libera referências
      preloaded.length = 0;
    };
  }, [items, visibleCount, batchSize, getImage, width]);
}
