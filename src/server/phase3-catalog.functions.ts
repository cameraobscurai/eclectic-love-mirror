import { createServerFn } from "@tanstack/react-start";
import { getCatalogPayload, type CatalogPayload } from "./phase3-catalog.server";

export const getCollectionCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogPayload> => getCatalogPayload(),
);
