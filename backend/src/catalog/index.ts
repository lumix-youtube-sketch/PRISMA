// Catalog provider selection via config. Callers import `catalog` and never know
// which concrete source is behind it.

import { config } from "../config";
import type { CatalogProvider } from "./types";
import { MockCatalogProvider } from "./mock";
import { VkusvillCatalogProvider } from "./vkusvill";

export const catalog: CatalogProvider =
  config.catalogProvider === "vkusvill" ? new VkusvillCatalogProvider() : new MockCatalogProvider();

export type { CatalogProvider, CatalogSearchFilters } from "./types";
export { checkProduct, filterSafe } from "./filter";
