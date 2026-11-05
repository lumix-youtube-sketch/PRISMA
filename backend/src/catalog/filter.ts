// Product-vs-profile filtering. Shared by substitutions and chat, kept OUTSIDE
// any CatalogProvider so the matching logic stays provider-independent.
//
// A product is "safe" for a set of restrictions when the deterministic allergen
// matcher finds no hit in its ingredient list. This is the same dictionary used
// for verdicts, so substitutions are consistent with how products are judged.

import type { CatalogProduct, RestrictionId } from "@foodguard/shared";
import { matchIngredients, normalize } from "@foodguard/shared";

export interface SafetyCheck {
  safe: boolean;
  violated: RestrictionId[];
}

export function checkProduct(
  product: CatalogProduct,
  excludeAllergens: RestrictionId[],
  excludeCustom?: string,
): SafetyCheck {
  const hits = matchIngredients(product.ingredients, excludeAllergens);
  const violated = [...new Set(hits.map((h) => h.restriction))];

  if (excludeCustom) {
    const needle = normalize(excludeCustom);
    if (needle && product.ingredients.some((i) => normalize(i).includes(needle))) {
      // Represent a custom-restriction violation without a RestrictionId by
      // marking the product unsafe; callers surface `excludeCustom` separately.
      return { safe: false, violated };
    }
  }
  return { safe: violated.length === 0, violated };
}

/** Keep only products that violate none of the given restrictions. */
export function filterSafe(
  products: CatalogProduct[],
  excludeAllergens: RestrictionId[],
  excludeCustom?: string,
): CatalogProduct[] {
  return products.filter((p) => checkProduct(p, excludeAllergens, excludeCustom).safe);
}
