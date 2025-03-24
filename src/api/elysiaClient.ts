import { edenTreaty } from "@elysiajs/eden";
import { type ApiType } from "@glowlabs-org/crm-bindings";
export const elysiaClient = edenTreaty<ApiType>(
  "http://gca-crm-backend-production-1f2a.up.railway.app/"
);
