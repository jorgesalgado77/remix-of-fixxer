import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transitionOSStatus, acceptProposal } from "@/lib/os-workflow.functions";
import { toast } from "sonner";

export function useOSWorkflow() {
  const queryClient = useQueryClient();
  const transitionFn = useServerFn(transitionOSStatus);
  const acceptFn = useServerFn(acceptProposal);

  const transitionMutation = useMutation({
    mutationFn: transitionFn,
    onSuccess: (data: any) => {
      if (data?.ok) {
        toast.success(`Status alterado para ${data.to}`);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["provider-stats"] });
      } else {
        toast.error(data?.error || "Erro ao transicionar status");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro de conexão ao transicionar status");
    }
  });

  const acceptMutation = useMutation({
    mutationFn: acceptFn,
    onSuccess: (data: any) => {
      if (data?.ok) {
        toast.success("Proposta aceita com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["proposals"] });
      } else {
        toast.error(data?.error || "Erro ao aceitar proposta");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro de conexão ao aceitar proposta");
    }
  });

  return {
    transitionStatus: transitionMutation.mutate,
    isTransitioning: transitionMutation.isPending,
    acceptProposal: acceptMutation.mutate,
    isAccepting: acceptMutation.isPending,
  };
}
