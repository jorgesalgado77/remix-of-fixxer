import { FileText, Play, File as FileIcon, Music, Archive } from "lucide-react";
import { useCurrentCategory } from "@/lib/user-category";
import { getCategoryTheme, type CategoryKey } from "@/lib/category-colors";

export type AttachmentKind = "image" | "video" | "pdf" | "audio" | "archive" | "other";

export interface AttachmentLike {
  url?: string;
  name?: string;
  mime?: string;
  kind?: AttachmentKind;
}

const IMG_RE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const VID_RE = /\.(mp4|webm|mov|m4v|ogv)$/i;
const AUD_RE = /\.(mp3|wav|ogg|m4a|flac)$/i;
const ARC_RE = /\.(zip|rar|7z|tar|gz)$/i;

export function detectKind(a: AttachmentLike): AttachmentKind {
  if (a.kind) return a.kind;
  const s = `${a.mime ?? ""} ${a.name ?? ""} ${a.url ?? ""}`.toLowerCase();
  if (s.includes("image/") || IMG_RE.test(a.name ?? "") || IMG_RE.test(a.url ?? "")) return "image";
  if (s.includes("video/") || VID_RE.test(a.name ?? "") || VID_RE.test(a.url ?? "")) return "video";
  if (s.includes("pdf") || /\.pdf$/i.test(a.name ?? "") || /\.pdf$/i.test(a.url ?? "")) return "pdf";
  if (s.includes("audio/") || AUD_RE.test(a.name ?? "") || AUD_RE.test(a.url ?? "")) return "audio";
  if (ARC_RE.test(a.name ?? "") || ARC_RE.test(a.url ?? "")) return "archive";
  return "other";
}

interface Props {
  attachment?: AttachmentLike | null;
  className?: string;
  aspect?: "video" | "square" | "auto";
  categoryOverride?: CategoryKey;
  /** Se true, tenta renderizar <video controls>; senão apenas thumb com play. */
  playable?: boolean;
  emptyLabel?: string;
}

/**
 * Componente único de prévia para anexos: imagem, vídeo, PDF, áudio, outros.
 * Fallback consistente por categoria com ícone apropriado — nunca quebra o layout.
 */
export function AttachmentPreview({
  attachment,
  className = "",
  aspect = "video",
  categoryOverride,
  playable = false,
  emptyLabel = "Sem mídia",
}: Props) {
  const cat = useCurrentCategory();
  const theme = getCategoryTheme(categoryOverride ?? cat);
  const aspectClass =
    aspect === "square" ? "aspect-square" : aspect === "auto" ? "" : "aspect-video";

  const shell = `relative overflow-hidden ${aspectClass} ${className}`;

  if (!attachment || !attachment.url) {
    return (
      <div
        className={`${shell} flex flex-col items-center justify-center gap-1 text-white/40`}
        style={{ background: `rgba(${theme.rgb}, 0.06)` }}
      >
        <FileIcon className="w-6 h-6" style={{ color: theme.hex, opacity: 0.6 }} />
        <span className="text-[10px] uppercase font-bold tracking-wider">{emptyLabel}</span>
      </div>
    );
  }

  const kind = detectKind(attachment);
  const name = attachment.name ?? attachment.url.split("/").pop() ?? "arquivo";

  if (kind === "image") {
    return (
      <div className={`${shell} bg-black`}>
        <img
          src={attachment.url}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={`${shell} bg-black`}>
        {playable ? (
          <video src={attachment.url} className="w-full h-full object-contain" controls playsInline />
        ) : (
          <>
            <video src={attachment.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div
                className="rounded-full w-12 h-12 flex items-center justify-center"
                style={{ backgroundColor: theme.hex }}
              >
                <Play className="w-5 h-5 text-black fill-black" />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <div
        className={`${shell} flex flex-col items-center justify-center gap-2`}
        style={{ background: `rgba(${theme.rgb}, 0.08)` }}
      >
        <div
          className="w-14 h-16 rounded-md flex items-center justify-center text-black font-black text-xs"
          style={{ backgroundColor: theme.hex }}
        >
          PDF
        </div>
        <span className="text-[10px] uppercase font-bold text-white/70 line-clamp-1 px-3 text-center">
          {name}
        </span>
      </div>
    );
  }

  const Icon = kind === "audio" ? Music : kind === "archive" ? Archive : FileText;
  return (
    <div
      className={`${shell} flex flex-col items-center justify-center gap-2`}
      style={{ background: `rgba(${theme.rgb}, 0.08)` }}
    >
      <Icon className="w-10 h-10" style={{ color: theme.hex }} />
      <span className="text-[10px] uppercase font-bold text-white/70 line-clamp-1 px-3 text-center">
        {name}
      </span>
    </div>
  );
}
