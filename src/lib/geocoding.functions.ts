import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

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
        query = data.cep;
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

      if (!query) return null;

      const url = new URL(NOMINATIM_URL);
      url.searchParams.append("q", query);
      url.searchParams.append("format", "json");
      url.searchParams.append("limit", "1");
      url.searchParams.append("countrycodes", "br");

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "FixxerHub-App/1.0"
        }
      });

      if (!response.ok) {
        throw new Error("Nominatim API error");
      }

      const results = await response.json();
      if (results && results.length > 0) {
        return {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
          display_name: results[0].display_name
        };
      }

      return null;
    } catch (error) {
      console.error("[Geocoding] Error:", error);
      return null;
    }
  });
