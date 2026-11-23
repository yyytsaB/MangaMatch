---
name: MangaMatch
description: Editorial dark-mode manga library and discovery interface where 2:3 cover art leads on quiet ink surfaces with restrained warm-brass accents.
colors:
  canvas-ink: "#0B1220"
  surface-shelf: "#111B2E"
  surface-elevated: "#162338"
  border-hairline: "#1E2C42"
  border-strong: "#2D4160"
  text-paper: "#F5F5F0"
  text-slate: "#94A6C2"
  text-muted: "#6B7E9B"
  accent-brass: "#E8C77E"
  accent-brass-hover: "#F2D99B"
  accent-brass-ink: "#0B1220"
  status-reading: "#60A5FA"
  status-completed: "#34D399"
  status-planning: "#FBBF24"
  status-releasing: "#A78BFA"
  status-hiatus: "#FB923C"
  danger: "#F87171"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  control: "8px"
  card: "12px"
  modal: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent-brass}"
    textColor: "{colors.accent-brass-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.accent-brass-hover}"
    textColor: "{colors.accent-brass-ink}"
  button-secondary:
    backgroundColor: "{colors.surface-shelf}"
    textColor: "{colors.text-paper}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  input-field:
    backgroundColor: "{colors.canvas-ink}"
    textColor: "{colors.text-paper}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  poster-card:
    backgroundColor: "{colors.surface-shelf}"
    textColor: "{colors.text-paper}"
    rounded: "{rounded.card}"
    padding: "12px"
---

# Design System: MangaMatch

> **Status:** Approved visual contract for Slice 2 (refines the existing `#0B1220` / `#E8C77E` visual identity while retiring AI-slop patterns).

## Overview

**Creative North Star: "The Late-Night Manga Shelf"**

MangaMatch is a quiet, dark-ink reading shelf built so that vibrant 2:3 manga cover art commands the room. Everything around the covers — navigation, filters, metadata, and recommendation rationales — recedes into disciplined tonal layers of midnight navy, crisp 1px hairlines, and warm cream typography. Warm brass is reserved like a bookmark ribbon: sparse, deliberate, and functional.

This system explicitly **retires** the visual noise accumulated in the initial prototype: drifting ambient glow blobs, neon colored box-shadows, shimmer sweeps over cover art, OS emojis used as UI icons, gradient text on every heading, mismatched container widths, and backend vendor names leaked into product copy.

**Key Characteristics:**
- **Cover art is the chromatic hero;** chrome stays calm and low-saturation.
- **Tonal layering over glassmorphism;** crisp 1px hairlines over glowing shadows.
- **One unified 16px stroke SVG icon set;** zero OS emojis in interface chrome.
- **Snappy, functional motion (<250ms ease-out);** zero idle ambient drift.

## Colors

A dark ink neutral ramp paired with a single warm-brass accent and desaturated semantic status tints.

### Primary
- **Warm Brass** (`#E8C77E`): Primary CTA fill, active selection state, star ratings, and the single recommendation-rationale accent border. Hover lightens cleanly to **Pale Brass** (`#F2D99B`); text on brass is always **Midnight Ink** (`#0B1220`) for crisp contrast.

### Neutral
- **Midnight Ink** (`#0B1220`): Root page canvas and inset input fills.
- **Raised Shelf** (`#111B2E`): Primary card, sidebar, and panel surface.
- **Elevated Surface** (`#162338`): Hover rows, active secondary controls, and modal containers.
- **Hairline Border** (`#1E2C42`): Default 1px structural divider across cards, inputs, and layout seams; lifts to **Strong Hairline** (`#2D4160`) on hover.
- **Cream Paper** (`#F5F5F0`): Primary titles, body emphasis, and active icons.
- **Muted Slate** (`#94A6C2`): Secondary metadata, descriptions, and inactive controls (≥5.5:1 contrast on Midnight Ink and Raised Shelf).
- **Quiet Slate** (`#6B7E9B`): Placeholders, subtle counters, and tertiary dividers.

### Semantic & User Tags
- **Reading** (`#60A5FA`), **Completed** (`#34D399`), **Planning** (`#FBBF24`), **Releasing** (`#A78BFA`), **Hiatus** (`#FB923C`), **Danger** (`#F87171`): Used strictly at 10–15% translucent fill with 30% border tint for status pills and destructive actions.
- **User Category Tags:** Always honor the category's stored `color` hex via a subtle color dot or 15% tinted border — never overwrite user colors with hardcoded Tailwind blue.

### Named Rules
- **The One-Voice Accent Rule.** Warm Brass occupies ≤10% of any viewport. When everything glows gold, nothing reads as primary.
- **The Cover-First Rule.** Never place saturated gradients, colored drop shadows, or animated shimmers over or behind manga posters.

## Typography

**Display Font:** Space Grotesk (`--font-display`, fallback `system-ui, sans-serif`)
**Body Font:** Inter (`--font-body`, fallback `system-ui, sans-serif`)
**Label / Mono Font:** JetBrains Mono (`--font-mono`, fallback `ui-monospace, monospace`)

**Character:** Geometric editorial headings paired with clean, neutral reading copy and crisp tabular monospace strictly for numeric scores, counts, and uppercase micro-labels.

### Hierarchy
- **Display** (600, `clamp(2rem, 4vw, 3.25rem)`, 1.1 lh): Landing hero headline only.
- **Headline** (600, `1.75rem–2.25rem`, 1.2 lh): Inner page titles (`/library`, `/search`, `/recommendations`, `/library/[id]`).
- **Title** (600, `0.9375rem`, 1.35 lh): Manga card titles and section headings (clamped cleanly to 1–2 lines).
- **Body** (400, `0.875rem`, 1.6 lh): Synopses, AI match rationales, descriptions, modal copy (max `65ch` on detail synopses).
- **Label** (500, `0.6875rem`, 1.4 lh, `0.08em` tracking, uppercase): Eyebrows, filter section headers, status badges, numeric counts (`tabular-nums`).

### Named Rules
- **The Plain-Ink Headline Rule.** Inner-page headlines are solid Cream Paper (`#F5F5F0`). Reserve gradient gold text strictly for one emphasized phrase on the landing hero — never on every page header or detail title.
- **The Mono-For-Data Rule.** JetBrains Mono is for counts, ratings, status pills, and micro-labels — never for full sentences or paragraph copy.

## Layout

- **Unified Container Width:** Every route — including `Nav`, `/`, `/library`, `/library/[id]`, `/search`, and `/recommendations` — aligns to **`max-w-7xl` (`1280px`)** with consistent horizontal padding (`px-4 sm:px-6 lg:px-8`). Navbar edges and main content edges must align vertically.
- **Inner Page Masthead:** All app routes (`/library`, `/search`, `/recommendations`) use the same compact left-aligned header anatomy: eyebrow + count/context on top, Headline below, optional 1-line subtitle, and right-aligned page actions on desktop. Retire the oversized centered-rule `DividerLabel` masthead on operational routes.
- **Poster Grid Rhythm:** Library and Search both use the exact same responsive poster grid (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4`). `MangaCardSkeletons` must mirror those exact column counts to eliminate layout shift.
- **Mobile Ergonomics:**
  - `/library`: Collapse the filter sidebar into a slide-over filter drawer button on `< lg` viewports so manga covers appear in the first viewport instead of below 900px of filters.
  - `/recommendations`: Use a compact, wrapping or numbered step indicator that fits cleanly at `360px` width without horizontal overflow.

## Elevation & Depth

**The Flat-By-Default Rule.** MangaMatch relies on **tonal surface stepping** (`#0B1220` → `#111B2E` → `#162338`) and crisp `1px` borders rather than heavy shadows or frosted glass.

- **Rest State:** Zero box-shadow on cards, buttons, pills, and sidebars.
- **Elevated State:** Neutral dark shadow (`0 12px 32px rgba(0, 0, 0, 0.45)`) only on modals, toasts, and overlays.
- **Hover State:** Border shifts from `#1E2C42` to `#2D4160` (or `rgba(232, 199, 126, 0.45)` on active/focus cards); cover image zooms subtly (`scale(1.03)`) only on fine-pointer hover devices.
- **Blur Budget:** `backdrop-blur-md` is allowed **only** on the sticky top navbar and modal backdrop scrim — never on opaque cards (`bg-[#111B2E]`) or ambient background blobs.

## Shapes

Strict 3-tier corner vocabulary with uniform `1px` strokes everywhere (retire mixed `border-2` / `rounded-3xl` inconsistencies):

- **Controls & Inputs** (`rounded-lg`, `8px`): Text inputs, selects, sidebar filter rows, compact list items, icon buttons.
- **Cards & Panels** (`rounded-xl`, `12px`): Poster cards, sidebar container, detail metadata panels, recommendation showcase cards.
- **Modals & Overlays** (`rounded-2xl`, `16px`): Dialogs, confirmation sheets, toasts.
- **Pills & Chips** (`rounded-full`, `9999px`): Primary/secondary action buttons, toggle pills, status badges, genre/category chips.

## Components

### Buttons & Controls
- **Primary:** Warm Brass fill (`#E8C77E`), Midnight Ink text, pill shape. Active press feedback: `active:scale-[0.97]`.
- **Secondary:** Raised Shelf fill (`#111B2E`), `1px` Hairline Border, Cream Paper text. Hover shifts to Elevated Surface (`#162338`) + Strong Hairline (`#2D4160`).
- **Danger:** Subtle `rgba(248, 113, 113, 0.1)` fill with `rgba(248, 113, 113, 0.35)` border and `#F87171` text; solid `#EF4444` only on hover/confirm.
- **Focus Ring:** Visible `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8C77E]` on every interactive element.

### Poster Cards (Library & Search)
- Root navigation uses Next.js `<Link>` (never `<div onClick>`), keeping secondary actions cleanly separated without nested interactive traps.
- Cover slot: `aspect-[2/3]`, `loading="lazy"`, graceful `onError` fallback with title typography.
- Overlay hygiene: At most **two** corner overlays on a cover (status top-left, rating/score top-right). Never hide essential remove/reader actions behind hover-only `opacity-0` on touch devices — expose them on focus/mobile or move secondary actions to a visible footer bar.

### Modals & Toasts
- Every modal uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape key dismissal, backdrop click dismissal, and restores focus on close.
- Enter transitions use `scale(0.96) + opacity(0)` → `scale(1) + opacity(1)` over `180ms cubic-bezier(0.23, 1, 0.32, 1)` (never `scale(0)` or `600ms` keyframes).

### Recommendation Rationale Callout
- Quiet warm-brass left accent (`border-l-2 border-[#E8C77E] bg-[#E8C77E]/[0.06] rounded-r-lg px-3.5 py-2.5`).
- Label reads **"Why this matches you"** (never `"Why Gemini picks this"`).

### Motion Grammar
- **Properties:** Animate only `transform`, `opacity`, `border-color`, `background-color`, and `color`. **Never use `transition-all`.**
- **Timing:** `150ms–220ms` for interactive UI states; custom ease-out `cubic-bezier(0.23, 1, 0.32, 1)`; never `ease-in`.
- **Hover Guard:** Gate lift/zoom hover transforms behind `@media (hover: hover) and (pointer: fine)`.
- **Reduced Motion:** Under `@media (prefers-reduced-motion: reduce)`, disable all transform/slide/bounce/pulse animations while preserving fast opacity fades.
- **Frequency Rule:** Do not replay entrance animations (`fade-in-up`) when toggling filters, switching grid/list mode, or paging tabs.

## Do's and Don'ts

### Do:
- **Do** use one consistent 16px stroke SVG icon set (e.g. `lucide-react` or a small local `components/Icons.tsx`) for every icon across nav, filters, cards, and modals.
- **Do** align `Nav` and all pages to the exact same `max-w-7xl` container grid.
- **Do** honor each user category's stored hex `color` across chips, filter rows, and the category manager.
- **Do** write product-centered copy (*"Find recommendations"*, *"Extra preferences"*, *"Why this matches you"*).
- **Do** sync Library filters/sort/view state to URL query parameters so browser Back works naturally.

### Don't:
- **Don't** use OS emojis (`✨`, `⚙️`, `🏷️`, `🔥`, `⭐`, `📥`, `📤`, `📚`, `🎭`, `🎯`) as UI icons anywhere in the interface.
- **Don't** render drifting ambient blur blobs (`AmbientBackground`), neon colored glow shadows (`shadow-[0_0_30px_rgba(...)]`), or hover shimmer overlays over poster art.
- **Don't** use `transition-all`, `600ms` UI entrance keyframes, or `backdrop-blur-xl` on opaque cards.
- **Don't** mention internal vendors or APIs (`AniList GraphQL`, `Gemini AI`) in user-facing buttons, headers, or callouts.
- **Don't** use `<div onClick={() => router.push(...)}>` for navigation cards or hide required actions behind desktop-only hover states.
