import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { recallChoices, gradeRecall, shuffle } from "./recall.js";
import { vocabFor, wordOf, VOCAB, supportedLangs } from "../data/vocab.js";
import { fill } from "../data/lesson.js";

describe("vocab data", () => {
  it("has Spanish, French, and English cards for every plant", () => {
    for (const id of Object.keys(VOCAB)) {
      for (const lang of ["es", "fr", "en"]) {
        const card = vocabFor(id, lang);
        assert.ok(card, `${id} missing ${lang}`);
        assert.ok(card.word);
        assert.ok(card.gloss);
        assert.ok(card.phrase);
        assert.ok(card.phraseGloss);
      }
    }
  });

  it("looks up the requested language, not a hard-coded one", () => {
    assert.equal(wordOf("sunpetal", "es"), "sol");
    assert.equal(wordOf("sunpetal", "fr"), "soleil");
    assert.equal(wordOf("moonbell", "es"), "luna");
    assert.equal(wordOf("fernling", "fr"), "fougère");
  });

  it("falls back when a language is missing", () => {
    const card = vocabFor("sunpetal", "zz");
    assert.ok(card?.word);
  });

  it("lists supported langs from the word bank", () => {
    assert.deepEqual(supportedLangs(), ["en", "es", "fr"]);
  });
});

describe("recall choices", () => {
  const zero = () => 0;

  it("always includes the target plant as the correct option", () => {
    const choices = recallChoices("moonbell", { rng: zero, lang: "es" });
    assert.equal(choices.length, 3);
    const hit = choices.find((c) => c.correct);
    assert.equal(hit.plantId, "moonbell");
    assert.equal(hit.word, "luna");
    assert.equal(choices.filter((c) => c.correct).length, 1);
  });

  it("uses unique plant ids", () => {
    const choices = recallChoices("sunpetal", { rng: zero });
    const ids = choices.map((c) => c.plantId);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("grades only the matching plant id", () => {
    assert.equal(gradeRecall("sunpetal", "sunpetal"), true);
    assert.equal(gradeRecall("fernling", "sunpetal"), false);
  });
});

describe("shuffle + fill", () => {
  it("does not mutate the original list", () => {
    const src = [1, 2, 3];
    const out = shuffle(src, () => 0);
    assert.deepEqual(src, [1, 2, 3]);
    assert.equal(out.length, 3);
  });

  it("fills lesson toast templates", () => {
    assert.equal(fill("{word} bloomed {emoji}", { word: "sol", emoji: "🌻" }), "sol bloomed 🌻");
    assert.equal(fill("none"), "none");
  });
});
