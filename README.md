# AWS Security Maturity Model Assessment Tool

A web-based security self-assessment tool for evaluating your AWS cloud security posture across 4 maturity phases and 10 capability areas (76 items total).

## Project Structure

```
maturity-model/
├── index.html              # Main application shell
├── vercel.json             # Vercel deployment config
├── css/
│   ├── styles.css          # Main styles
│   ├── responsive.css      # Mobile breakpoints
│   ├── auth.css            # Authentication UI
│   ├── cognito.css         # Cognito hosted UI overrides
│   └── print.css           # Print media styles
├── js/
│   ├── app.js              # Core logic (data loading, scoring, rendering, sessions)
│   ├── auth.js             # Cognito PKCE authentication (web + Android)
│   ├── cognito-config.js   # Cognito domain/client config
│   └── print.js            # Print preview modal
└── data/
    ├── manifest.json        # Index of all data files
    ├── phase_1/             # Phase 1: Quick Wins (18 items)
    ├── phase_2/             # Phase 2: Foundational (20 items)
    ├── phase_3/             # Phase 3: Efficient (20 items)
    ├── phase_4/             # Phase 4: Optimized (18 items)
    ├── count_chars.sh       # CI: validate JSON file sizes (max 1300 chars)
    ├── extract_link.sh      # CI: extract links from JSON data
    ├── check_link.sh        # CI: verify extracted links
    └── check_link_action.sh # CI: GitHub Actions wrapper
```

Each JSON file in `data/phase_*/` follows this schema:

```json
{
  "id": "1.7.1",
  "phase": "Phase 1: Quick Wins",
  "capability": "Data protection",
  "recommendation": "Block Public Access",
  "aws_service": "S3 / EC2",
  "guidance": "Assessment guidance text...",
  "how_to_check": "How to verify..."
}
```

> **Note:** Individual JSON files must stay under 1300 characters to pass CI checks.

## Run Locally

```bash
# Option 1: npx serve
npx serve .

# Option 2: Python
python3 -m http.server 3000

# Option 3: VS Code Live Server extension
```

> ⚠️ You must use a local server — opening `index.html` directly via `file://` will block the JSON fetches due to CORS restrictions.

## Deploy to Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy preview
vercel

# 3. Deploy production
vercel --prod
```

Production: https://aws-maturity-model.vercel.app

## Adding / Editing Assessment Items

Edit any JSON file under `data/phase_*/` or add a new one. Make sure to add the new file path to `data/manifest.json`:

```json
{
  "items": [
    "data/phase_1/your_new_item.json",
    ...
  ],
  "total": 76
}
```

Keep the `total` field in sync with the number of entries in `items`.

## CI — Link & Size Checks

A GitHub Actions workflow (`.github/workflows/check-links.yml`) runs on every push/PR that modifies files in `data/`:

1. **`count_chars.sh`** — fails if any JSON item exceeds 1300 characters
2. **`extract_link.sh`** — extracts `https://maturitymodel.security.aws.dev` URLs from data files
3. **`check_link_action.sh`** — verifies each link responds with 2xx/3xx

See [`data/ToolsInfo.md`](data/ToolsInfo.md) for detailed usage of each script.

## Authentication (Cognito)

The app supports optional authentication via Amazon Cognito using the Authorization Code flow with PKCE. Configuration lives in `js/cognito-config.js`:

```javascript
const COGNITO_CONFIG = {
  domain:      'https://<your-domain>.auth.<region>.amazoncognito.com',
  clientId:    '<your-app-client-id>',
  redirectUri: '<your-redirect-uri>',
  scopes:      'phone openid email',
};
```

### Cognito App Client Setup

1. Create a User Pool in the AWS Console
2. Create an App Client (public client, no secret)
3. Configure the Hosted UI with the following:
   * **Allowed Callback URLs:**
     - `https://your-production-domain.com` (web)
     - `com.yourcompany.maturitymodel://callback` (Android/Capacitor)
   * **Allowed Sign-out URLs:**
     - `https://your-production-domain.com` (HTTPS only — Cognito rejects custom URI schemes for logout)
   * **OAuth 2.0 Grant Types:** Authorization code grant
   * **OpenID Connect scopes:** `phone`, `openid`, `email`

### Platform Detection

The config automatically detects whether the app is running as a native Capacitor app or in a browser and selects the appropriate `redirectUri`:

```javascript
const IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
```

* **Web:** redirects via `window.location.href`
* **Android (Capacitor):** opens an in-app WebView via `@capacitor/browser` and listens for the deep-link callback via `@capacitor/app`

### Disabling Authentication

To run without authentication, remove the `<script>` tags for `js/cognito-config.js` and `js/auth.js` from `index.html`. The app will function normally without them — the `AUTH` global simply won't exist and sign-out buttons won't render.

## Features

* Live scoring with 6-point alignment scale (0%, 25%, 50%, 75%, 100%, Excluded)
* Multi-session management with localStorage persistence
* Print preview with Color / B&W output options
* Export / Import CSV
* Filter by phase, capability, unassessed, or excluded items
* Radar chart and per-capability scoring
* Optional Cognito authentication (PKCE)
* Responsive design + Android support (Capacitor)
