import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const vods = sqliteTable(
  "vods",
  {
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    curatedOrder: integer("curated_order").notNull(),
    hero: text("hero").notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    map: text("map").notNull(),
    tier: text("tier", { enum: ["Ranked GM", "Ranked Champion", "FACEIT", "OWCS"] }).notNull(),
    title: text("title").notNull(),
    youtubeVideoId: text("youtube_video_id").notNull(),
  },
  (table) => [index("vods_curated_order_idx").on(table.curatedOrder)],
);

const checkpoints = sqliteTable(
  "checkpoints",
  {
    correctOptionIndex: integer("correct_option_index").notNull(),
    explanation: text("explanation").notNull(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    options: text("options", { mode: "json" }).$type<string[]>().notNull(),
    question: text("question").notNull(),
    skillCategory: text("skill_category", {
      enum: ["Strategy", "Tactics", "Awareness", "Tracking"],
    }).notNull(),
    timeSec: integer("time_sec").notNull(),
    vodId: text("vod_id")
      .notNull()
      .references(() => vods.id, { onDelete: "cascade" }),
  },
  (table) => [index("checkpoints_vod_id_time_sec_idx").on(table.vodId, table.timeSec)],
);

const competitiveTiers = vods.tier.enumValues;
const skillCategories = checkpoints.skillCategory.enumValues;

type Vod = typeof vods.$inferSelect;
type NewVod = typeof vods.$inferInsert;
type Checkpoint = typeof checkpoints.$inferSelect;
type NewCheckpoint = typeof checkpoints.$inferInsert;
type CompetitiveTier = (typeof vods.$inferSelect)["tier"];
type SkillCategory = (typeof checkpoints.$inferSelect)["skillCategory"];

export {
  checkpoints,
  competitiveTiers,
  skillCategories,
  vods,
  type Checkpoint,
  type CompetitiveTier,
  type NewCheckpoint,
  type NewVod,
  type SkillCategory,
  type Vod,
};
