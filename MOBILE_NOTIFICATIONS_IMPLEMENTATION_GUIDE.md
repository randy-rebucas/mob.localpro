# Mobile Notifications Implementation Guide

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Status:** Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [Mobile Implementation](#mobile-implementation)
5. [API Reference](#api-reference)
6. [Real-Time Streaming](#real-time-streaming)
7. [Notification Types & Routing](#notification-types--routing)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## System Overview

LocalPro implements a **multi-channel notification system** supporting:
- **In-app notifications** (real-time via Server-Sent Events)
- **Web push notifications** (W3C standard, browser-based)
- **Mobile push notifications** (Expo, Firebase-compatible)
- **Email notifications** (transactional + digest batching)

**Three-Layer Architecture:**
```
┌─────────────────────────────────┐
│   Application Logic             │
│   (status changes, job events)  │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   Notification Services         │
│   (routing, preferences, batch) │
└──────────────┬──────────────────┘
               │
        ┌──────┴─────────────────┬──────────────┬──────────────┐
        │                        │              │              │
   ┌────▼─────┐  ┌────────────┐ │         ┌────▼────┐   ┌────▼────┐
   │ SSE Stream│  │ Web Push   │ │         │  Email  │   │ Expo    │
   │ (In-app)  │  │ (Browser)  │ │         │ (Digest)│   │ (Mobile)│
   └───────────┘  └────────────┘ │         └─────────┘   └─────────┘
                                  │
                                  └─ Redis Queue (Batch Processing)
```

---

## Architecture

### Database Models

#### `Notification`
Represents a single notification event for a user.

```typescript
interface Notification {
  id: string;
  userId: string;
  type: NotificationType; // e.g., "job_submitted", "quote_received"
  title: string;
  message: string;
  data?: {
    entityType?: string; // "job", "quote", "payment"
    entityId?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  };
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Fields:**
- `type` — notification category for filtering and analytics
- `data` — context-specific payload (job ID, quote details, action URLs)
- `readAt` — timestamp when user marked as read (null = unread)

#### `NotificationPreference`
User channel and category preferences.

```typescript
interface NotificationPreference {
  userId: string;
  emailNotifications: boolean; // Global email toggle
  pushNotifications: boolean;  // Global push toggle
  
  // Category-level granularity
  categories: {
    jobUpdates: {
      email: boolean;
      push: boolean;
      in_app: boolean;
    };
    quoteAlerts: { /* ... */ };
    paymentAlerts: { /* ... */ };
    consultations: { /* ... */ };
    disputes: { /* ... */ };
    reminders: { /* ... */ };
  };
}
```

**Default Behavior:** All channels enabled (opt-out model).

#### `NotificationQueue`
Scheduled notifications for batch processing.

```typescript
interface NotificationQueue {
  id: string;
  userId: string;
  type: string;
  payload: object;
  scheduledFor: Date;
  sentAt?: Date;
  status: "pending" | "sent" | "failed";
}
```

### Services

#### `notification.service.ts`
**Main notification dispatcher.**

**Key Methods:**

```typescript
// Create notification + broadcast + conditional delivery
async push(userId: string, {
  type: NotificationType;
  title: string;
  message: string;
  data?: object;
}): Promise<Notification>

// Mark notification as read
async markRead(notificationId: string): Promise<void>

// List user notifications with pagination
async listForUser(userId: string, {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<Notification[]>

// Get unread count
async countUnread(userId: string): Promise<number>
```

**Delivery Flow:**
1. Create notification record in database
2. Broadcast via SSE to real-time listeners
3. Check user preferences
4. Send email (if enabled for category)
5. Send web/Expo push (if critical type)
6. Batch quote notifications (15-min digest window)

#### `status-notifier.service.ts`
**Proactive job status change notifications.**

Automatically triggers notifications when jobs transition between statuses.

```typescript
// Triggered on job status change
async notifyStatusChange(job: Job): Promise<void>
// Maps: APPROVED → notification type
//       ACCEPTED → includes provider assignment
//       COMPLETED → includes completion details
```

**Spam Prevention:**
- Max 3 notifications per job in 4-hour window
- Deduplicates repeated status changes
- Persona-specific messages (customer vs. provider context)

---

## Setup & Configuration

### Backend Configuration

#### 1. Environment Variables

Add to `.env.local`:

```bash
# Web Push (W3C Standard)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:admin@localpro.ph

# Redis (optional; falls back to in-process for development)
UPSTASH_REDIS_REST_URL=https://<your-redis-endpoint>
UPSTASH_REDIS_REST_TOKEN=<your-token>

# Database
DATABASE_URL=<your-database-url>
```

#### 2. Generate VAPID Keys

**One-time setup for web push:**

```bash
npm install -g web-push
web-push generate-vapid-keys
```

Output:
```
Public Key: <public-key>
Private Key: <private-key>
```

Store both in `.env.local`.

#### 3. Database Migrations

Ensure notification tables exist:

```sql
-- Notifications table
CREATE TABLE IF NOT EXISTS Notification (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  readAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_userId_createdAt (userId, createdAt DESC)
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS NotificationPreference (
  userId TEXT PRIMARY KEY,
  emailNotifications BOOLEAN DEFAULT true,
  pushNotifications BOOLEAN DEFAULT true,
  categories JSONB,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Push subscription records
ALTER TABLE User ADD COLUMN expoPushTokens TEXT[] DEFAULT '{}';
```

---

## Mobile Implementation

### For Expo-Based React Native Apps

#### 1. Install Dependencies

```bash
npm install expo-notifications expo-device
# or
yarn add expo-notifications expo-device
```

#### 2. Request Permissions

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    alert('Must use physical device for Push Notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Expo Push Token:', token);
  return token;
}
```

#### 3. Register Token with Backend

```typescript
async function registerPushToken(token: string, userId: string) {
  const response = await fetch('/api/notifications/register-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      token,
      device: 'expo',
      userId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to register push token');
  }
}
```

#### 4. Set Up Notification Listeners

```typescript
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

// Configure notification display behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotificationListener() {
  useEffect(() => {
    // Notification received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        // Update app state, show toast, etc.
      }
    );

    // Notification tapped while app is backgrounded
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        const { data } = response.notification.request.content;
        // Navigate to relevant screen based on data.actionUrl or data.entityType
        handleNotificationNavigation(data);
      }
    );

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);
}
```

#### 5. Full App Integration Example

```typescript
import React, { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export default function NotificationManager() {
  const [token, setToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    async function setup() {
      // Request permissions
      const pushToken = await registerForPushNotificationsAsync();
      setToken(pushToken);

      // Register with backend
      if (pushToken && userId) {
        await registerPushToken(pushToken, userId);
      }
    }

    setup();

    // Listen for notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      setNotification
    );

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        // Handle tap
        const data = response.notification.request.content.data;
        handleNavigationToNotification(data);
      }
    );

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return <NotificationUI notification={notification} />;
}
```

### For Web/PWA

#### 1. Register Service Worker

```typescript
// app.tsx or main layout
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(
    (registration) => console.log('SW registered:', registration),
    (error) => console.error('SW registration failed:', error)
  );
}
```

#### 2. Request Push Permission & Subscribe

```typescript
async function subscribeToPushNotifications() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  });

  // Send subscription to backend
  await fetch('/api/notifications/register-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      device: 'web',
    }),
  });
}
```

#### 3. Service Worker Push Handler (`public/sw.js`)

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.type, // Prevents duplicate notifications
    data: data.data,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const actionUrl = event.notification.data?.actionUrl;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Try to focus existing window
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === actionUrl) {
          return clientList[i].focus();
        }
      }
      // Otherwise open new window
      if (actionUrl) {
        return clients.openWindow(actionUrl);
      }
    })
  );
});
```

---

## API Reference

### 1. List Notifications

**Endpoint:** `GET /api/notifications`

**Authentication:** Required (Bearer token)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 20 | Max results |
| `offset` | number | 0 | Pagination offset |
| `unreadOnly` | boolean | false | Unread notifications only |

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif_123",
      "type": "job_submitted",
      "title": "New Job Posted",
      "message": "A new job matching your skills...",
      "data": {
        "entityType": "job",
        "entityId": "job_456",
        "actionUrl": "/jobs/job_456"
      },
      "readAt": null,
      "createdAt": "2026-04-18T10:30:00Z"
    }
  ],
  "unreadCount": 5,
  "total": 42
}
```

### 2. Mark as Read

**Endpoint:** `POST /api/notifications/{id}/read`

**Response:**
```json
{
  "id": "notif_123",
  "readAt": "2026-04-18T10:35:00Z"
}
```

### 3. Mark All as Read

**Endpoint:** `PATCH /api/notifications`

**Body:**
```json
{
  "action": "markAllRead"
}
```

### 4. Register Push Token

**Endpoint:** `POST /api/notifications/register-token`

**Body (Expo):**
```json
{
  "token": "ExponentPushToken[XXX...]",
  "device": "expo"
}
```

**Body (Web):**
```json
{
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "device": "web"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Push token registered"
}
```

### 5. Get Notification Preferences

**Endpoint:** `GET /api/notifications/preferences`

**Response:**
```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "categories": {
    "jobUpdates": {
      "email": true,
      "push": true,
      "in_app": true
    },
    "quoteAlerts": {
      "email": true,
      "push": false,
      "in_app": true
    },
    "paymentAlerts": {
      "email": true,
      "push": true,
      "in_app": true
    },
    "consultations": {
      "email": true,
      "push": true,
      "in_app": true
    },
    "disputes": {
      "email": true,
      "push": true,
      "in_app": true
    },
    "reminders": {
      "email": false,
      "push": true,
      "in_app": true
    }
  }
}
```

### 6. Update Notification Preferences

**Endpoint:** `PUT /api/notifications/preferences`

**Body:**
```json
{
  "emailNotifications": false,
  "categories": {
    "quoteAlerts": {
      "email": false,
      "push": true,
      "in_app": true
    }
  }
}
```

### 7. Real-Time Stream (SSE)

**Endpoint:** `GET /api/notifications/stream`

**Authentication:** Required (Bearer token)

**Response (Server-Sent Events):**
```
data: {"id":"notif_123","type":"job_submitted","title":"New Job","message":"...","data":{...}}

data: {":heartbeat":true}

data: {"__event":"status_update","entityType":"job","entityId":"job_456","status":"completed"}
```

**Event Types:**
- **Regular notifications** — `{id, type, title, message, data}`
- **Status updates** — `{__event: "status_update", entityType, entityId, status}`
- **Heartbeat** — `{":heartbeat": true}` (keeps connection alive)

---

## Real-Time Streaming

### SSE (Server-Sent Events) Architecture

The system uses Redis-backed or in-process event buses to deliver real-time notifications.

#### Connection Lifecycle

```typescript
// Client connects
const eventSource = new EventSource('/api/notifications/stream', {
  headers: { Authorization: `Bearer ${token}` }
});

// Listen for events
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data[':heartbeat']) {
    // Heartbeat (keeps connection alive)
  } else if (data.__event === 'status_update') {
    // Status change (job completed, etc.)
  } else {
    // Regular notification
    updateNotificationUI(data);
  }
});

// Handle errors
eventSource.addEventListener('error', () => {
  eventSource.close();
  // Reconnect after delay
  setTimeout(reconnectStream, 5000);
});

// Cleanup
eventSource.close();
```

#### Event Bus Modes

**Production (Redis):**
- Multi-instance support
- Persistent event channels
- Scales horizontally
- Requires `UPSTASH_REDIS_REST_URL`

**Development (In-Process):**
- Single-instance EventEmitter
- No Redis dependency
- Sufficient for local testing
- Falls back automatically

### Example: Listen for Job Status Updates

```typescript
export function useJobStatusListener(jobId: string) {
  const [status, setStatus] = useState<JobStatus>();
  
  useEffect(() => {
    const eventSource = new EventSource('/api/notifications/stream');
    
    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.__event === 'status_update' && data.entityId === jobId) {
        setStatus(data.status);
      }
    });
    
    return () => eventSource.close();
  }, [jobId]);
  
  return status;
}
```

---

## Notification Types & Routing

### Core Notification Types

#### Job Lifecycle
| Type | Channel | Context |
|------|---------|---------|
| `job_submitted` | Email | New job posted |
| `job_approved` | Push, Email | Job approved by admin |
| `job_rejected` | Email | Job rejected (policy violation) |
| `job_expired` | Email | Expired without completion |
| `job_direct_invite` | Push, Email | Provider directly invited |

#### Quote Management
| Type | Channel | Context |
|------|---------|---------|
| `quote_received` | Push, Email* | New quote for job |
| `quote_accepted` | Email | Customer accepted quote |
| `quote_rejected` | Email | Customer rejected quote |
| `quote_expired` | Email | Quote expired |

*Quote notifications are batched into digest emails (15-min window for 3+ quotes).

#### Payments
| Type | Channel | Context |
|------|---------|---------|
| `escrow_funded` | Push, Email | Customer funded escrow |
| `payment_confirmed` | Email | Payment processed |
| `payment_released` | Push | Escrow released to provider |
| `dispute_opened` | Push, Email | Payment dispute filed |
| `dispute_resolved` | Push, Email | Dispute resolved |

#### Consultations
| Type | Channel | Context |
|------|---------|---------|
| `consultation_request` | Push, Email | New consultation request |
| `consultation_accepted` | Email | Request accepted |
| `consultation_stale` | Email | No response for 24h |
| `consultation_expired` | Email | Expired without action |

#### Reminders
| Type | Channel | Context |
|------|---------|---------|
| `reminder_complete_profile` | Email | Incomplete profile |
| `reminder_fund_escrow` | Push, Email | Escrow funding pending |
| `reminder_no_quotes` | Email | No quotes received (48h+) |
| `reminder_start_job` | Push | Accepted job not started |

### Channel Delivery Rules

```typescript
// EMAIL_ALWAYS (25+ types)
const emailAlwaysTypes = [
  'job_submitted',
  'job_approved',
  'quote_received',
  'payment_confirmed',
  // ... more
];

// PUSH_TYPES (10+ critical types)
const pushTypes = [
  'job_approved',
  'quote_received',
  'escrow_funded',
  'payment_released',
  'dispute_opened',
  'consultation_request',
  'reminder_fund_escrow',
  'reminder_start_job',
  // ... more
];

// Delivery logic
async function push(userId, { type, title, message, data }) {
  // 1. Create notification (always)
  const notif = await db.notification.create({ userId, type, title, message, data });
  
  // 2. Broadcast SSE (always)
  await eventBus.emit(userId, notif);
  
  // 3. Check preferences
  const prefs = await db.notificationPreference.findUnique({ where: { userId } });
  
  // 4. Email (if enabled globally + category)
  if (prefs.emailNotifications && isEmailType(type)) {
    if (isBatchable(type)) {
      // Queue for digest
      await queueForBatch(userId, type, data);
    } else {
      // Send immediately
      await sendEmail(userId, { type, title, message });
    }
  }
  
  // 5. Push (if critical + enabled)
  if (prefs.pushNotifications && isPushType(type)) {
    await sendPushToAllDevices(userId, { type, title, message, data });
  }
}
```

---

## Best Practices

### 1. Handle Network Issues

```typescript
// Implement automatic reconnection with exponential backoff
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const baseDelay = 1000; // 1 second

function connectNotificationStream() {
  const eventSource = new EventSource('/api/notifications/stream');
  
  eventSource.addEventListener('open', () => {
    reconnectAttempts = 0; // Reset on successful connection
    console.log('Connected to notification stream');
  });
  
  eventSource.addEventListener('error', () => {
    eventSource.close();
    
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = baseDelay * Math.pow(2, reconnectAttempts);
      reconnectAttempts++;
      console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
      setTimeout(connectNotificationStream, delay);
    }
  });
}
```

### 2. Batch Heavy Operations

```typescript
// Don't process each notification individually
// Batch updates to the UI

function useNotificationBatcher() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout>();
  
  const addNotification = (notif: Notification) => {
    setNotifications(prev => [...prev, notif]);
    
    // Clear existing batch timer
    clearTimeout(batchTimerRef.current);
    
    // Set new batch timer (process every 100ms)
    batchTimerRef.current = setTimeout(() => {
      processNotificationBatch();
    }, 100);
  };
}
```

### 3. Respect User Preferences

Always check preferences before displaying notifications:

```typescript
async function shouldShowNotification(userId: string, type: string): Promise<boolean> {
  const prefs = await getNotificationPreferences(userId);
  
  // Get category from type
  const category = getCategoryFromType(type);
  
  return prefs.pushNotifications && 
         prefs.categories?.[category]?.push !== false;
}
```

### 4. Set Meaningful Notification Data

```typescript
// Good - includes navigation context
await notification.push(userId, {
  type: 'quote_received',
  title: 'New Quote Received',
  message: 'John quoted ₱5,000 for your job',
  data: {
    entityType: 'quote',
    entityId: 'quote_789',
    actionUrl: '/jobs/job_123/quotes/quote_789',
    metadata: {
      jobTitle: 'House Cleaning',
      quoteAmount: 5000,
      providerName: 'John'
    }
  }
});

// Bad - no context
await notification.push(userId, {
  type: 'quote_received',
  title: 'New Quote',
  message: 'You have a new quote',
  data: {}
});
```

### 5. Implement Unread Badge Tracking

```typescript
function useUnreadNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Listen for new notifications
  useEffect(() => {
    const eventSource = new EventSource('/api/notifications/stream');
    
    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (!data[':heartbeat'] && !data.__event) {
        // New notification received
        setUnreadCount(prev => prev + 1);
        updateBadge(prev + 1);
      }
    });
    
    return () => eventSource.close();
  }, []);
}
```

### 6. Clean Up Subscriptions on Logout

```typescript
function useNotificationCleanup() {
  useEffect(() => {
    const handleLogout = async () => {
      // Unsubscribe from push notifications
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await fetch('/api/notifications/register-token', {
          method: 'DELETE',
          body: JSON.stringify({ subscription }),
        });
        await subscription.unsubscribe();
      }
    };
    
    window.addEventListener('logout', handleLogout);
    return () => window.removeEventListener('logout', handleLogout);
  }, []);
}
```

---

## Troubleshooting

### Issue: Push Notifications Not Received

**Checklist:**

1. **Verify VAPID Keys:**
   ```bash
   echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY
   echo $VAPID_PRIVATE_KEY
   ```

2. **Check Browser Support:**
   ```javascript
   if ('serviceWorker' in navigator && 'PushManager' in window) {
     console.log('Push notifications supported');
   }
   ```

3. **Verify Permission Status:**
   ```javascript
   console.log(Notification.permission); // should be 'granted'
   ```

4. **Check Service Worker Registration:**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     console.log(registrations);
   });
   ```

5. **Inspect Network Requests:**
   - Open DevTools → Network tab
   - Look for `POST /api/notifications/register-token`
   - Verify 200 response

### Issue: SSE Connection Drops

**Solutions:**

1. **Check Proxy Timeout Settings:**
   - Nginx: `proxy_read_timeout 60s;`
   - Apache: `timeout 300`
   - Vercel: Default 60s

2. **Enable Heartbeat:**
   - Heartbeat packets sent every 25 seconds
   - Prevents idle connection timeout
   - Check `GET /api/notifications/stream` response

3. **Implement Reconnection Logic:**
   ```typescript
   eventSource.addEventListener('error', () => {
     eventSource.close();
     setTimeout(() => {
       connectStream(); // Retry connection
     }, 5000);
   });
   ```

### Issue: Notifications Marked as Spam

**Reduce Spam Score:**

1. **Limit Frequency:**
   ```typescript
   // Max 3 notifications per job in 4 hours
   const recentNotifications = await db.notification.count({
     where: {
       userId,
       data: { entityId: jobId },
       createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) }
     }
   });
   
   if (recentNotifications >= 3) {
     // Batch or suppress
   }
   ```

2. **Use Proper Headers:**
   ```javascript
   const options = {
     tag: notificationType, // Prevents duplicates
     requireInteraction: false, // Don't force dismiss
     badge: '/badge.png',
   };
   ```

3. **Provide Unsubscribe Link:**
   - Email notifications should include unsubscribe link
   - Link to `/notifications/preferences` settings page

### Issue: High Memory Usage

**Optimize:**

1. **Limit Concurrent SSE Connections:**
   ```typescript
   // Max 100 concurrent streams per server
   if (activeConnections >= 100) {
     return res.status(429).send('Too many connections');
   }
   ```

2. **Clean Up Old Notifications:**
   ```typescript
   // Archive notifications older than 90 days
   await db.notification.deleteMany({
     where: {
       createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
     }
   });
   ```

3. **Batch Database Queries:**
   ```typescript
   // Don't query per notification
   const notifications = await db.notification.findMany({
     where: { userId },
     take: 50,
     orderBy: { createdAt: 'desc' }
   });
   ```

---

## Quick Reference

### Environment Setup
```bash
# 1. Generate VAPID keys
web-push generate-vapid-keys

# 2. Add to .env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@localpro.ph
```

### Mobile App Setup (Expo)
```bash
npm install expo-notifications expo-device
```

### Register Push Token
```typescript
const token = await Notifications.getExpoPushTokenAsync();
await fetch('/api/notifications/register-token', {
  method: 'POST',
  body: JSON.stringify({ token, device: 'expo' })
});
```

### Listen for Notifications
```typescript
Notifications.addNotificationReceivedListener((notification) => {
  console.log(notification);
});
```

### Connect to Real-Time Stream
```typescript
const eventSource = new EventSource('/api/notifications/stream');
eventSource.addEventListener('message', (e) => {
  const data = JSON.parse(e.data);
  handleNotification(data);
});
```

---

## Support & Resources

- **API Docs:** See [api-reference.md](api-reference.md)
- **Mobile Auth:** See [MOBILE_AUTH_IMPLEMENTATION_GUIDE.md](MOBILE_AUTH_IMPLEMENTATION_GUIDE.md)
- **Provider Training:** See [provider-training-mobile.md](provider-training-mobile.md)
- **Monitoring:** See [MONITORING_DEPLOYMENT_GUIDE.md](MONITORING_DEPLOYMENT_GUIDE.md)
