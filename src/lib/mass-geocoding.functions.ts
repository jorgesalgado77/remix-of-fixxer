import { createServerFn } from "@tanstack/react-start";
import { supabaseExternal } from "./supabaseExternal";
import { geocodeAddress } from "./geocoding.functions";

export const syncAllUsersCoordinates = createServerFn({ method: "POST" })
  .handler(async () => {
    console.log("[MassGeocoding] Iniciando varredura de usuários...");
    
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
      const address = {
        street: user.street,
        number: user.number,
        neighborhood: user.neighborhood,
        city: user.city,
        state: user.state,
        cep: user.cep
      };

      if (!address.cep && !address.city) continue;

      try {
        const geo = await geocodeAddress({ data: address });
        console.log(`[MassGeocoding] Resultado para user ${user.id}:`, geo);
        
        if (geo) {
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
        }
      } catch (e) {
        errors.push(`Falha geocodificação user ${user.id}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { 
      success: true, 
      total: users.length, 
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  });
