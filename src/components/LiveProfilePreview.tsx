import { useMemo } from "react";
import { Eye, FileText, Camera } from "lucide-react";
import type { PhotoSectionsValue, PhotoItem } from "@/components/PhotoSectionsManager";

const getUrl = (p: PhotoItem): string => (typeof p === "string" ? p : p.url);
const getThumb = (p: PhotoItem): string =>
  typeof p === "string" ? p : p.thumbUrl || p.url;

interface Props {
  aboutBio?: string | null;
  sections?: PhotoSectionsValue | null;
  portfolioImages?: Array<{ url: string; type?: string }>;
  companyName?: string | null;
  fullName?: string | null;
  accentHex?: string;
}

/**
 * Prévia ao vivo do que aparece no perfil público (aba "Sobre" + seções de fotos).
 * Atualiza em tempo real conforme o usuário edita — antes mesmo de salvar.
 */
export function LiveProfilePreview({
  aboutBio,
  sections,
  portfolioImages,
  companyName,
  fullName,
  accentHex,
}: Props) {
  const custom = sections?.custom ?? [];
  const showroom = sections?.showroom ?? [];

  const fallbackImages = useMemo(
    () => (portfolioImages || []).filter((i) => (i.type ?? "image") === "image").slice(0, 6),
    [portfolioImages],
  );

  const bio = (aboutBio || "").trim();
  const displayName = companyName || fullName || "Seu Perfil";
  const accent = accentHex || "#00FF87";

  return (
    <section
      className="bg-card/30 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl space-y-5 sticky top-4"
      aria-label="Prévia ao vivo do perfil público"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="w-4 h-4 shrink-0" style={{ color: accent }} />
          <h3 className="text-sm font-black uppercase tracking-tighter truncate">
            Prévia ao Vivo
          </h3>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
          style={{ background: `${accent}20`, color: accent }}
        >
          Atualizando
        </span>
      </div>

      <p className="text-[10px] text-white/50 -mt-2">
        É assim que a aba <b>Sobre</b> e suas <b>seções de fotos</b> ficarão no perfil
        público. Clique em <b>Salvar Perfil</b> para publicar.
      </p>

      {/* Cabeçalho simulado */}
      <div
        className="rounded-2xl p-4 border border-white/10"
        style={{ background: `linear-gradient(135deg, ${accent}10, transparent)` }}
      >
        <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">
          Perfil público
        </div>
        <div className="text-base font-black text-white truncate" title={displayName}>
          {displayName}
        </div>
      </div>

      {/* Aba Sobre */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" style={{ color: accent }} />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70">
            Aba "Sobre"
          </h4>
        </div>
        {bio ? (
          <p className="text-xs leading-relaxed text-white/80 whitespace-pre-wrap break-words rounded-xl bg-white/5 border border-white/5 p-3">
            {bio}
          </p>
        ) : (
          <p className="text-[11px] italic text-white/40 rounded-xl border border-dashed border-white/10 p-3">
            Preencha o campo "Sobre / Apresentação da Empresa" para vê-lo aqui.
          </p>
        )}
      </div>

      {/* Show Room */}
      {showroom.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Camera className="w-3.5 h-3.5" style={{ color: accent }} />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70">
              Show Room ({showroom.length})
            </h4>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {showroom.slice(0, 8).map((p, i) => (
              <img
                key={i}
                src={getThumb(p)}
                alt=""
                loading="lazy"
                className="w-full aspect-square object-cover rounded-lg border border-white/10"
              />
            ))}
          </div>
        </div>
      )}

      {/* Seções personalizadas — respeita a ordem atual */}
      {custom.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70">
            Seções personalizadas ({custom.length})
          </h4>
          {custom.map((sec) => (
            <div
              key={sec.id}
              className="rounded-xl border border-white/10 bg-black/20 p-2.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase text-white truncate">
                  {sec.name || "Sem nome"}
                </span>
                <span className="text-[9px] font-bold text-white/40 shrink-0">
                  {sec.photos.length} foto{sec.photos.length === 1 ? "" : "s"}
                </span>
              </div>
              {sec.photos.length > 0 ? (
                <div className="grid grid-cols-4 gap-1">
                  {sec.photos.slice(0, 4).map((p, i) => (
                    <img
                      key={`${sec.id}-${i}`}
                      src={getThumb(p)}
                      alt=""
                      loading="lazy"
                      className="w-full aspect-square object-cover rounded-md border border-white/10"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[10px] italic text-white/40">Sem fotos ainda.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fallback galeria portfolio */}
      {custom.length === 0 && showroom.length === 0 && fallbackImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70">
            Galeria ({fallbackImages.length})
          </h4>
          <div className="grid grid-cols-3 gap-1.5">
            {fallbackImages.map((img, i) => (
              <img
                key={i}
                src={getUrl(img as any)}
                alt=""
                loading="lazy"
                className="w-full aspect-square object-cover rounded-lg border border-white/10"
              />
            ))}
          </div>
        </div>
      )}

      {custom.length === 0 && showroom.length === 0 && fallbackImages.length === 0 && (
        <p className="text-[11px] italic text-white/40 rounded-xl border border-dashed border-white/10 p-3 text-center">
          Adicione fotos nas seções para pré-visualizá-las aqui.
        </p>
      )}
    </section>
  );
}
