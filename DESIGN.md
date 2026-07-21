---
name: Sweet Love
description: A private mobile-first couple space for memories, care, plans, and small daily rituals.
colors:
  rose-accent: "#ec4899"
  rose-strong: "#f43f5e"
  ink: "#111827"
  text: "#374151"
  muted: "#6b7280"
  soft-muted: "#9ca3af"
  shell-pink: "#fdf2f8"
  warm-surface: "#fef9f3"
  lavender-surface: "#f5f3ff"
  white: "#ffffff"
  blue-accent: "#3b82f6"
  amber-accent: "#f59e0b"
  emerald-accent: "#10b981"
typography:
  headline:
    fontFamily: "Inter, Source Sans Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "0"
  title:
    fontFamily: "Inter, Source Sans Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "0"
  body:
    fontFamily: "Inter, Source Sans Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.55
    letterSpacing: "0"
  label:
    fontFamily: "Inter, Source Sans Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "28px"
  modal: "32px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  page: "24px"
components:
  button-primary:
    backgroundColor: "{colors.rose-accent}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  card-soft:
    backgroundColor: "{colors.white}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input-soft:
    backgroundColor: "{colors.white}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
---

# Design System: Sweet Love

## 1. Overview

**Creative North Star: "The Pocket Keepsake Room"**

Sweet Love should feel like a small private room carried in a phone: warm, personal, and useful in short visits. The existing visual language uses a mobile app shell, soft rose accents, white translucent surfaces, rounded controls, photo-led memory cards, and compact task panels. Keep that intimacy, but discipline the density.

This is a product UI, not a landing page. Every decorative choice must pay rent by making the couple's shared state easier to understand. Romance belongs in photos, microcopy, and selected accents; it must not become full-screen pink noise or a wall of identical rounded pills.

**Key Characteristics:**

- Mobile-first phone-shell layout with a maximum-width app surface.
- Soft layered surfaces over rose, warm-white, and lavender backgrounds.
- One primary romantic accent, supported by semantic blue, amber, and emerald states.
- Dense enough for repeated use, but never cramped.
- AI and generated content appear as draft panels, not permanent actions.

## 2. Colors

The palette is restrained romantic product UI: rose is the primary attention color, warm surfaces carry intimacy, and semantic accents are reserved for meaning.

### Primary

- **Keepsake Rose**: Use `rose-accent` for primary actions, active tabs, selected chips, heart states, and important romantic emphasis.
- **Care Signal Rose**: Use `rose-strong` sparingly for urgent or emotionally salient actions, not for every label.

### Secondary

- **Clear Sky Blue**: Use `blue-accent` for partner-side status, informational actions, and contrast against rose.
- **Kitchen Amber**: Use `amber-accent` for kitchen, food, highlight, and celebratory utility moments.
- **Done Emerald**: Use `emerald-accent` for completion, success, checked shopping items, and finished memories.

### Neutral

- **Ink**: Use `ink` for high-priority text and dark primary buttons.
- **Reading Gray**: Use `text` for body and dense UI copy.
- **Soft Muted Gray**: Use `muted` and `soft-muted` for secondary text only when contrast remains readable.
- **Phone Shell Pink**: Use `shell-pink` as the outer app atmosphere.
- **Warm Surface**: Use `warm-surface` for content pages that need a softer diary/kitchen mood.
- **Lavender Surface**: Use `lavender-surface` as a quiet secondary background, never as a dominant purple theme.

### Named Rules

**The One Rose Rule.** Rose is the product's romantic signal. It must guide the eye to primary actions and selected states, not decorate every surface.

**The No Wrong Picture Rule.** If a recipe or memory image is not accurate, show a neutral placeholder rather than a misleading generic image.

## 3. Typography

**Display Font:** Inter / Source Sans Pro system stack  
**Body Font:** Inter / Source Sans Pro system stack  
**Label Font:** Same family, heavier weight

**Character:** The type system is compact, friendly, and app-native. It uses one sans family with strong weights for scanability, avoiding display-font personality that would compete with photos and records.

### Hierarchy

- **Headline** (900, 24px, 1.15): Page titles and major status summaries.
- **Title** (800-900, 16px, 1.25): Cards, panels, and section headers.
- **Body** (600-700, 13-14px, 1.55): Notes, AI results, diary previews, and descriptive copy.
- **Label** (800-900, 10-11px, 0.08em max): Small metadata, chips, badges, and secondary action labels.

### Named Rules

**The No Vertical Text Rule.** Names, statuses, and buttons must truncate or reflow before they ever collapse into one-character vertical stacks.

**The Small UI Text Rule.** Text under 11px is only for metadata. Main actions and meaningful copy must remain readable in the phone shell.

## 4. Elevation

Sweet Love uses a hybrid of tonal layering, soft borders, and gentle shadows. Depth should feel tactile and quiet, like paper and soft objects inside a phone, not like glass panels floating for decoration.

### Shadow Vocabulary

- **Soft Card Lift** (`0 10px 30px rgba(236, 72, 153, 0.10)`): Repeated cards and status panels.
- **Action Glow** (`0 12px 24px rgba(236, 72, 153, 0.18)`): Primary buttons that need a confident tap target.
- **Phone Shell Lift** (`0 25px 60px rgba(15, 23, 42, 0.18)`): The outer app container on desktop only.

### Named Rules

**The Quiet Lift Rule.** Shadows should separate surfaces, not become the design. If a shadow is visible before the content, it is too strong.

## 5. Components

### Buttons

- **Shape:** Soft rounded rectangles (16px-24px), with circular icon buttons only for compact tools.
- **Primary:** Rose background with white text for create/save/adopt actions.
- **Dark Primary:** Ink background with white text for AI generation or strong neutral commands.
- **Hover / Focus:** Use subtle brightness, ring, or scale feedback. Focus rings must be visible and not rely only on pink.
- **Disabled:** Reduce opacity and remove heavy shadows; do not keep a saturated active look.

### Chips

- **Style:** Chips are for filters, tags, symptoms, categories, and compact states.
- **State:** Selected chips use a filled accent; unselected chips use white or pale-tinted backgrounds with readable text.
- **Constraint:** Avoid long rows of identical pink capsules. If more than six chips appear, group them, scroll them, or reduce visual weight.

### Cards / Containers

- **Corner Style:** Large app cards use 24px-32px; smaller repeated rows use 16px-24px.
- **Background:** Prefer white or white with light opacity over soft page gradients.
- **Shadow Strategy:** Use Soft Card Lift only when a card needs separation from a tinted page.
- **Border:** Use subtle white or pale rose borders, not thick side stripes.
- **Internal Padding:** 16px is the default; dense rows can use 12px; forms need at least 16px.

### Inputs / Fields

- **Style:** White or pale-tinted backgrounds, 16px radius, clear borders, bold readable text.
- **Focus:** Rose-tinted focus ring or border shift.
- **Error / Disabled:** Error states use clear copy and red/rose distinction; disabled fields must still be legible.

### Navigation

- **Bottom Nav:** Floating phone-shell nav with five core entries only. Do not add secondary feature pages that crowd the nav.
- **Page Back:** Full-screen task pages like messages and period assistant should own their top back action and remove the bottom nav when it would cover content.
- **Quick Entry:** Secondary modules can live as homepage cards or quick-entry buttons.

### Signature Components

- **Couple Hero:** Photo-led, status-light, and readable. The image carries emotion; the UI overlays only the relationship name, days, and a small love state.
- **AI Draft Panel:** Input, generate button, loading state, error state, and result preview. Generated results must expose an explicit adopt/copy/fill action.
- **Period Health Status:** Gentle calendar-like summary for cycle, daily logs, trends, and trying-to-conceive reference mode. Avoid medical certainty, diagnosis, contraception advice, pregnancy-probability claims, or safety-period framing.

## 6. Do's and Don'ts

### Do:

- **Do** design every surface inside the narrow phone shell first.
- **Do** use photos and real user content as the emotional anchor.
- **Do** keep rose for primary actions and meaningful states.
- **Do** show AI output as a draft with a manual confirmation action.
- **Do** use single-line truncation for compact names, status text, and chip labels.
- **Do** provide empty states that teach the next action.

### Don't:

- **Don't** create full-screen pink capsule overload.
- **Don't** let action buttons squeeze names or statuses into vertical text.
- **Don't** put nested cards inside decorative cards.
- **Don't** add bottom-nav entries for every new feature.
- **Don't** use medical certainty, pregnancy-probability, safety-period, contraception, diagnosis, or treatment language in period features.
- **Don't** let AI save, send, or overwrite content without explicit user adoption.
- **Don't** use generic recipe photos when the match is uncertain.
