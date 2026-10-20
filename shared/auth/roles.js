import { z } from "zod";

export const assignableRoles = [
  { value: "comite", label: "Comité", description: "Permite consultar y descargar Formatos IAP." }
];
export const userRolesSchema = z.object({
  id: z.string().uuid(),
  roles: z.array(z.enum(["comite"])).max(assignableRoles.length)
    .refine(roles => new Set(roles).size === roles.length, "No repitas roles.")
}).strict();

export function hasCommitteeRole(guardian) {
  return guardian?.role === "comite" || guardian?.roles?.includes("comite") === true;
}
