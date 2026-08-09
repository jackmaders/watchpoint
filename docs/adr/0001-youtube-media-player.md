# ADR-001: Third-Party YouTube Media Strategy & Minimal Custom Player Wrapper

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Engineering / Product Architecture  

---

## Context

Watchpoint requires video playback of full 10-to-40-minute high-level ranked Overwatch 2 gameplay VODs. The platform must pause playback at specific timestamp markers to prompt the user with interactive decision scenarios.

Storing and serving full 40-minute high-bitrate VOD assets directly incurs substantial cloud storage costs, egress bandwidth fees, and video encoding infrastructure overhead. Conversely, third-party video hosting platforms (specifically YouTube) eliminate bandwidth and storage costs but introduce synchronization constraints (e.g. 250ms–500ms API polling latency).

---

## Decision

We will use **YouTube Embedded IFrame API** as the primary media streaming provider for Watchpoint VODs.

To maintain pedagogical focus and prevent cheating, we will apply the following constraints:
1. **Hide Native Player Controls**: YouTube native controls are hidden via iframe configuration (`controls=0`).
2. **Minimal Custom Player Wrapper**: The custom Watchpoint player UI provides only **Play**, **Pause**, and **Replay Scenario** actions. Freeform timeline scrubbing/seeking is disabled during interactive practice sessions.
3. **1-Second Marker Synchronization**: Scenario trigger timestamps operate on 1-second intervals with an accepted $\pm 500\text{ms}$ polling tolerance via a client-side polling timer (`player.getCurrentTime()`).
4. **Visibility Event Handling**: The Page Visibility API (`document.hidden`) automatically invokes `player.pauseVideo()` if a user switches tabs, maintaining state synchronization.

---

## Consequences

### Positive
* **Zero Storage & Egress Costs**: Video hosting and CDN streaming costs are fully offloaded to YouTube.
* **Simplified Infrastructure**: No custom video processing, transcoding pipelines, or HLS streaming infrastructure required.
* **Simplified Player State**: Disabling freeform scrubbing eliminates complex edge cases (e.g. scrubbing past missed scenarios).

### Negative / Trade-Offs
* **Polling Latency**: YouTube API polling is subject to $\pm 500\text{ms}$ jitter. Scenario pause points must be authored with a brief safety margin.
* **Third-Party Dependency**: Platform availability and video accessibility depend on YouTube availability and video un-listing/removal status.
