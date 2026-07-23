import { useState, useEffect, useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import {
  MapPin,
  Star,
  ShieldCheck,
  Clock,
  MessageCircle,
  Play,
  X,
  Download,
  FileText,
  Zap,
  Award,
  ChevronLeft,
  ChevronRight,
  Filter,
  Wrench,
  Truck,
  User,
  Send,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type TabKey = "sobre" | "oportunidades" | "avaliacoes" | "especialidades";

interface StoreProfile {
  user_id?: string;
  company_name?: string;
  social_name?: string;
  cnpj?: string;
  city?: string;
  state?: string;
  whatsapp?: string;
  logo_url?: string | null;
  banner_url?: string | null;
  gallery_urls?: string[];
  video_urls?: string[];
  activity_branch?: string;
  created_at?: string;
}

interface ServiceOrder {
  id: string;
  code: string;
  title: string;
  description?: string;
  city?: string;
  state?: string;
  price?: number;
  deadline?: string;
  status: string;
  created_at?: string;
}

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_city?: string;
  reviewer_category: "cliente" | "prestador" | "fornecedor";
  reviewer_avatar?: string | null;
  rating: number;
  comment: string;
  created_at: string;
  store_reply?: string | null;
}

const PHOTO_FILTERS = ["Todas", "Cozinhas", "Dormitórios", "Showroom"];

export function LojistaPublicProfilePage() {
  const params = useParams({ strict: false }) as { id?: string };
  const storeId = params?.id;

  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("sobre");
  const [photoFilter, setPhotoFilter] = useState("Todas");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // O.S.
  const [orders, setOrders] = useState<ServiceOrder[]>([]);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewCategoryFilter, setReviewCategoryFilter] = useState<string>("Todos");
  const [reviewRatingFilter, setReviewRatingFilter] = useState<string>("Todas");
  const [reviewDateOrder, setReviewDateOrder] = useState<"desc" | "asc">("desc");

  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabaseExternal.from("store_profiles").select("*");
        if (storeId) query = query.eq("user_id", storeId);
        const { data } = await query.limit(1).maybeSingle();
        if (data) setProfile(data as StoreProfile);

        // O.S. pendentes deste lojista
        if (storeId) {
          const { data: osData } = await supabaseExternal
            .from("service_orders")
            .select("*")
            .eq("lojista_id", storeId)
            .eq("status", "PENDENTE")
            .order("created_at", { ascending: false });
          if (osData) setOrders(osData as ServiceOrder[]);

          const { data: revData } = await supabaseExternal
            .from("store_reviews")
            .select("*")
            .eq("lojista_id", storeId)
            .order("created_at", { ascending: false });
          if (revData) setReviews(revData as Review[]);
        }
      } catch (err) {
        console.error("Erro ao carregar perfil público:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId]);

  const gallery = profile?.gallery_urls || [];
  const videos = profile?.video_urls || [];

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 5.0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const yearsActive = useMemo(() => {
    if (!profile?.created_at) return 2;
    const diff = Date.now() - new Date(profile.created_at).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24 * 365)));
  }, [profile?.created_at]);

  const filteredReviews = useMemo(() => {
    let list = [...reviews];
    if (reviewCategoryFilter !== "Todos") {
      const map: Record<string, Review["reviewer_category"]> = {
        "Clientes Finais": "cliente",
        Prestadores: "prestador",
        "Parceiros Fornecedores": "fornecedor",
      };
      list = list.filter((r) => r.reviewer_category === map[reviewCategoryFilter]);
    }
    if (reviewRatingFilter !== "Todas") {
      if (reviewRatingFilter === "5") list = list.filter((r) => r.rating >= 4.5);
      else if (reviewRatingFilter === "4") list = list.filter((r) => r.rating >= 3.5 && r.rating < 4.5);
      else if (reviewRatingFilter === "3") list = list.filter((r) => r.rating < 3.5);
    }
    list.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return reviewDateOrder === "desc" ? db - da : da - db;
    });
    return list;
  }, [reviews, reviewCategoryFilter, reviewRatingFilter, reviewDateOrder]);

  const handleContactWhatsApp = () => {
    const num = profile?.whatsapp?.replace(/\D/g, "");
    if (!num) {
      toast.error("WhatsApp da loja indisponível.");
      return;
    }
    window.open(`https://wa.me/55${num}`, "_blank");
  };

  const submitReview = async () => {
    if (!newComment.trim()) {
      toast.error("Escreva um comentário antes de enviar.");
      return;
    }
    setSubmittingReview(true);
    try {
      const { data: { user } } = await supabaseExternal.auth.getUser();
      const payload = {
        lojista_id: storeId,
        reviewer_id: user?.id,
        reviewer_name: user?.email?.split("@")[0] || "Anônimo",
        reviewer_category: "cliente" as const,
        rating: newRating,
        comment: newComment,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabaseExternal
        .from("store_reviews")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      if (data) setReviews((prev) => [data as Review, ...prev]);
      toast.success("Avaliação publicada!");
      setShowReviewModal(false);
      setNewComment("");
      setNewRating(5);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao publicar avaliação.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const openImageLightbox = (url: string, idx: number) => {
    setLightboxImage(url);
    setLightboxIndex(idx);
  };

  const navigateLightbox = (dir: 1 | -1) => {
    const next = (lightboxIndex + dir + gallery.length) % gallery.length;
    setLightboxIndex(next);
    setLightboxImage(gallery[next]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white pb-32 md:pb-8 scrollbar-none">
      {/* HERO */}
      <div className="relative">
        <div
          className="h-48 md:h-80 w-full bg-cover bg-center relative"
          style={{
            backgroundImage: profile?.banner_url
              ? `url(${profile.banner_url})`
              : "linear-gradient(135deg, #0A0A0B, #1A1A1B)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0B]/60 to-[#0A0A0B]" />
        </div>

        {/* Card sobreposto */}
        <div className="max-w-5xl mx-auto px-4 -mt-20 md:-mt-24 relative z-10">
          <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-5 md:p-8 shadow-2xl">
            <div className="flex flex-col md:flex-row gap-5 md:gap-8 items-start">
              {/* Logo */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-black border-2 border-primary shadow-[0_0_25px_rgba(0,255,135,0.4)] overflow-hidden flex items-center justify-center">
                  {profile?.logo_url ? (
                    <img src={profile.logo_url} alt={profile.company_name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="text-3xl font-black text-primary italic">F</span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary text-black px-2 py-1 rounded-lg text-[9px] font-black uppercase italic shadow-lg flex items-center gap-1">
                  <Award className="w-3 h-3" /> Ouro
                </div>
              </div>

              {/* Infos */}
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <h1 className="text-xl md:text-3xl font-black uppercase italic tracking-tight">
                    {profile?.company_name || "Lojista FIXXER"}
                  </h1>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase italic mt-1">
                    <MapPin className="w-3 h-3 text-primary" />
                    {profile?.city || "Cidade"} / {profile?.state || "UF"}
                  </div>
                </div>

                {/* Reputação */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="text-sm font-black text-primary italic">{avgRating.toFixed(1)}</span>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase">/ 5.0</span>
                  </div>
                  <span className="text-[9px] font-black uppercase italic text-amber-400 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Selo Ouro FIXXER
                  </span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge icon={<ShieldCheck className="w-3 h-3" />} label="CNPJ Verificado" />
                  <Badge icon={<Clock className="w-3 h-3" />} label={`Ativo há +${yearsActive} ${yearsActive === 1 ? "ano" : "anos"}`} />
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-2 md:gap-3 pt-2">
                  <MetricCard label="O.S. Concluídas" value="148" suffix="Serviços" />
                  <MetricCard label="Satisfação" value="99%" suffix="Positivo" />
                  <MetricCard label="Tempo Resposta" value="<15" suffix="min" />
                </div>

                {/* CTA */}
                <Button
                  onClick={handleContactWhatsApp}
                  className="w-full md:w-auto bg-primary text-black font-black uppercase italic tracking-widest h-12 rounded-xl hover:bg-primary/90 shadow-[0_0_20px_rgba(0,255,135,0.3)]"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Entrar em Contato
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STICKY TABS */}
      <div className="sticky top-0 md:top-4 z-30 max-w-5xl mx-auto px-4 mt-6">
        <div className="bg-[#1A1A1B]/95 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 flex gap-1 overflow-x-auto scrollbar-none">
          <TabBtn active={activeTab === "sobre"} onClick={() => setActiveTab("sobre")}>📌 Sobre & Mídia</TabBtn>
          <TabBtn active={activeTab === "oportunidades"} onClick={() => setActiveTab("oportunidades")}>🔥 Oportunidades ({orders.length})</TabBtn>
          <TabBtn active={activeTab === "avaliacoes"} onClick={() => setActiveTab("avaliacoes")}>⭐ Avaliações ({reviews.length})</TabBtn>
          <TabBtn active={activeTab === "especialidades"} onClick={() => setActiveTab("especialidades")}>📦 Especialidades</TabBtn>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-8">
        {activeTab === "sobre" && (
          <>
            {/* Galeria de Fotos */}
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-sm font-black uppercase italic text-primary flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Galeria de Projetos
                </h2>
                <div className="flex gap-1.5 flex-wrap">
                  {PHOTO_FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setPhotoFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase italic transition-all ${
                        photoFilter === f ? "bg-primary text-black" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {gallery.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
                  {gallery.map((url, i) => (
                    <button
                      key={url}
                      onClick={() => openImageLightbox(url, i)}
                      className="shrink-0 w-40 h-40 md:w-56 md:h-56 rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all snap-start group relative"
                    >
                      <img src={url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState label="Nenhuma foto publicada ainda." />
              )}
            </section>

            {/* Vídeos */}
            <section className="space-y-4">
              <h2 className="text-sm font-black uppercase italic text-primary flex items-center gap-2">
                <Play className="w-4 h-4" /> Vídeos da Loja
              </h2>
              {videos.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
                  {videos.map((url) => (
                    <button
                      key={url}
                      onClick={() => setLightboxVideo(url)}
                      className="shrink-0 w-64 h-40 md:w-80 md:h-48 rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all snap-start relative bg-black"
                    >
                      <video src={url} className="w-full h-full object-cover opacity-70" preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,135,0.5)]">
                          <Play className="w-7 h-7 fill-black text-black ml-0.5" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState label="Nenhum vídeo disponível." />
              )}
            </section>
          </>
        )}

        {activeTab === "oportunidades" && (
          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase italic text-primary flex items-center gap-2">
              <Zap className="w-4 h-4" /> Ordens de Serviço em Aberto
            </h2>
            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((os) => (
                  <OrderCard key={os.id} order={os} />
                ))}
              </div>
            ) : (
              <EmptyState label="Nenhuma O.S. pendente no momento." />
            )}
          </section>
        )}

        {activeTab === "avaliacoes" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-black uppercase italic text-primary flex items-center gap-2">
                <Star className="w-4 h-4" /> Avaliações & Depoimentos
              </h2>
              <Button
                onClick={() => setShowReviewModal(true)}
                className="bg-primary text-black font-black uppercase italic text-[10px] h-9 rounded-xl hover:bg-primary/90"
              >
                <Send className="w-3 h-3 mr-1.5" /> Adicionar Avaliação
              </Button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <FilterGroup label="Categoria" options={["Todos", "Clientes Finais", "Prestadores", "Parceiros Fornecedores"]} value={reviewCategoryFilter} onChange={setReviewCategoryFilter} />
              <FilterGroup label="Nota" options={["Todas", "5", "4", "3"]} value={reviewRatingFilter} onChange={setReviewRatingFilter} />
              <FilterGroup label="Data" options={["Mais Recentes", "Mais Antigas"]} value={reviewDateOrder === "desc" ? "Mais Recentes" : "Mais Antigas"} onChange={(v) => setReviewDateOrder(v === "Mais Recentes" ? "desc" : "asc")} />
            </div>

            {filteredReviews.length > 0 ? (
              <div className="space-y-3">
                {filteredReviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            ) : (
              <EmptyState label="Nenhuma avaliação encontrada com esses filtros." />
            )}
          </section>
        )}

        {activeTab === "especialidades" && (
          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase italic text-primary">📦 Especialidades da Loja</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Móveis Planejados de Alto Padrão", desc: "Projetos residenciais premium sob medida." },
                { title: "Marcenaria Sob Medida", desc: "Peças exclusivas para ambientes personalizados." },
                { title: "Projetos Corporativos", desc: "Ambientes empresariais e comerciais completos." },
                { title: "Assistência Técnica Garantida", desc: "Suporte pós-venda e manutenção especializada." },
              ].map((s) => (
                <div key={s.title} className="bg-[#1A1A1B] border border-white/10 rounded-2xl p-5 hover:border-primary/30 transition-all">
                  <h3 className="text-sm font-black uppercase italic text-white mb-2">{s.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* STICKY FOOTER CTA MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-[#0A0A0B]/95 backdrop-blur-md border-t border-white/10">
        <Button
          onClick={handleContactWhatsApp}
          className="w-full bg-primary text-black font-black uppercase italic tracking-widest h-12 rounded-xl hover:bg-primary/90 shadow-[0_0_20px_rgba(0,255,135,0.3)]"
        >
          <MessageCircle className="w-4 h-4 mr-2" /> Entrar em Contato
        </Button>
      </div>

      {/* LIGHTBOX IMAGEM */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20" onClick={() => setLightboxImage(null)}>
            <X className="w-5 h-5" />
          </button>
          {gallery.length > 1 && (
            <>
              <button className="absolute left-4 p-3 bg-white/10 rounded-full hover:bg-white/20" onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button className="absolute right-4 p-3 bg-white/10 rounded-full hover:bg-white/20" onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <img src={lightboxImage} alt="" className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* LIGHTBOX VÍDEO */}
      {lightboxVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxVideo(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20" onClick={() => setLightboxVideo(null)}>
            <X className="w-5 h-5" />
          </button>
          <video src={lightboxVideo} controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* MODAL DE AVALIAÇÃO */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase italic text-white">Nova Avaliação</h3>
              <button onClick={() => setShowReviewModal(false)} className="p-1.5 hover:bg-white/5 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Sua nota</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setNewRating(n)} className="transition-transform hover:scale-110">
                    <Star className={`w-8 h-8 ${n <= newRating ? "fill-primary text-primary" : "text-white/20"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Seu depoimento</p>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Conte sua experiência com esta loja..."
                className="bg-black/40 border-white/10 min-h-24 rounded-xl"
              />
            </div>
            <Button
              onClick={submitReview}
              disabled={submittingReview}
              className="w-full bg-primary text-black font-black uppercase italic h-12 rounded-xl hover:bg-primary/90"
            >
              {submittingReview ? "Enviando..." : "Publicar Avaliação"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- SUBCOMPONENTES -------- */

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 md:px-4 py-2.5 rounded-xl text-[10px] font-black uppercase italic transition-all whitespace-nowrap ${
        active ? "bg-primary text-black shadow-[0_0_15px_rgba(0,255,135,0.3)]" : "text-muted-foreground hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase italic text-white">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}

function MetricCard({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-center">
      <div className="text-lg md:text-xl font-black text-primary italic leading-none">{value}</div>
      <div className="text-[8px] font-black uppercase text-muted-foreground mt-1">{label}</div>
      <div className="text-[8px] text-white/40 uppercase font-bold">{suffix}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="p-8 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center text-[10px] font-black uppercase italic text-muted-foreground">
      {label}
    </div>
  );
}

function FilterGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[9px] font-black uppercase text-muted-foreground italic">{label}:</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase italic transition-all ${
            value === o ? "bg-primary text-black" : "bg-white/5 text-muted-foreground hover:bg-white/10"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function OrderCard({ order }: { order: ServiceOrder }) {
  return (
    <div className="bg-[#1A1A1B] border border-white/10 rounded-2xl p-5 space-y-4 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-primary">
            <Clock className="w-4 h-4" />
            <h3 className="text-sm font-black uppercase italic truncate">{order.title}</h3>
          </div>
          <div className="text-[9px] font-black uppercase text-muted-foreground mt-1">
            {order.code} • {order.city || "—"}/{order.state || "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-primary italic">R$ {(order.price || 0).toFixed(2)}</div>
          <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-md">PENDENTE</span>
        </div>
      </div>
      {order.description && <p className="text-[11px] text-muted-foreground">{order.description}</p>}
      {order.deadline && (
        <div className="text-[9px] font-bold uppercase text-white/60">
          Prazo: <span className="text-white">{new Date(order.deadline).toLocaleDateString("pt-BR")}</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-[9px] text-muted-foreground border-t border-white/5 pt-3">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="font-black uppercase">O.S. criada em {new Date(order.created_at || Date.now()).toLocaleString("pt-BR")}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button variant="ghost" className="h-9 text-[9px] font-black uppercase italic border border-white/10 hover:bg-white/5 rounded-xl">
          Ver Detalhes
        </Button>
        <Button variant="ghost" className="h-9 text-[9px] font-black uppercase italic border border-white/10 hover:bg-white/5 rounded-xl">
          <Download className="w-3 h-3 mr-1.5" /> PDF
        </Button>
        <Button className="h-9 text-[9px] font-black uppercase italic bg-primary text-black hover:bg-primary/90 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.3)]">
          <Zap className="w-3 h-3 mr-1.5" /> Candidatar-se
        </Button>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const catMeta = {
    prestador: { icon: <Wrench className="w-3 h-3" />, label: "Prestador", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
    fornecedor: { icon: <Truck className="w-3 h-3" />, label: "Parceiro Fornecedor", color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
    cliente: { icon: <User className="w-3 h-3" />, label: "Cliente Final", color: "text-primary bg-primary/10 border-primary/30" },
  }[review.reviewer_category];

  return (
    <div className="bg-[#1A1A1B] border border-white/10 rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
          {review.reviewer_avatar ? <img src={review.reviewer_avatar} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-xs font-black text-white italic">{review.reviewer_name}</p>
              {review.reviewer_city && <p className="text-[9px] font-bold text-muted-foreground uppercase">{review.reviewer_city}</p>}
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase italic border ${catMeta.color}`}>
              {catMeta.icon} {catMeta.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`w-3 h-3 ${n <= Math.round(review.rating) ? "fill-primary text-primary" : "text-white/20"}`} />
              ))}
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">
              {new Date(review.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-white/80 leading-relaxed">{review.comment}</p>
      {review.store_reply && (
        <div className="mt-2 ml-4 pl-3 border-l-2 border-primary/40 bg-primary/5 rounded-r-lg p-3">
          <p className="text-[9px] font-black uppercase italic text-primary mb-1">Resposta da Loja</p>
          <p className="text-[11px] text-white/70">{review.store_reply}</p>
        </div>
      )}
    </div>
  );
}

function SpecialtyCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-[#1A1A1B] border border-white/10 p-5 rounded-2xl space-y-2 hover:border-primary/30 transition-all">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="w-4 h-4" />
        <h3 className="text-xs font-black uppercase italic">{title}</h3>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

