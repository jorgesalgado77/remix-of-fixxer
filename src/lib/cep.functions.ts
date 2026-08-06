import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAddressByCep = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ cep: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const cleanCep = data.cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return null;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) return null;
      
      const result = await response.json();
      if (result.erro) return null;

      return {
        street: result.logradouro,
        neighborhood: result.bairro,
        city: result.localidade,
        state: result.uf,
      };
    } catch (error) {
      console.error("[ViaCEP] Error:", error);
      return null;
    }
  });
