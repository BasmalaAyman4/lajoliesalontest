# Dashboard CRUD — Architecture Guide

## Stack choices

| Concern | Choice | Why |
|---------|--------|-----|
| Data fetching + caching | **RTK Query** (inside `@reduxjs/toolkit`) | Handles GET caching, POST/PUT/DELETE invalidation, loading/error states — no extra lib needed. SWR is great for read-heavy SPAs but RTK Query handles mutations natively alongside the Redux store. |
| Global UI state | **Redux Toolkit slice** | Sidebar open/close, language direction — small slice, no boilerplate. |
| Form handling | **react-hook-form + zod** | Uncontrolled inputs (fast), schema validation, native TS types from `z.infer`. |
| Notifications | **sonner** | Minimal API, beautiful toasts. |
| Animation | **framer-motion** | Used in Modal, Sidebar. |
| Calendar | **FullCalendar** | Industry standard, supports RTL, drag-and-drop, multiple views. |
| i18n | **i18next + react-i18next** | EN/AR translations, RTL direction is toggled on `<html dir>`. |

---

## Folder structure

```
src/
├── components/
│   ├── layout/          # AppLayout, Sidebar, Header
│   └── shared/          # Reusable UI primitives
│       ├── Button.tsx
│       ├── Input/
│       ├── Select/
│       ├── MultiSelect/
│       ├── Textarea/
│       ├── UploadImage/
│       ├── Modal/        # Modal + ConfirmModal
│       └── Table/
├── features/
│   └── schedule/        # Feature-scoped components
│       ├── EventForm.tsx        (create/edit form)
│       ├── EventFilters.tsx     (search/filter bar)
│       └── ScheduleCalendar.tsx (FullCalendar wrapper)
├── hooks/
│   ├── useAppStore.ts   # Typed dispatch + selector
│   ├── useConfirm.ts    # Programmatic confirm dialog
│   └── useFilters.ts    # Generic filter/pagination state
├── lib/
│   ├── cn.ts            # clsx + tailwind-merge
│   └── i18n.ts          # i18next config + all translations
├── pages/
│   ├── DashboardPage.tsx
│   └── SchedulePage.tsx # Wires all schedule features together
├── routes/
│   └── index.tsx        # React Router v6 createBrowserRouter
├── services/
│   ├── api.ts           # RTK Query createApi base
│   └── scheduleApi.ts   # All schedule endpoints (CRUD + dropdowns)
├── store/
│   ├── index.ts         # configureStore
│   └── slices/
│       └── uiSlice.ts
└── types/
    └── index.ts         # Shared TypeScript types
```

---

## Adding a new controller (e.g. "Projects")

1. **Add types** in `src/types/index.ts`
2. **Create API** `src/services/projectsApi.ts` — copy `scheduleApi.ts` pattern
3. **Inject into store** — RTK Query auto-registers via `api.injectEndpoints`
4. **Create feature folder** `src/features/projects/` with Form + Filters
5. **Create page** `src/pages/ProjectsPage.tsx` — same pattern as SchedulePage
6. **Add route** in `src/routes/index.tsx`
7. **Add nav item** in `src/components/layout/Sidebar.tsx`

---

## API contract expected by scheduleApi

```
GET    /schedules?page=1&limit=10&search=&categoryId=   → PaginatedResponse<ScheduleEvent>
GET    /schedules/:id                                    → ScheduleEvent
POST   /schedules                                        → ScheduleEvent
PUT    /schedules/:id                                    → ScheduleEvent
PATCH  /schedules/:id                                    → ScheduleEvent  (drag/drop)
DELETE /schedules/:id                                    → 204

GET    /schedules/categories/dropdown   → DropdownOption[]
GET    /schedules/attendees/dropdown    → DropdownOption[]
```

`DropdownOption` = `{ value: string | number; label: string }`

---

## Language / RTL

Language is toggled in `Header.tsx`:
- Calls `i18n.changeLanguage(next)`
- Dispatches `setLang(next)` to Redux
- Sets `document.documentElement.dir` and `document.documentElement.lang`
- FullCalendar reads `dir` from Redux and `locale` from `i18n.language`
- CSS uses `[dir="rtl"]` for font swap (Cairo) and logical properties (`ms-`, `ps-`, `start-`)

---

## Environment

```
VITE_API_URL=https://api.example.com
```

Copy `.env.example` to `.env`.
