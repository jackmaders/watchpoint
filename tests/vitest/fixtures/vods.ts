import type { VodCheckpoint, VodDetail } from "@/pages/vod-player";
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

const TEST_VOD_CHECKPOINTS: VodCheckpoint[] = [
  {
    correctOptionIndex: 1,
    explanation: "Pair Nano Boost with your tank dive to take space around the first choke.",
    id: "shu-ana-owcs-kr-s3-cp-1",
    options: [
      "Save Nano Boost strictly as an emergency heal",
      "Use Nano Boost to enable your main tank dive initiation",
      "Nano your flex support during poke",
      "Hold Nano Boost until overtime",
    ],
    question:
      "Before the first fight breaks out, what is your primary win condition with Nano Boost?",
    skillCategory: "Strategy",
    timeSec: 45,
    vodId: TEST_VOD.id,
  },
  {
    correctOptionIndex: 0,
    explanation: "Wait out Winston bubble timing before landing Sleep Dart and anti-nade.",
    id: "shu-ana-owcs-kr-s3-cp-2",
    options: [
      "Wait out bubble timing, land Sleep Dart, then anti-nade",
      "Throw Biotic Grenade into his barrier shield",
      "Stand still inside Tesla Cannon range",
      "Sprint forward into the enemy frontline",
    ],
    question:
      "The enemy Winston dives your backline; how should you sequence Sleep Dart and Biotic Grenade?",
    skillCategory: "Tactics",
    timeSec: 110,
    vodId: TEST_VOD.id,
  },
  {
    correctOptionIndex: 2,
    explanation: "Hold a safe off-corner with natural cover and LoS to both your tank and peel.",
    id: "shu-ana-owcs-kr-s3-cp-3",
    options: [
      "Walk directly down main street behind your tank",
      "Drop into an isolated room with no sightline",
      "Take a safe off-corner with cover and LoS to tank and peel",
      "Jump onto the payload alone",
    ],
    question:
      "Your tank is pushing past the choke; where should you reposition to maintain LoS safely?",
    skillCategory: "Awareness",
    timeSec: 185,
    vodId: TEST_VOD.id,
  },
  {
    correctOptionIndex: 3,
    explanation: "Enemy support defensive ultimate is online for the overtime contest.",
    id: "shu-ana-owcs-kr-s3-cp-4",
    options: [
      "Neither support has an ultimate",
      "Enemy DPS used both ultimates",
      "Enemy tank spent Primal Rage",
      "Enemy support defensive ultimate is online",
    ],
    question: "Which enemy ultimate is most likely online for the upcoming overtime contest?",
    skillCategory: "Tracking",
    timeSec: 260,
    vodId: TEST_VOD.id,
  },
];

const TEST_VOD_DETAIL: VodDetail = {
  checkpoints: TEST_VOD_CHECKPOINTS,
  hero: TEST_VOD.hero,
  id: TEST_VOD.id,
  map: TEST_VOD.map,
  role: TEST_VOD.role,
  tier: TEST_VOD.tier,
  title: TEST_VOD.title,
  youtubeVideoId: TEST_VOD.youtubeVideoId,
};

function createVodCheckpointFixture(overrides: Partial<VodCheckpoint> = {}): VodCheckpoint {
  return { ...TEST_VOD_CHECKPOINTS[0]!, ...overrides };
}

function createVodDetailFixture(overrides: Partial<VodDetail> = {}): VodDetail {
  return { ...TEST_VOD_DETAIL, ...overrides };
}

export {
  TEST_VOD,
  TEST_VOD_CHECKPOINTS,
  TEST_VOD_DETAIL,
  TEST_VODS,
  createVodCheckpointFixture,
  createVodDetailFixture,
  createVodFixture,
};
