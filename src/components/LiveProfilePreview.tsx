import { useMemo } from "react";
import { Eye, FileText, Camera, Gift, Truck, Briefcase, Sparkles, Star } from "lucide-react";
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
  displayName?: string | null;
  accentHex?: string;
  /** 💼 Formatos de contratação aceitos (work_modes) */
  workModes?: string[] | null;
  /** 🎁 Itens listados em "Oferece" */
  offerings?: string[] | null;
  /** Observações livres da seção Oferece */
  offeringsNotes?: string | null;
  /** Tipo do veículo próprio (ex.: Moto, Carro, Van) */
  vehicleType?: string | null;
  /** Descrição/caracteristicas do veículo */
  vehicleDescription?: string | null;
  /** 📦 Especialidades cadastradas em /profile */
  specialties?: Array<{ id?: string; title?: string; description?: string; featured?: boolean }> | null;
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
  displayName,
  accentHex,
  workModes,
  offerings,
  offeringsNotes,
  vehicleType,
  vehicleDescription,
  specialties,
}: Props) {
  const custom = sections?.custom ?? [];
  const showroom = sections?.showroom ?? [];

  const fallbackImages = useMemo(
    () => (portfolioImages || []).filter((i) => (i.type ?? "image") === "image").slice(0, 6),
    [portfolioImages],
  );

  const bio = (aboutBio || "").trim();
  const shownDisplayName = (displayName || "").trim();
  const shownCompany = (companyName || fullName || "Seu Perfil").trim();
  const accent = accentHex || "#00FF87";

  const workModesList = Array.isArray(workModes) ? workModes.filter(Boolean) : [];
  const offeringsList = Array.isArray(offerings) ? offerings.filter(Boolean) : [];
  const notes = (offeringsNotes || "").trim();
  const vType = (vehicleType || "").trim();
  const vDesc = (vehicleDescription || "").trim();
  const hasVehicle = !!(vType || vDesc);
  const hasOferece = workModesList.length > 0 || offeringsList.length > 0 || notes.length > 0 || hasVehicle;
  const specialtiesList = Array.isArray(specialties)
    ? specialties.filter((s) => (s?.title || "").trim().length > 0)
    : [];


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
        {shownDisplayName && (
          <div
            className="text-lg font-black text-white truncate leading-tight"
            title={shownDisplayName}
          >
            {shownDisplayName}
          </div>
        )}
        <div
          className={`${shownDisplayName ? 'text-[11px] text-white/60 font-bold' : 'text-base font-black text-white'} truncate`}
          title={shownCompany}
        >
          {shownCompany}
        </div>
      </div>


      {/* 🎁 Oferece (prévia ao vivo) */}
      {hasOferece && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <Gift className="w-3.5 h-3.5" style={{ color: accent }} />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70">
              🎁 Oferece
            </h4>
          </div>

          {workModesList.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/40">
                <Briefcase className="w-3 h-3" /> Aceita trabalhos como
              </div>
              <div className="flex flex-wrap gap-1.5">
                {workModesList.map((m, i) => (
                  <span
                    key={`${m}-${i}`}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase italic border"
                    style={{ borderColor: `${accent}55`, color: accent, background: `${accent}12` }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {offeringsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {offeringsList.map((o, i) => (
                <span
                  key={`${o}-${i}`}
                  className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-[10px] font-bold uppercase italic text-white/90"
                >
                  {o}
                </span>
              ))}
            </div>
          )}

          {hasVehicle && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-2 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                <Truck className="w-3 h-3" /> Veículo
              </p>
              <div className="text-[11px] text-white/85 flex flex-wrap gap-x-3 gap-y-0.5">
                {vType && (<span><b className="text-white/50 mr-1">Tipo:</b>{vType}</span>)}
                {vDesc && (<span className="italic text-white/70">{vDesc}</span>)}
              </div>
            </div>
          )}

          {notes && (
            <p className="text-[11px] italic text-white/75 border-l-2 pl-2" style={{ borderColor: `${accent}80` }}>
              {notes}
            </p>
          )}
        </div>
      )}

      {specialtiesList.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70">
              📦 Especialidades ({specialtiesList.length})
            </h4>
          </div>
          <ul className="space-y-1.5">
            {specialtiesList.map((s, i) => (
              <li
                key={s.id || `${s.title}-${i}`}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2"
                style={s.featured ? { borderColor: `${accent}80` } : undefined}
              >
                <div className="flex items-start gap-2">
                  {s.featured && <Star className="w-3 h-3 mt-0.5 shrink-0" style={{ color: accent }} />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase italic text-white break-words">{s.title}</p>
                    {s.description && (
                      <p className="text-[10px] italic text-white/60 mt-0.5 break-words">{s.description}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}






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
