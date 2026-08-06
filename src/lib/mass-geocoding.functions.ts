import { createServerFn } from "@tanstack/react-start";
import { supabaseExternal } from "./supabaseExternal";
import { geocodeAddress } from "./geocoding.functions";

export const syncAllUsersCoordinates = createServerFn({ method: "POST" })
  .handler(async () => {
    console.log("[MassGeocoding] Iniciando varredura de usuários...");
    
    // 1. Buscar todos os usuários que têm endereço mas não têm coordenadas
    // Ou simplesmente todos para garantir atualização
    const { data: users, error } = await supabaseExternal
      .from('profiles')
      .select('id, street, number, neighborhood, city, state, cep, lat, lng');

    if (error) {
      console.error("[MassGeocoding] Erro ao buscar usuários:", error);
      return { success: false, error: error.message };
    }

    if (!users || users.length === 0) {
      return { success: true, updated: 0 };
    }

    let updatedCount = 0;
    const errors = [];

    for (const user of users) {
      // Se já tem coordenadas e não queremos forçar, poderíamos pular
      // Mas o pedido é "garanta que todos recebam corretamente"
      
      const address = {
        street: user.street,
        number: user.number,
        neighborhood: user.neighborhood,
        city: user.city,
        state: user.state,
        cep: user.cep
      };

      // Só geocodifica se tiver o mínimo de informação
      if (!address.cep && !address.city) continue;

      try {
        const geo = await geocodeAddress({ data: address });
        
        // Log para debug local
        console.log(`[MassGeocoding] Tentando geocodificar user ${user.id}:`, address);
        
        if (geo) {
          // Se as coordenadas mudaram ou se o usuário não tinha coordenadas (lat/lng null)
          const isChanged = geo.lat !== user.lat || geo.lng !== user.lng;
          const isNew = user.lat === null || user.lng === null;
          
          if (isChanged || isNew) {
          const { error: updateError } = await supabaseExternal
            .from('profiles')
            .update({
              lat: geo.lat,
              lng: geo.lng
            })
            .eq('id', user.id);

          if (updateError) {
            errors.push(`Erro user ${user.id}: ${updateError.message}`);
          } else {
            updatedCount++;
            console.log(`[MassGeocoding] Usuário ${user.id} atualizado: ${geo.lat}, ${geo.lng}`);
          }
        }
      } catch (e) {
        errors.push(`Falha geocodificação user ${user.id}`);
      }
      
      // Delay pequeno para não estourar rate limit do Nominatim (1 req/s recomendado)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { 
      success: true, 
      total: users.length, 
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  });
