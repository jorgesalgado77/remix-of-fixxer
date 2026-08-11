import { supabaseExternal } from "@/lib/supabaseExternal";
import { resolveIdentity } from "./identity/identity-service";
import type { ResolvedProfile } from "./identity/identity-types";

export type FeedCategory = 
  | "cliente" 
  | "prestador" 
  | "fornecedor" 
  | "lojista";

export type FeedPostType = 
  | "necessidade_cliente" 
  | "anuncio_loja" 
  | "anuncio_prestador" 
  | "anuncio_fornecedor"
  | "oportunidade_servico"
  | "solicitacao_b2b"
  | "conteudo_relevante";

export interface FeedPostData {
  id: string;
  type: FeedPostType;
  category: FeedCategory;
  authorId: string;
  author?: ResolvedProfile;
  title: string;
  description: string;
  price?: number;
  location: {
    city: string;
    state: string;
    neighborhood?: string;
    lat?: number;
    lng?: number;
  };
  media: Array<{
    type: "image" | "video";
    url: string;
    poster?: string;
  }>;
  metadata: Record<string, any>;
  createdAt: string;
  status: string;
  urgency: "normal" | "urgente" | "critica";
}

export interface FeedFilters {
  category?: FeedCategory | "todos";
  type?: FeedPostType | "todos";
  query?: string;
  city?: string;
  state?: string;
  distanceKm?: number;
  userCoords?: { lat: number; lng: number };
  status?: string | "todos";
  limit?: number;
  offset?: number;
}

class FeedService {
  /**
   * Busca posts do feed com filtros unificados e resolução de identidade canônica.
   */
  async getFeed(filters: FeedFilters): Promise<FeedPostData[]> {
    let query = supabaseExternal
      .from("feed_posts")
      .select("*")
      .eq("status", filters.status && filters.status !== "todos" ? filters.status : "ativo");

    if (filters.category && filters.category !== "todos") {
      query = query.eq("category", filters.category);
    }

    if (filters.type && filters.type !== "todos") {
      query = query.eq("type", filters.type);
    }

    if (filters.state) {
      query = query.ilike("location->>state", filters.state);
    }

    if (filters.city) {
      query = query.ilike("location->>city", filters.city);
    }

    if (filters.query) {
      query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
    }

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[FeedService] Error fetching feed:", error);
      throw error;
    }

    if (!data) return [];

    // Mapear para o formato FeedPostData e resolver identidades em paralelo
    const posts: FeedPostData[] = await Promise.all(
      data.map(async (row) => {
        const author = await resolveIdentity(row.author_id);
        return {
          id: row.id,
          type: row.type as FeedPostType,
          category: row.category as FeedCategory,
          authorId: row.author_id,
          author,
          title: row.title,
          description: row.description,
          price: row.price,
          location: row.location || {},
          media: row.media || [],
          metadata: row.metadata || {},
          createdAt: row.created_at,
          status: row.status,
          urgency: (row.metadata?.urgency || "normal") as FeedPostData["urgency"],
        };
      })
    );

    return posts;
  }

  /**
   * Escuta novos posts em tempo real para um canal específico.
   */
  subscribeToFeed(callback: (post: FeedPostData) => void) {
    return supabaseExternal
      .channel("public:feed_posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feed_posts" },
        async (payload) => {
          const row = payload.new;
          if (row.status === "ativo") {
            const author = await resolveIdentity(row.author_id);
            callback({
              id: row.id,
              type: row.type as FeedPostType,
              category: row.category as FeedCategory,
              authorId: row.author_id,
              author,
              title: row.title,
              description: row.description,
              price: row.price,
              location: row.location || {},
              media: row.media || [],
              metadata: row.metadata || {},
              createdAt: row.created_at,
              status: row.status,
              urgency: (row.metadata?.urgency || "normal") as FeedPostData["urgency"],
            });
          }
        }
      )
      .subscribe();
  }
}

export const feedService = new FeedService();
