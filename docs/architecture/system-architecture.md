# System Architecture & Domain Design Specification

**Project**: Watchpoint — Interactive Overwatch 2 Game Sense Learning Platform  
**Status**: Draft / Approved Architectural Baseline  
**Date**: 2026-08-06  

---

## 1. Executive Overview

Watchpoint is a browser-based interactive training platform designed to sharpen an Overwatch 2 player's "game sense" through active, scenario-based VOD analysis. 

Rather than passively watching gameplay, Watchpoint embeds high-level ranked VODs that automatically pause at curated timestamps (pre-fight, mid-fight, post-fight). The user is required to make tactical decisions, track enemy ultimate charges, estimate cooldown availability, or recognize situational opportunities before video playback can resume.

This document defines the high-level architecture, database schemas, state synchronization model, and component interactions required to build Watchpoint.

---

## 2. High-Level System Architecture

Watchpoint follows a decoupled client-server architecture:

```mermaid
flowchart TB
    subgraph Client ["Watchpoint Client Application"]
        direction TB
        YT["YouTube IFrame Wrapper"]
        SyncPoller["Time Sync Poller (1s Interval)"]
        OverlayEngine["Scenario Overlay Engine"]
        StateMachine["Session State Machine"]
        
        YT --> StateMachine
        SyncPoller --> StateMachine
        OverlayEngine --> StateMachine
    end

    subgraph Backend ["Watchpoint Backend API"]
        direction TB
        ManifestService["VOD & Scenario Manifest Service"]
        TelemetryService["Attempt & Telemetry Service"]
    end

    subgraph Database ["PostgreSQL Database"]
        direction TB
        VODTable[("VOD Table")]
        ScenarioTable[("Scenario Table")]
        AttemptTable[("AttemptRecord Table")]
    end

    Client -- REST / GraphQL Queries --> Backend
    ManifestService --> VODTable
    ManifestService --> ScenarioTable
    TelemetryService --> AttemptTable
    VODTable -- "1:N" --> ScenarioTable
```

---

## 3. Data Schemas & Entity Specifications

Watchpoint utilizes a **Hybrid Relational Schema with Polymorphic Input Payloads**. Relational columns enable fast filtering (e.g. by `vod_id` and `module_type`), while JSON payloads store module-specific configuration without requiring schema migrations when adding new interaction types.

### 3.1 Entity-Relationship Overview

```mermaid
erDiagram
    USER ||--o{ ATTEMPT_RECORD : records
    VOD ||--|{ SCENARIO : contains
    SCENARIO ||--o{ ATTEMPT_RECORD : evaluates

    VOD {
        uuid id PK
        string title
        string youtube_video_id
        int duration_seconds
        string map_name
        string rank_tier
        boolean is_published
        timestamp created_at
    }

    SCENARIO {
        uuid id PK
        uuid vod_id FK
        float timestamp_seconds
        string module_type
        int time_limit_seconds
        string prompt_text
        string explanation_text
        string image_url
        string input_type
        json input_config
    }

    ATTEMPT_RECORD {
        uuid id PK
        uuid user_id FK
        uuid scenario_id FK
        string selected_option_id
        json input_value
        boolean is_correct
        int response_time_ms
        timestamp created_at
    }
```

### 3.2 `VOD` Entity
Represents an annotated gameplay video session.

| Field | Type | Description |
|---|---|---|
| `id` | UUID / String | Unique identifier |
| `title` | String | Human-readable title (e.g., "Grandmaster Ana VOD - King's Row") |
| `youtube_video_id` | String | Third-party YouTube video identifier (e.g., `dQw4w9WgXcQ`) |
| `duration_seconds` | Integer | Total video duration in seconds |
| `map_name` | String | Overwatch 2 map name (e.g., "King's Row", "Eichenwalde") |
| `rank_tier` | String | Ranked tier context (e.g., "Grandmaster", "Top 500") |
| `is_published` | Boolean | Visibility flag for production playback |
| `created_at` | Timestamp | Creation timestamp |

### 3.3 `Scenario` Entity
Represents a curated pause point within a VOD.

| Field | Type | Description |
|---|---|---|
| `id` | UUID / String | Unique scenario identifier |
| `vod_id` | Foreign Key (`VOD.id`) | Associated VOD |
| `timestamp_seconds` | Float / Int | Video time trigger (1-second marker, $\pm 500\text{ms}$ tolerance) |
| `module_type` | Enum | `STRATEGY`, `TACTICS`, `ULTIMATE`, `COOLDOWN`, `SPATIAL` |
| `time_limit_seconds` | Nullable Int | `3` for strictly timed `TACTICS` scenarios; `null` for untimed |
| `prompt_text` | Text | Question or decision prompt shown to the user |
| `explanation_text` | Text | Analytical explanation rendered after user responds |
| `image_url` | Nullable String | Optional static point screenshot (used in Spatial Location scenarios) |
| `input_type` | Enum | `MULTIPLE_CHOICE`, `PERCENT_SLIDER`, `TIME_SLIDER`, `MAP_PIN_2D` |
| `input_config` | JSON | Polymorphic configuration object containing option list or validation rules |

#### Polymorphic `input_config` Examples

##### V1 Default: `MULTIPLE_CHOICE` (Used for Strategy, Tactics, Ult Tracking, Cooldowns, Spatial)
```json
{
  "options": [
    { "id": "opt_a", "text": "0-25% (No Ult)", "is_correct": false },
    { "id": "opt_b", "text": "26-50% (Building)", "is_correct": false },
    { "id": "opt_c", "text": "51-75% (Soon)", "is_correct": true },
    { "id": "opt_d", "text": "76-100% (Ready)", "is_correct": false }
  ]
}
```

##### V2 Upgrade: `PERCENT_SLIDER` (Future Ultimate Tracking)
```json
{
  "target_value": 75,
  "tolerance_margin": 10,
  "min_label": "0%",
  "max_label": "100%"
}
```

##### V2 Upgrade: `MAP_PIN_2D` (Future Spatial Awareness Pin-Drop)
```json
{
  "map_image_url": "/assets/maps/kings_row_point_b.png",
  "target_coordinate": { "x": 0.42, "y": 0.68 },
  "acceptable_radius": 0.08
}
```

### 3.4 `AttemptRecord` Entity
Logs raw user responses for performance analytics.

| Field | Type | Description |
|---|---|---|
| `id` | UUID / String | Unique log entry ID |
| `user_id` | Foreign Key (`User.id`) | User taking the scenario |
| `scenario_id` | Foreign Key (`Scenario.id`) | Scenario being attempted |
| `selected_option_id` | Nullable String | Option ID chosen (if multiple choice) |
| `input_value` | Nullable JSON | Raw input value (for future slider/pin coordinates) |
| `is_correct` | Boolean | Binary PASS/FAIL evaluation |
| `response_time_ms` | Integer | Latency between overlay presentation and answer submission |
| `created_at` | Timestamp | Attempt timestamp |

---

## 4. State Machine & Video Synchronization

### 4.1 Sync Loop & Player Wrapper Rules
1. **Player Controls Restriction**: Native YouTube player controls are hidden/disabled via iframe settings (`controls=0`). The custom UI provides only Play / Pause / Replay Scenario actions. No freeform scrubbing is permitted during interactive practice sessions.
2. **1-Second Polling Loop**: While video is playing, a 1-second interval timer queries YouTube's `player.getCurrentTime()`.
3. **Trigger Execution**:
   * If `currentTime >= nextScenario.timestamp_seconds`:
     1. Call `player.pauseVideo()`.
     2. Transition player state to `SCENARIO_PAUSED`.
     3. Render interactive overlay modal.
     4. If `module_type === 'TACTICS'`, start 3-second countdown timer.
4. **Tab Visibility Protection**: If `document.hidden` triggers while playing, `player.pauseVideo()` is invoked immediately to avoid desynchronization while out of view.

---

## 5. Sequence Flows

### 5.1 Preloading & Session Initialization
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Watchpoint Player
    participant API as Watchpoint Backend
    participant DB as Database

    User->>Client: Select VOD + Choose Module Filters (e.g. Ult Tracking only)
    Client->>API: GET /api/vods/{id}/manifest?modules=ULTIMATE
    API->>DB: Query VOD + Filtered Scenarios ORDER BY timestamp_seconds ASC
    DB-->>API: Return VOD + Scenarios
    API-->>Client: Return Session Manifest JSON
    Client->>Client: Preload UI Assets (Images, Screenshots, Question Payloads)
    Client-->>User: Render "Ready to Start" State
```

### 5.2 Scenario Trigger & Resume Loop
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Watchpoint Player
    participant YT as YouTube IFrame API
    participant API as Backend Telemetry API

    User->>Client: Click "Start Playback"
    Client->>YT: player.playVideo()
    loop 1-Second Polling Timer
        Client->>YT: player.getCurrentTime()
        YT-->>Client: timestamp (seconds)
    end
    Note over Client: currentTime >= Scenario.timestamp_seconds
    Client->>YT: player.pauseVideo()
    Client->>Client: Display Interactive Scenario Overlay Modal
    alt Module is TACTICS
        Client->>Client: Start 3-Second Timer
    end
    User->>Client: Submit Answer Selection
    Client->>Client: Evaluate Pass/Fail
    Client->>API: POST /api/attempts (Async telemetry log)
    Client-->>User: Render Feedback Overlay (Pass/Fail + Explanation)
    User->>Client: Click "Resume Playback"
    Client->>Client: Dismiss Overlay Modal
    Client->>YT: player.playVideo()
```

---

## 6. Non-Functional Requirements

1. **Low-Latency Overlays**: Zero network calls must occur between video pause and overlay rendering. All scenario prompts and assets must be pre-fetched during session initialization.
2. **Minimal Data Footprint**: Video streams remain entirely on YouTube CDN. Database storage is restricted to metadata, scenario configs, and lightweight attempt logs.
3. **Extensibility**: The polymorphic `input_config` model allows upgrading input types (e.g. from multiple choice to sliders or map pin drops) without database migration overhead.
