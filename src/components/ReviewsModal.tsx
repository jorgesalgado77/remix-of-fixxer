import React, { useState, useMemo } from "react";
import { X, Star, User, SlidersHorizontal, ChevronDown, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCategoryColor } from "@/lib/getCategoryColor";

export interface Review {
  id: string;
  reviewer_id?: string;
  reviewer_name: string;
  reviewer_city?: string;
  reviewer_category: "cliente" | "prestador" | "fornecedor" | "lojista";
  reviewer_avatar?: string | null;
  rating: number;
  comment: string;
  created_at: string;
  store_reply?: string | null;
}

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviews: Review[];
  displayName: string;
}

export function ReviewsModal({ isOpen, onClose, reviews, displayName }: ReviewsModalProps) {
  const [ratingFilter, setRatingFilter] = useState<string>("Todas");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    if (ratingFilter !== "Todas") {
      const num = parseInt(ratingFilter);
      result = result.filter((r) => Math.round(r.rating) === num);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [reviews, ratingFilter, sortOrder]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        className="relative bg-[#0F0F10] border border-white/10 w-full max-w-2xl max-h-[85vh] rounded-[2rem] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/[0.02] to-transparent">
          <div>
            <h2 className="text-xl font-black uppercase italic text-white tracking-tight flex items-center gap-2">
              <Star className="w-5 h-5 text-emerald-400 fill-emerald-400" />
              Avaliações de {displayName}
            </h2>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
              {reviews.length} depoimentos registrados
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Sticky Area */}
        <div className="px-6 py-4 bg-[#141415] border-b border-white/5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:opacity-80 transition-opacity"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {showFilters ? "Esconder Filtros" : "Mostrar Filtros"}
                {(ratingFilter !== "Todas" || sortOrder !== "desc") && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
              
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                Mostrando {filteredReviews.length} resultados
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5 ml-1">
                    <Filter className="w-3 h-3" /> Filtrar por Nota
                  </label>
                  <div className="flex gap-1.5">
                    {["Todas", "5", "4", "3", "2", "1"].map((n) => (
                      <button
                        key={n}
                        onClick={() => setRatingFilter(n)}
                        className={`flex-1 h-8 rounded-lg text-[10px] font-black uppercase italic border transition-all ${
                          ratingFilter === n 
                            ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {n === "Todas" ? "Todas" : n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5 ml-1">
                    <Calendar className="w-3 h-3" /> Ordenar Data
                  </label>
                  <div className="flex gap-1.5">
                    {[
                      { val: "desc", label: "Recentes" },
                      { val: "asc", label: "Antigas" }
                    ].map((o) => (
                      <button
                        key={o.val}
                        onClick={() => setSortOrder(o.val as any)}
                        className={`flex-1 h-8 rounded-lg text-[10px] font-black uppercase italic border transition-all ${
                          sortOrder === o.val 
                            ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
              <Star className="w-12 h-12 mb-4 stroke-[1px]" />
              <p className="text-sm font-black uppercase italic tracking-widest">Nenhuma avaliação encontrada</p>
              <p className="text-[10px] font-medium mt-1">Tente ajustar os filtros acima</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex justify-center bg-black/20">
          <Button 
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase italic hover:bg-white/10 transition-all"
          >
            Fechar Visualização
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const color = getCategoryColor(review.reviewer_category);
  
  return (
    <div 
      className="group relative p-5 rounded-2xl bg-[#1A1A1C] border border-white/5 hover:border-white/10 transition-all"
      style={{
        background: `linear-gradient(145deg, #1A1A1C 0%, #151516 100%)`
      }}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div 
            className="w-12 h-12 rounded-full border-2 bg-black flex items-center justify-center overflow-hidden shadow-xl"
            style={{ borderColor: `${color.hex}44` }}
          >
            {review.reviewer_avatar ? (
              <img src={review.reviewer_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6" style={{ color: color.hex }} />
            )}
          </div>
          <div 
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/10 flex items-center justify-center text-[8px] font-black shadow-lg"
            style={{ color: color.hex }}
            title={review.reviewer_category}
          >
            {review.reviewer_category === 'lojista' ? '🏪' : 
             review.reviewer_category === 'prestador' ? '🛠️' : 
             review.reviewer_category === 'fornecedor' ? '🚚' : '👤'}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-sm font-black text-white italic truncate">
              {review.reviewer_name}
            </h4>
            <span className="text-[9px] font-bold text-white/30 uppercase shrink-0">
              {new Date(review.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`w-3 h-3 ${n <= Math.round(review.rating) ? "fill-emerald-400 text-emerald-400" : "text-white/10"}`}
                />
              ))}
            </div>
            {review.reviewer_city && (
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40 italic">
                • {review.reviewer_city}
              </span>
            )}
          </div>

          <p className="text-xs leading-relaxed text-white/70 italic line-clamp-4">
            "{review.comment}"
          </p>

          {review.store_reply && (
            <div className="mt-4 pl-4 border-l-2 border-emerald-500/30 bg-emerald-500/5 p-3 rounded-r-xl">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400 block mb-1">Resposta do Profissional</span>
              <p className="text-[11px] text-white/60 italic leading-snug">
                {review.store_reply}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
