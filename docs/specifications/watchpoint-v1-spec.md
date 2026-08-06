# Feature Specification: Watchpoint V1 Interactive Learning Platform

**Status**: Ready for Implementation  
**Target Issue**: #1 — Watchpoint Core Interactive Learning Engine  
**Labels**: `ready-for-agent`  

---

## Problem Statement

Competitive Overwatch 2 players struggle to improve their "game sense"—positional awareness, ultimate tracking, cooldown management, and tactical decision-making—through conventional passive VOD watching. Passive video consumption lacks active decision-making loops, immediate feedback on tactical choices, and objective measurement of decision speed under pressure.

---

## Solution

Watchpoint is a browser-based interactive learning platform that transforms passive VOD watching into active scenario training. High-level ranked VODs automatically pause at curated timestamps (pre-fight, mid-fight, post-fight) to present interactive decision prompts (Strategy, Tactics, Ultimate Tracking, Cooldown Tracking, Spatial Awareness). The video remains paused until the user submits a decision, whereupon immediate PASS/FAIL feedback and analytical explanations are displayed before playback seamlessly resumes.

---

## User Stories

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

## Implementation Decisions

### Core Architecture & ADR Compliance
* **Media Delivery (ADR-001)**: Implemented via the YouTube IFrame API wrapped in a custom minimalist control interface (`Play`, `Pause`, `Replay Scenario`). Native controls are disabled (`controls=0`).
* **Database Schema (ADR-002)**: Utilizes a PostgreSQL database managed via Prisma ORM using a **Hybrid Relational Schema with Polymorphic JSON Payloads**.
* **Input Engine (ADR-003)**: Standardizes V1 interactive modules on uniform multiple-choice UI components while maintaining polymorphic `input_type` metadata to allow future continuous sliders and 2D map pin drops.

### Database Schema (Prisma)
Derived from architectural decision records:

```prisma
model Vod {
  id              String     @id @default(cuid())
  title           String
  youtubeVideoId  String     @map("youtube_video_id")
  durationSeconds Int        @map("duration_seconds")
  mapName         String     @map("map_name")
  rankTier        String     @map("rank_tier")
  isPublished     Boolean    @default(false) @map("is_published")
  createdAt       DateTime   @default(now()) @map("created_at")
  scenarios       Scenario[]

  @@map("vod")
}

enum ModuleType {
  STRATEGY
  TACTICS
  ULTIMATE
  COOLDOWN
  SPATIAL
}

enum InputType {
  MULTIPLE_CHOICE
  PERCENT_SLIDER
  TIME_SLIDER
  MAP_PIN_2D
}

model Scenario {
  id               String          @id @default(cuid())
  vodId            String          @map("vod_id")
  vod              Vod             @relation(fields: [vodId], references: [id], onDelete: Cascade)
  timestampSeconds Float           @map("timestamp_seconds")
  moduleType       ModuleType      @map("module_type")
  timeLimitSeconds Int?            @map("time_limit_seconds")
  promptText       String          @map("prompt_text")
  explanationText  String          @map("explanation_text")
  imageUrl         String?         @map("image_url")
  inputType        InputType       @map("input_type")
  inputConfig      Json            @map("input_config")
  attempts         AttemptRecord[]

  @@index([vodId, moduleType])
  @@map("scenario")
}

model AttemptRecord {
  id               String   @id @default(cuid())
  userId           String   @map("user_id")
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  scenarioId       String   @map("scenario_id")
  scenario         Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  selectedOptionId String?  @map("selected_option_id")
  inputValue       Json?    @map("input_value")
  isCorrect        Boolean  @map("is_correct")
  responseTimeMs   Int      @map("response_time_ms")
  createdAt        DateTime @default(now()) @map("created_at")

  @@map("attempt_record")
}
```

### Player State Machine & Seam Specification
The client session state machine manages playback, pause triggers, countdown timers, and overlay transitions:

```
[ IDLE ] ──(Load VOD)──> [ PRELOADING ] ──(Manifest Ready)──> [ READY ]
                                                                 │
                                                            (Click Play)
                                                                 ▼
[ SCENARIO_FEEDBACK ] <──(Submit/Timeout)── [ SCENARIO_PAUSED ] <──(Trigger Hit)── [ PLAYING ]
         │                                                                              ▲
         └─────────────────────────────────(Click Resume)───────────────────────────────┘
```

---

## Testing Decisions

### Testing Seams & Boundaries
To adhere to system rules and architectural guidelines, testing will occur at three distinct high-level seams:

1. **Client State Machine & Player Hook Seam (`useSessionPlayer`)**:
   * **Seam**: Highest custom React hook / component boundary driving player state.
   * **Testing Environment**: Vitest + `happy-dom` (`src/features/session-player/**/*.spec.ts`).
   * **Behavior Tested**: Verifies that 1-second time poller triggers scenario pause, 3-second Tactics countdown enforces timeout FAIL, tab visibility changes trigger player pause, and answer submission computes binary PASS/FAIL accurately.
   
2. **API Manifest & Telemetry Endpoint Seam**:
   * **Seam**: HTTP API route handlers (`/api/vods/[id]/manifest` and `/api/attempts`).
   * **Testing Environment**: Vitest unit/integration specs.
   * **Behavior Tested**: Verifies that manifest queries correctly filter scenarios by requested `module_type` params and attempt logs record correct latency and binary evaluation status.

3. **End-to-End Playback Seam**:
   * **Seam**: Playwright E2E (`e2e/watchpoint-player.test.ts`).
   * **Testing Environment**: Desktop Chromium / Firefox.
   * **Behavior Tested**: Full user journey: selecting VOD $\rightarrow$ selecting module filters $\rightarrow$ launching playback $\rightarrow$ verifying iframe pause trigger $\rightarrow$ answering scenario prompt $\rightarrow$ verifying feedback modal $\rightarrow$ resuming playback.

### Prior Art & Guidelines
* Tests follow strict TDD protocol (Red $\rightarrow$ Green $\rightarrow$ Refactor).
* Each unit test block executes in under 50ms.
* Zero manual inline mocks; external APIs use `__mocks__` or happy-dom test stubs.
* 100% coverage threshold enforced across statements, branches, functions, and lines.

---

## Out of Scope

* Public user VOD upload or crowdsourced scenario authoring interface (V1 is strictly admin/seeded content).
* Complex freeform video scrubbing or fast-forward timeline controls.
* Continuous percentage sliders (0-100%) or interactive 2D map pin-drop coordinates (deferred to V2 upgrade).
* Dynamic weighted scoring curves (V1 relies strictly on binary PASS/FAIL).
* Remedial video branching or alternate explanation VOD clips.

---

## Further Notes

* Domain terms used throughout this spec strictly match the [Ubiquitous Language Glossary](file:///home/jackw/projects/watchpoint/docs/architecture/glossary.md).
* System architecture details match the [System Architecture Specification](file:///home/jackw/projects/watchpoint/docs/architecture/system-architecture.md).
