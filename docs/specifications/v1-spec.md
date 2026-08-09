# Feature Specification: Watchpoint V1 Interactive Learning Platform

**Status**: Approved Specification  
**Version**: 1.0  
**Target Milestone**: v1.0 — Core Interactive Learning Engine  

---

## 1. Problem Statement

Competitive Overwatch 2 players struggle to improve their "game sense"—positional awareness, ultimate tracking, cooldown management, and tactical decision-making—through conventional passive VOD watching. Passive video consumption lacks active decision-making loops, immediate feedback on tactical choices, and objective measurement of decision speed under pressure.

---

## 2. Solution

Watchpoint is a browser-based interactive learning platform that transforms passive VOD watching into active scenario training. High-level ranked VODs automatically pause at curated timestamps (pre-fight, mid-fight, post-fight) to present interactive decision prompts (Strategy, Tactics, Ultimate Tracking, Cooldown Tracking, Spatial Awareness). The video remains paused until the user submits a decision, whereupon immediate PASS/FAIL feedback and analytical explanations are displayed before playback seamlessly resumes.

---

## 3. User Stories

1. As a competitive player, I want to select an Overwatch 2 VOD from a catalog, so that I can practice game sense scenarios on specific maps and ranked tiers.
2. As a player, I want to filter active scenario modules (e.g. toggle on Ultimate Tracking and Cooldowns only) before launching playback, so that I can target specific weaknesses in my gameplay.
3. As a player, I want high-definition VOD playback served efficiently without buffering or playback stutters, so that I can focus entirely on the learning experience.
4. As a player, I want the video player controls to exclude freeform scrubbing, so that I cannot inadvertently spoil upcoming scenario answers by fast-forwarding.
5. As a player, I want video playback to automatically pause at exact target timestamps (within 1 second accuracy), so that I am presented with decision scenarios precisely when fight conditions develop.
6. As a player, I want Strategy scenarios to pause untimed during pre-fight setups, so that I can evaluate win conditions and macro positioning without time pressure.
7. As a player, I want Tactics scenarios to enforce a strict 3-second visual countdown timer, so that my micro opportunity recognition is tested under mid-fight pressure.
8. As a player, I want to receive an automatic FAIL if the 3-second Tactics timer expires before I submit an answer, so that indecision is penalized appropriately.
9. As a player, I want Ultimate Tracking scenarios to present multiple-choice charge ranges (e.g. 0-25%, 26-50%, 51-75%, 76-100%), so that I can estimate enemy ultimate status.
10. As a player, I want Cooldown Tracking scenarios to present multiple-choice availability states (e.g. Ready, On CD <3s, On CD 3-6s, On CD >6s), so that I can track critical enemy abilities.
11. As a player, I want Spatial Awareness scenarios to display descriptive location options paired with point screenshots, so that I can locate unseen flanking threats.
12. As a player, I want to see immediate visual feedback (PASS/FAIL highlight) after submitting an answer, so that I know if my decision was correct.
13. As a player, I want to read a detailed analytical explanation alongside the answer feedback, so that I understand the tactical reasoning behind the correct choice.
14. As a player, I want to click a "Resume Playback" button after reviewing feedback, so that video playback resumes smoothly from where it paused.
15. As a player, I want video playback to pause automatically if I switch browser tabs or minimize the browser, so that I do not miss scenario triggers while out of focus.
16. As a player, I want my scenario attempts and response latencies logged asynchronously, so that my historical performance and weak spots can be analyzed over time.
17. As an administrator, I want to seed and manage VOD records and curated scenario timelines, so that high-quality learning content is maintained.

---

## 4. Implementation Decisions

### Core Architecture & ADR Compliance
* **Media Delivery ([ADR-001](file:///home/jackw/projects/watchpoint/docs/architecture/adr/0001-youtube-media-player.md))**: Implemented via the YouTube IFrame API wrapped in a custom minimalist control interface (`Play`, `Pause`, `Replay Scenario`). Native controls are disabled (`controls=0`).
* **Database Schema ([ADR-002](file:///home/jackw/projects/watchpoint/docs/architecture/adr/0002-hybrid-relational-schema-polymorphic-input.md))**: Utilizes a Cloudflare D1 (SQLite) database managed via Drizzle ORM using a **Hybrid Relational Schema with Polymorphic JSON Payloads**.
* **Input Engine ([ADR-003](file:///home/jackw/projects/watchpoint/docs/architecture/adr/0003-uniform-multiple-choice-v1-input-engine.md))**: Standardizes V1 interactive modules on uniform multiple-choice UI components while maintaining polymorphic `input_type` metadata to allow future continuous sliders and 2D map pin drops.
* **Edge Deployment ([ADR-004](file:///home/jackw/projects/watchpoint/docs/architecture/adr/0004-cloudflare-native-deployment.md))**: Deployed natively to Cloudflare Workers using `@opennextjs/cloudflare`, Cloudflare D1, and Cloudflare R2 object storage.

### Database Schema (Drizzle ORM)
Drizzle is the ORM of record (see [ADR-004](file:///home/jackw/projects/watchpoint/docs/architecture/adr/0004-cloudflare-native-deployment.md)); this spec previously referenced Prisma, which was documentation drift, now corrected. Full schema lives in `src/shared/db/schema/index.ts`; the domain-relevant tables:

```ts
export const vods = sqliteTable("vod", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  youtubeVideoId: text("youtube_video_id").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  mapName: text("map_name").notNull(),
  rankTier: text("rank_tier").notNull(),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const moduleTypeEnum = ["STRATEGY", "TACTICS", "ULTIMATE", "COOLDOWN", "SPATIAL"] as const;
export const inputTypeEnum = ["MULTIPLE_CHOICE", "PERCENT_SLIDER", "TIME_SLIDER", "MAP_PIN_2D"] as const;

export const scenarios = sqliteTable("scenario", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vodId: text("vod_id").notNull().references(() => vods.id, { onDelete: "cascade" }),
  timestampSeconds: real("timestamp_seconds").notNull(),
  moduleType: text("module_type", { enum: moduleTypeEnum }).notNull(),
  timeLimitSeconds: integer("time_limit_seconds"),
  promptText: text("prompt_text").notNull(),
  explanationText: text("explanation_text").notNull(),
  imageUrl: text("image_url"),
  inputType: text("input_type", { enum: inputTypeEnum }).notNull(),
  inputConfig: text("input_config", { mode: "json" }).notNull(),
});

export const attemptRecords = sqliteTable("attempt_record", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scenarioId: text("scenario_id").notNull().references(() => scenarios.id, { onDelete: "cascade" }),
  selectedOptionId: text("selected_option_id"),
  inputValue: text("input_value", { mode: "json" }),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
  responseTimeMs: integer("response_time_ms").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

`users` (plus `sessions`/`accounts`/`verifications` for `better-auth`) are also defined in the same schema file — see [glossary](file:///home/jackw/projects/watchpoint/docs/architecture/glossary.md#1-core-platform-concepts) for the domain-level **User** definition.

---

## 5. Testing Decisions

### Testing Seams & Boundaries
1. **Player State Controller Seam (`useSessionPlayer`)**: Highest custom React hook / component boundary driving player state. Tested via Vitest + `happy-dom`.
2. **API Route Handler Seam (`/api/vods/[id]/manifest` & `/api/attempts`)**: Tested via Vitest unit/integration specs.
3. **End-to-End Playback Seam**: Tested via Playwright (`e2e/watchpoint-player.test.ts`).

---

## 6. Out of Scope

* Public user VOD upload or crowdsourced scenario authoring interface (V1 is strictly admin/seeded content).
* Complex freeform video scrubbing or fast-forward timeline controls.
* Continuous percentage sliders (0-100%) or interactive 2D map pin-drop coordinates (deferred to V2 upgrade).
* Dynamic weighted scoring curves (V1 relies strictly on binary PASS/FAIL).
* Remedial video branching or alternate explanation VOD clips.

---

## 7. Further Notes

* Domain terms used throughout this spec strictly match the [Ubiquitous Language Glossary](file:///home/jackw/projects/watchpoint/docs/architecture/glossary.md).
* System architecture details match the [System Architecture Specification](file:///home/jackw/projects/watchpoint/docs/architecture/system-architecture.md).
