import { memo } from "react";

/**
 * Skeleton "pulsing dark" reutilizável — substitui spinners infinitos
 * durante a paginação por lote (10 em 10) dos Feeds.
 *
 * Compatível com celulares de entrada (Realme C55 e inferiores):
 * usa apenas animação CSS `animate-pulse` do Tailwind, sem JS.
 */
export const FeedCardSkeleton = memo(function FeedCardSkeleton({
  accent = "rgba(255,255,255,0.15)",
}: {
  accent?: string;
}) {
  return (
    <article
      className="rounded-3xl border-2 overflow-hidden bg-[#1A1A1B] animate-pulse"
      style={{ borderColor: accent }}
      aria-hidden
    >
      <div className="p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/5 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded bg-white/5 w-2/3" />
          <div className="h-2.5 rounded bg-white/5 w-1/3" />
        </div>
      </div>
      <div className="aspect-[16/10] bg-white/[0.04]" />
      <div className="p-3 flex gap-2">
        <div className="h-9 rounded-xl bg-white/5 flex-1" />
        <div className="h-9 w-24 rounded-xl bg-white/5" />
      </div>
    </article>
  );
});

/** Renderiza N skeletons de uma vez (default 2). */
export function FeedCardSkeletonList({
  count = 2,
  accent,
}: {
  count?: number;
  accent?: string;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <FeedCardSkeleton key={i} accent={accent} />
      ))}
    </>
  );
}
