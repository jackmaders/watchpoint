import type { NewCheckpoint, NewVod } from "../schema";

const CURATED_ORDER_FIRST = 1;
const CURATED_ORDER_SECOND = 2;
const CURATED_ORDER_THIRD = 3;

const OPTION_FIRST = 0;
const OPTION_SECOND = 1;
const OPTION_THIRD = 2;
const OPTION_FOURTH = 3;

const SHU_CP_1_SEC = 45;
const SHU_CP_2_SEC = 110;
const SHU_CP_3_SEC = 185;
const SHU_CP_4_SEC = 260;

const JUNBIN_CP_1_SEC = 40;
const JUNBIN_CP_2_SEC = 105;
const JUNBIN_CP_3_SEC = 175;
const JUNBIN_CP_4_SEC = 245;

const TAEJONG_CP_1_SEC = 35;
const TAEJONG_CP_2_SEC = 95;
const TAEJONG_CP_3_SEC = 160;
const TAEJONG_CP_4_SEC = 230;

const SHU_VOD_ID = "shu-ana-owcs-kr-s3";
const JUNBIN_VOD_ID = "junbin-winston-owcs-kr-s3";
const TAEJONG_VOD_ID = "taejong-tracer-owcs-kr-s3";

const SEED_VODS: readonly NewVod[] = [
  {
    curatedOrder: CURATED_ORDER_FIRST,
    hero: "Ana",
    id: SHU_VOD_ID,
    map: "King's Row",
    tier: "OWCS",
    title: "[ Shu ] Ana Main Madness | Zeta Division vs Team Falcons | OWCS Korea Stage 3",
    youtubeVideoId: "Ha5QwBV3Rhk",
  },
  {
    curatedOrder: CURATED_ORDER_SECOND,
    hero: "Winston",
    id: JUNBIN_VOD_ID,
    map: "Lijiang Tower",
    tier: "OWCS",
    title: "[ Junbin ] Primal Punch | Crazy Raccoon vs Zeta Division | OWCS Korea Stage 3",
    youtubeVideoId: "nkfn9HK66gg",
  },
  {
    curatedOrder: CURATED_ORDER_THIRD,
    hero: "Tracer",
    id: TAEJONG_VOD_ID,
    map: "Suravasa",
    tier: "OWCS",
    title: "[ Taejong ] One Trick Tracer | Poker Face vs RODE Zanside Gaming | OWCS Korea Stage 3",
    youtubeVideoId: "w0iO_PuUxFs",
  },
];

const SEED_CHECKPOINTS: readonly NewCheckpoint[] = [
  {
    correctOptionIndex: OPTION_SECOND,
    explanation:
      "Pairing Nano Boost with your Winston's primal engage or dive commitment creates immediate backline pressure and secures space around the first choke.",
    id: `${SHU_VOD_ID}-cp-1`,
    options: [
      "Save Nano Boost strictly as an emergency heal for your Tracer",
      "Use Nano Boost to enable your main tank's dive initiation and build momentum",
      "Nano your flex support before the poke phase begins",
      "Hold Nano Boost until overtime regardless of fight tempo",
    ],
    question:
      "Before the first fight breaks out, what is your primary win condition with Nano Boost?",
    skillCategory: "Strategy",
    timeSec: SHU_CP_1_SEC,
    vodId: SHU_VOD_ID,
  },
  {
    correctOptionIndex: OPTION_FIRST,
    explanation:
      "Landing Sleep Dart before Winston drops bubble removes his threat immediately and preserves Biotic Grenade to punish the follow-up or heal through splash damage.",
    id: `${SHU_VOD_ID}-cp-2`,
    options: [
      "Bait or wait out his bubble timing, land Sleep Dart, then anti-nade as your team collapses",
      "Throw Biotic Grenade into his barrier shield and save Sleep Dart for later",
      "Stand still inside Tesla Cannon range while reloading",
      "Immediately sprint forward past Winston into the enemy frontline",
    ],
    question:
      "The enemy Winston dives your backline; how should you sequence Sleep Dart and Biotic Grenade?",
    skillCategory: "Tactics",
    timeSec: SHU_CP_2_SEC,
    vodId: SHU_VOD_ID,
  },
  {
    correctOptionIndex: OPTION_THIRD,
    explanation:
      "Playing an angled corner near natural cover keeps sightlines onto your tank while staying out of enemy sniper lanes and close to peel.",
    id: `${SHU_VOD_ID}-cp-3`,
    options: [
      "Walk directly down the middle of main street behind your tank",
      "Drop into an isolated side room with no sightline to the choke",
      "Take a safe off-corner with natural cover and clear LoS to both your tank and peel",
      "Jump onto the frontline payload alone without cooldowns",
    ],
    question:
      "Your tank is pushing past the choke; where should you reposition to maintain LoS safely?",
    skillCategory: "Awareness",
    timeSec: SHU_CP_3_SEC,
    vodId: SHU_VOD_ID,
  },
  {
    correctOptionIndex: OPTION_FOURTH,
    explanation:
      "Tracking ult economy since the previous fight shows the enemy support has built their defensive ultimate in time for the final overtime stall.",
    id: `${SHU_VOD_ID}-cp-4`,
    options: [
      "Neither support has built an ultimate in the last two fights",
      "Enemy DPS used both ultimates during the prior cleanup",
      "Enemy main tank already spent Primal Rage ten seconds ago",
      "The enemy support defensive ultimate is online and ready to counter your engage",
    ],
    question: "Which enemy ultimate is most likely online for the upcoming overtime contest?",
    skillCategory: "Tracking",
    timeSec: SHU_CP_4_SEC,
    vodId: SHU_VOD_ID,
  },
  {
    correctOptionIndex: OPTION_FIRST,
    explanation:
      "Staging on high ground or adjacent cover lets you drop onto the backline without burning Jump Pack to close the gap, saving your leap to chase or escape.",
    id: `${JUNBIN_VOD_ID}-cp-1`,
    options: [
      "Stage from high ground or close cover so you can drop in and save Jump Pack for disengage",
      "Burn Jump Pack from spawn directly onto the enemy tank's face",
      "Stand in main choke soaking poke damage until Barrier Projector breaks",
      "Wait on the objective alone while your DPS push ahead",
    ],
    question: "How should you stage before initiating onto the enemy backline on this point?",
    skillCategory: "Strategy",
    timeSec: JUNBIN_CP_1_SEC,
    vodId: JUNBIN_VOD_ID,
  },
  {
    correctOptionIndex: OPTION_THIRD,
    explanation:
      "With Primal Rage ready, committing Jump Pack onto isolated squishies forces support cooldowns and lets you pop Primal as a second health bar and mobility reset.",
    id: `${JUNBIN_VOD_ID}-cp-2`,
    options: [
      "Never use Jump Pack aggressively even when Primal Rage is online",
      "Use Primal Rage immediately at full HP before taking any sightline",
      "Commit Jump Pack to force backline cooldowns, then use Primal Rage to survive and juggle",
      "Save both Jump Pack and Primal Rage until your team has already lost two players",
    ],
    question:
      "You have Primal Rage available; when do you commit Jump Pack versus saving it for disengage?",
    skillCategory: "Tactics",
    timeSec: JUNBIN_CP_2_SEC,
    vodId: JUNBIN_VOD_ID,
  },
  {
    correctOptionIndex: OPTION_SECOND,
    explanation:
      "Once your bubble is spent and you have forced cooldowns, staying overextended exposes you to focus fire and anti-nade follow-up from rotated DPS angles.",
    id: `${JUNBIN_VOD_ID}-cp-3`,
    options: [
      "Running out of Tesla Cannon ammo on a full-HP barrier",
      "Lingering in open sightlines without bubble against enemy focus fire and anti-nade",
      "Missing a melee weave on a retreating tank",
      "Reloading behind natural cover after resetting",
    ],
    question:
      "After forcing cooldowns on high ground, what is the biggest threat to your survival?",
    skillCategory: "Awareness",
    timeSec: JUNBIN_CP_3_SEC,
    vodId: JUNBIN_VOD_ID,
  },
  {
    correctOptionIndex: OPTION_FIRST,
    explanation:
      "The enemy Ana fired Sleep Dart during the previous dive exchange, opening a ~14-second window where she cannot sleep your next initiation.",
    id: `${JUNBIN_VOD_ID}-cp-4`,
    options: [
      "Yes — Sleep Dart was spent in the previous exchange and is still on cooldown",
      "No — she held Sleep Dart and still has it ready for your jump",
      "She swapped off Ana during the middle of the fight",
    ],
    question: "Did the enemy Ana use Sleep Dart in the previous exchange?",
    skillCategory: "Tracking",
    timeSec: JUNBIN_CP_4_SEC,
    vodId: JUNBIN_VOD_ID,
  },
  {
    correctOptionIndex: OPTION_SECOND,
    explanation:
      "Taking a short flank lane close enough to collapse the moment your Winston leaps creates simultaneous crossfire without getting caught early.",
    id: `${TAEJONG_VOD_ID}-cp-1`,
    options: [
      "Stand directly behind your tank in main and shoot shields",
      "Hold a close side lane near cover so you can collapse on the same frame as your tank",
      "Spend all three Blinks deep behind enemy spawn before your team crosses choke",
      "Sit AFK on the objective while the fight happens off-point",
    ],
    question: "Which off-angle gives you the best timing to sync with your tank's engage?",
    skillCategory: "Strategy",
    timeSec: TAEJONG_CP_1_SEC,
    vodId: TAEJONG_VOD_ID,
  },
  {
    correctOptionIndex: OPTION_FOURTH,
    explanation:
      "With only 1 Blink and no Recall, taking a hard 1v2 risks feeding a free pick; using that last Blink to reach cover/health pack preserves uptime until Recall returns.",
    id: `${TAEJONG_VOD_ID}-cp-2`,
    options: [
      "Blink straight into the middle of three enemies to force a trade",
      "Ego-peek the enemy hitscan in an open lane without Recall",
      "Stand still on point to burn 1 second of capture time",
      "Use your remaining Blink to kite behind cover toward a health pack until Recall comes back",
    ],
    question: "You are down to 1 Blink and no Recall; what is the highest-value play right now?",
    skillCategory: "Tactics",
    timeSec: TAEJONG_CP_2_SEC,
    vodId: TAEJONG_VOD_ID,
  },
  {
    correctOptionIndex: OPTION_THIRD,
    explanation:
      "After losing a teammate, the surviving support backs toward main-side safety or a spawn-side mega pack to stay within peel range of their remaining core.",
    id: `${TAEJONG_VOD_ID}-cp-3`,
    options: [
      "Directly forward into your team's frontline solo",
      "Up onto the far side sniper perch away from all teammates",
      "Back toward their remaining team core and nearby cover to preserve escape peel",
      "Deep into your own backline alone",
    ],
    question: "Where is the enemy Brig/flex support likely rotating after the first pick?",
    skillCategory: "Awareness",
    timeSec: TAEJONG_CP_3_SEC,
    vodId: TAEJONG_VOD_ID,
  },
  {
    correctOptionIndex: OPTION_FIRST,
    explanation:
      "Baiting or waiting out Suzu/Immortality Field before committing Pulse Bomb prevents the stick from being cleansed and turns the cooldown deficit into a guaranteed pick.",
    id: `${TAEJONG_VOD_ID}-cp-4`,
    options: [
      "Pressure with guns/Blinks to force out the defensive cooldown first, then stick immediately",
      "Throw Pulse Bomb onto a full-HP target while Suzu and Lamp are both off cooldown",
      "Stick the enemy tank barrier from 20 meters away",
      "Wait until the fight is already lost before throwing Pulse Bomb",
    ],
    question: "How should you time Pulse Bomb relative to the enemy support defensive cooldown?",
    skillCategory: "Tracking",
    timeSec: TAEJONG_CP_4_SEC,
    vodId: TAEJONG_VOD_ID,
  },
];

export { SEED_CHECKPOINTS, SEED_VODS };
