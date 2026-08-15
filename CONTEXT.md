# Watchpoint Domain Glossary & Ubiquitous Language

**Project**: Watchpoint — Interactive Overwatch 2 Game Sense Learning Platform  
**Status**: Living Specification  
**Last Updated**: 2026-08-07  

This document defines the core domain terminology used across product discussions, system documentation, database schemas, and codebase entities.

---

## 1. Core Platform Concepts

* **VOD (Video On Demand)**  
  A recorded video clip of high-level ranked Overwatch 2 gameplay (typically 10 to 40 minutes) annotated with scenario trigger points.

* **Game Sense**  
  A player's situational awareness, predictive decision-making, positioning intuition, ultimate tracking, and cooldown management under real-time game conditions.

* **Scenario (Interactive Pause Point)**  
  A curated timestamp in a VOD where playback automatically pauses, forcing the user to evaluate the game state and respond to a prompt before playback can continue.

* **Session Manifest**  
  The complete pre-loaded data bundle sent to the client at the start of a VOD training session. Contains VOD metadata, video ID, and the ordered array of active scenarios filtered by user settings.

* **Attempt Record**  
  A single telemetry log documenting a user's answer choice, PASS/FAIL result, and response latency for a specific scenario.

* **User**  
  The individual account an Attempt Record is attributed to. Distinct from the **Administrator** role (spec user story 17), which seeds and manages VOD/Scenario content rather than taking training sessions. How a User's identity is established (login, or a V1 stand-in) is an implementation concern, not part of this term's definition.

> **Note on "Session"**: this glossary's **Session Manifest** (a VOD training playthrough) and the authentication layer's `session` table (a login session) are different concepts that happen to share a name. Not a conflict today since no login UX exists yet — but if login UX is ever built, disambiguate explicitly (e.g. "training session" vs. "auth session") rather than letting "session" mean both.

---

## 2. Interactive Module Types

* **Strategy Module**  
  A scenario presented during pre-fight or fight setup moments testing macro planning, target prioritization, team composition win conditions, and high-level pathing.

* **Tactics Module**  
  A strictly timed mid-fight scenario testing micro opportunity recognition (e.g. anti-nade windows, vulnerable targets, target focus shifts). Has a hard 3-second response window.

* **Ultimate Tracking Module**  
  A scenario requiring the user to estimate an enemy hero's current ultimate charge percentage based on fight duration, damage dealt, and kill feed cues.

* **Cooldown Tracking Module**  
  A scenario requiring the user to determine whether a key enemy ability (e.g. Ana Sleep Dart, Baptiste Immortality Field, Kiriko Suzu) is available or on cooldown.

* **Spatial Awareness Module**  
  A scenario requiring the user to identify the physical location or flank route of an unseen enemy threat based on audio cues, visual kill feed, or team positioning.

---

## 3. Architecture & Engine Terms

* **Time Sync Poller**  
  The client-side background timer operating on a 1-second interval to compare current video playback time against the next scenario's target timestamp.

* **Pause Interceptor**  
  The mechanism that halts YouTube video playback when `currentTime >= scenario.timestamp_seconds` and transfers control to the Interactive Overlay Engine.

* **Scenario Overlay**  
  The interactive decision overlay component that renders when video playback pauses at a curated scenario timestamp across all 5 learning module types.

* **Tactical Drawer**  
  The desktop responsive drawer layout presentation of the Scenario Overlay, docking alongside the video player on large viewports.

* **Scenario Countdown Timer**  
  A visual countdown timer active during timed scenario modules (with Tactics defaulting to 3000ms, and other modules/scenarios configurable). If the countdown reaches zero before an answer is submitted, the scenario records an automatic FAIL (Timeout).

* **Tactics Countdown Timer**  
  The canonical 3-second instance of the Scenario Countdown Timer active strictly during Tactics modules.

* **Polymorphic Input Payload (`input_config`)**  
  A flexible JSON document structure embedded within each scenario record that specifies the input mechanism (`MULTIPLE_CHOICE`, `PERCENT_SLIDER`, `MAP_PIN_2D`) and validation constraints without hardcoding database schema structures.

* **Module Filter**  
  User-configured pre-session settings that filter which scenario module types are active during a VOD playthrough (e.g., allowing a user to isolate and practice only Ultimate Tracking).

* **Pre-Session Module Filter UI**  
  Interactive pill toggle interface on the VOD detail landing view allowing users to customize active scenario modules before initiating a session.

* **Timeline Manifest Endpoint**  
  The endpoint serving the ordered Session Manifest, filtered dynamically by module selection. See the route handler for the current path and query parameters.

* **Tab Visibility Sync**  
  An automated event listener that pauses video playback whenever the user switches browser tabs, preventing missed scenario triggers.
