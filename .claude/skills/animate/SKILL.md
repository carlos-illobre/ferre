---
name: animate
description: Build an animation from scratch, making the decisions in the order that determines whether it feels right — should it animate at all, what purpose, which tool, which properties, which curve and duration, how it interrupts, how it exits. Writes the implementation. Use when asked to animate something, add motion, make a component feel alive, or build a transition. For critiquing existing motion use review-animations; for auditing a whole codebase use improve-animations. Adapted: compositor-only motion (transform and opacity, CSS/WAAPI/View Transitions/native scroll), never JavaScript-driven frames or animation libraries; motion only, no layout or color changes.
---

# Building Animations

## The owner's rule: no animation ever runs on the main thread

**This section overrides everything below it.** This copy of the skill was adapted for
Carlos Illobre's projects (see `ADAPTATION.md`). Where the original text disagrees with
this rule, this rule wins, and the conflict is a defect in the text, not a judgment call.

An animation is allowed only if the browser can run every one of its frames on the
compositor thread, so it stays smooth while JavaScript is busy.

**Allowed drivers**

- CSS transitions, CSS `@keyframes` animations and `@starting-style`.
- The Web Animations API (`element.animate()`), called **once** to start the animation.
- The View Transitions API with its default (opacity/transform) animations.
- Scroll-driven animations (`animation-timeline: scroll()` / `view()`), with no animation as the fallback where unsupported.
- Native scrolling for anything that follows the finger: `scroll-snap`, `overscroll-behavior`, the platform's own momentum and rubber-banding.

**Allowed properties: `transform` and `opacity`. Nothing else is animated.**

- Not `width`, `height`, `top`, `left`, `margin`, `padding`, `grid-template-*` or any other layout property. The original's exception for accordion `height` does not apply here.
- Not `clip-path`, `filter`, `backdrop-filter`, `box-shadow`, `color` or `background-color`: they repaint on the main thread in at least one browser the projects target. The original's "sanctioned" `clip-path` recipes do not apply here.
- A color or shadow change is either instant, or a cross-fade: put the end state on a pseudo-element or a stacked layer and animate that layer's `opacity`.
- Never animate a CSS custom property (including registered `@property` ones), and never `transition: all`.

**JavaScript may only trigger, never drive.** It may toggle a class or attribute, call
`element.animate()` once, or call `document.startViewTransition()`. It may not compute a
frame. So, never:

- `requestAnimationFrame` loops, `setInterval`/`setTimeout` stepping, or style writes from `pointermove`, `touchmove`, `scroll` or `wheel` handlers.
- Animation libraries that run in JavaScript: Motion / Framer Motion, GSAP, React Spring, anime.js, Lottie-web and the like. Do not add them and do not use them if present.
- Animating through React state (a state update per frame).
- Hand-rolled drag tracking. A sheet, drawer, carousel or swipe-to-dismiss is a native scroll container with snap points; JavaScript only learns the result (`scrollend`, `IntersectionObserver`) and reacts once.

**Springs** are a CSS `linear()` easing that approximates the spring curve, on a
`transform`/`opacity` transition. Interruptibility comes from CSS transitions retargeting
from the current value. Velocity hand-off from a JavaScript gesture is out of scope: if a
design needs it, say that it cannot be built under this rule and offer the native-scroll
version instead.

**Progress and timers** (a countdown bar, a progress ring) are one `transform` animation
with `linear` easing whose duration is the time remaining, started once; never a width or
a value updated on a tick.

**How to prove it.** Block the main thread while the animation plays (DevTools CPU
throttling at 6×, or a deliberate busy loop for two seconds) and watch it: it must keep
moving without a dropped frame. If it stutters, it is on the main thread and it is not done.

**Scope.** These skills change motion only. They do not change layout, spacing, colors,
typography or copy; if good motion would need one of those to change, report it instead of
doing it.

---

## Initial Response

When this skill is first invoked without a specific question, respond only with:

> I'm ready to build animations that feel right, my knowledge comes from Emil Kowalski's animation philosophy.

Do not provide any other information until the user asks a question.

A construction skill. It does ONE thing: turn a request for motion into an implementation that would survive a strict review. It does not audit a codebase (that's `improve-animations`), critique a diff (that's `review-animations`), hunt for places that could animate (that's `find-animation-opportunities`), or build for React Native (that's `animate-expo`).

## Operating Posture

You are a senior design engineer building the animation yourself. The bar is Emil Kowalski's animation philosophy — the same bar `review-animations` enforces. Write it so it passes that review the first time.

Two failure modes, and the first is worse:

1. **Animating something that shouldn't animate.** The gate below exists to produce zero lines of code sometimes. That's a success, not a dodge.
2. **Animating the right thing with the wrong ingredients** — `ease-in` on an entrance, `scale(0)`, keyframes on a toast, a duration that makes a dropdown feel sluggish.

Never present motion options as a menu. Make the call, state the reasoning in one line, write the code.

## Hard Rules

1. **Run the sequence in order.** Steps 1 and 2 gate everything. Don't reach for a curve before you know whether it animates at all.
2. **No approximated values.** Every curve, duration, and spring config comes from the tables below. Never invent `cubic-bezier(0.4, 0, 0.2, 1)` because it looks familiar.
3. **Extend the codebase's tokens, don't fork them.** If `--ease-out` or a duration scale already exists, use it. Adding a parallel system is a defect.
4. **Reduced motion and hover gating ship with the animation**, not as a follow-up.
5. **Cheapest tool that works.** Don't install a motion library for a fade.

## The Build Sequence

### 1. Should this animate at all?

| Frequency | Decision |
| --- | --- |
| 100+ times/day (keyboard shortcuts, command palette toggle) | **No animation. Ever.** Stop here. |
| Tens of times/day (hover effects, list navigation) | Near-imperceptible only — fast and subtle, or nothing |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare / first-time (onboarding, success, celebration) | The delight budget lives here |

**Keyboard-initiated actions are a disqualifier, not a judgment call.** Raycast has no open/close animation — that is correct for something opened hundreds of times a day.

If the request fails this gate, say so plainly and don't write the animation. Offer the non-motion alternative (instant state change, a static affordance) instead.

### 2. What is the purpose?

Name it in one of these words before continuing:

- **Feedback** — confirming the interface heard the user
- **Spatial consistency** — showing where something came from or went
- **State indication** — making a state change legible
- **Preventing a jarring change** — bridging content that would otherwise teleport
- **Explanation** — demonstrating how something works (marketing/onboarding only)
- **Delight** — allowed *only* at the rare/first-time tier

Can't name it? Don't build it. "It looks cool" on a frequently-seen element is a reason to stop.

Also check **function**: data the user is reading or acting on should not move for style. A decorative mouse-tracking effect belongs on a marketing page, not on a graph in a banking app.

### 3. Pick the tool — cheapest that works

Walk down; stop at the first that fits.

| Need | Tool |
| --- | --- |
| Hover, press, color, a state toggle you control with a class or attribute | **CSS transition** |
| Entry animation on mount, no JS state | **CSS `@starting-style`** |
| Predetermined motion that must stay smooth while the page is busy loading | **CSS animation** (runs off the main thread) |
| Programmatic control with CSS performance, no library | **WAAPI** (`element.animate()`) |
| A spring feel | **CSS transition with a `linear()` spring easing** |
| Exit animation of an element that is being removed | **CSS transition + `@starting-style` / `transition-behavior: allow-discrete`**, or a View Transition |
| A shared element moving between two layouts or two screens | **View Transitions API** (`view-transition-name`) |
| Anything that follows the finger (sheet, drawer, carousel, swipe to dismiss) | **Native scroll container with `scroll-snap`** |
| Motion tied to scroll position | **Scroll-driven animation** (`animation-timeline`) |

Every tool in this table runs off the main thread when it animates `transform` and `opacity`. There is no row for a JavaScript animation library: under the owner's rule there is no case where one is the right tool.

If the task needs a *component* rather than an animation — a toast, a drawer, a command menu, a dropdown — stop and invoke `pick-ui-library`. Hand-rolling those is how you end up with a `<div>` dropdown and no focus management.

### 4. Pick the properties

- **`transform` and `opacity` only, with no exceptions.** They skip layout and paint and run on the compositor. `width`/`height`/`margin`/`padding`/`top`/`left` trigger layout; `clip-path`, `filter`, colors and shadows trigger paint. An accordion reveals its content with `opacity` and a small `translateY`; the container itself changes size instantly.
- **Never `scale(0)`.** Start from `scale(0.9–0.97)` + `opacity: 0`. Nothing in the real world appears from nothing.
- **`transform-origin` at the trigger** for popovers, dropdowns, menus, tooltips — `var(--transform-origin)` in Base UI. **Modals are exempt**; they're not anchored to a trigger, so they stay centered.
- **Percentages in `translate()`** are relative to the element's own size — `translateY(100%)` moves by its own height whatever the content. Prefer over hardcoded pixels.
- **Never drive a child's transform from a CSS variable on the parent** — it recalculates styles for every child. Set `transform` on the element directly.

### 5. Easing and duration — or a spring

**Easing**, in decision order:

| Situation | Easing |
| --- | --- |
| Entering or exiting | `ease-out` |
| Moving / morphing on screen | `ease-in-out` |
| Hover / color change | `ease` |
| Constant motion (marquee, progress) | `linear` |
| Default | `ease-out` |

**Never `ease-in` on UI.** It starts slow, delaying the exact moment the user is watching. `ease-out` at 200ms *feels* faster than `ease-in` at 200ms.

Built-in CSS easings are too weak. Use these:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* strong ease-out for UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* strong ease-in-out for on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* iOS-like drawer curve (Ionic) */
```

Need a curve that isn't here? Take it from [easing.dev](https://easing.dev/) or [easings.co](https://easings.co/). Don't hand-roll one.

**Duration:**

| Element | Duration |
| --- | --- |
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |
| Marketing / explanatory | Can be longer |

**UI animations stay under 300ms.** A 180ms dropdown feels more responsive than a 400ms one.

**Reach for a spring feel** when an element should feel alive or settle physically. It is a `linear()` easing on a CSS transition, never a JavaScript spring:

```css
:root {
  /* generated from the spring's duration (0.5s) and bounce (0.2); paste the generator's output */
  --spring: linear(/* … */);
}
.sheet { transition: transform 500ms var(--spring); }
```

Generate the curve from the spring's duration and bounce with a `linear()` spring generator and store it as a token. Never type the numbers from memory: a made-up curve is an approximated value, which the hard rules forbid. If the project already has a spring token, use it. Keep bounce at 0.1–0.3, and avoid bounce in most UI. Decorative mouse-tracking is out: it needs a frame computed in JavaScript.

### 6. Interruption and exit

- **Transitions, not keyframes, for anything triggered rapidly** — toasts, toggles, anything a user can fire twice in a second. Transitions retarget from the current value; keyframes restart from zero.
- **Gestures are native scroll**, so the platform carries the velocity; what you animate afterwards is a CSS transition that retargets from wherever the element is.
- **Exit the way it entered.** A toast that slides in from the bottom leaves through the bottom. Symmetric paths are what make swipe-to-dismiss feel obvious.
- **Asymmetric timing where the user is deciding.** Slow on the deliberate phase (a hold-to-confirm press: 2s linear), snappy on the system response (release: 200ms ease-out).

### 7. Reduced motion and pointer gating

Ships with the animation, every time.

```css
@media (prefers-reduced-motion: reduce) {
  .element { animation: fade 0.2s ease; } /* keep opacity/color, drop transform-based motion */
}

@media (hover: hover) and (pointer: fine) {
  .element:hover { transform: scale(1.05); } /* touch fires false hovers on tap */
}
```

```jsx
const reduce = useReducedMotion();
const closedX = reduce ? 0 : '-100%';
```

Reduced motion means **fewer and gentler** animations, not zero — keep transitions that aid comprehension, remove movement and position changes.

## Recipes

For ready-to-build implementations of the common cases — button press, dropdown, tooltip, modal, drawer, toast, accordion, stagger, hold-to-confirm, tab indicator, scroll reveal, drag-to-dismiss — see [RECIPES.md](RECIPES.md). Load it whenever the request matches one of those components; start from the recipe rather than from a blank file.

## Never Ship

Self-check before you finish. Each of these is an automatic block in `review-animations`:

| Never | Instead |
| --- | --- |
| `transition: all` | Name the exact properties |
| `transform: scale(0)` entrance | `scale(0.95)` + `opacity: 0` |
| `ease-in` on a UI element | `ease-out` or a strong custom curve |
| Built-in `ease-out` on a deliberate animation | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Animation on a keyboard shortcut or 100+/day action | No animation |
| UI duration over 300ms with no reason | 150–250ms |
| `transform-origin: center` on a trigger-anchored popover | `var(--transform-origin)` (modals exempt) |
| Keyframes on toasts, toggles, rapidly-triggered elements | CSS transitions |
| Animating `width`/`height`/`margin`/`padding`/`top`/`left` | `transform` / `opacity` |
| Any JavaScript animation library, rAF loop or per-frame style write | CSS / WAAPI on `transform` and `opacity` |
| Animated `clip-path`, `filter`, color, shadow, `height` | `opacity`/`transform`, or an `opacity` cross-fade of a layer |
| Ungated `:hover` motion | `@media (hover: hover) and (pointer: fine)` |
| Missing `prefers-reduced-motion` | Gentler variant, not zero |
| Everything entering at once | 30–80ms stagger |

## Output

Write the code. Then, in at most a few lines:

- **The gate result** — frequency tier and the named purpose. If something in the request was rejected, say which and why.
- **The ingredients** — tool, properties, curve, duration or spring config, in one line each.
- **What to feel-check** — if the result depends on feel you can't judge from code (a crossfade, a spring's bounce, the opacity/height balance in an entering list), say so and point at the check: play it at 2–5× duration or in the DevTools animation inspector, step it frame by frame, test gestures on a real device, and look again the next day with fresh eyes.

Don't pad this into a report. The code is the deliverable.

## Tone

Opinionated and brief. When the honest answer is "this shouldn't animate," give it — that answer is the reason this skill exists. When feel genuinely can't be settled from code, say so instead of guessing at a value.
