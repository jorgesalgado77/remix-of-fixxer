import { supabaseExternal } from "./supabaseExternal";
import { isChannelEnabled, type NotifEventKey } from "./notification-prefs";

export interface NotificationPayload {
  owner_id: string;
  sender_id?: string;
  type: "info" | "success" | "warning" | "danger" | "chat" | "system";
  event_key: NotifEventKey;
  title: string;
  content: string;
  link?: string;
  metadata?: Record<string, any>;
}

class NotificationService {
  /**
   * Envia uma notificação real persistida no banco.
   * Verifica as preferências do usuário antes de inserir.
   */
  async notify(payload: NotificationPayload) {
    try {
      // 1. Verificar se o usuário aceita este tipo de notificação no canal in-app
      const enabled = await isChannelEnabled(payload.event_key, "inapp");
      if (!enabled) return { success: false, reason: "disabled_by_user" };

      // 2. Persistir no banco
      const { data, error } = await supabaseExternal
        .from("notifications")
        .insert([
          {
            owner_id: payload.owner_id,
            sender_id: payload.sender_id,
            type: payload.type,
            event_key: payload.event_key,
            title: payload.title,
            content: payload.content,
            link: payload.link,
            metadata: payload.metadata || {},
          },
        ])
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, data };
    } catch (err) {
      console.error("[NotificationService] Erro ao enviar notificação:", err);
      return { success: false, error: err };
    }
  }

  /**
   * Marca uma notificação específica como lida.
   */
  async markAsRead(notificationId: string) {
    const { error } = await supabaseExternal
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);
    
    return { success: !error, error };
  }

  /**
   * Marca todas as notificações do usuário como lidas.
   */
  async markAllAsRead(userId: string) {
    const { error } = await supabaseExternal
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("owner_id", userId)
      .is("read_at", null);
    
    return { success: !error, error };
  }
}

export const notificationService = new NotificationService();
