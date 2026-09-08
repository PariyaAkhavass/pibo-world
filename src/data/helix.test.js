import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WORLD } from "../data/world.js";
import { getConstraints, CONSTRAINT_PACKS } from "../data/constraints.js";
import {
  composeHelix,
  plantingPlantIds,
  distractorPlantIds,
  playablePlants,
} from "../data/helix.js";
import {
  createSession,
  recordPlanting,
  recordRecall,
  addCreation,
  mergeVocabCreations,
} from "../data/session.js";
import { recallChoices } from "../learn/recall.js";
import { VOCAB } from "../data/vocab.js";

describe("triple helix compose", () => {
  it("maps designer world → teacher constraints → student session", () => {
    const helix = composeHelix({ classId: "garden" });
    assert.equal(helix.world.role, "designer");
    assert.equal(helix.world.id, WORLD.id);
    assert.equal(helix.constraints.role, "teacher");
    assert.equal(helix.constraints.worldId, WORLD.id);
    assert.equal(helix.session.role, "student");
    assert.equal(helix.session.worldId, WORLD.id);
    assert.equal(helix.session.constraintId, helix.constraints.id);
    assert.deepEqual(helix.session.creations, []);
    assert.deepEqual(helix.session.peers, []);
  });

  it("lets a teacher pack restrict which plants students may grow", () => {
    const garden = composeHelix({ classId: "garden" });
    const night = composeHelix({ classId: "night" });
    assert.deepEqual(plantingPlantIds(garden), ["sunpetal", "moonbell", "fernling"]);
    assert.deepEqual(plantingPlantIds(night), ["moonbell"]);
    assert.equal(playablePlants(night).length, 1);
    assert.equal(playablePlants(night)[0].id, "moonbell");
  });

  it("keeps language swappable on top of a teacher pack", () => {
    const helix = composeHelix({ classId: "garden", lang: "fr" });
    assert.equal(helix.target.code, "fr");
    assert.equal(helix.target.name, "French");
    assert.equal(helix.constraints.targetLang, "fr");
  });

  it("ignores unknown language codes and keeps the pack default", () => {
    const helix = composeHelix({ classId: "garden", lang: "zz" });
    assert.equal(helix.target.code, CONSTRAINT_PACKS.garden.targetLang);
  });

  it("falls back to the garden pack for an unknown class id", () => {
    assert.equal(getConstraints("nope").id, CONSTRAINT_PACKS.garden.id);
  });

  it("borrows world-catalog foils when a class list is too small", () => {
    const night = composeHelix({ classId: "night" });
    assert.equal(night.constraints.distractors, "world");
    const foils = distractorPlantIds(night);
    assert.ok(foils.includes("moonbell"));
    assert.ok(foils.length >= 3);
    const choices = recallChoices("moonbell", { plantIds: foils, lang: "es", rng: () => 0 });
    assert.equal(choices.length, 3);
    assert.ok(choices.some((c) => c.correct && c.plantId === "moonbell"));
  });
});

describe("student session stub", () => {
  const now = (() => {
    let t = 1000;
    return () => ++t;
  })();

  it("records plantings and recalls on the session log", () => {
    const session = createSession("world", "class", now);
    recordPlanting(session, { spotIndex: 0, plantId: "sunpetal" }, now);
    recordRecall(session, { plantId: "sunpetal", correct: false, word: "luna" }, now);
    recordRecall(session, { plantId: "sunpetal", correct: true, word: "sol" }, now);
    assert.equal(session.plantings.length, 1);
    assert.equal(session.recalls.length, 2);
    assert.equal(session.recalls[0].correct, false);
    assert.equal(session.recalls[1].correct, true);
  });

  it("merges a student vocab creation into the designer word bank", () => {
    const session = createSession("world", "class", now);
    addCreation(session, {
      kind: "vocab",
      plantId: "sunpetal",
      lang: "de",
      word: "Sonne",
      gloss: "sun",
      phrase: "Die Sonne scheint.",
      phraseGloss: "The sun is shining.",
    }, now);
    const merged = mergeVocabCreations(VOCAB, session.creations);
    assert.equal(merged.sunpetal.de.word, "Sonne");
    assert.equal(VOCAB.sunpetal.de, undefined);
  });
});
