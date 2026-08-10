import { createClient } from "@supabase/supabase-js";

// Usando service_role no servidor para bypass de RLS e validações de workflow
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);


export async function transitionStatus(osId: string, newStatus: string, notes?: string) {
  const { data, error } = await supabaseAdmin.rpc("transition_os_status", {
    _os_id: osId,
    _new_status: newStatus,
    _notes: notes || null,
  });

  if (error) {
    console.error("[workflow.server] transitionStatus error:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function acceptProposalServer(proposalId: string) {
  const { data, error } = await supabaseAdmin.rpc("accept_proposal", {
    _proposal_id: proposalId,
  });

  if (error) {
    console.error("[workflow.server] acceptProposal error:", error);
    throw new Error(error.message);
  }

  return data;
}
