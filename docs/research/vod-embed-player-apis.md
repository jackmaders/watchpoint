# Research Report: Third-Party VOD Embed Player APIs for Checkpoint Playback

**Ticket:** `wayfinder:research` — *Third-party VOD embed player APIs for checkpoint playback*
**Target Stack:** Watchpoint (TanStack Start + Feature-Sliced Design; see [ARCHITECTURE.md](../engineering/ARCHITECTURE.md))

---

## Executive Summary

- **Recommended MVP Provider:** Standardize on the **YouTube IFrame Player API** (`YT.Player`, ideally via `youtube-nocookie.com` privacy-enhanced embeds where permitted) behind a strict application-owned player adapter interface.
- **Why YouTube Wins over Twitch for MVP:** YouTube supports playback speed control (`setPlaybackRate`), parameter-level hiding of the transport bar and keyboard shortcuts (`controls=0`, `disablekb=1`, `fs=0`, `iv_load_policy=3`), indefinite VOD persistence, and matches where OWCS archives, pro POVs, and Overwatch coaching VODs actually live. Twitch VODs expire in **7–60 days**, lack a playback-speed API, cannot disable pre-roll ads or reliably hide native UI controls via documented embed parameters, and face cross-site auth breakage on subscriber-only archives.
- **Critical Unfixable Trade-off:** Neither YouTube nor Twitch allows third-party embeds to remove pause-state overlays (`showinfo` deprecated Sep 2018; `modestbranding` deprecated Aug 2023; `rel=0` only scopes suggestions to the same channel). Both platforms' developer terms also forbid placing visual overlays or frames in front of the embedded player. Watchpoint must therefore design its custom transport bar and Checkpoint UX **adjacent to** (never overlaid on top of) the 16:9 player viewport and address pause-screen Overwatch HUD occlusion through playback workflow (e.g., slow-motion `0.25x`, concise jump/step controls) rather than DOM overlays.

---

## 1. Programmatic Playback Control & Checkpoint Polling Precision

### 1.1 YouTube IFrame Player API (`YT.Player`)

Source: [YouTube IFrame Player API Reference](https://developers.google.com/youtube/iframe_api_reference)

| Capability | API Surface | Notes & Constraints |
| :--- | :--- | :--- |
| **Load / Cue** | `cueVideoById(...)`, `loadVideoById(...)` | `cueVideoById` loads thumbnail/metadata without playing; `loadVideoById` loads and starts playback. |
| **Play / Pause** | `playVideo()`, `pauseVideo()` | Asynchronous `postMessage` bridge to iframe. Programmatic `playVideo()` without prior user gesture can be blocked by browsers. |
| **Seek** | `seekTo(seconds, allowSeekAhead)` | Preserves current state when `PAUSED`; continues/starts playback from `seconds` if `PLAYING` or `CUED`. Advances to **closest keyframe before `seconds`** unless the segment is already buffered. |
| **Time / Duration** | `getCurrentTime(): Number`, `getDuration(): Number`, `getVideoLoadedFraction(): Number` | Returns elapsed playback seconds (float). `getDuration()` returns `0` until metadata loads. |
| **Playback Speed** | `getPlaybackRate()`, `setPlaybackRate(suggestedRate)`, `getAvailablePlaybackRates()` | Supports rates such as `0.25`, `0.5`, `1`, `1.5`, `2` (actual list returned by `getAvailablePlaybackRates()`). Fires `onPlaybackRateChange`. |
| **State Query** | `getPlayerState(): Number` | `YT.PlayerState`: `-1` (`UNSTARTED`), `0` (`ENDED`), `1` (`PLAYING`), `2` (`PAUSED`), `3` (`BUFFERING`), `5` (`CUED`). |
| **Lifecycle / DOM** | `getIframe()`, `destroy()` | Clean teardown via `destroy()` removes the generated `<iframe>`. |
| **Events** | `onReady`, `onStateChange`, `onPlaybackRateChange`, `onPlaybackQualityChange`, `onAutoplayBlocked`, `onError`, `onApiChange` | **No `timeupdate` event exists.** `onError` delivers integer codes: `2` (invalid param), `5` (HTML5 playback error), `100` (not found/private/removed), `101`/`150` (owner disallows embedding). `onAutoplayBlocked` fires when browser blocks scripted/autoplay playback. |

### 1.2 Twitch Interactive Frames API (`Twitch.Player`)

Source: [Twitch Embedded Video & Clips](https://dev.twitch.tv/docs/embed/video-and-clips/)

| Capability | API Surface | Notes & Constraints |
| :--- | :--- | :--- |
| **Load / Switch** | `new Twitch.Player(elementId, options)`, `setVideo(videoId, timestamp)` | Requires `https://player.twitch.tv/js/embed/v1.js`. Video IDs in URL query params use `"v"` prefix; JS options pass VOD ID. |
| **Play / Pause** | `play()`, `pause()` | Synchronous JS wrapper calls over iframe messaging; unmuted `play()` without user gesture triggers `PLAYBACK_BLOCKED`. |
| **Seek** | `seek(timestampSeconds)` | **VOD-only** (not supported on live streams). Emits `Twitch.Player.SEEK`. |
| **Time / Duration** | `getCurrentTime(): Float`, `getDuration(): Float` | **VOD-only**; returns seconds as `Float`. |
| **Playback Speed** | *Not supported* | **No `setPlaybackRate()` method exists.** (`playbackRate` inside `getPlaybackStats()` reports video bitrate in Kbps, not playback speed.) |
| **State Query** | `isPaused(): Boolean`, `getEnded(): Boolean`, `getPlaybackStats()` | `isPaused()` returns `false` while **buffering or seeking** (must also track `PLAY`/`PLAYING`/`PAUSE` events rather than trusting `!isPaused()` alone as "advancing"). |
| **Events** | `addEventListener(event, cb)` | `READY`, `PLAY`, `PLAYING`, `PAUSE`, `ENDED`, `SEEK` (payload has `position`), `PLAYBACK_BLOCKED`, `ONLINE`, `OFFLINE`, `CAPTIONS`. **No `timeupdate` event exists.** |

### 1.3 Polling Precision, `seekTo` Latency, and Avoiding Double-Triggers

1. **Why Polling Is Required & How `getCurrentTime()` Behaves:**
   - Neither YouTube ([IFrame API Reference](https://developers.google.com/youtube/iframe_api_reference)) nor Twitch ([Video & Clips API](https://dev.twitch.tv/docs/embed/video-and-clips/)) exposes a native `timeupdate` event.
   - Internally, YouTube's client wrapper (`widgetapi.js`) receives periodic `infoDelivery` `postMessage` frames from the iframe and **interpolates** `getCurrentTime()` between updates while `PLAYING` using cached `currentTime`, `currentTimeLastUpdated_`, and `playbackRate`. Consequently, `player.getCurrentTime()` is a **synchronous read of host-side cached/interpolated state** (not an async cross-origin round-trip), though its underlying synchronization ticks arrive discretely (~250ms cadence) and raw `infoDelivery` listeners are undocumented/unsupported.
2. **`requestAnimationFrame` vs. `setInterval` Polling:**
   - **`setInterval` (e.g., `100ms`–`250ms`):** Lower wakeup frequency, but a `250ms` interval introduces up to `250ms` overshoot at `1x` (and `500ms` at `2x` speed) before a Checkpoint pause executes, plus visible playhead stutter on custom scrubbers.
   - **`requestAnimationFrame` (gated strictly to active `PLAYING` state):** Runs aligned to display paint (~16.6ms at 60Hz) and pauses automatically when the tab is backgrounded ([MDN `requestAnimationFrame`](https://developer.mozilla.org/)). Because `getCurrentTime()` reads interpolated state locally, a `rAF` loop active *only* between `PLAYING` and `PAUSE`/`BUFFERING`/`ENDED` detects Checkpoint crossings within one animation frame (~16ms of interpolated time) while keeping custom scrubber UI smooth and consuming zero cycles while paused.
3. **`seekTo(seconds, allowSeekAhead)` Scrubbing & Keyframe Precision:**
   - Per [YouTube IFrame API Reference](https://developers.google.com/youtube/iframe_api_reference), `allowSeekAhead: false` restricts seeking to buffered data and prevents flooding servers with range requests during continuous mouse dragging; pass `allowSeekAhead: true` only on final release (`pointerup`) or discrete Checkpoint jumps.
   - **Keyframe undershoot hazard:** `seekTo(t, true)` advances to the **closest keyframe prior to `t`** if unbuffered. Seeking directly to a Checkpoint at `t = 42.3s` may land at `t = 40.0s`. If playback immediately resumes, `currentTime` will cross `42.3s` two seconds later and could falsely re-trigger the same Checkpoint!
4. **Preventing Double-Triggering & Re-Trigger Loops:**
   - **Edge-crossing detector (not threshold `>=`):** Only auto-pause when `prevTime < checkpoint.timeSec && currentTime >= checkpoint.timeSec` (bounded by a max step delta like `currentTime - prevTime < 1.5 * maxExpectedStep` so manual forward seeks don't fire every skipped Checkpoint along the way).
   - **Consumed / active Checkpoint latch:** When a Checkpoint triggers `pause()`, record `consumedCheckpointId = checkpoint.id` (or add to a session `consumedSet` keyed by checkpoint ID + play direction). When the user hits **Play/Resume**, do **not** re-trigger that Checkpoint until either:
     - the playhead has moved past `checkpoint.timeSec + epsilon`, OR
     - the user explicitly seeks backward before `checkpoint.timeSec` (clear checkpoints with `timeSec > seekTarget` from `consumedSet`), OR
     - the user clicks a Checkpoint pill to jump to it (in which case: `seekTo(checkpoint.timeSec, true)` + `pause()`, and mark `checkpoint.id` as currently parked/consumed so clicking Play advances forward cleanly instead of re-pausing if keyframe snapping landed slightly before `checkpoint.timeSec`).

---

## 2. Custom Transport Control & Scrubbing Lock

### 2.1 YouTube Player Parameters Matrix

Source: [YouTube Embedded Players and Player Parameters](https://developers.google.com/youtube/player_parameters)

| Parameter | Setting for Watchpoint | Behavior & Status |
| :--- | :--- | :--- |
| `controls` | `0` | Hides bottom native transport bar (play/pause, scrubber, volume, captions, settings, fullscreen). **Does NOT disable click-to-pause on the video surface**, nor does it hide top title bar or pause overlay. |
| `disablekb` | `1` | Disables YouTube's built-in keyboard shortcuts (`Space`, `K`, `J`, `L`, arrows, `F`, `0–9`), preventing users from bypassing custom transport/scrubbing locks via keyboard. |
| `fs` | `0` | Hides the fullscreen button. |
| `rel` | `0` | **Changed Sep 25, 2018:** No longer disables related videos. Restricts related/paused suggestions to videos **from the same channel only**. |
| `modestbranding` | *(omit)* | **Deprecated Aug 15, 2023 — no effect.** YouTube determines branding automatically based on player size, `controls`, and other signals. |
| `showinfo` | *(omit)* | **Deprecated Sep 25, 2018 — no effect.** Video title and uploader avatar always show before playback, on pause, and on end. |
| `iv_load_policy` | `3` | Suppresses video annotations. |
| `playsinline` | `1` | Prevents iOS WebKit/Safari from forcing native fullscreen playback (which hijacks custom UI and breaks Checkpoint overlays/controls). |
| `enablejsapi` | `1` | Required for `YT.Player` JS API communication. |
| `origin` | `window.location.origin` | Recommended security parameter when `enablejsapi=1`; ensures `postMessage` origin verification succeeds. |

### 2.2 Twitch Embed Options Matrix

Source: [Twitch Embedded Video & Clips](https://dev.twitch.tv/docs/embed/video-and-clips/) and [Twitch Embedding Everything](https://dev.twitch.tv/docs/embed/everything/)

| Option | Type / Value | Behavior & Documentation Reality |
| :--- | :--- | :--- |
| `video` | `string` | VOD ID (`"v..."` in iframe URL query params; ID string in JS options). |
| `parent` | `string[]` (required) | Domain(s) hosting the embed (no protocol/path; SSL/HTTPS required on host). Mismatch blocks playback entirely. |
| `autoplay` | `boolean` | Defaults: `true` for non-interactive video/VOD iframes, `false` for interactive `Twitch.Player` / clips. Subject to visibility and browser policies. |
| `muted` | `boolean` | Default `false`; required `true` for un-gestured autoplay. |
| `time` | `string` (e.g. `"0h15m30s"`) | Initial VOD start timestamp (`0h0m0s` default). |
| `controls` | *(undocumented / unsupported in current official parameter tables)* | Not listed in official `dev.twitch.tv/docs/embed/video-and-clips/` non-interactive or standard option tables; historically `controls: false` worked inconsistently on `Twitch.Player` JS only (and failed on `Twitch.Embed`), while Twitch docs treat native controls and Twitch branding as mandatory compliance elements. |

### 2.3 Pointer-Events Shielding, Autoplay/User-Gesture Constraints, & Terms of Service

1. **Why Click-Locking Matters:**
   - Even with YouTube `controls=0&disablekb=1`, a user clicking directly inside the `<iframe>` pauses/plays natively (desyncing UI state if not tracked, or revealing YouTube's pause overlay) or clicks the top title/"Watch on YouTube" links to navigate away.
   - Setting `pointer-events: none` on the `<iframe>` CSS (or placing a transparent intercept layer over the frame) blocks iframe clicks and disables native scrubbing, routing all play/pause/seek actions through Watchpoint's custom transport bar.
2. **Terms of Service & Policy Conflict (CRITICAL):**
   - **YouTube Required Minimum Functionality — "Overlays and frames"** ([RMF](https://developers.google.com/youtube/terms/required-minimum-functionality), [Developer Policies](https://developers.google.com/youtube/terms/developer-policies)):
     > *"You must not display overlays, frames, or other visual elements in front of any part of a YouTube embedded player, including player controls. Similarly, you must not use overlays, frames or other visual elements to obscure any part of an embedded player, including player controls."*
   - **YouTube Minimum Dimensions:** Embedded players must have a viewport **at least 200 × 200 px** (recommended minimum **480 × 270 px** for 16:9). Apps using YouTube API Services must also display/link the [YouTube Terms of Service](https://www.youtube.com/t/terms) and disclose Google API usage + [Google Privacy Policy](https://policies.google.com/privacy) in their privacy policy.
   - **Twitch Developer Services Agreement** ([Developer Agreement](https://www.twitch.tv/p/en/legal/developer-agreement/)): Prohibits modifying, replacing, interfering with, blocking, covering, or obscuring Twitch embeddable experiences, ads, or Twitch Marks; Twitch also restricts playback/autoplay if it detects an obscured iframe, and **prohibits charging fees specifically to access Twitch embeddable experiences**.
   - **Implication for Watchpoint:** Putting a DOM overlay (`<div>` click-catcher, custom pause banner, or HUD annotations) **on top of** the YouTube/Twitch iframe violates YouTube's "Overlays and frames" policy (and risks Twitch feature disabling/agreement breach). Place all Watchpoint custom controls, Checkpoint scrubber track, and review notes **strictly outside/below** the iframe container. For click-to-pause prevention, applying `pointer-events: none` directly on the `<iframe>` has no visual overlay element, **but** still interferes with direct user access to attribution/links and creates a WebKit user-gesture trap (see below) — so evaluate carefully whether `pointer-events: none` should only engage *after* playback starts or be omitted in favor of `controls=0` + `disablekb=1` + `onStateChange` synchronization.
3. **Cross-Origin Autoplay & User-Gesture Caveats:**
   - Per [MDN Autoplay Guide](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide), cross-origin iframes require `allow="autoplay"` (and must not be blocked by `Permissions-Policy: autoplay=()`), and audible programmatic `play()` calls without valid user activation fail (`onAutoplayBlocked` in YouTube; `Twitch.Player.PLAYBACK_BLOCKED` in Twitch).
   - **iOS Safari / Mobile WebKit:** Clicking a custom Play button in the parent document and calling `player.playVideo()` over `postMessage` does **not** reliably pass cross-origin user activation inside iOS Safari unless playback starts **muted** (`mute: 1` + `playsinline: 1`, then `unMute()` inside a user tap handler) or the user taps directly inside the iframe. Permanently setting `pointer-events: none` on the iframe before first playback can prevent mobile users from ever unblocking playback natively.

---

## 3. Pause-State Visual Clutter vs. Overwatch HUD Visibility

### 3.1 Native Pause Chrome Comparison (Unremovable Cross-Origin Elements)

Because both players render inside cross-origin `<iframe>` elements, the browser's Same-Origin Policy blocks any parent CSS from hiding internal classes (such as YouTube's `.ytp-pause-overlay`, `.ytp-chrome-top`, `.ytp-watermark`).

| Region of 16:9 Frame | YouTube Embed (Paused via `pauseVideo()`, `controls=0&rel=0&iv_load_policy=3`) | Twitch Embed (Paused via `pause()`) |
| :--- | :--- | :--- |
| **Top Bar** | Dark top gradient scrim, channel avatar + video title (top-left), **"Watch later"** + **"Share"** buttons (top-right). Using `youtube-nocookie.com` collapses Watch Later / Share into a smaller **"Copy link"** control, but the top bar remains. | Channel avatar, streamer name, VOD title, game category (top-left), Follow / Subscribe / Share controls (top-right). |
| **Center** | Center Play icon button; dark scrim on hover/pause. | Dimmed dark backdrop scrim across frame + large center Play icon. |
| **Bottom Band (~25–30% height)** | **"More videos"** drawer/carousel (same-channel suggestions with `rel=0`) + dismiss `X` button; persistent YouTube logo watermark in bottom-right corner (`modestbranding` deprecated). | Persistent bottom control bar (play/pause, timeline scrubber, timestamps, volume, settings, fullscreen, Twitch mark) + bottom gradient scrim. |

### 3.2 Spatial Collision Map Against Overwatch 2 In-Game HUD

Overwatch 2 locks its HUD elements to screen edges with no native drag-and-drop repositioning:

| Overwatch 2 HUD Zone | Gameplay Info Coaches Inspect on Pause | YouTube Pause Collision | Twitch Pause Collision | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **Bottom-Center** | **Ultimate Charge Meter (`0–100%`)** and hero-specific resource gauges | Directly covered by the **"More videos"** thumbnail carousel | Covered by native bottom scrubber & timestamp bar | **High (Critical)** |
| **Bottom-Left** | **Hero Portrait, Health / Armor / Shield segments, Perks**, & team chat context | Covered by left side of **"More videos"** carousel | Covered by bottom-left play/volume controls & dark gradient | **High** |
| **Bottom-Right** | **Ability Cooldowns & Weapon Ammo Counter** | Covered by right side of **"More videos"** shelf + **`.ytp-watermark` YouTube logo** | Covered by bottom-right quality/fullscreen/Twitch logo controls | **High** |
| **Top-Right** | **Killfeed** (eliminations, assists, ability icons, Mercy Rez) | Partially obscured by top gradient + **"Watch later" / "Share"** (or **"Copy link"**) buttons | Obscured by top-right **Follow / Share** buttons & top scrim | **Medium–High** |
| **Top-Left / Top-Center** | **Objective / Payload Progress %, Capture Ticks, Overtime / Contested status**, & Spectator/Replay Team Rosters | Top-left rosters/status covered by **channel avatar + video title**; top-center partially darkened by gradient scrim | Top-left covered by **streamer avatar + VOD title + category**; top-center darkened by scrim | **Medium–High** |
| **Center Viewport** | **Crosshair / Reticle**, enemy sightlines, hit-markers | Center play button overlaps exact reticle | Heavy dimmed scrim + large center play glyph degrades contrast | **Medium** |

### 3.3 Concrete Mitigations & Hard Limitations

**What Watchpoint CANNOT do:**
- Cannot suppress YouTube's **"More videos"** shelf, top title bar, or bottom-right YouTube logo via any official URL parameter or API call ([Player Parameters](https://developers.google.com/youtube/player_parameters)).
- Cannot CSS-crop the top/bottom bars via `overflow: hidden` — Overwatch's most critical telemetry (health, ult, cooldowns, killfeed, objective) lives in those exact edge bands, so cropping the embed would cut off the game HUD itself (and violate YouTube RMF).
- Cannot place custom React pause-state overlays or opaque covers over the iframe (violates [YouTube RMF](https://developers.google.com/youtube/terms/required-minimum-functionality) and [Twitch Developer Agreement](https://www.twitch.tv/p/en/legal/developer-agreement/)).

**Mitigations Watchpoint SHOULD implement:**
1. **Default to `youtube-nocookie.com` + `rel=0&controls=0&iv_load_policy=3&disablekb=1&fs=0`:** Eliminates end-card annotations (`iv_load_policy=3`), removes the bottom transport bar (`controls=0`), restricts related thumbnails to the uploader's channel (`rel=0`), and condenses Watch Later + Share into a smaller single Copy Link control in the top-right (preserving more of the Overwatch killfeed).
2. **Zero-Overlay Workspace Layout:** Keep all Watchpoint UI (Checkpoint markers, timeline scrubber, `-5s` / `+5s` step controls, coaching notes, and playback speed selector) strictly **outside** the 16:9 player container so active playback has 100% unobstructed HUD visibility.
3. **Slow-Motion (`0.25x` / `0.5x`) Inspection Mode:** Expose `setPlaybackRate(0.25)` and `0.5` prominently in Watchpoint's custom transport bar. Unlike pausing, playing a key teamfight at `0.25x` lets coaches read Ultimate charge, cooldown timers, and killfeed order with **zero** YouTube pause-shelf occlusion.
4. **Quick-Jump Replay Loop (`-2s` / `-5s` before Checkpoint):** Because the YouTube pause drawer appears immediately when `pauseVideo()` runs at a Checkpoint, provide a 1-click "Rewatch Checkpoint (-3s)" / Resume button directly beneath the frame so reviewers can view the pre-pause HUD smoothly at `0.25x`–`1x` before or after reading the Checkpoint note.
5. **Post-MVP Clean-Pause Upgrade Path:** Document clearly in product expectations that third-party embeds always exhibit provider pause chrome; achieving completely zero-chrome frame-by-frame pause inspection requires first-party video storage (e.g., Cloudflare R2 + native `<video>`).

---

## 4. VOD Availability, Permanence, & MVP Recommendation

### 4.1 Twitch VOD Retention vs. YouTube Permanence

Source: [Twitch Help — Video on Demand](https://help.twitch.tv/s/article/video-on-demand) & [Twitch Help](https://help.twitch.tv/)

| Dimension | Twitch VODs | YouTube Videos | Impact on Watchpoint |
| :--- | :--- | :--- | :--- |
| **Standard Past Broadcast Retention** | **7 days** (non-Affiliate/standard), **14 days** (Affiliates), **60 days** (Partners, Prime, Twitch Turbo). Dual-format vertical/2K variants expire in **7 days**. | **Indefinite** (until uploader deletes/privates). | Twitch Checkpoint links suffer guaranteed **link rot** within 1–8 weeks unless manually highlighted. |
| **Permanent Highlights Cap** | Highlights & uploads do not expire on the 7–60 day timer, but are capped at **100 hours total per channel** (excess hours subject to automatic deletion). | No per-channel hour cap like Twitch's 100-hour highlight limit. | Even Twitch "Highlights" are no longer safely permanent for prolific streamers/coaches. |
| **Copyright Audio Muting** | Automated recognition (Audible Magic) silently mutes flagged VOD segments unless creator splits VOD audio track in OBS. | Typically claims monetization or blocks specific tracks; rarely selectively silences mid-game segments for gameplay POVs unless copyright-blocked. | Twitch coaching VODs from ranked streams with background music frequently lose comms/game audio mid-review. |
| **Access Gating & Ads** | Broadcasters can enable **Subscriber-only archives**; cross-site cookie restrictions frequently break sub auth inside embeds. Pre-roll/mid-roll ads cannot be disabled via `Twitch.Player`. | Unlisted/Public videos play cleanly in embeds (unless owner disables embedding -> `onError` `101`/`150`). | Sub-only gating and unskippable pre-roll ads break synchronous Checkpoint jumping on Twitch. |
| **Overwatch 2 POV Ecosystem** | Live OWCS broadcasts (`ow_esports`) and raw live coaching streams, which creators routinely export to YouTube afterward. | Official OWCS full match VOD archives (`Overwatch Esports`), community 1P pro POV archives (e.g., *OBS Sojourn*), structured ranked coaching channels, and player-uploaded POVs (since in-game OW2 replay codes break on patches). | Watchpoint's target catalog (persistent coaching reviews, OWCS matches, pro POVs) already concentrates on YouTube. |

### 4.2 MVP Recommendation & Adapter Architecture

1. **MVP Provider Decision:** **Standardize exclusively on YouTube (`YT.Player` via `youtube-nocookie.com` / IFrame Player API) for the Watchpoint MVP.**
   - Do **not** ship Twitch embed support in MVP: 7–60 day VOD expiration, the 100-hour highlight storage cap, missing `setPlaybackRate()`, un-suppressible pre-roll ads, and broken subscriber-only embed auth create high UX failure rates for minimal value (streamers already export reviewable Overwatch VODs to YouTube).
   - Handle `onError` codes (`100`, `101`, `150`) and `onAutoplayBlocked` gracefully in the UI (e.g., actionable message when an uploader disabled embedding or deleted a video).

2. **Isolating the Embed Behind an Adapter (per [ARCHITECTURE.md](../engineering/ARCHITECTURE.md)):**
   - Per **Dependency boundaries** in `docs/engineering/ARCHITECTURE.md`, vendor SDK calls (`window.YT`, `YT.Player`, script loading from `https://www.youtube.com/iframe_api`) must be isolated behind an application-owned adapter so domain logic and UI never import or depend on YouTube globals or `YT.PlayerState` integers directly.
   - **Recommended Module Split (FSD-compliant):**
     - **Page-local or shared adapter boundary:** Following `ARCHITECTURE.md`, if only the VOD Review page uses the player initially, keep the adapter contract and implementation in `src/pages/<vod-review>/model/` (or extract to `src/shared/lib/vod-player/` only once shared across 2+ pages).
     - **Vendor-agnostic contract (`VodPlayerAdapter` / `VodPlayerPort`):**
       - Normalized state enum: `"unstarted" | "cued" | "playing" | "paused" | "buffering" | "ended" | "error"`
       - Normalized error codes: `"EMBED_DISABLED" | "NOT_FOUND" | "INVALID_SOURCE" | "PLAYBACK_ERROR" | "AUTOPLAY_BLOCKED"`
       - Methods: `play()`, `pause()`, `seekTo(seconds, { allowSeekAhead })`, `getCurrentTime()`, `getDuration()`, `setPlaybackRate(rate)`, `getAvailablePlaybackRates()`, `setMuted(muted)`, `destroy()`
       - Subscriptions: `onStateChange`, `onPlaybackRateChange`, `onAutoplayBlocked`, `onError`
     - **Concrete Adapter (`YouTubeVodPlayerAdapter`):**
       - Owns idempotent loading of `https://www.youtube.com/iframe_api` (`onYouTubeIframeAPIReady` promise singleton).
       - Configures `youtube-nocookie.com` host (or standard `https://www.youtube.com` fallback if needed) with `playerVars`: `enablejsapi: 1`, `origin: window.location.origin`, `controls: 0`, `disablekb: 1`, `fs: 0`, `rel: 0`, `iv_load_policy: 3`, `playsinline: 1`.
       - Translates `YT.PlayerState` integers and `onError` (`2`, `5`, `100`, `101`, `150`) into Watchpoint domain events.
     - **Pure Checkpoint Engine (`model/checkpoint-engine.ts`):**
       - Consumes only `VodPlayerAdapter` and `requestAnimationFrame` while `"playing"`.
       - Encapsulates edge-crossing detection (`prevTime < cp.timeSec && currentTime >= cp.timeSec`), consumed-Checkpoint latching, backward-seek resets, and keyframe-undershoot guards—completely testable in Vitest with a fake `VodPlayerAdapter` without spinning up a real YouTube iframe.

---

## Primary Sources Cited

- **YouTube IFrame Player API Reference:** <https://developers.google.com/youtube/iframe_api_reference>
- **YouTube Embedded Players and Player Parameters:** <https://developers.google.com/youtube/player_parameters>
- **YouTube API Services – Required Minimum Functionality:** <https://developers.google.com/youtube/terms/required-minimum-functionality>
- **YouTube API Services – Developer Policies:** <https://developers.google.com/youtube/terms/developer-policies>
- **YouTube Terms of Service & Google Privacy Policy:** <https://www.youtube.com/t/terms> and <https://policies.google.com/privacy>
- **Twitch Embedded Video & Clips API:** <https://dev.twitch.tv/docs/embed/video-and-clips/>
- **Twitch Embedding Everything:** <https://dev.twitch.tv/docs/embed/everything/>
- **Twitch Developer Services Agreement:** <https://www.twitch.tv/p/en/legal/developer-agreement/>
- **Twitch Help – Video on Demand (Retention & Highlights Limit):** <https://help.twitch.tv/s/article/video-on-demand>
- **Twitch Help (Muted Audio & Subscriber-Only Archives):** <https://help.twitch.tv/>
- **MDN Web Docs – Autoplay Guide for Media and Web Audio APIs:** <https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide>
- **Watchpoint Architecture Conventions:** [docs/engineering/ARCHITECTURE.md](../engineering/ARCHITECTURE.md)
