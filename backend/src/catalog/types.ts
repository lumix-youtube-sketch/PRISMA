// Catalog abstraction. The source of product cards (photo + price + composition)
// used for substitutions and chat search sits behind this interface so it can be
// swapped without touching callers.
//
// Prototype source is VkusVill (its cards expose photo/price/composition). In
// production this is replaced by an official partner feed (Kuper / an aggregator)
// that licenses images, price and availability — see VkusvillCatalogProvider.

import type { CatalogProduct, RestrictionId } from "@foodguard/shared";

export interface CatalogSearchFilters {
  /** Restrictions the returned products must NOT violate (checked by the shared filter). */
  excludeAllergens?: RestrictionId[];
  /** Free-text custom restriction to also avoid (best-effort substring). */
  excludeCustom?: string;
  limit?: number;
}

export interface CatalogProvider {
  readonly name: string;
  /** Products in a category (e.g. "сыр", "молоко", "печенье"). Filtering by
   *  allergens is applied by the caller via the shared filter, not here —
   *  the provider only needs to return candidates for the category. */
  searchByCategory(category: string, filters?: CatalogSearchFilters): Promise<CatalogProduct[]>;
  getProduct(id: string): Promise<CatalogProduct | null>;
}
