import type { VodCatalogueItem } from "@/pages/vods";

const TEST_VOD: VodCatalogueItem = {
  checkpointCount: 4,
  curatedOrder: 1,
  hero: "Ana",
  id: "shu-ana-owcs-kr-s3",
  map: "King's Row",
  role: "Support",
  skillCategories: ["Strategy", "Tactics", "Awareness", "Tracking"],
  tier: "OWCS",
  title: "[ Shu ] Ana Main Madness | Zeta Division vs Team Falcons | OWCS Korea Stage 3",
  youtubeVideoId: "Ha5QwBV3Rhk",
};

function createVodFixture(overrides: Partial<VodCatalogueItem> = {}): VodCatalogueItem {
  return { ...TEST_VOD, ...overrides };
}

const TEST_VODS: VodCatalogueItem[] = [
  TEST_VOD,
  createVodFixture({
    curatedOrder: 2,
    hero: "Winston",
    id: "junbin-winston-owcs-kr-s3",
    map: "Lijiang Tower",
    role: "Tank",
    title: "[ Junbin ] Primal Punch | Crazy Raccoon vs Zeta Division | OWCS Korea Stage 3",
    youtubeVideoId: "nkfn9HK66gg",
  }),
  createVodFixture({
    curatedOrder: 3,
    hero: "Tracer",
    id: "taejong-tracer-owcs-kr-s3",
    map: "Suravasa",
    role: "Damage",
    title: "[ Taejong ] One Trick Tracer | Poker Face vs RODE Zanside Gaming | OWCS Korea Stage 3",
    youtubeVideoId: "w0iO_PuUxFs",
  }),
];

export { TEST_VOD, TEST_VODS, createVodFixture };
