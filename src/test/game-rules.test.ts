import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

type Rules = {
  bonusLeft: (bonusAt: number, now: number) => number;
  flipOdds: (chance: number, luck: number) => number;
};

let rules: Rules;

beforeAll(() => {
  // The game is plain browser JS shared by the extension and website.
  const src = readFileSync(path.resolve(__dirname, "../../extension/rules.js"), "utf8");
  new Function(src)();
  rules = (window as unknown as { PC_RULES: Rules }).PC_RULES;
});

describe("free 50 coins", () => {
  it("can't be claimed again until a minute has passed", () => {
    const claimedAt = 1_000_000;
    expect(rules.bonusLeft(claimedAt, claimedAt + 1_000)).toBe(59);
    expect(rules.bonusLeft(claimedAt, claimedAt + 59_000)).toBe(1);
    expect(rules.bonusLeft(claimedAt, claimedAt + 60_000)).toBe(0);
  });

  it("can be claimed right away the first time", () => {
    expect(rules.bonusLeft(0, Date.now())).toBe(0);
  });
});

describe("luck", () => {
  it("100% luck wins every flip, even at 1% win chance", () => {
    expect(rules.flipOdds(1, 100)).toBe(100);
  });

  it("-100% luck loses every flip", () => {
    expect(rules.flipOdds(50, -100)).toBe(0);
  });

  it("no luck keeps the picked win chance", () => {
    expect(rules.flipOdds(50, 0)).toBe(50);
  });
});
