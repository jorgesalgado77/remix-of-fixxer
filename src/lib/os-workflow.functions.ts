import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { transitionStatus, acceptProposalServer } from "./os-workflow.server";

export const transitionOSStatus = createServerFn({ method: "POST" })
  .inputValidator((data) => 
    z.object({
      osId: z.string().uuid(),
      newStatus: z.string(),
      notes: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    return transitionStatus(data.osId, data.newStatus, data.notes);
  });

export const acceptProposal = createServerFn({ method: "POST" })
  .inputValidator((data) => 
    z.object({
      proposalId: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    return acceptProposalServer(data.proposalId);
  });
