# Architecture

A running record of how Doctor App is built and why. We only add a decision here once we've agreed on it.

## Status

Early setup. The Expo starter template has been stripped down to one screen. No product features yet.

## Tech stack

| Area | Choice | Notes |
| --- | --- | --- |
| Framework | Expo SDK 57 | React Native 0.86, React 19.2 |
| Language | TypeScript 6 | |
| Navigation | Expo Router | File-based routes in `src/app/`, typed routes enabled |
| Compiler | React Compiler | Enabled via `experiments.reactCompiler` in `app.json` |
| Animation | Reanimated 4 + Worklets | Installed with the template |
| Platforms | iOS, Android, Web | Web output is `static` |
| Package manager | npm | `package-lock.json` |
| Build and release | EAS (planned) | Not configured yet |

## Project structure

```
src/
  app/            # Routes only: every file is a screen, _layout.tsx files define navigators
    _layout.tsx   # Root Stack navigator
    index.tsx     # Home screen (placeholder)
assets/           # Icons, splash and images
app.json          # Expo config and config plugins (native config lives here, not in ios/ or android/)
```

Non-route code (components, hooks, utilities) goes outside `src/app/`.

## Navigation

- Root: a single `Stack`.

## Decisions log

Newest first. Each entry records what we decided, why, and what we considered instead.

<!-- Template:
### YYYY-MM-DD: Short title
**Decision:** ...
**Why:** ...
**Alternatives considered:** ...
-->

## Open questions

These are to be settled as we brainstorm:

- Who uses the app: patients, doctors, or both?
- Core features for v1.
- Backend and data storage.
- Authentication.
- State management and data fetching.
- Styling approach and design system.
- Handling health data: privacy, compliance (e.g. HIPAA, DPDP) and encryption.
