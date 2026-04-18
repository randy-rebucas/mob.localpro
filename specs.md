You are a senior React Native + Expo + Full-stack architect.

Your task is to build a **production-grade Super App (Mini-App Architecture)** for:

PROJECT: LocalPro Super App (Client Mobile App)
TYPE: B2B2C Marketplace Platform (Philippines)
ARCHITECTURE: Modular Super App with Mini Apps

---

## 🧠 CORE OBJECTIVE

Instead of building a monolithic mobile app, you MUST:

✅ Build a SUPER APP CONTAINER
✅ Slice all features into INDEPENDENT MINI APPS
✅ Ensure each mini app is modular, scalable, and loosely coupled

Each mini app should behave like:

- A self-contained feature module
- A future standalone SaaS product
- A plug-and-play system (enable/disable per role)

---

## 🧱 TECH STACK (MANDATORY)

- Expo SDK 52 (React Native)
- Expo Router v4 (file-based routing)
- Zustand (global state)
- TanStack Query v5 (server state)
- Axios (withCredentials: true)
- NativeWind v4 (styling)
- React Hook Form + Zod (forms)
- SSE (react-native-sse)
- Expo Secure Store
- Expo Notifications
- React Native Maps + Expo Location
- Expo Image Picker
- Fast Image (image optimization)

---

## 🏗 SUPER APP ARCHITECTURE

You MUST structure the app like this:

/app
\_layout.tsx ← SUPER APP SHELL

/(core)
/api
/auth
/stores
/hooks
/utils
/services
authService.ts
jobService.ts
paymentService.ts
messageService.ts

/(miniapps)
/jobs
/messages
/wallet
/discovery
/consultations
/recurring
/loyalty
/notifications
/profile
/support

---

## 🧩 SUPER APP SHELL RESPONSIBILITIES

Implement a global shell that handles:

- Authentication (cookie-based, with refresh logic)
- Global navigation (Tabs + Mini App Launcher)
- Notification system (SSE)
- Messaging system (shared across mini apps)
- Payment handling (escrow)
- User session (Zustand)

---

## 📱 GLOBAL NAVIGATION

Tabs (dynamic):

- Home
- Jobs
- Messages
- Wallet
- Profile

Add a MINI APP LAUNCHER (grid menu like GCash):

- Book Service
- Find Providers
- Wallet
- Consultations
- Recurring
- Rewards
- Support

---

## 🧩 MINI APPS (MANDATORY IMPLEMENTATION)

You MUST implement each mini app as an independent module:

---

1. JOBS MINI APP (CORE MARKETPLACE)

---

Features:

- Post Job
- View Jobs
- Receive Quotes
- Accept Quote
- Track Job
- Leave Review

Routes:
jobs/index.tsx
jobs/new.tsx
jobs/[id].tsx
jobs/[id]/quotes.tsx
jobs/[id]/chat.tsx
jobs/[id]/review.tsx

---

2. MESSAGING MINI APP

---

Features:

- Chat threads
- Real-time messaging (SSE)
- Attachments

Routes:
messages/index.tsx
messages/[threadId].tsx

---

3. WALLET & PAYMENTS MINI APP

---

Features:

- Escrow payments
- Wallet balance
- Transactions

Routes:
wallet/index.tsx
wallet/transactions.tsx

---

4. DISCOVERY MINI APP

---

Features:

- Search providers
- Filters
- Map view

Routes:
discovery/index.tsx
discovery/map.tsx
discovery/providers/[id].tsx

---

5. CONSULTATIONS MINI APP

---

Features:

- Request consultation
- Provider response
- Messaging

Routes:
consultations/index.tsx
consultations/new.tsx
consultations/[id].tsx

---

6. RECURRING SERVICES MINI APP

---

Features:

- Schedule recurring jobs
- Pause/resume

Routes:
recurring/index.tsx
recurring/[id].tsx

---

7. LOYALTY MINI APP

---

Features:

- Points
- Tier system
- Referrals

Routes:
loyalty/index.tsx

---

8. NOTIFICATIONS MINI APP

---

Features:

- Notification list
- Real-time updates (SSE)

Routes:
notifications/index.tsx

---

9. PROFILE MINI APP

---

Features:

- Edit profile
- Addresses
- Settings

Routes:
profile/index.tsx
profile/settings.tsx
profile/addresses.tsx

---

10. SUPPORT MINI APP

---

Features:

- Support hub (signed-in quick links + pull to refresh ticket summary)
- Support chat (`GET`/`POST` `/api/support`, SSE stream)
- Support tickets list, new ticket form, ticket detail
- Knowledge articles list + article detail (`/api/knowledge`)

Routes:
support/index.tsx, support/chat.tsx, support/tickets.tsx, support/ticket-new.tsx, support/ticket/[id].tsx, support/articles.tsx, support/articles/[id].tsx

---

## 🔁 SHARED SYSTEMS (CRITICAL)

ALL mini apps must use shared core services:

- Messaging system
- Notification system
- Auth system
- Payment system

DO NOT duplicate logic.

---

## 🌐 API INTEGRATION RULES

- Base URL: process.env.EXPO_PUBLIC_API_URL
- Use Axios with:
  withCredentials: true

- On 401:
  → call /api/auth/refresh
  → retry once
  → if fail → logout

---

## ⚡ PERFORMANCE RULES

- Use FlatList for all lists
- Memoize components
- Lazy load mini apps
- Cache with TanStack Query
- Optimize images with FastImage

---

## 📶 OFFLINE SUPPORT

- Detect via NetInfo
- Cache queries
- Queue mutations
- Retry on reconnect

---

## 🔔 REAL-TIME (SSE)

Implement:

- Notifications stream
- Messaging stream

---

## 🎯 UX REQUIREMENTS

- Skeleton loaders (not spinners)
- Toast feedback
- Haptic feedback
- Accessible components (a11y)

---

## 🧪 TESTING

- Jest (unit)
- React Native Testing Library
- Detox (E2E for core flows)

---

## 🚀 BUILD GOAL

Generate:

1. Folder structure
2. Core architecture setup
3. At least 1 fully working mini app (Jobs)
4. Shared services (API, auth, messaging)
5. Navigation system (Tabs + Mini App Launcher)

Code must be:

- Clean
- Scalable
- Type-safe (TypeScript strict)
- Production-ready

---

## ⚠️ IMPORTANT RULES

- DO NOT build as monolithic app
- DO NOT mix mini app logic
- EACH mini app must be modular
- Think like building a SUPER APP (Grab / GCash model)

---

## END OF PROMPT
