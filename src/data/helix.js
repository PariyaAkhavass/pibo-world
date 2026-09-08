/**
 * Compose the triple helix into one playable runtime config:
 *
 *   World (designer) → Constraints (teacher) → Session (student)
 *
 * The garden loop already in this PR is the designer-side learn beat.
 * Teacher packs filter that beat; the student session records play.
 * Language can still be overridden with `?lang=` for thesis experiments.
 *
 *   ?class=garden   default nature pack (all three plants)
 *   ?class=night    night pack (moonbell only)
 *   ?lang=fr        swap target language on any pack
 */
import { WORLD } from "./world.js";
import { getConstraints } from "./constraints.js";
import { createSession } from "./session.js";
import { queryParam, langName, resolveLang } from "./lesson.js";
import { getPlant } from "./plants.js";

export function composeHelix({
  world = WORLD,
  classId = "garden",
  lang,
} = {}) {
  const pack = getConstraints(classId);
  const targetCode = resolveLang(lang, pack.targetLang);
  const allowed = (pack.allowedPlantIds || []).filter((id) =>
    world.plantCatalog.includes(id)
  );

  return {
    world,
    constraints: { ...pack, worldId: world.id, targetLang: targetCode },
    session: createSession(world.id, pack.id),
    target: { code: targetCode, name: langName(targetCode) },
    native: { code: pack.nativeLang, name: langName(pack.nativeLang) },
    allowedPlantIds: allowed.length ? allowed : world.plantCatalog.slice(),
  };
}

/** Plant ids the student may plant (teacher allow-list ∩ designer catalog). */
export function plantingPlantIds(helix) {
  return helix.allowedPlantIds;
}

export function playablePlants(helix) {
  return plantingPlantIds(helix).map((id) => getPlant(id)).filter(Boolean);
}

/**
 * Plant ids used as quiz foils. Teachers can keep foils inside the assignment
 * (`distractors: "allowed"`) or borrow extras from the designer catalog when
 * the class list is too small for a 3-choice quiz (`"world"`).
 */
export function distractorPlantIds(helix) {
  const allowed = helix.allowedPlantIds;
  if (helix.constraints.distractors === "world") return helix.world.plantCatalog.slice();
  if (allowed.length >= 2) return allowed.slice();
  return helix.world.plantCatalog.slice();
}

export const HELIX = composeHelix({
  classId: queryParam("class") || "garden",
  lang: queryParam("lang") || undefined,
});
