# NEXT Vision — Billboard Analytics Platform

Production billboard analytics dashboard for tracking QR code scans, campaigns, and audience engagement in real-time.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Routing | React Router v7 |
| Animation | Framer Motion |
| Charts | Recharts |
| Forms | React Hook Form |
| Icons | Lucide React |
| Deployment | Netlify |

## Features

- **Real-time scan tracking** — live feed of QR code scans with device/platform breakdown
- **Campaign management** — create, edit, and track advertising campaigns
- **Billboard management** — add billboards, generate QR codes, track performance
- **QR code generation** — downloadable SVG/PNG QR codes per billboard
- **Deep analytics** — date range filters, heatmaps, trend charts, AI insights, CSV export
- **Team management** — invite team members, manage roles (admin/viewer)
- **Preferences** — per-user timezone, date format, density, and more
- **Role-based access** — only admin accounts can access the dashboard

## Setup

### Prerequisites

- Node.js 18+
- Firebase project with Firestore and Email/Password Authentication enabled

### Installation

```bash
git clone <repo-url>
cd next-billboards
npm install
```

Create `.env.local`:

```env
VITE_APP_URL=http://localhost:5173
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Database Setup

1. Enable **Firestore** and **Authentication → Email/Password** in Firebase Console
2. Publish `firestore.rules`
3. Create first admin user doc in Firestore:

```
/users/{your-auth-uid}:
  email:       "admin@example.com"
  displayName: "Admin"
  role:        "admin"
  createdAt:   <timestamp>
```

4. Optionally seed test data: `npm run seed`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run seed` | Populate Firestore with test data |
| `npm run cleanup` | Delete all test data |
| `npm run reset` | cleanup + seed |

## Deployment (Netlify)

Set all `VITE_*` env vars in Netlify, plus `VITE_APP_URL=https://billboards-nikola.netlify.app`.
Add `billboards-nikola.netlify.app` to Firebase Console → Authentication → Authorized domains.

## Project Structure

```
src/
├── components/
│   ├── layout/      Layout, sidebar
│   ├── shared/      ErrorBoundary, ProtectedRoute, PageTransition, NetworkStatus
│   └── ui/          Button, Card, Input, Select, Badge, Modal, Toast, Spinner
├── contexts/        AuthContext, PreferencesContext
├── firebase/        Firestore service functions
├── hooks/           Custom hooks
├── pages/           Route pages
├── styles/          Global CSS + design tokens
└── utils/           deviceDetection, errorHandler
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Show keyboard shortcuts |
| `Ctrl/Cmd + K` | Quick search (coming soon) |
| `Esc` | Close modal |

## License

Private project. All rights reserved.
