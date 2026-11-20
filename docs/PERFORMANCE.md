# Engineering & performance notes

> **Position:** OUTPOST ZERO is optimized by architecture, not by unverified market-superlatives. No device-level FPS, INP, memory, or Lighthouse benchmark has been claimed.

## Design goals

| Area | Implementation | Why |
| --- | --- | --- |
| Runtime payload | HTML, CSS, native JavaScript modules, one shared SVG sprite | No React, bundler, UI framework, third-party icon code, or telemetry |
| Simulation | Deterministic resource engine with one-second steps | Predictable balancing and replayable unit tests |
| Map | 7 × 6 static grid; rebuilt on player actions, not each tick | Avoid repetitive DOM work for immobile terrain |
| HUD | One-second update cadence | Management decisions do not need a 60 Hz animation loop |
| Art | CSS planet illustration, custom SVG icons, hand-designed vector cover | Small scalable art; zero runtime image CDN dependencies |
| Persistence | LocalStorage with explicit export and import | No backend, no accounts, local-first progress |
| Offline | Small versioned service-worker app shell on HTTPS/localhost | Install and revisit with cached core assets |
| Accessibility | Native buttons, aria-labels, keyboard shortcuts, reduced-motion fallback | User input and clarity before decorative effects |
| Offline advancement | Bounded to 900 simulation seconds per restoration | Predictable boot time, no multi-hour blocking calculation |
| Security | Save schema validation, bounded file import, escaped event text | Prevent arbitrary DOM insertion and invalid game objects |

## External research and decisions

1. **[Chrome for Developers — Using and managing icons](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-atoms/icons):** a single same-origin SVG sprite is an appropriate, cacheable approach for repeated handcrafted icon symbols. All icons here are original, with no dependency on a remote icon set.
2. **[web.dev — Optimize input delay](https://web.dev/articles/optimize-input-delay):** avoid long main-thread work and unnecessary animation callbacks. Our immutable terrain layer and event-driven map redraws minimize work during idle ticks.
3. **[MDN — Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API):** hidden pages can be throttled. The engine measures elapsed wall time when a timer resumes and caps catch-up to avoid an unbounded loop.
4. **[MDN — Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas):** use layered rendering and avoid redrawing static content for dynamic scenes. This 42-tile strategy game uses responsive HTML/CSS instead of a high-frequency canvas loop because its visual workload does not require canvas.
5. **[web.dev — Optimize long tasks](https://web.dev/articles/optimize-long-tasks/):** gameplay work is small, synchronous, bounded, and separated from occasional structural redraws.

## Validation performed

- Pure simulation regression tests run without a browser: starting economy, spending, invalid tiles, tech prerequisites, terrain modifiers, upgrades, mission progression, storm determinism, save round-trip, offline limits, resource caps, and objective rewards.
- Module syntax and DOM identifier mapping validated.
- GitHub Actions runs Node 22 syntax and game-engine tests on pull requests and main branch pushes.

## Measurements not yet established

The source does **not** contain validated device performance numbers, cross-game comparisons, or a claim to be the fastest browser game on the market. Those require reproducible runs on representative devices and a defined competitor test suite.

Recommended release acceptance gate:

| Measurement | Proposed target | Status |
| --- | --- | --- |
| Initial interactive render | < 1.5 s on mid-range mobile over local cache | Not measured |
| p75 Interaction to Next Paint | < 200 ms | Not measured |
| Game logic one-second step | < 8 ms on mid-range mobile | Not measured |
| Memory stability after 30 minutes | No persistent growth | Not measured |
| Offline reload from installed shell | Core game playable without network | Requires browser validation |
| Save export/import across browsers | State preserved with valid JSON | Engine tests pass; UI manual test pending |
| Mobile portrait layout | No horizontal overflow at 320 px | CSS implemented; device verification pending |

## Browser profiling recipe

1. Run `python -m http.server 4173` and open `http://localhost:4173`.
2. In Chrome DevTools, use Performance to record interactions while placing structures, scrolling research, and simulating a late-game base.
3. Record INP with web-vitals or Chrome's field instrumentation, and measure resource request/transfer size in Network.
4. Repeat after filling all 42 tiles, while a mission completes, and after restoring a capped offline save.
5. Repeat on Safari/iOS, Chromium desktop, and a lower-tier Android phone. Record browser, hardware, battery/power mode, and throttling.
6. Compare measured results to the proposed targets, fixing regressions before making speed claims.

### Engine constraints

Engine state remains a plain JSON-compatible object. It imports no UI code. Save migrations require a new version and tested migration path. Every new structure should specify power, crew, cost, resource rates, art icon, and tech gate. Add tests for finite stock, deterministic outcomes, negative resource protection, and persistence.
