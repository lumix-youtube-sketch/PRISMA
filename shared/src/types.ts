// Shared API contract between frontend and backend.

export type RestrictionId =
  | "gluten" | "milk" | "nuts" | "peanut" | "egg"
  | "soy" | "fish" | "seafood" | "honey" | "sugar";

export interface Profile {
  id?: number;
  name: string;                 // "Me", "Child", "Grandma"
  restrictions: RestrictionId[];
  custom?: string;              // free-text restriction
}

export type Verdict = "safe" | "caution" | "unsafe"; // МОЖНО / ОСТОРОЖНО / НЕЛЬЗЯ

export interface Hit {
  ingredient: string;
  matchedRestriction: string;
  reason: string;
}

export interface ProfileResult {
  profileName: string;
  verdict: Verdict;
  hits: Hit[];
  explanation: string;          // facts only, no health advice
}

export interface AnalyzeRequest { ingredients: string[]; profiles: Profile[] }
export interface AnalyzeResponse { results: ProfileResult[]; disclaimer: string }

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  priceRub: number;
  imageUrl: string;
  ingredients: string[];
  url?: string; // link to the product page (e.g. VkusVill), if available
}

export const DISCLAIMER =
  "Это не медицинская рекомендация. При сомнениях — обратитесь к врачу.";
