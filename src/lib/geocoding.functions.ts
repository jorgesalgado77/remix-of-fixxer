import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Cache em memória no servidor para evitar chamadas repetidas ao Nominatim no mesmo processo
const geoCache = new Map<string, { lat: number, lng: number, display_name: string }>();

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
        const geoData = {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
          display_name: results[0].display_name
        };
        // Guardar no cache
        geoCache.set(cacheKey, geoData);
        return geoData;
      }

      // Se falhou com endereço completo, tenta apenas com Cidade/Estado como fallback
      if (data.cep && (data.city || data.state)) {
        console.log("[Geocoding] Retrying with city/state fallback...");
        const fallbackQuery = [data.city, data.state, "Brasil"].filter(Boolean).join(", ");
        url.searchParams.set("q", fallbackQuery);
        const fbRes = await fetch(url.toString(), { headers: { "User-Agent": "FixxerHub-App/1.0" } });
        if (fbRes.ok) {
          const fbResults = await fbRes.json();
          if (fbResults && fbResults.length > 0) {
             return {
              lat: parseFloat(fbResults[0].lat),
              lng: parseFloat(fbResults[0].lon),
              display_name: fbResults[0].display_name
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error("[Geocoding] Error:", error);
      return null;
    }
  });
