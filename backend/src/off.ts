// Open Food Facts proxy: barcode -> composition + photo. No API key required.
// Results are cached in SQLite so repeat scans are instant and offline-friendly.

import { cacheRepo } from "./db";
import { vkusvillByBarcode } from "./catalog/vkusvill";

const OFF_URL = (barcode: string) =>
  `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
  `?fields=product_name,product_name_ru,image_front_url,image_url,ingredients_text,ingredients_text_ru,ingredients`;

export interface ProductLookup {
  found: boolean;
  barcode: string;
  productName?: string;
  imageUrl?: string;
  ingredients: string[];
  source: "cache" | "off" | "crowd";
}

/** Split an OFF ingredients_text blob into individual ingredients. */
function splitIngredients(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/\([^)]*\)/g, (m) => m.replace(/,/g, ";")) // keep nested lists together
    .split(/[,;•\n]/)
    .map((s) => s.replace(/[_*]/g, "").trim())
    .filter((s) => s.length > 1);
}

export async function lookupBarcode(barcode: string): Promise<ProductLookup> {
  const cached = cacheRepo.get(barcode);
  if (cached) {
    return {
      found: cached.ingredients.length > 0 || Boolean(cached.productName),
      barcode,
      productName: cached.productName,
      imageUrl: cached.imageUrl,
      ingredients: cached.ingredients,
      source: cached.source === "crowd" ? "crowd" : "cache",
    };
  }

  // 1) Open Food Facts (any brand, global).
  try {
    const res = await fetch(OFF_URL(barcode), {
      headers: { "User-Agent": "FoodGuard/0.1 (telegram mini app; demo)" },
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name: string | undefined = p.product_name_ru || p.product_name || undefined;
        const image: string | undefined = p.image_front_url || p.image_url || undefined;
        const fromStructured: string[] = Array.isArray(p.ingredients)
          ? p.ingredients.map((i: any) => String(i.text ?? "").trim()).filter(Boolean)
          : [];
        const ingredients = fromStructured.length
          ? fromStructured
          : splitIngredients(p.ingredients_text_ru || p.ingredients_text);
        if (ingredients.length > 0) {
          cacheRepo.put(barcode, { productName: name, imageUrl: image, ingredients, source: "off" });
          return { found: true, barcode, productName: name, imageUrl: image, ingredients, source: "off" };
        }
      }
    }
  } catch { /* fall through to VkusVill */ }

  // 2) VkusVill official catalog (Russia) — great for RU products OFF misses.
  const vv = await vkusvillByBarcode(barcode);
  if (vv && (vv.ingredients.length > 0 || vv.productName)) {
    cacheRepo.put(barcode, { productName: vv.productName, imageUrl: vv.imageUrl, ingredients: vv.ingredients, source: "off" });
    return { found: true, barcode, productName: vv.productName, imageUrl: vv.imageUrl, ingredients: vv.ingredients, source: "off" };
  }

  return { found: false, barcode, ingredients: [], source: "off" };
}
