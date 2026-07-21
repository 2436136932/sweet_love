---
target: src/pages/Home.tsx
total_score: 24
p0_count: 0
p1_count: 3
timestamp: 2026-06-24T08-22-33Z
slug: src-pages-home-tsx
---
# Impeccable Critique: Home

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading/toast coverage exists, but AI/config errors rely too much on transient toast. |
| 2 | Match System / Real World | 3 | Warm couple language works; mixed English labels like IN LOVE / AI LOVE feel generic. |
| 3 | User Control and Freedom | 3 | Main page exits are clear; inline panels have cancel, but some actions lack undo/recovery. |
| 4 | Consistency and Standards | 2 | Cards, pills, quick entries, and status rows use inconsistent density and emphasis. |
| 5 | Error Prevention | 2 | Some guards exist, but AI and status flows need clearer inline prevention/recovery. |
| 6 | Recognition Rather Than Recall | 3 | Bottom nav and quick entries are labeled; status editing affordance is still subtle. |
| 7 | Flexibility and Efficiency | 2 | Quick entries help, but high-frequency actions are not prioritized enough. |
| 8 | Aesthetic and Minimalist Design | 2 | First screen has too many competing modules and nested rounded surfaces. |
| 9 | Error Recovery | 2 | Generic toast-based recovery; form state is preserved but guidance is thin. |
| 10 | Help and Documentation | 2 | Empty states teach some next steps, but complex/AI areas lack contextual help. |
| **Total** | | **24/40** | **Acceptable: solid foundation, significant homepage polish needed.** |

## Anti-Patterns Verdict

**LLM assessment**: The homepage does not look hopelessly AI-generated, because the couple-specific domain and photo-led hero give it a real product center. But it has obvious AI app tells: soft gradient phone shell, many rounded cards, repeated pills, small uppercase micro-labels, and pink/purple emphasis fighting for attention.

**Deterministic scan**: CLI detector found 3 warnings in `src/pages/Home.tsx`: gray text on colored backgrounds at lines 474 and 635, and AI color palette risk at line 542. Line 635 is likely a ternary false positive because the active branch pairs pink with white text. Browser detector found 6 page-level anti-patterns: one low-contrast text hit, one overused-font notice, one single-font notice, and four nested-card hits. Single-font is acceptable for this product UI; nested cards and low contrast are real issues.

**Visual overlays**: Browser injection succeeded in a headless Playwright tab, not a human-visible tab. The overlay highlighted the hero and status sections for nested-card structure and the hero text area for low contrast risk.

## Overall Impression

The homepage has the right emotional raw material: a photo-led couple hero, shared status, quick entries, period care, AI draft helper, and daily rituals. The biggest opportunity is to make the first screen calmer and more decisive. Right now it is trying to show everything at once.

## What's Working

- The phone-shell product frame is appropriate for the intended mobile-first, private couple space.
- The hero image gives the app emotional specificity; this is stronger than a decorative abstract hero.
- AI is presented as a helper/draft area rather than silently writing data, which matches the product principle.

## Priority Issues

### [P1] Homepage has no single primary focus

**Why it matters**: A returning user wants to know what changed or what to do now. The first scroll contains hero, status, quick nav, period card, AI helper, anniversary, todo, checklist, and rating. That creates a daily dashboard rather than a calm shared room.

**Fix**: Split the homepage into a clear daily stack: relationship hero, today/attention summary, then secondary modules. Move AI and lower-frequency cards behind compact entry points or collapsible sections.

**Suggested command**: `/impeccable distill src/pages/Home.tsx`

### [P1] Rounded-card nesting makes the page feel generated and crowded

**Why it matters**: The detector found four nested-card hits, and visually the hero/status/period sections stack rounded containers inside rounded containers. This directly violates the project's new DESIGN.md rule against pink capsule overload and nested decorative cards.

**Fix**: Flatten the status area into rows or a single band. Use cards only for real repeated items. Reduce border radii variety and reserve heavy shadows for primary surfaces.

**Suggested command**: `/impeccable polish src/pages/Home.tsx`

### [P1] Hero and status text are fragile on real photos

**Why it matters**: The browser detector flagged low contrast in the hero. White text over a bright cover image will fail depending on the uploaded photo, and the status action button still competes with names/status copy.

**Fix**: Use a stronger bottom scrim or move text into a stable lower band. Give status rows a strict layout contract: avatar, name/status, fixed action affordance with icon-only fallback at narrow widths.

**Suggested command**: `/impeccable audit src/pages/Home.tsx`

### [P2] Several controls are below comfortable touch/reading thresholds

**Why it matters**: Playwright found small hit areas, including the header message button at 38x38 and tiny secondary actions. The page also uses many 8-10px labels, which is risky in a one-handed mobile product.

**Fix**: Enforce 44px minimum touch targets for all icon buttons and keep sub-11px text limited to metadata only. Promote meaningful labels to 11-13px.

**Suggested command**: `/impeccable adapt src/pages/Home.tsx`

### [P2] AI/helper areas need more resilient inline states

**Why it matters**: A toast saying AI failed disappears and leaves the user with no next step. For optional AI features, the user needs to know whether AI is unavailable, loading, returned a draft, or needs configuration.

**Fix**: Add inline empty/error states to AI panels: configured/unconfigured, retry, and clear draft affordances. Keep generated content visually separate from saved content.

**Suggested command**: `/impeccable harden src/pages/Home.tsx`

## Persona Red Flags

**Casey (Distracted Mobile User)**: Too many modules compete before the first full scroll. Primary actions are not consistently in the thumb zone, and several secondary tap targets are small. Casey will scan, miss the intended next action, and tap the bottom nav instead.

**Sam (Accessibility-Dependent User)**: The hero can fail contrast on bright images. Several icon buttons are missing accessible names or rely on visual context. Tiny labels and color-only active states reduce robustness.

**Jordan (First-Timer)**: The status card says it can be tapped, but the exact editable target is unclear. The page has many concepts at once: status, period, AI, anniversaries, todo, rating. Jordan gets the vibe but not the priority.

## Minor Observations

- The English micro-labels (`IN LOVE`, `AI LOVE`, `DAYS`) are legible but generic; stronger Chinese-first wording would feel less template-like.
- Purple appears as a generic secondary color in anniversary/todo contexts; this is one of the detector's AI-palette signals.
- The quick-entry grid is useful, but visually louder than the user's next meaningful action.
- The single-font detector warning is not a problem here; product UI should generally keep one sans family.

## Questions to Consider

- What is the one thing a returning partner should notice in the first five seconds?
- Should AI be a homepage module, or a contextual tool that appears inside diary/todo/kitchen/message flows?
- Which homepage elements are daily-use, and which are occasional shortcuts that can move lower?
