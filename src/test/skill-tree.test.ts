import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

type Perks = Record<string, number>;
type Rules = {
  SKILLS: { id: string; cost: number }[];
  canBuy: (owned: string[], id: string, chips: number) => boolean;
  perks: (owned: string[], levels?: Record<string, number>) => Perks;
  upgradeCost: (id: string, levels: Record<string, number>) => number | null;
  buildingCost: (id: string, owned: number) => number;
  chipRate: (casino: Record<string, number>) => number;
  offlineChips: (casino: Record<string, number>, since: number, now: number) => number;
  flipEdge: (chance: number, p: Perks) => number;
};
let rules: Rules;
beforeAll(() => {
  new Function(readFileSync(path.resolve(__dirname, "../../extension/rules.js"), "utf8"))();
  rules = (window as unknown as { PC_RULES: Rules }).PC_RULES;
});

describe("skill tree", () => {
  it("has 20 skills", () => expect(rules.SKILLS.length).toBe(20));
  it("needs the skill above it", () => {
    expect(rules.canBuy([], "luck2", 1e9)).toBe(false);
    expect(rules.canBuy(["luck1"], "luck2", 1e9)).toBe(true);
  });
  it("costs casino chips (a tenth of the old coin price) and can't be bought twice", () => {
    expect(rules.canBuy([], "luck1", 49)).toBe(false);
    expect(rules.canBuy([], "luck1", 50)).toBe(true);
    expect(rules.canBuy(["luck1"], "luck1", 1e9)).toBe(false);
  });
  it("flips are fair with no skills", () => {
    expect(rules.flipEdge(50, rules.perks([]))).toBeCloseTo(0, 6);
  });
  it("skills are big: Lucky Charm gives +5% win chance, Fortress 30% back", () => {
    expect(rules.perks(["luck1"])["winBoost"]).toBeCloseTo(0.05);
    expect(rules.perks(["safe1", "safe2", "safe4", "safe5"])["flipRefund"]).toBeCloseTo(0.3);
  });
  it("refunds never pass 90% even fully upgraded", () => {
    expect(rules.perks(["safe5"], { safe5: 5 })["flipRefund"]).toBe(0.9);
  });
  it("free coins max out at 2000 every 15s", () => {
    const all = rules.perks(rules.SKILLS.map((s) => s.id));
    expect(all["bonusAmount"]).toBe(2000);
    expect(all["bonusWait"]).toBe(15000);
  });
  it("upgrades go to level 5 and each level adds the full perk again", () => {
    expect(rules.upgradeCost("luck1", {})).toBe(100);
    expect(rules.upgradeCost("luck1", { luck1: 4 })).toBe(1000);
    expect(rules.upgradeCost("luck1", { luck1: 5 })).toBeNull();
    expect(rules.perks(["luck1"], { luck1: 2 })["winBoost"]).toBeCloseTo(0.1);
    expect(rules.perks(["luck1"], { luck1: 5 })["winBoost"]).toBeCloseTo(0.25);
    expect(rules.perks(["bonus1"], { bonus1: 3 })["bonusWait"]).toBe(10000);
  });
});

describe("casino tycoon", () => {
  it("buildings get 15% pricier each", () => {
    expect(rules.buildingCost("slot", 0)).toBe(100);
    expect(rules.buildingCost("slot", 1)).toBe(115);
  });
  it("makes chips per second from buildings", () => {
    expect(rules.chipRate({ slot: 5, table: 2 })).toBeCloseTo(3);
  });
  it("earns while away, capped at 8 hours", () => {
    expect(rules.offlineChips({ table: 1 }, 1000, 61000)).toBeCloseTo(60);
    expect(rules.offlineChips({ table: 1 }, 1, 1 + 24 * 3600e3)).toBeCloseTo(8 * 3600);
  });
});

describe("packs", () => {
  type R = { openPack: (id: string, r: () => number) => { rarity: string; coins: number; chips: number } };
  const seq = (...v: number[]) => () => v.shift() ?? 0.5;
  it("mythic is 0.1%, legendary 0.9%, common 60%", () => {
    const r = rules as unknown as R;
    expect(r.openPack("bronze", seq(0.0, 0.5)).rarity).toBe("common");
    expect(r.openPack("bronze", seq(0.5999, 0.5)).rarity).toBe("common");
    expect(r.openPack("bronze", seq(0.995, 0.5)).rarity).toBe("legendary");
    expect(r.openPack("bronze", seq(0.9995, 0.5)).rarity).toBe("mythic");
  });
  it("every pack gives an item of the rolled rarity", () => {
    const r = rules as unknown as R & { item: (id: string) => { rarity: string } };
    const res = r.openPack("bronze", seq(0.9995, 0.5, 0.5));
    expect(r.item((res as unknown as { item: string }).item).rarity).toBe("mythic");
  });
});
