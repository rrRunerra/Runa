import { PROVIDERS_METADATA, ConnectionCapability } from "@runa/connections/metadata";

export interface ConnectionProviderUI {
  key: string;
  name: string;
  capabilities: ConnectionCapability[];
  search?(query: string, type: "ANIME" | "MANGA" | "MOVIES" | "TV_SHOWS"): Promise<any[]>;
}

export const BASE_CONNECTION_PROVIDERS: ConnectionProviderUI[] = PROVIDERS_METADATA.map((prov) => ({
  key: prov.id,
  name: prov.name,
  capabilities: prov.capabilities,
  search: prov.search,
}));

export { ConnectionCapability };
