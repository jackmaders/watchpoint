# YouTube video package comparison

Checked 2026-09-24. Sources are limited to npm package pages/metadata and the
projects' own GitHub repositories, releases, package manifests, READMEs, and
official documentation.

## Bottom line

**Recommendation: evaluate `react-player` v3.4.0 first.** Its v3 YouTube
player is an HTML-media-shaped adapter, exposes `onTimeUpdate`, and accepts a
React ref with media methods. That makes it the closest fit for the existing
cue/sync seam, although the cue scheduler would still be application code.
Its trade-off is a broad multi-provider package with lazy provider chunks and
ten direct runtime dependencies.

`media-chrome` v4.19.2 is a good companion when the primary need is custom
controls, but it is not a YouTube player or a cue scheduler. Its YouTube story
requires the separate `youtube-video-element` adapter. `youtube-player` v5.6.0
is a small low-level API wrapper that can replace the iframe-loader plumbing,
but it is old, promise-based, and still leaves React lifecycle and cue timing
to us. `@next/third-parties` v16.3.5 is not a fit for this TanStack Start app:
it is a Next.js-specific, experimental lazy embed with no imperative player
seam.

The current custom slice expects synchronous player operations such as
`getCurrentTime`, `pauseVideo`, and `seekTo`; see the [adapter contract](../../src/shared/video/types.ts)
and [sync engine](../../src/shared/video/sync-engine.ts). This matters when
interpreting the ratings below.

## Comparison

| Package | Version and cadence (fact) | Relevant features (fact) | Dependencies, output, and performance signals (fact) | Cue-driven pauses in React/TanStack Start |
|---|---|---|---|---|
| [`react-player`](https://www.npmjs.com/package/react-player?activeTab=versions) | `3.4.0`, latest; GitHub released it 2025-11-13. The preceding `3.3.3` was 2025-09-19 and the v3 line had a concentrated release burst in July–November 2025. The README says Mux is taking over maintenance and intends a higher fix/release rate. | React component for YouTube and other providers; `onTimeUpdate`, pause/play/seek/rate/volume callbacks and media-like instance methods; `light` mode defers the full player until interaction; YouTube playlists are supported in v3. The v3 implementation lazy-loads the YouTube provider through `youtube-video-element`. | Ten direct runtime dependencies, including `youtube-video-element`; React/React DOM peers support 17, 18, and 19. Ships ESM `dist` with subpath exports and uses `import()`/React lazy provider chunks; v3 removed CJS/IIFE/standalone bundles. This favors provider-level code splitting but adds provider dependency surface. | **Best fit, with inference.** The documented HTMLMediaElement-shaped ref, `onTimeUpdate`, and YouTube adapter are enough to build an adapter around the existing scheduler; the package does not itself offer Questions/cues. Guard the player mount at the browser boundary and verify SSR/build output in TanStack Start. |
| [`media-chrome`](https://www.npmjs.com/package/media-chrome?activeTab=versions) | `4.19.2`, latest stable; releases were frequent from February through June 2026 (`4.18.0`–`4.19.2`). A `4.19.3-canary.2` build exists. | Custom-element controls and React wrappers: play, seek, time range/display, mute, volume, rate, fullscreen, captions, keyboard shortcuts, responsive/control-bar behavior. Media Chrome requires a slotted element exposing an HTML-media-like API. Official docs show YouTube through the separate `youtube-video-element` package. | One direct runtime dependency (`ce-la-react`). Builds ESM and CJS modules, minified IIFE bundles, TypeScript declarations, custom-elements metadata, and React wrappers; targets ES2019. The project advertises a bundle-size badge, but no exact official min+gzip figure was used here. | **Controls only.** With `youtube-video-element` (or a ReactPlayer v3 media element), Media Chrome can present controls around the player. Cue detection, pause-before/at-cue, seek clamping, and Question state remain application logic. It is a good UI layer, not a replacement for the custom sync seam by itself. |
| [`@next/third-parties`](https://www.npmjs.com/package/%40next/third-parties?activeTab=versions) | `16.3.5`, latest npm tag when checked; the package follows Next’s release/canary cadence and remains marked experimental. Next’s official repo already has a newer `16.3.6` release, while this package’s stable manifest/tag is still `16.3.5`. | `YouTubeEmbed` accepts `videoid`, dimensions, accessibility label, styles, and a query-string `params` value such as `controls=0`, `start`, and `end`. It loads a `lite-youtube-embed`-style preview/embed for faster initial loading. | One runtime dependency (`third-party-capital`); published files are `dist` plus declarations, built by TypeScript. The implementation imports `next/script`, generates HTML/scripts through `third-party-capital`, and renders the HTML with `dangerouslySetInnerHTML`; it is not a player object. | **No, for this app.** The package has a `next` peer and directly imports `next/script`; the official component exposes no ref, current-time callback, pause method, or state event. This is an inference from the source shape, corroborated by an official unanswered discussion about accessing the underlying JS API. It is suitable for a simple Next.js embed, not cue-driven Lessons in TanStack Start. |
| [`youtube-player`](https://www.npmjs.com/package/youtube-player?activeTab=versions) | `5.6.0`, latest; npm reports it was published about four years ago. GitHub shows `5.6.0` as the latest release; the prior stable releases are much older. | Promise-based abstraction over the YouTube IFrame Player API. It avoids overwriting the global ready callback, queues calls until `onReady`, proxies YouTube events through `player.on`/`off`, and exposes the underlying API methods. | Three direct runtime dependencies: `debug`, `load-script`, and `sister`. The package publishes only `dist`; its build transpiles Flow source with Babel and copies source annotations. The README says built output does not include polyfills. No official min+gzip size was found in the permitted sources. | **Yes, but only as a low-level adapter; inference.** It has the needed pause/seek/current-time/state API, but every method is promise-wrapped and it does not provide a cue scheduler or documented `timeupdate` stream. A React hook must be client-only, cache/poll current time, unsubscribe events, and adapt async methods before the existing synchronous engine can use it. |

## Package-specific findings

### `react-player`

**Facts.** The README documents `onTimeUpdate`, `onPause`, `onSeeking`,
`onSeeked`, `playing`, `playbackRate`, `volume`, `muted`, and ref-based methods.
It explicitly recommends code splitting: the selected provider is loaded in
additional chunks so the main bundle can be smaller. The package manifest
declares React 17–19 peers and the provider dependencies, while the source
registers YouTube as a lazy `youtube-video-element/react` player.

Recent v3 changes are relevant: v3 was a TypeScript/function-component
rewrite, switched to media-elements for Media Chrome compatibility, removed
CJS/IIFE/standalone bundles, and added React 19 support. v3.4.0 then improved
accessibility/code quality, upgraded player dependencies, and added
`disableRemotePlayback`; v3.3.3 fixed an HLS configuration bug and upgraded
dependencies. See the [README](https://github.com/cookpete/react-player#readme),
[package.json](https://raw.githubusercontent.com/cookpete/react-player/master/package.json),
[provider registry](https://raw.githubusercontent.com/cookpete/react-player/master/src/players.ts),
and [release history](https://github.com/cookpete/react-player/releases).

**Inference for Watchpoint.** A thin adapter can translate the media-shaped ref
to the existing `YouTubePlayerAdapter`; the main design question is whether
the engine should consume `onTimeUpdate` or keep a polling loop for tighter
cue windows. The package removes most iframe/API lifecycle code but does not
encode VOD Questions or “pause, show Question, then resume” policy.

The refactor uses ReactPlayer's factory with only its YouTube provider instead
of the default all-provider entry. This preserves the ReactPlayer/media
contract while preventing unrelated HLS and DASH provider chunks from being
emitted into the client build.

### `media-chrome`

**Facts.** Media Chrome’s contract is explicit: the slotted media element must
expose the relevant HTML media API and events. Its official YouTube example
uses `<youtube-video>` plus `<media-controller>`, and its React docs expose
PascalCase wrappers from `media-chrome/react`. The latest releases include
casting-state and accessibility fixes, Safari playback-rate display rounding,
memory-leak fixes, hotkey support, and improved accessibility labels.

See the [media-element contract](https://www.media-chrome.org/docs/en/media-element),
[YouTube integration docs](https://www.media-chrome.org/docs/en/media-elements/youtube-video),
[React docs](https://www.media-chrome.org/docs/en/react/get-started),
[package.json](https://raw.githubusercontent.com/muxinc/media-chrome/main/package.json),
and [release history](https://github.com/muxinc/media-chrome/releases).

**Inference for Watchpoint.** This is attractive if the custom slice’s visual
controls are the part to replace. It should sit above a player adapter rather
than own the Lesson/Question timing policy. Using it with the official
`youtube-video-element` adds another package and custom-element boundary; using
it with ReactPlayer v3 may be the cleanest composition because ReactPlayer v3
was deliberately updated for Media Chrome interoperability.

### `@next/third-parties`

**Facts.** The official Next docs describe the package as experimental and
recommend installing the latest or canary version. `YouTubeEmbed` delegates to
`third-party-capital`, then `ThirdPartyScriptEmbed` inserts generated HTML and
loads scripts with `next/script` strategies. Its public type contains only
embed/layout parameters; its package manifest declares a Next peer and exports
only `./google`.

The official repo also has an unanswered discussion about accessing the
underlying YouTube JS API, and an issue documenting autoplay limitations of the
lite embed approach. Those are practical signals that its performance-oriented
embed is intentionally not a controllable player abstraction. See the
[Next guide](https://nextjs.org/docs/app/guides/third-party-libraries),
[YouTube component source](https://raw.githubusercontent.com/vercel/next.js/canary/packages/third-parties/src/google/youtube-embed.tsx),
[embed wrapper source](https://raw.githubusercontent.com/vercel/next.js/canary/packages/third-parties/src/ThirdPartyScriptEmbed.tsx),
[v16.3.5 manifest](https://raw.githubusercontent.com/vercel/next.js/v16.3.5/packages/third-parties/package.json),
[API discussion](https://github.com/vercel/next.js/discussions/63791), and
[autoplay issue](https://github.com/vercel/next.js/issues/77447).

**Inference for Watchpoint.** Even if its markup could be rendered outside
Next, importing a component that depends on `next/script` defeats the goal of a
small TanStack Start integration and leaves no usable player seam for cue
polling or pause/seek commands.

### `youtube-player`

**Facts.** The README describes a factory whose methods return promises and are
queued until the player is ready. The implementation proxies YouTube events
through an emitter and wraps the API function set; the state map specifically
handles readiness for `pauseVideo`, `playVideo`, and `seekTo`. It also supports
passing an existing `YT.Player` instance. The latest release’s only listed fix
is correcting the semantic-release configuration; the preceding notable fixes
are from 2018–2019.

See the [README](https://github.com/gajus/youtube-player#readme),
[package.json](https://github.com/gajus/youtube-player/blob/main/package.json),
[factory](https://raw.githubusercontent.com/gajus/youtube-player/main/src/index.js),
[promise/state wrapper](https://raw.githubusercontent.com/gajus/youtube-player/main/src/YouTubePlayer.js),
[state map](https://github.com/gajus/youtube-player/blob/main/src/FunctionStateMap.js),
and [releases](https://github.com/gajus/youtube-player/releases).

**Inference for Watchpoint.** It is a reasonable replacement only for the
iframe API loader/command queue. Its old release cadence, Flow/Babel output,
CommonJS-oriented package entry, missing React integration, and promise-based
sampling make it a weaker fit than ReactPlayer for this slice. It could still
be useful if the project wants to retain a deliberately small custom React
orchestrator around a low-level API wrapper.

## Decision guidance

- Choose **ReactPlayer** for the first replacement spike: verify SSR-safe
  mounting, `onTimeUpdate` cadence, ref methods, seek behavior, and YouTube
  autoplay/mobile behavior in the existing Lesson flow.
- Add **Media Chrome** if controls/theme work is the main cost; do not expect it
  to remove the cue scheduler or the YouTube adapter.
- Consider **youtube-player** only if minimizing the low-level iframe loader is
  more important than React ergonomics and maintenance cadence.
- Reject **@next/third-parties** for this TanStack Start slice; retain it only as
  a reference for lazy, click-to-load YouTube embeds in a Next.js application.
