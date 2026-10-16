# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Project Overview

AWS Security Maturity Model Assessment Tool — a static web app for self-assessing AWS cloud security posture across 4 maturity phases and 10 capability areas. Deployed to Vercel; optionally wrapped as an Android app via Capacitor.

## Running Locally

Must use a local server (file:// will fail due to CORS on JSON fetches):
```bash
npx serve .
# or
python3 -m http.server 3000
```

## Deployment

```bash
vercel          # preview
vercel --prod   # production
```


Production URL: https://aws-maturity-model.vercel.app

## CI / Checks

GitHub Actions workflow (`.github/workflows/check-links.yml`) runs on push/PR to `data/**`:
1. `data/count_chars.sh` — fails if any JSON item exceeds 1300 characters
2. `data/extract_link.sh` — extracts links from JSON data files
3. `data/check_link_action.sh` — verifies extracted links respond correctly

## Architecture

Single-page app with no build step — vanilla HTML/CSS/JS served as static files.

- `index.html` — app shell (layout, modals, sidebar, header)
- `js/app.js` — core logic: data loading from manifest, scoring, filtering, rendering, session management (localStorage + cookies), CSV import/export, radar chart (SVG), print preview
- `js/print.js` — print preview modal rendering
- `css/styles.css` — main styles; `css/responsive.css` — mobile breakpoints; `css/print.css` — print media styles

## Data Model

Assessment items live as individual JSON files under `data/phase_{1..4}/`. All files are registered in `data/manifest.json` (array of paths + total count).

Each item schema:
```json
{
  "id": "1.7.1",
  "phase": "Phase 1: Quick Wins",
  "capability": "Data protection",
  "recommendation": "Block Public Access",
  "aws_service": "S3 / EC2",
  "guidance": "...",
  "how_to_check": "..."
}
```

The `guidance` and `how_to_check` fields may contain inline HTML (links). Keep individual JSON files under 1300 characters to pass CI.

**Adding/editing items:** edit or create JSON under `data/phase_*/`, then add the path to `data/manifest.json`.

## Key Constants (js/app.js)

- `PHASES` — 4 maturity phases (Quick Wins, Foundational, Efficient, Optimized)
- `CAPABILITIES` — 10 security capability areas
- `SCORING_OPTIONS` — 6-point scale (0%, 25%, 50%, 75%, 100%, Excluded)
- Session state persisted in localStorage under keys `mma_sessions_v2` / `mma_current_session_v2`
- Current session ID also stored in browser cookie `mma_session_id` for persistence across browser sessions

## Session Management

The application uses a dual-storage approach for session persistence:
- **localStorage**: Stores all session data (scores, comments, metadata)
- **Cookies**: Stores the current session ID (`mma_session_id`) with 365-day expiration
- Cookie storage provides persistence across browser restarts while localStorage serves as fallback
- No authentication required — application loads directly and is fully accessible
