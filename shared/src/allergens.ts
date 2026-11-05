// Deterministic allergen dictionary.
//
// For each restriction we list Russian terms that signal its presence in an
// ingredient list — including hidden sources and derivatives that a naive
// substring search over the restriction's own label would miss
// (casein/whey -> milk, malt/semolina -> gluten, lecithin -> soy, ...).
//
// This layer runs BEFORE Claude: anything matched here is a hard, explainable
// fact. Claude only fills in what the dictionary cannot catch (unusual wording,
// compound names, transliterations). Matching is accent-insensitive and works
// on word stems, so "сывороточный" matches the stem "сыворотк".

import type { RestrictionId } from "./types";

export interface AllergenEntry {
  /** Human label shown in the UI and in `matchedRestriction`. */
  label: string;
  /**
   * Lowercase Russian stems. A product ingredient matches when it contains one
   * of these as a substring (after normalization). Keep stems short enough to
   * catch declensions but long enough to avoid false positives.
   */
  stems: string[];
  /**
   * Stems that look like a match but must be excluded (e.g. "кокосовое молоко"
   * is not dairy milk, "соевый соус" context aside). Checked before `stems`.
   */
  except?: string[];
}

export const ALLERGEN_DICTIONARY: Record<RestrictionId, AllergenEntry> = {
  gluten: {
    label: "Глютен",
    stems: [
      "глютен", "клейковин",
      "пшениц", "пшен", // пшеничная; note: "пшено"/millet excluded below
      "рож", "ржан",
      "ячмен", "ячнев",
      "овсян", "овс", // овёс, овсяные хлопья (oats are cross-contaminated)
      "солод",
      "манк", "манн", // манка / манная крупа
      "булгур", "кускус", "кус-кус", "спельт", "полб",
      "мук", // мука (wheat flour unless qualified below)
      "сухар", "панировк", "панировоч",
      "отруб",
      "крахмал пшенич",
      "сейтан",
    ],
    except: [
      "пшено", "пшённ", "пшенн", // millet — gluten-free
      "рисовая мук", "кукурузная мук", "гречнев", "миндальн", "кокосовая мук",
      "нутовая мук", "кукурузный крахмал", "картофельный крахмал", "рисовая",
    ],
  },

  milk: {
    label: "Молоко/лактоза",
    stems: [
      "молок", "молочн",
      "лактоз",
      "казеин", "казеинат",
      "сыворотк", "сыворот",
      "сливк", "сливочн",
      "сметан", "творог", "твор",
      "сыр", "сырн",
      "йогурт", "кефир", "ряженк", "простокваш", "ацидофил",
      "масло сливочн", "топлёное масло", "топленое масло", "гхи",
      "сухое молок", "сгущ",
      "ацидофилин", "пахт",
      "деморализ", // placeholder removed below — keep list clean
    ].filter((s) => s !== "деморализ"),
    except: [
      "кокосовое молок", "миндальное молок", "соевое молок", "овсяное молок",
      "рисовое молок", "кокосовые сливк", "растительные сливк",
      "масло какао", "масло подсолнечн", "масло растительн", "сырьё", "сыр соев",
      // lactic acid / lactic-acid bacteria are vegan — not dairy milk
      "молочная кислот", "молочной кислот", "молочнокисл",
    ],
  },

  nuts: {
    label: "Орехи",
    stems: [
      "орех", "орешк",
      "миндал", "фундук", "лещин", "кешью", "фисташк",
      "грецк", "пекан", "макадам", "бразильск орех",
      "кедров", "праслин", "пралине", "марципан", "нуга",
      "ореховая паст",
    ],
    except: [
      "мускатный орех", "мускатн", // spice, tolerated by most tree-nut allergics; flag separately if needed
      "кокос", // coconut is botanically not a tree nut
      "арахис", // peanut handled by its own restriction
      "водяной орех", "земляной орех",
    ],
  },

  peanut: {
    label: "Арахис",
    stems: ["арахис", "арахисов", "земляной орех", "земляного ореха"],
  },

  egg: {
    label: "Яйца",
    stems: [
      "яйц", "яич",
      "альбумин", "овальбумин",
      "желток", "желтк", "белок яич", "яичный белок",
      "меланж", "лизоцим", "лецитин яич",
      "овомукоид", "овоглобулин",
    ],
    except: ["рыбья икра", "икр"], // roe is not egg-allergen
  },

  soy: {
    label: "Соя",
    stems: [
      "соя", "сое", "соев",
      "тофу", "темпе", "мисо", "эдамам",
      "лецитин", // E322 is overwhelmingly soy lecithin in RU products
      "соевый белок", "изолят сои", "текстурат",
      "соус соев",
    ],
    except: ["лецитин подсолнечн", "подсолнечный лецитин"],
  },

  fish: {
    label: "Рыба",
    stems: [
      "рыб",
      "лосос", "сёмг", "семг", "форел", "тунец", "тунц",
      "треск", "минтай", "сельд", "селёдк", "селедк", "скумбри",
      "горбуш", "кет", "палтус", "камбал", "хек", "сайр", "килек", "килк",
      "анчоус", "икр", "икор",
      "рыбный жир", "рыбий жир", "рыбный соус",
      "сурими",
    ],
    except: ["рыба-меч название"], // keep structure for future tuning
  },

  seafood: {
    label: "Морепродукты",
    stems: [
      "морепродукт", "моллюск", "ракообразн",
      "креветк", "краб", "крабов", "омар", "лобстер", "лангуст",
      "кальмар", "осьминог", "каракатиц",
      "мид", "устриц", "гребешок", "гребешк", "морской гребеш",
      "улитк", "трепанг", "кревет",
    ],
    except: ["крабовые палочки имитация"], // surimi is fish, flagged under fish
  },

  honey: {
    label: "Мёд",
    stems: ["мёд", "мед ", "меда", "меду", "медов", "прополис", "перг", "маточное молочко"],
    except: ["медь", "медн", "медиум", "медицин"],
  },

  sugar: {
    label: "Сахар/диабет",
    stems: [
      "сахар", "сахароз",
      "глюкоз", "фруктоз", "декстроз", "мальтоз", "лактоз",
      "сироп", "паток", "патока", "меласс",
      "мёд", "медов",
      "кукурузный сироп", "глюкозно-фруктозн", "инвертный сироп",
      "декстрин", "мальтодекстрин",
      "карамел",
    ],
    except: [
      "сахарозаменит", "без сахар", "подсластит",
      "стевиозид", "эритрит", "сукралоз", "аспартам", "ксилит", "сорбит",
      "сахарная вата название",
    ],
  },
};

/** Normalize for matching: lowercase, ё->е, collapse whitespace, strip extra punctuation. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface DeterministicHit {
  restriction: RestrictionId;
  label: string;
  ingredient: string; // the original ingredient text that matched
  stem: string;       // which stem triggered it
}

/**
 * Run the deterministic layer: for each ingredient, for each active restriction,
 * check excepts first, then stems. Returns every hit (ingredient x restriction).
 */
export function matchIngredients(
  ingredients: string[],
  restrictions: RestrictionId[],
): DeterministicHit[] {
  const hits: DeterministicHit[] = [];
  for (const raw of ingredients) {
    const ing = normalize(raw);
    if (!ing) continue;
    for (const restriction of restrictions) {
      const entry = ALLERGEN_DICTIONARY[restriction];
      if (!entry) continue;
      if (entry.except?.some((e) => ing.includes(normalize(e)))) continue;
      const stem = entry.stems.find((s) => ing.includes(normalize(s)));
      if (stem) {
        hits.push({ restriction, label: entry.label, ingredient: raw.trim(), stem });
      }
    }
  }
  return hits;
}
