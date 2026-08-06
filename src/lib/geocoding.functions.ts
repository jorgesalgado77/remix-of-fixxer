import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Cache em memória no servidor para evitar chamadas repetidas ao Nominatim no mesmo processo
const geoCache = new Map<string, { lat: number, lng: number, display_name: string }>();

export const isValidCoordinate = (lat: number | null | undefined, lng: number | null | undefined) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  // Brasil está aproximadamente entre Lat: 5N a 33S e Lng: 35W a 74W
  // Uma faixa segura global para evitar coordenadas inválidas
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
};

export const geocodeAddress = createServerFn({ method: "GET" })
  .inputValidator((data) => 
    z.object({
      street: z.string().optional(),
      number: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      cep: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    try {
      // Prioridade: CEP é o mais preciso
      let query = "";
      if (data.cep) {
        query = data.cep.replace(/\D/g, ''); // Normaliza CEP para busca
      } else {
        const parts = [
          data.street,
          data.number,
          data.neighborhood,
          data.city,
          data.state,
          "Brasil"
        ].filter(Boolean);
        query = parts.join(", ");
      }

      if (!query || query.length < 3) return null;

      // Verificar Cache
      const cacheKey = query.toLowerCase().trim();
      if (geoCache.has(cacheKey)) {
        console.log("[Geocoding] Serving from cache:", cacheKey);
        return geoCache.get(cacheKey);
      }

      console.log("[Geocoding] Calling Nominatim for:", query);
      const url = new URL(NOMINATIM_URL);
      url.searchParams.append("q", query);
      url.searchParams.append("format", "json");
      url.searchParams.append("limit", "1");
      url.searchParams.append("countrycodes", "br");

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "FixxerHub-App/1.0 (contact@fixxer.app)"
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("[Geocoding] Nominatim Rate Limit reached");
          return null;
        }
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const results = await response.json();
      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        
        if (isValidCoordinate(lat, lng)) {
          const geoData = {
            lat,
            lng,
            display_name: results[0].display_name
          };
          // Guardar no cache
          geoCache.set(cacheKey, geoData);
          return geoData;
        }
      }

      // Se falhou com endereço completo, tenta apenas com Cidade/Estado como fallback
      // Fallback disparado se houver algo além de apenas cidade/estado (ex: CEP ou rua) 
      // ou se a primeira busca exata falhou.
      if ((data.cep || data.street) && (data.city || data.state)) {
        console.log("[Geocoding] Retrying with city/state fallback...");
        const fallbackQuery = [data.city, data.state, "Brasil"].filter(Boolean).join(", ");
        
        // Verifica cache do fallback primeiro
        const fbCacheKey = fallbackQuery.toLowerCase().trim();
        if (geoCache.has(fbCacheKey)) return geoCache.get(fbCacheKey);

        url.searchParams.set("q", fallbackQuery);
        const fbRes = await fetch(url.toString(), { headers: { "User-Agent": "FixxerHub-App/1.0" } });
        if (fbRes.ok) {
          const fbResults = await fbRes.ok ? await fbRes.json() : [];
          if (fbResults && fbResults.length > 0) {
            const lat = parseFloat(fbResults[0].lat);
            const lng = parseFloat(fbResults[0].lon);
            if (isValidCoordinate(lat, lng)) {
              const fbData = {
                lat,
                lng,
                display_name: fbResults[0].display_name
              };
              geoCache.set(fbCacheKey, fbData);
              return fbData;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error("[Geocoding] Error:", error);
      return null;
    }
  });