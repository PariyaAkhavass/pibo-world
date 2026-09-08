/**
 * Pure recall helpers for the garden quiz.
 * Kept free of DOM / Three.js so thesis experiments can unit-test item
 * selection and later swap in bigger word banks or spaced schedules.
 */
import { PLANTS, getPlant } from "../data/plants.js";
import { wordOf } from "../data/vocab.js";

export function shuffle(list, rng = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a multiple-choice recall item for a bloomed plant.
 * The correct L2 word is always included; remaining options are other
 * garden plants (same lesson), shuffled.
 */
export function recallChoices(targetPlantId, { count = 3, lang, rng = Math.random, plantIds } = {}) {
  const poolIds = plantIds && plantIds.length ? plantIds : PLANTS.map((p) => p.id);
  const pool = poolIds.map((id) => getPlant(id)).filter(Boolean);
  const target = getPlant(targetPlantId) || pool.find((p) => p.id === targetPlantId);
  if (!target) return [];

  const others = pool.filter((p) => p.id !== targetPlantId);
  const distractors = shuffle(others, rng).slice(0, Math.max(0, count - 1));
  const selected = shuffle([target, ...distractors], rng);

  return selected.map((plant) => ({
    plantId: plant.id,
    word: wordOf(plant.id, lang),
    emoji: plant.emoji,
    correct: plant.id === targetPlantId,
  }));
}

export function gradeRecall(choicePlantId, targetPlantId) {
  return choicePlantId === targetPlantId;
}
