# Watchpoint Domain Glossary & Ubiquitous Language

**Project**: Watchpoint — Interactive Overwatch 2 Game Sense Learning Platform  
**Status**: Living Specification  
**Last Updated**: 2026-08-06  

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

* **Tactics Countdown Timer**  
  A 3-second visual countdown active strictly during Tactics modules. If the countdown reaches zero before an answer is submitted, the scenario records an automatic FAIL (Timeout).

* **Polymorphic Input Payload (`input_config`)**  
  A flexible JSON document structure embedded within each scenario record that specifies the input mechanism (`MULTIPLE_CHOICE`, `PERCENT_SLIDER`, `MAP_PIN_2D`) and validation constraints without hardcoding database schema structures.

* **Module Filter**  
  User-configured pre-session settings that filter which scenario module types are active during a VOD playthrough (e.g., allowing a user to isolate and practice only Ultimate Tracking).

* **Tab Visibility Sync**  
  An automated event listener using the browser Page Visibility API (`document.hidden`) to pause video playback whenever the user switches browser tabs, preventing missed scenario triggers.
