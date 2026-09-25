# Wicked Storm homepage redesign: reference research

Prepared 2026-09-25. Scope: hero storytelling, techniques, mobile strategy, trust signals, multilingual.

**Method.** Besides web sources, I probed 39 live sites on 2026-09-25 with headless Chromium at 1440x900 and with iPhone 14 emulation. The probe logged canvas/WebGL contexts, the three.js revision (`window.__THREE__`), the GSAP version, video sources, the LCP element and stylesheet contents, and took screenshots of the first three scroll positions. Findings from it are marked **(probe)**, with the site URL as the source. Screenshots are in `scratchpad/research_refs/shots/<site>_<desktop|mobile>_<0-2>.jpg` and raw data in `research_refs/probe_*.json`. Headless WebGL runs on SwiftShader, so the probe says nothing reliable about timing.

Other probed sites cited below without their own entry: https://supabase.com, https://cursor.com, https://retool.com, https://www.snowflake.com/en/, https://www.shopify.com/editions, https://www.anthropic.com, https://www.clay.com, https://www.docebo.com, https://www.magicschool.ai, https://www.instructure.com, https://www.notion.com/ko, https://www.notion.com/ja, https://www.duolingo.com, https://stripe.com/jp, https://www.apple.com/kr/airpods-pro/, https://www.apple.com/jp/airpods-pro/.

---

## 1. Hero and opening references

The story to tell: **learning moment → standard data → AI signal → better teaching**. The current concept (xAPI chips → glowing canvas bars → caption) has the right first beat. What it lacks is a destination: the bars end as decoration. The references below show how the best openings end on something concrete: a product screen, a number, or a named customer.

1. **Scale AI**, https://scale.com
   *Opening:* A full-bleed photo (a surgeon at a robotic console) sits under "The world's most important decisions need reliable AI systems." On scroll the photo is carried into a pinned 3D scene. There it splits into stacked translucent planes with contour and annotation lines ("Reliable AI has no shortcuts… Humans stay in the loop"). Next comes "AI systems that actually work", aimed at "enterprise and government".
   *Technique (probe):* three.js r181 canvas pinned from the second screen, GSAP ScrollTrigger, Lenis, Next.js. The scene is kept on mobile (390x664 canvas).
   *Fit:* **Best structural match.** Replace the surgeon with a real classroom moment and the planes with xAPI layers (actor, verb, object, result).

2. **Stripe**, https://stripe.com
   *Opening:* A live ticker ("Global GDP running on Stripe: 1.72…%") sits above the H1, with a WebGL ribbon and a customer logo strip in the first viewport. Screen 2 is a grid of real product screens; further down is a dotted WebGL globe of payment flows.
   *Technique (probe):* three.js r178. The LCP element is a static `wave-fallback-desktop-1x.webp` (`…-mobile-1x.webp` on phones), so WebGL only adds to a picture that is already there. The H1 shrinks from two sentences at 48px to one sentence at 34px on mobile.
   *Fit:* Two ideas carry over directly: the live counter ("오늘 수집된 학습 이벤트", today's collected learning events) and showing a static image before WebGL. The light, commerce tone does not.

3. **Linear**, https://linear.app
   *Opening:* Dark theme, a two-line H1, then a full-width replica of an issue page showing an AI agent's activity log: labels added, PR drafted, status moved. Panels were caught mid-animation. Screen 2 has a logo strip captioned "POWERING THE COMPANIES BUILDING THE FUTURE".
   *Technique (probe):* DOM/CSS only, no canvas. The LCP element was a 2560px product screenshot.
   *Fit:* The model for the xAPI panel: a faithful product surface that animates as events arrive. Build it in HTML/SVG, not as one big bitmap.

4. **Vercel**, https://vercel.com
   *Opening:* "Agentic Infrastructure" with the triangle logo drawn on a canvas in the centre and logos at the bottom of the first viewport. Screen 2 pairs a product mock with one named proof: "Notion powers millions of agent conversations daily on Vercel."
   *Technique (probe):* Next.js. The canvas uses an OffscreenCanvas WebGL2 context, which suggests rendering in a worker (inferred, not confirmed).
   *Fit:* One named proof line next to each demo, for example a public LRS deployment.

5. **Raycast**, https://www.raycast.com
   *Opening:* The brand's diagonal stripes glow as a light sculpture behind the H1. On scroll the light resolves into a macOS window running the product.
   *Technique (probe):* three.js r185 WebGL2, kept on mobile.
   *Fit:* The closest reference to the current glowing bars, **but with a destination.** The bars should become Lecognizer AI's actual signal chart or a LearnHubble AI screen.

6. **Palantir**, https://www.palantir.com
   *Opening:* A cinematic hero reel (autoplay muted MP4) under "Sovereign AI Systems for Every Decision". Screen 2 is a tab strip of programs with line drawings in blueprint style and sector labels, plus the line "Including U.S. Navy, CDAO, GE Aerospace, and more".
   *Technique (probe):* video plus GSAP ScrollTrigger, Next.js.
   *Fit:* A reference for the serious tone and named government clients that public-sector buyers look for. The video hero is exactly what Low Power Mode blocks (section 2.4).

7. **Databricks**, https://www.databricks.com
   *Opening:* An H1 with one coloured phrase and an animated product dashboard with a pause control. A dark logo band ("TRUSTED BY DATA + AI TEAMS") also has a pause control. Later comes a stats band ("20K+ customers", "5x Leader in Gartner® Magic Quadrant™").
   *Fit:* The stats band and the pause controls carry over directly.

8. **GitHub**, https://github.com
   *Opening:* A product video (Copilot in the editor) with a pause button, then tabs: Code, Plan, Collaborate, Automate, Secure.
   *Technique (probe):* separate `code-1_desktop` and `code-1_mobile` MP4 files, and three.js r148 for 3D mascots lower down.
   *Fit:* The tabs map onto the three audiences: 운영자 (administrators), 교수자 (instructors), 학습자 (learners).

9. **Apple AirPods Pro 3**, https://www.apple.com/airpods-pro/
   *Opening:* A still start frame paints first (it is the LCP element), then the film plays with a pause button.
   *Technique (probe):* `anim/hero/large.mp4` on desktop and `small.mp4` on phones, each with a matching start-frame JPG.
   *Fit:* A technique reference: still frame first, assets per screen size, and pause controls.

10. **Cerebrium**, https://www.cerebrium.ai (case study: https://tympanus.net/codrops/2026/07/23/building-cerebrium-making-serverless-infrastructure-tangible/)
    *Opening:* A dark 3D scene with magenta light ribbons behind the H1, then a sticky list ("2-4s Cold Starts…") next to benchmark bars (3.8 s versus 156 s).
    *Technique:* Astro, three.js r183, GSAP ScrollTrigger and Lenis (probe). The team dropped three.js WebGPURenderer/TSL for WebGLRenderer because start-up shader compilation took "close to twenty seconds" (case study).
    *Fit:* The same palette family and the same GSAP + Lenis stack. It shows how to end a 3D intro on hard numbers.

11. **Brilliant**, https://brilliant.org
    *Opening:* A serif H1, a looping clip of an interactive lesson, two audience buttons ("I'm a learner" / "I'm a parent or teacher") and grey award laurels.
    *Technique (probe):* the poster PNG is the LCP element, then `lohp-rebrand-hero.webm` plays (a `-mobile.webm` version on phones). A Rive file (`meet_koji.riv`) appears further down.
    *Fit:* It shows a learning moment concretely and sorts visitors by audience in the first screen.

12. **Khanmigo**, https://www.khanmigo.ai
    *Opening:* A typewriter H1 completing a role ("…writing co[ach]"), a collage of UI illustrations, and cards for teachers, districts and writing.
    *Fit:* Role-cycling copy and a district (B2G) path in the first screen. The playful illustration style does not fit.

13. **Socra AI** (served at https://riiid.com)
    *Opening:* A field of ASCII tokens drawn in an orbit, "Know your AI", a Korean subhead, then four numbered principles.
    *Technique (probe):* Canvas 2D (no WebGL) and GSAP ScrollTrigger.
    *Fit:* A Korean AI-edtech peer. It shows that a light 2D-canvas "data field" can sit behind Korean type.

14. **Watershed** (LRS competitor), https://www.watershedlrs.com
    *Opening:* A static dashboard screenshot, two CTAs and a logo carousel. This is the category norm, so a live opening that follows the standards would stand out.

15. **Awwwards winners**: Igloo Inc (https://www.igloo.inc) and Messenger (https://messenger.abeto.co), both listed at https://www.awwwards.com/websites/sites_of_the_year/, plus the studio Lusion (https://lusion.co).
    *Opening:* A loader or progress counter, then a full-screen WebGL world. Igloo shows an igloo inside a numbered wireframe network.
    *Technique (probe):* three.js r165, r180 and r158. Lusion is built on Astro and serves a low-resolution `matcap_ld.exr` texture on phones.
    *Fit:* A benchmark for craft only. Loader gates work against evaluators on locked-down office PCs.

## 2. Techniques and 2025-2026 trends

### 2.1 What the probed sites actually ship
- **Product UI as the hero** is the main B2B pattern: Linear, Vercel, Databricks, Supabase, Cursor, GitHub, Retool, Snowflake (probe).
- **Custom WebGL means three.js, not Spline.** Stripe, Scale, Raycast, GitHub, Cerebrium and Shopify Editions all use three.js. None of the 39 sites had a Spline viewer or runtime.
- **GSAP is still the scroll engine.** Anthropic and Clay run 3.15.0, Docebo 3.13.0, Snowflake 3.12.5; Scale and Cerebrium add Lenis. All GSAP plugins, SplitText and MorphSVG included, are free for commercial use since 3.13 (29 Apr 2025, https://gsap.com/blog/3-13/).
- **CSS scroll-driven animation only appears as an enhancement** inside `@supports (animation-timeline: scroll())`: Stripe (scroll state in dialogs and nav), GitHub Primer, Retool (background parallax), Brilliant. Cursor ships `@view-transition { navigation: auto }` (probe, from stylesheet contents).
- **Autoplaying media has a visible pause control** at Apple, GitHub, Databricks and Retool.

### 2.2 Plain static hosting versus a framework
- **Everything that runs in the browser works on plain static files:** GSAP/Lenis, three.js or OGL, CSS scroll-driven animation, and cross-document view transitions (one CSS rule).
- **A framework mainly buys build-time work:** shared layouts across 4 languages, an image pipeline (AVIF/WebP, srcset), loading JS per component, and news collections.
  - Astro builds static output to GitHub Pages through an official action. Server rendering is not supported there (https://docs.astro.build/en/guides/deploy/github/).
  - Astro's i18n routing works statically, but Accept-Language detection and per-language domains need server rendering (https://docs.astro.build/en/guides/internationalization/).
- **GitHub Pages limits:** 1 GB per site and a soft 100 GB/month bandwidth cap (https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
  - The live site returns `cache-control: max-age=600` on both the HTML and `js/vendor/gsap.min.js` (checked 2026-09-25), so assets cannot be cached long-term.
  - The fix is a host with header control (https://developers.cloudflare.com/pages/configuration/headers/, https://docs.netlify.com/manage/routing/headers/), not a framework.

### 2.3 Browser support
Source: MDN browser-compat-data fetched 2026-09-25 (https://github.com/mdn/browser-compat-data: `css/properties/animation-timeline.json`, `css/at-rules/view-transition.json`, `api/Navigator.json`, `css/properties/word-break.json`, `html/elements/script.json`).

| Feature | Chrome | Safari | Firefox |
|---|---|---|---|
| Scroll-driven `animation-timeline` | 115 | 26; runs off the main thread since 26.4 (https://webkit.org/blog/17862/webkit-features-for-safari-26-4/) | preview builds only |
| Cross-document view transitions (`@view-transition`) | 126 | 18.2 | no (same-document since 144) |
| WebGPU | 113 desktop, 121 Android | 26 | 141, Windows only |
| `word-break: auto-phrase` (Japanese) | 119 | preview builds only | no |
| Speculation Rules | 109 | 26.2, behind a flag | no |

Interop 2026 includes both scroll-driven animations and cross-document view transitions (https://webkit.org/blog/17818/announcing-interop-2026/). In practice, use both as enhancements; the baseline stays GSAP.

### 2.4 Performance budget and fallbacks
- **Targets:** LCP at or under 2.5 s and INP at or under 200 ms at the 75th percentile (https://web.dev/articles/lcp, https://web.dev/articles/inp).
  - web.dev's list of LCP element types does not include canvas; video counts through its poster or first frame. So the LCP element should be the H1 or a still first frame, as Stripe, Apple and Brilliant do (probe).
- **JS weight** (https://bundlephobia.com, whole package, min+gzip):

  | Library | Size |
  |---|---|
  | Spline runtime | 263 KB |
  | three.js | 180.6 KB |
  | lottie-web | 75 KB |
  | Rive canvas | 52.4 KB (plus WASM, **unverified**) |
  | OGL | 33.4 KB |
  | GSAP | 26.7 KB |
  | Lenis | 5.3 KB |

  For bars or particles, OGL or raw WebGL2 is enough. Load it after LCP and only on capable devices.
- **Low-end devices:** detect-gpu assigns tiers 0 to 3, but its benchmark data stopped updating in Dec 2025 (https://github.com/pmndrs/detect-gpu). Pair it with a runtime FPS check (my recommendation).
- **Safari Low Power Mode:**
  - WebKit disables autoplay by design ("Autoplay is disabled when in low power mode to conserve battery", WONTFIX: https://bugs.webkit.org/show_bug.cgi?id=219889).
  - It also throttles requestAnimationFrame to 30 fps (https://bugs.webkit.org/show_bug.cgi?id=168837), and per a 2020 Motion article, CSS animations too (https://motion.dev/magazine/when-browsers-throttle-requestanimationframe).
  - So: no video in the hero, motion that still reads at 30 fps, and treat a rejected `video.play()` as the signal to stay on the still frame.
- **Reduced motion:** Lenis honours `prefers-reduced-motion` by default (`respectReducedMotion: true`, https://github.com/darkroomengineering/lenis). `gsap.matchMedia()` can branch on it and reverts automatically (https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/).
- **B2G requirement:**
  - A continuously updating statement stream counts as "auto-updating information". WCAG 2.2 SC 2.2.2 (Level A) therefore requires pause, stop or hide, whatever the duration (https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).
  - KWCAG 2.2 checkpoint 6.2.2 requires the same (https://a11ykr.github.io/kwcag22/).
  - KRDS, the Korean government design system, wants a stop button as the first control on auto-playing carousels (https://www.krds.go.kr/html/site/utility/utility_04.html).

## 3. Mobile versus desktop

- **Same story beats, different assets (probe):**
  - Apple: `large.mp4` versus `small.mp4`, with matching start frames.
  - GitHub: `code-1_desktop` versus `code-1_mobile`.
  - Brilliant: `-mobile.webm` versions.
  - Stripe: a separate mobile fallback image and a one-sentence H1.
  - Lusion: low-resolution textures on phones.
- **Pin or no pin:** Scale keeps its pinned scene on a 390x664 canvas. Linear shows the product scaled and cropped, with no pin (probe).
- **Keep native touch scrolling.** Lenis `syncTouch` defaults to false (README above).
- **iOS pins:**
  - `ScrollTrigger.normalizeScroll(true)` stops address-bar resizes, but iOS portrait still forces them. `ignoreMobileResize` skips those refreshes.
  - The docs flag a cost on slower devices and call the feature experimental (https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.normalizeScroll()/).
- **Sizing:**
  - The Pudding's advice not to use `vh` for step heights dates from 2017 (https://pudding.cool/process/responsive-scrollytelling/). `svh`/`lvh`/`dvh` units now cover it (Chrome 108, Safari 15.4, Firefox 101; BCD `css/types/length.json`).
  - The same article recommends fewer steps and no hover-dependent content on mobile.
- **Suggested approach** (my recommendation):
  - Build two timelines with `gsap.matchMedia()`: a three-beat pin-scrub on desktop, and on mobile the same beats stacked with in-view triggers and no pin.
  - Booth QR scans in Hanoi will land on phones, so `/vi/` on mobile is the main surface for that audience.

## 4. B2G and enterprise credibility

- **One quiet logo strip right under the hero:** Stripe, Linear, Vercel, Databricks, Watershed (probe). Linear and Databricks add a small monochrome caption.
- **One named proof instead of adjectives:**
  - Vercel's Notion line.
  - Palantir's "Including U.S. Navy, CDAO, GE Aerospace, and more".
  - Cerebrium's benchmark bars.
  - Databricks' stats band.
- **Certifications as a text row plus a link, not a badge wall (probe text scan):**
  - Supabase's footer reads "SOC2 Type 2 Certified · HIPAA Compliant · ISO 27001 Certified" beside "More on Security".
  - Docebo shows "ISO SOC GDPR CCPA / SEE OUR STANDARDS".
  - Vercel, Palantir, Retool and MagicSchool link a Trust Center from the footer.
- **Edtech has its own marks.** MagicSchool groups FERPA, COPPA, SOC, ESSA and 1EdTech "TrustEd Apps Certified" into a single graphic. Instructure shows an eight-logo award wall, the cluttered extreme (probe).
- **Make claims checkable:**
  - 1EdTech's certified-product directory: https://site.imsglobal.org/certifications
  - ADL's registry (https://adopters.adlnet.gov/) failed TLS and its test site (https://lrstest.adlnet.gov/) returned 404 on 2026-09-25. Host the ADL conformance certificate on the site instead.
  - Link patent numbers (10-2883249 is already on the site) to the official record. The KIPRIS deep-link format is **unverified**.

## 5. Multilingual

- **Label languages by their own names**, not flags or codes (https://www.smashingmagazine.com/2022/05/designing-better-language-selector/). Observed (probe):
  - Notion: "한국어", "日本語".
  - Duolingo: "SITE LANGUAGE: ENGLISH".
  - Stripe: "日本(日本語)".
  - Apple: "대한민국 / 日本 / Việt Nam", with aria-labels in each language.
  - The current site uses KO/EN/JA/VI.
- **Do not auto-redirect.** Google says to "avoid automatically redirecting users from one language version of a site to a different language version" (https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).
  - Anti-pattern: snowflake.com/en/ answers a Korean IP with a 301 to `/ko/`, even with `Accept-Language: en-US`.
  - Better: Apple showed a Korean suggestion banner with a country picker (probe).
  - hreflang: each page lists itself and every alternate (https://developers.google.com/search/docs/specialty/international/localized-versions).
- **Per-language hero typography (probe, computed styles):**
  - Apple KR: `SF Pro KR`, `keep-all`, 35px line-height versus 32px for English at the same 28px.
  - Apple JP: `SF Pro JP`, `line-break: strict`.
  - Notion KO: keep-all + strict + `text-wrap: balance`.
  - Notion JA: `word-break: auto-phrase` + balance.
  - Stripe JP: H1 at 44px versus 48px for English.
- **Gaps in the current CSS** (which already does keep-all and `:lang(ja)` auto-phrase):
  - auto-phrase only works in Chrome, so pre-segment Japanese headlines at build time with BudouX. It has a Python port (https://github.com/google/budoux).
  - Relax Korean keep-all + balance below about 480px (https://ryelle.codes/2025/04/typography-troubles-balancing-in-japanese-korean/).
  - Give each language its own H1 size, leading and tracking.
  - Vietnamese stacks tone marks over circumflexes (https://vietnamesetypography.com/diacritical-details/), so give it extra leading (my recommendation, not measured).

## Unverified or not checked
- D2L and Quizlet showed a Cloudflare bot check, so I could not assess them. Anthology's homepage is now only a hub of links pointing to the companies that took over its products.
- The Awwwards list shows Lando Norris and Messenger under 2025, but I did not confirm which award each won. The Lando Norris probe timed out.
- Low Power Mode was not re-tested on an iOS 26 device. The sources are WebKit bugs plus a Jan 2026 Apple forum report (https://developer.apple.com/forums/thread/813352).
- Socra AI now serves riiid.com; I did not check the relationship between the two companies.

## Top 5 ideas for Wicked Storm
1. **Moment → statement → signal → action, in three beats.** Model it on Scale:
   - Start from a still of a real learning moment; it is also the LCP element.
   - Explode it into xAPI layers using real verb IRIs.
   - Collapse the layers into a Lecognizer AI anomaly signal.
   - End on a LearnHubble AI teacher screen.
   - On mobile, show the same beats stacked, with no pin.
2. **Make the stream a real product surface.**
   - Use the true statement structure and a running counter; label it as a demo feed unless it is live.
   - Add a visible pause button (WCAG 2.2.2 / KWCAG 6.2.2).
   - Turn the bars into the real signal chart, the way Raycast resolves its light into the product.
3. **Tiered rendering.**
   - HTML/SVG/CSS is the baseline and also the reduced-motion and Low Power Mode path.
   - Add a small OGL/WebGL2 layer after load, only on capable devices, and pause it when off-screen.
   - No hero video. CSS scroll-driven effects only inside `@supports`.
4. **One evidence line under the hero, as linked text:** 1EdTech Korea founding board, ADL LRS certificate, GS certification grade 1, patent numbers. Follow it with named public projects, and keep the full certificates on a Trust page.
5. **Hanoi-ready languages.**
   - A switcher in native names (한국어 · English · 日本語 · Tiếng Việt).
   - A suggestion banner instead of a redirect.
   - Hero typography per language, and BudouX for Japanese.
   - A mobile-first `/vi/` landing page for QR scans.
