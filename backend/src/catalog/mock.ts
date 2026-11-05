// MockCatalogProvider — 15 hardcoded products so the whole demo (substitutions,
// chat) works with zero network dependency and lets us develop without the real
// source. Covers several categories with both allergen-containing and
// allergen-free variants, so the filter has something to keep and something to
// drop.
//
// Images point at the backend's own /api/img/:seed SVG placeholder so cards
// render offline. In production these become licensed photos from the partner feed.

import type { CatalogProduct } from "@foodguard/shared";
import type { CatalogProvider, CatalogSearchFilters } from "./types";

const img = (seed: string) => `/api/img/${encodeURIComponent(seed)}`;

export const MOCK_PRODUCTS: CatalogProduct[] = [
  // --- сыр ---
  { id: "cheese-1", name: "Сыр Гауда", category: "сыр", priceRub: 189, imageUrl: img("gauda"),
    ingredients: ["молоко нормализованное", "соль", "закваска", "фермент", "хлорид кальция"] },
  { id: "cheese-2", name: "Сыр Чеддер", category: "сыр", priceRub: 219, imageUrl: img("cheddar"),
    ingredients: ["молоко", "соль", "сычужный фермент", "краситель аннато"] },
  { id: "cheese-3", name: "Тофу классический (растительный «сыр»)", category: "сыр", priceRub: 149, imageUrl: img("tofu"),
    ingredients: ["соевые бобы", "вода", "коагулянт (сульфат кальция)"] },
  { id: "cheese-4", name: "Сыр из кешью безлактозный", category: "сыр", priceRub: 329, imageUrl: img("cashew-cheese"),
    ingredients: ["орехи кешью", "вода", "соль", "лимонный сок", "кокосовое масло"] },

  // --- молоко ---
  { id: "milk-1", name: "Молоко 3.2%", category: "молоко", priceRub: 89, imageUrl: img("milk"),
    ingredients: ["молоко цельное нормализованное"] },
  { id: "milk-2", name: "Молоко безлактозное 2.5%", category: "молоко", priceRub: 119, imageUrl: img("lactfree-milk"),
    ingredients: ["молоко нормализованное", "фермент лактаза"] }, // still dairy: milk allergic unsafe, lactose-intolerant ok — verdict layer nuances this
  { id: "milk-3", name: "Напиток овсяный", category: "молоко", priceRub: 139, imageUrl: img("oat-milk"),
    ingredients: ["вода", "овсяная крупа", "масло подсолнечное", "соль"] }, // gluten via oats
  { id: "milk-4", name: "Напиток кокосовый", category: "молоко", priceRub: 159, imageUrl: img("coconut-milk"),
    ingredients: ["вода", "кокосовое молоко", "стабилизатор"] },

  // --- печенье ---
  { id: "cookie-1", name: "Печенье овсяное", category: "печенье", priceRub: 99, imageUrl: img("oat-cookie"),
    ingredients: ["мука пшеничная", "овсяные хлопья", "сахар", "масло сливочное", "яйцо", "сода"] },
  { id: "cookie-2", name: "Печенье кукурузное безглютеновое", category: "печенье", priceRub: 179, imageUrl: img("corn-cookie"),
    ingredients: ["мука кукурузная", "мука рисовая", "сахар", "масло растительное"] },
  { id: "cookie-3", name: "Печенье песочное с арахисом", category: "печенье", priceRub: 129, imageUrl: img("peanut-cookie"),
    ingredients: ["мука пшеничная", "сахар", "арахис", "масло сливочное", "яичный порошок"] },

  // --- хлеб ---
  { id: "bread-1", name: "Хлеб пшеничный", category: "хлеб", priceRub: 59, imageUrl: img("wheat-bread"),
    ingredients: ["мука пшеничная", "вода", "дрожжи", "соль", "солод"] },
  { id: "bread-2", name: "Хлеб гречневый безглютеновый", category: "хлеб", priceRub: 189, imageUrl: img("buckwheat-bread"),
    ingredients: ["мука гречневая", "мука рисовая", "вода", "дрожжи", "соль", "псиллиум"] },

  // --- йогурт ---
  { id: "yogurt-1", name: "Йогурт натуральный 3.2%", category: "йогурт", priceRub: 69, imageUrl: img("yogurt"),
    ingredients: ["молоко", "сливки", "закваска"] },
  { id: "yogurt-2", name: "Йогурт кокосовый растительный", category: "йогурт", priceRub: 149, imageUrl: img("coconut-yogurt"),
    ingredients: ["кокосовое молоко", "вода", "загуститель (пектин)", "живые культуры"] },
];

export class MockCatalogProvider implements CatalogProvider {
  readonly name = "mock";

  async searchByCategory(category: string, filters?: CatalogSearchFilters): Promise<CatalogProduct[]> {
    const cat = category.trim().toLowerCase();
    const matches = MOCK_PRODUCTS.filter(
      (p) => p.category.toLowerCase() === cat || p.name.toLowerCase().includes(cat),
    );
    const list = matches.length ? matches : MOCK_PRODUCTS;
    return filters?.limit ? list.slice(0, filters.limit) : list;
  }

  async getProduct(id: string): Promise<CatalogProduct | null> {
    return MOCK_PRODUCTS.find((p) => p.id === id) ?? null;
  }
}
