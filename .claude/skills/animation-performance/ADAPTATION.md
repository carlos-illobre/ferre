# Adapted copy

These five skills come from https://github.com/emilkowalski/skills (MIT license, see
`LICENSE`), commit 2d228630ba1446365f614a108cb8252f1feda202, by Emil Kowalski.

They were adapted on 2026-10-13 for Carlos Illobre's projects, with one rule added at the
top of every `SKILL.md` and the passages that contradicted it rewritten:

- **No animation ever runs on the main thread.** Only `transform` and `opacity`; only CSS
  transitions and animations, the Web Animations API, View Transitions, scroll-driven
  animations and native scrolling; no JavaScript animation library and no
  JavaScript-computed frame.
- **Motion only.** The skills do not change layout, spacing, colors, typography or copy.

What was rewritten: the tool table, the property rules and the spring section of
`animate`; its drag-to-dismiss recipe (now native scroll with snap points); the
"Should you avoid JS animation?" section of `animation-performance`; the gesture rules of
`review-animations`, `find-animation-opportunities` and `improve-animations`.

Not installed from the same package: `apple-design` and `emil-design-eng` (they also give
layout, material and typography advice, and their gesture physics need JavaScript frames),
and the skills for native apps, libraries and prototyping.

Do not update these by reinstalling the package: that would restore the original text.
