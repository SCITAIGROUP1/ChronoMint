# @chronomint/ui

Shared **shadcn/ui** components (Tailwind v4). Only primitives under `src/components/ui/` plus `cn`.

## Exports

- `Button`, `Input`, `Label`, `Card`, `Badge`, `Table`, `Select`, `Chart*`
- `cn` utility
- `globals.css` — design tokens

## Usage in apps

```tsx
import { Button, Card, CardHeader, CardTitle, CardContent, Label, Input } from "@chronomint/ui";
```

```css
/* app/globals.css */
@import "tailwindcss";
@source "../../../../packages/ui/src/**/*.{ts,tsx}";
@import "tw-animate-css";
@import "@chronomint/ui/globals.css";
```

Theme switching: use `next-themes` in each app (`Providers` in `src/components/providers.tsx`).

Charts: import `Bar`, `Line`, etc. from `recharts` in the page; wrap with `ChartContainer` from this package (shadcn chart pattern).

## Add components

```bash
cd packages/ui
npx shadcn@latest add dialog -y
```

Then export from `src/index.ts`.
