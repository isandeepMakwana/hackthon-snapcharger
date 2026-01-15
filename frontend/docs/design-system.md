# SnapCharge Design System

This document defines the visual language and interaction patterns for SnapCharge. It is the single source of truth for UI decisions in this frontend.

## Design Principles

- **Calm confidence**: Use airy surfaces, soft shadows, and restrained accent usage.
- **Operational clarity**: Information must be scannable in 3-5 seconds.
- **Accessible by default**: Maintain WCAG 2.1 AA contrast and strong focus states.
- **Motion with purpose**: Animations should guide attention or indicate state changes.

## Typography

- **Display / Headings**: `Space Grotesk`
- **Body / UI Copy**: `Spline Sans`

Usage guidance:
- Headings should be short and bold; use sentence case.
- Body text stays at 14-16px with generous line height.

## Color Tokens

Defined in `src/styles/index.css` as CSS variables and consumed by Tailwind.

- `--ink`: Primary text color
- `--muted`: Secondary text color
- `--surface`: App background
- `--surface-strong`: Elevated surfaces
- `--border`: Neutral divider
- `--accent`: Primary action
- `--accent-strong`: Hover state
- `--accent-soft`: Subtle background
- `--warning`, `--danger`, `--info`: Status accents

## Layout & Spacing

- Base spacing uses 4px increments (Tailwind default scale).
- Layout widths are responsive with primary splits at `md` (driver layout shifts).
- Cards use 16-24px internal padding for legibility.

## Components

### Buttons

- Primary actions use `bg-accent` with white text.
- Secondary actions use `bg-surface` and `border-border`.
- Icon buttons always include `aria-label` for accessibility.

### Cards

- Use rounded corners (`rounded-2xl`) and `shadow-soft` for depth.
- Hover should increase contrast or border clarity rather than heavy motion.

### Forms

- Inputs use rounded corners and soft borders.
- Labels are uppercase, 12px, and medium weight for quick scanning.

### Navigation

- The segmented control indicates the active role.
- Status chips are uppercase to indicate availability at a glance.

## Motion

- **Fade up**: Used for list items appearing on initial render.
- **Scale in**: Used for modal entrance and focus.
- Respect `prefers-reduced-motion` to reduce animation.

## Accessibility

- All interactive elements must be keyboard focusable.
- Always include labels for inputs and icon-only buttons.
- Ensure contrast ratios meet WCAG 2.1 AA.
