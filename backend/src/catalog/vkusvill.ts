// VkusvillCatalogProvider — backed by VkusVill's official MCP server. Returns
// real products with composition, price (₽), real photos, and rating.
//
// This is the production source for Russia: VkusVill published these product
// tools for AI developers and they are public (no OAuth). On any network/parse
// failure we fall back to the offline mock so the app never hard-fails.

import type { CatalogProduct, RestrictionId } from "@foodguard/shared";
import type { CatalogProvider, CatalogSearchFilters } from "./types";
import { MockCatalogProvider } from "./mock";
import { callVkusvillTool } from "./vkusvillMcp";

// Append "без X" hints so VkusVill surfaces dietary products (безлактозный,
// безглютеновый, растительный аналог …) that will survive the composition filter.
const EXCLUDE_HINT: Record<RestrictionId, string> = {
  milk: "без лактозы", gluten: "без глютена", nuts: "без орехов",
  peanut: "без арахиса", egg: "без яиц", soy: "без сои", fish: "без рыбы",
  seafood: "без морепродуктов", honey: "без мёда", sugar: "без сахара",
};
const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");

/** Extract a clean category word from an incoming category/product-name string.
 *  "Сметана 20% классическая" -> "сметана", "Печенье овсяное" -> "печенье". */
function categoryWord(input: string): string {
  const w = norm(input).split(/[^а-яa-z]+/).find((x) => x.length >= 3);
  return w || norm(input).trim() || "продукты";
}

function buildQuery(word: string, excludeAllergens?: RestrictionId[]): string {
  const ex = excludeAllergens ?? [];
  const dairy = DAIRY.some((d) => word.startsWith(d));
  // Dairy category + milk excluded: "растительный <category>" surfaces the plant
  // alternatives (VkusVill ranks these far better with the hint leading).
  if (dairy && ex.includes("milk")) return `растительный ${word}`.trim();
  // Otherwise prefer a non-milk dietary hint (e.g. gluten) after the category.
  const hints = ex.map((a) => EXCLUDE_HINT[a]).filter(Boolean);
  const primary = hints.find((h) => h !== EXCLUDE_HINT.milk) ?? hints[0];
  return [word, primary].filter(Boolean).join(" ").trim();
}

// Dairy categories: their plant substitutes are named "Продукт/Десерт/Напиток
// кокосовый/овсяный/соевый…" — WITHOUT the category word — so accept those forms.
const DAIRY = ["молок", "сметан", "сливк", "йогур", "кефир", "творог", "твор", "сыр", "ряженк", "просток"];
const PLANT_FORMS = [
  "продукт кокос", "продукт овсян", "продукт соев", "продукт миндал", "продукт рисов",
  "десерт кокос", "десерт овсян", "десерт соев",
  "напиток кокос", "напиток овсян", "напиток миндал", "напиток соев", "напиток рисов", "напиток растительн",
  "moloko",
];
function relevanceTerms(word: string): string[] {
  const stem = word.slice(0, Math.min(6, Math.max(4, word.length)));
  const terms = [stem];
  if (word.startsWith("сыр") || word.startsWith("твор")) terms.push("тофу");
  if (DAIRY.some((d) => word.startsWith(d))) terms.push(...PLANT_FORMS);
  return terms;
}

interface VvProperty { name: string; value: string }
interface VvItem {
  id: number; xml_id: number; name: string;
  price?: { current?: number }; unit?: string; url?: string;
  properties?: VvProperty[];
  images?: Array<Record<string, string>>;
}

function decode(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "; ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const COMPANY = /\b(ООО|ОАО|ЗАО|АО|ИП|ПАО)\b|производител/i;

function compositionOf(item: VvItem): string[] {
  const prop = item.properties?.find((p) => /состав/i.test(p.name));
  if (!prop?.value) return [];
  return decode(prop.value)
    .split(/[;,]/)
    .map((s) => s.replace(/^[^:]{1,40}:/, "").trim()) // drop "Производитель Х:" prefixes
    .filter((s) => s.length > 1 && !COMPANY.test(s));
}

function imageOf(item: VvItem): string | undefined {
  const img = item.images?.[0];
  if (!img) return undefined;
  return img.medium || img.large || img.small || Object.values(img)[0];
}

function toProduct(item: VvItem, category: string, image?: string): CatalogProduct {
  return {
    id: String(item.xml_id ?? item.id),
    name: decode(item.name),
    category,
    priceRub: Math.round(item.price?.current ?? 0),
    imageUrl: image ?? imageOf(item) ?? `/api/img/${encodeURIComponent(decode(item.name).slice(0, 16))}`,
    ingredients: compositionOf(item),
    url: item.url,
  };
}

export class VkusvillCatalogProvider implements CatalogProvider {
  readonly name = "vkusvill";
  private fallback = new MockCatalogProvider();

  async searchByCategory(category: string, filters?: CatalogSearchFilters): Promise<CatalogProduct[]> {
    const limit = 10; // fetch a full page, then relevance-filter down
    const word = categoryWord(category);
    try {
      const res = await callVkusvillTool<{ ok: boolean; data: { items: VvItem[] } }>(
        "vkusvill_products_search",
        { q: buildQuery(word, filters?.excludeAllergens), limit, sort: "popularity" },
      );
      const items = res?.data?.items ?? [];
      if (!items.length) return [];

      // Keep only items of the same category/type (kills "сметана → вафли").
      const terms = relevanceTerms(word);
      const relevant = (word === "продукты")
        ? items
        : items.filter((it) => { const n = norm(decode(it.name)); return terms.some((t) => n.includes(t)); });
      const picked = relevant.slice(0, filters?.limit ?? 8);

      // Search items carry composition but not images; enrich with details for photos.
      const enriched = await Promise.all(
        picked.map(async (it) => {
          if (imageOf(it)) return toProduct(it, word);
          try {
            const d = await callVkusvillTool<{ data: VvItem }>("vkusvill_product_details", { id: it.id });
            return toProduct(it, word, imageOf(d.data));
          } catch { return toProduct(it, word); }
        }),
      );
      return enriched;
    } catch {
      return this.fallback.searchByCategory(category, filters);
    }
  }

  async getProduct(id: string): Promise<CatalogProduct | null> {
    const numId = Number(id);
    if (!Number.isFinite(numId)) return this.fallback.getProduct(id);
    try {
      const res = await callVkusvillTool<{ data: VvItem & { category?: { name?: string } } }>(
        "vkusvill_product_details", { id: numId },
      );
      if (!res?.data) return null;
      return toProduct(res.data, res.data.category?.name ?? "");
    } catch {
      return this.fallback.getProduct(id);
    }
  }
}

/** Barcode lookup via VkusVill (EAN-13). Returns composition + name + image, or null. */
export async function vkusvillByBarcode(barcode: string): Promise<{ productName?: string; imageUrl?: string; ingredients: string[] } | null> {
  if (!/^\d{13}$/.test(barcode)) return null;
  try {
    const res = await callVkusvillTool<{ ok: boolean; data: VvItem }>("vkusvill_product_barcode", { barcode });
    const item = res?.data;
    if (!item) return null;
    return { productName: decode(item.name), imageUrl: imageOf(item), ingredients: compositionOf(item) };
  } catch {
    return null;
  }
}
