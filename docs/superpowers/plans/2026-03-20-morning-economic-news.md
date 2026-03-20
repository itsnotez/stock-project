# Morning Economic News Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global economic news tab to the existing Vue 3 + Node.js stock app, with daily RSS crawling, Claude AI summarization, and Web Push notifications at 8:00 AM.

**Architecture:** Node.js server (CommonJS) crawls Reuters/CNBC/AP RSS feeds at 07:50 daily, summarizes headlines via Claude API, and caches results in `news-cache.json`. Client fetches via `/api/news` and displays in a new tab. Server sends Web Push at 08:00 to subscribed browsers.

**Tech Stack:** Node.js (CommonJS/require), Express, rss-parser, node-cron, @anthropic-ai/sdk, web-push, Jest (server tests), Vue 3 (Composition API), Service Worker (Web Push)

---

## File Map

**Create:**
- `server/package.json` — server npm manifest with all dependencies
- `server/news-crawler.js` — RSS feed fetching and headline extraction
- `server/news-summarizer.js` — Claude API summarization + cache write
- `server/push-manager.js` — Web Push subscription storage and send
- `server/news-crawler.test.js` — unit tests for crawler
- `server/news-summarizer.test.js` — unit tests for summarizer
- `server/push-manager.test.js` — unit tests for push manager
- `client/public/sw.js` — Service Worker (receives push, shows notification)
- `client/src/components/NewsTab.vue` — news tab component

**Modify:**
- `server/stock-server.js` — add news endpoints + cron jobs
- `client/src/App.vue` — add news tab to nav + content area
- `client/src/main.js` — register Service Worker

**Create (config):**
- `server/.env.example` — template for required env vars
- `.gitignore` (project root) — ignore runtime JSON files

---

## Task 1: Initialize Server Package & Install Dependencies

**Files:**
- Create: `server/package.json`
- Create: `server/.env.example`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "stock-server",
  "version": "1.0.0",
  "main": "stock-server.js",
  "scripts": {
    "start": "node stock-server.js",
    "test": "jest"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "nightmare": "^3.0.2",
    "rss-parser": "^3.13.0",
    "node-cron": "^3.0.3",
    "@anthropic-ai/sdk": "^0.27.0",
    "web-push": "^3.6.7",
    "vo": "^4.1.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd server && npm install
```

Expected: `node_modules/` created, no errors.

> **Note:** `nightmare` requires Electron binaries and may fail on headless CI environments. On macOS/Linux desktop this installs fine. If `npm install` errors on nightmare, you can skip it for now — it is only needed for the existing stock scraping feature, not the news feature.

- [ ] **Step 3: Create `.env.example`**

```
ANTHROPIC_API_KEY=your_key_here
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:your@email.com
```

- [ ] **Step 4: Generate VAPID keys**

```bash
cd server && node -e "const wp = require('web-push'); const keys = wp.generateVAPIDKeys(); console.log('Public:', keys.publicKey); console.log('Private:', keys.privateKey);"
```

Copy output keys and create `server/.env` (never commit this file):
```
ANTHROPIC_API_KEY=<your real key>
VAPID_PUBLIC_KEY=<generated public key>
VAPID_PRIVATE_KEY=<generated private key>
VAPID_EMAIL=mailto:you@example.com
```

- [ ] **Step 5: Add runtime files to .gitignore**

Create `/Users/shinwon/Documents/workspaces/stock-project/.gitignore`:
```
server/news-cache.json
server/push-subscriptions.json
server/.env
node_modules/
```

---

## Task 2: Build RSS News Crawler

**Files:**
- Create: `server/news-crawler.js`
- Create: `server/news-crawler.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/news-crawler.test.js`:
```javascript
const { fetchHeadlines } = require('./news-crawler');

describe('fetchHeadlines', () => {
  test('returns array of headline objects', async () => {
    const headlines = await fetchHeadlines();
    expect(Array.isArray(headlines)).toBe(true);
  });

  test('each headline has required fields', async () => {
    const headlines = await fetchHeadlines();
    if (headlines.length > 0) {
      const item = headlines[0];
      expect(item).toHaveProperty('headline');
      expect(item).toHaveProperty('source');
      expect(item).toHaveProperty('url');
      expect(typeof item.headline).toBe('string');
      expect(typeof item.source).toBe('string');
      expect(typeof item.url).toBe('string');
    }
  });

  test('returns at most 10 headlines', async () => {
    const headlines = await fetchHeadlines();
    expect(headlines.length).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest news-crawler.test.js --no-coverage
```

Expected: FAIL with "Cannot find module './news-crawler'"

- [ ] **Step 3: Implement `news-crawler.js`**

Create `server/news-crawler.js`:
```javascript
const Parser = require('rss-parser');
const parser = new Parser();

const FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters', limit: 4 },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC', limit: 3 },
  { url: 'https://feeds.apnews.com/rss/apf-business', source: 'AP', limit: 3 },
];

async function fetchFromFeed({ url, source, limit }) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, limit).map(item => ({
      headline: item.title || '',
      source,
      url: item.link || '',
    }));
  } catch (err) {
    console.warn(`[news-crawler] Failed to fetch ${source}: ${err.message}`);
    return [];
  }
}

async function fetchHeadlines() {
  const results = await Promise.all(FEEDS.map(fetchFromFeed));
  return results.flat().slice(0, 10);
}

module.exports = { fetchHeadlines };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd server && npx jest news-crawler.test.js --no-coverage
```

Expected: PASS.

> **Note:** These tests make real HTTP calls to Reuters/CNBC/AP. On a restricted network they may time out or return empty arrays (all sources fail gracefully). An empty array still passes all three tests — this is the correct behavior per the spec (failed sources are skipped). If you need network-free tests, mock `Parser.prototype.parseURL` with Jest's `jest.spyOn`.

- [ ] **Step 5: Commit**

```bash
cd server && git add package.json package-lock.json .env.example news-crawler.js news-crawler.test.js && cd .. && git add .gitignore && git commit -m "feat: add RSS news crawler with tests"
```

---

## Task 3: Build Claude AI Summarizer

**Files:**
- Create: `server/news-summarizer.js`
- Create: `server/news-summarizer.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/news-summarizer.test.js`:
```javascript
const { summarizeHeadlines, saveCache } = require('./news-summarizer');
const fs = require('fs');
const path = require('path');

describe('summarizeHeadlines', () => {
  test('returns items with summary field added', async () => {
    const input = [
      { headline: 'Fed holds rates steady', source: 'Reuters', url: 'https://example.com/1' },
      { headline: 'Oil prices drop 3%', source: 'CNBC', url: 'https://example.com/2' },
    ];
    const result = await summarizeHeadlines(input);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    result.forEach(item => {
      expect(item).toHaveProperty('headline');
      expect(item).toHaveProperty('summary');
      expect(item).toHaveProperty('source');
      expect(item).toHaveProperty('url');
    });
  });

  test('summary is string or null', async () => {
    const input = [{ headline: 'Test headline', source: 'Test', url: 'https://example.com' }];
    const result = await summarizeHeadlines(input);
    result.forEach(item => {
      expect(item.summary === null || typeof item.summary === 'string').toBe(true);
    });
  });
});

describe('saveCache', () => {
  const testCachePath = path.join(__dirname, 'test-news-cache.json');

  afterEach(() => {
    if (fs.existsSync(testCachePath)) fs.unlinkSync(testCachePath);
  });

  test('writes valid JSON file', () => {
    const news = [{ headline: 'Test', summary: '테스트', source: 'Test', url: 'https://example.com' }];
    saveCache(news, testCachePath);
    const content = JSON.parse(fs.readFileSync(testCachePath, 'utf-8'));
    expect(content).toHaveProperty('date');
    expect(content).toHaveProperty('updatedAt');
    expect(content).toHaveProperty('news');
    expect(content.news).toEqual(news);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest news-summarizer.test.js --no-coverage
```

Expected: FAIL with "Cannot find module './news-summarizer'"

- [ ] **Step 3: Implement `news-summarizer.js`**

Create `server/news-summarizer.js`:
```javascript
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'news-cache.json');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function summarizeHeadlines(headlines) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[news-summarizer] No ANTHROPIC_API_KEY — skipping summarization');
    return headlines.map(h => ({ ...h, summary: null }));
  }

  const headlineList = headlines
    .map((h, i) => `${i + 1}. ${h.headline}`)
    .join('\n');

  const prompt = `다음 영문 경제 뉴스 헤드라인들을 각각 한국어 한 문장(30자 이내)으로 요약해줘.
JSON 배열로만 응답해. 각 항목: {"headline": "원문", "summary": "한국어 요약"}

헤드라인 목록:
${headlineList}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');

    const summaries = JSON.parse(jsonMatch[0]);
    return headlines.map((h, i) => ({
      ...h,
      summary: summaries[i]?.summary || null,
    }));
  } catch (err) {
    console.error('[news-summarizer] Claude API error:', err.message);
    return headlines.map(h => ({ ...h, summary: null }));
  }
}

function saveCache(news, cachePath = CACHE_PATH) {
  const today = new Date().toISOString().split('T')[0];
  const cache = {
    date: today,
    updatedAt: new Date().toISOString(),
    news,
  };
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
}

module.exports = { summarizeHeadlines, saveCache, CACHE_PATH };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd server && npx jest news-summarizer.test.js --no-coverage
```

Expected: PASS (summarizeHeadlines will return null summaries if no API key in test env — that's fine)

- [ ] **Step 5: Commit**

```bash
cd .. && git add server/news-summarizer.js server/news-summarizer.test.js && git commit -m "feat: add Claude AI news summarizer with cache writer"
```

---

## Task 4: Build Web Push Manager

**Files:**
- Create: `server/push-manager.js`
- Create: `server/push-manager.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/push-manager.test.js`:
```javascript
const { addSubscription, removeSubscription, loadSubscriptions, saveSubscriptions } = require('./push-manager');
const fs = require('fs');
const path = require('path');

const TEST_PATH = path.join(__dirname, 'test-push-subscriptions.json');

// Override the default path for tests
jest.mock('./push-manager', () => {
  const actual = jest.requireActual('./push-manager');
  return { ...actual };
}, { virtual: false });

describe('subscription storage', () => {
  afterEach(() => {
    if (fs.existsSync(TEST_PATH)) fs.unlinkSync(TEST_PATH);
  });

  test('saveSubscriptions writes JSON file', () => {
    const subs = [{ endpoint: 'https://example.com/push/1', keys: { auth: 'a', p256dh: 'b' } }];
    saveSubscriptions(subs, TEST_PATH);
    const content = JSON.parse(fs.readFileSync(TEST_PATH, 'utf-8'));
    expect(content).toEqual(subs);
  });

  test('loadSubscriptions returns empty array when file missing', () => {
    const result = loadSubscriptions(TEST_PATH);
    expect(result).toEqual([]);
  });

  test('loadSubscriptions reads saved subscriptions', () => {
    const subs = [{ endpoint: 'https://example.com/push/1', keys: {} }];
    saveSubscriptions(subs, TEST_PATH);
    const result = loadSubscriptions(TEST_PATH);
    expect(result).toEqual(subs);
  });

  test('addSubscription adds new entry', () => {
    const sub = { endpoint: 'https://example.com/push/2', keys: {} };
    addSubscription(sub, TEST_PATH);
    const result = loadSubscriptions(TEST_PATH);
    expect(result).toContainEqual(sub);
  });

  test('addSubscription does not duplicate by endpoint', () => {
    const sub = { endpoint: 'https://example.com/push/2', keys: {} };
    addSubscription(sub, TEST_PATH);
    addSubscription(sub, TEST_PATH);
    const result = loadSubscriptions(TEST_PATH);
    expect(result.filter(s => s.endpoint === sub.endpoint).length).toBe(1);
  });

  test('removeSubscription removes by endpoint', () => {
    const sub = { endpoint: 'https://example.com/push/3', keys: {} };
    addSubscription(sub, TEST_PATH);
    removeSubscription(sub.endpoint, TEST_PATH);
    const result = loadSubscriptions(TEST_PATH);
    expect(result.find(s => s.endpoint === sub.endpoint)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest push-manager.test.js --no-coverage
```

Expected: FAIL with "Cannot find module './push-manager'"

- [ ] **Step 3: Implement `push-manager.js`**

Create `server/push-manager.js`:
```javascript
require('dotenv').config();
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const SUBS_PATH = path.join(__dirname, 'push-subscriptions.json');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

function loadSubscriptions(filePath = SUBS_PATH) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function saveSubscriptions(subs, filePath = SUBS_PATH) {
  fs.writeFileSync(filePath, JSON.stringify(subs, null, 2), 'utf-8');
}

function addSubscription(subscription, filePath = SUBS_PATH) {
  const subs = loadSubscriptions(filePath);
  const exists = subs.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push(subscription);
    saveSubscriptions(subs, filePath);
  }
}

function removeSubscription(endpoint, filePath = SUBS_PATH) {
  const subs = loadSubscriptions(filePath).filter(s => s.endpoint !== endpoint);
  saveSubscriptions(subs, filePath);
}

async function sendPushNotifications(payload) {
  const subs = loadSubscriptions();
  const results = await Promise.allSettled(
    subs.map(sub => webpush.sendNotification(sub, JSON.stringify(payload)))
  );
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`[push-manager] ${failed.length} notifications failed`);
  }
}

module.exports = { loadSubscriptions, saveSubscriptions, addSubscription, removeSubscription, sendPushNotifications };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd server && npx jest push-manager.test.js --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd .. && git add server/push-manager.js server/push-manager.test.js && git commit -m "feat: add Web Push subscription manager with tests"
```

---

## Task 5: Add News API Endpoints & Cron Jobs to Server

**Files:**
- Modify: `server/stock-server.js`

The server currently uses CommonJS and has no `dotenv` usage. We add news-related routes and scheduled jobs without changing existing functionality.

- [ ] **Step 1: Add dotenv as the very first line of `stock-server.js`**

`require('dotenv').config()` **must be the first line** of the file — before any other `require` — so that `process.env` is populated before `push-manager.js` and `news-summarizer.js` call `webpush.setVapidDetails()` and `new Anthropic()` at module load time.

Replace the first line of `server/stock-server.js` (currently `const express = require("express");`) with:

```javascript
require('dotenv').config();
const express = require("express");
```

Then add the remaining new requires after the existing ones (after `const vo = require("vo");`):

```javascript
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { fetchHeadlines } = require('./news-crawler');
const { summarizeHeadlines, saveCache, CACHE_PATH } = require('./news-summarizer');
const { addSubscription, removeSubscription, sendPushNotifications } = require('./push-manager');
```

Add `express.json()` middleware after `app.use(cors())`:
```javascript
app.use(express.json());
```

- [ ] **Step 2: Add the `collectNews` helper function**

Add this function before `app.listen(...)`:

```javascript
async function collectNews() {
  console.log('[news] Starting news collection...');
  try {
    const headlines = await fetchHeadlines();
    const summarized = await summarizeHeadlines(headlines);
    saveCache(summarized);
    console.log(`[news] Collected ${summarized.length} news items`);
  } catch (err) {
    console.error('[news] Collection failed:', err.message);
  }
}
```

- [ ] **Step 3: Add news API endpoints**

Add before `app.listen(...)`:

```javascript
app.get('/api/news', async (req, res) => {
  try {
    if (!fs.existsSync(CACHE_PATH)) {
      await collectNews();
    } else {
      const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
      const ageMs = Date.now() - new Date(cache.updatedAt).getTime();
      const isStale = ageMs > 24 * 60 * 60 * 1000;
      if (isStale) {
        collectNews(); // background refresh, don't await
      }
    }
    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    res.json(cache);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load news' });
  }
});

app.post('/api/push/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  addSubscription(subscription);
  res.status(201).json({ message: 'Subscribed' });
});

app.delete('/api/push/subscribe', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
  removeSubscription(endpoint);
  res.json({ message: 'Unsubscribed' });
});
```

- [ ] **Step 4: Add cron jobs**

Add before `app.listen(...)`:

```javascript
// Collect news every day at 07:50
cron.schedule('50 7 * * *', collectNews);

// Send push notifications every day at 08:00
cron.schedule('0 8 * * *', () => {
  sendPushNotifications({
    title: '오늘의 경제 뉴스',
    body: '오늘의 경제 뉴스가 준비됐습니다.',
    url: 'http://localhost:8080',
  });
});
```

- [ ] **Step 5: Test the endpoints manually**

```bash
cd server && node stock-server.js &
sleep 2
curl http://localhost:12010/api/news
```

Expected: JSON response with `date`, `updatedAt`, `news` array.

> **Note:** On the very first call, if no `.env` file is set up yet (`ANTHROPIC_API_KEY` missing), `collectNews()` will run but return headlines with `summary: null`. The response is still valid JSON. If the cache file cannot be written, the endpoint returns `{"error": "Failed to load news"}` (HTTP 500) — this is expected until the `.env` is configured with a real API key.

Kill the test server: `pkill -f stock-server.js`

- [ ] **Step 6: Commit**

```bash
cd .. && git add server/stock-server.js && git commit -m "feat: add news API endpoints and daily cron jobs to server"
```

---

## Task 6: Add Service Worker

**Files:**
- Create: `client/public/sw.js`

- [ ] **Step 1: Create `client/public/sw.js`**

```javascript
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '경제 뉴스';
  const options = {
    body: data.body || '오늘의 경제 뉴스가 준비됐습니다.',
    icon: '/favicon.ico',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
```

- [ ] **Step 2: Register the Service Worker in `client/src/main.js`**

Replace the contents of `client/src/main.js` with:

```javascript
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.warn('Service Worker registration failed:', err);
  });
}
```

- [ ] **Step 3: Verify SW registration works (manual step)**

> This step requires a browser and cannot be automated. If running as an agent, skip to Step 4.

Start the client dev server:
```bash
cd client && npm run serve
```

Open `http://localhost:8080` in Chrome DevTools → Application → Service Workers.
Expected: `sw.js` listed as registered.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
cd .. && git add client/public/sw.js client/src/main.js && git commit -m "feat: add Service Worker for Web Push notifications"
```

---

## Task 7: Build NewsTab Vue Component

**Files:**
- Create: `client/src/components/NewsTab.vue`

The existing `App.vue` uses Vue 3 Composition API with `setup()`. `NewsTab.vue` follows the same pattern.

- [ ] **Step 1: Create `client/src/components/NewsTab.vue`**

```vue
<template>
  <div class="news-tab">
    <h2>글로벌 경제 뉴스</h2>
    <p class="news-date" v-if="date">{{ date }}</p>

    <div v-if="loading" class="news-loading">뉴스를 불러오는 중...</div>
    <div v-else-if="error" class="news-error">{{ error }}</div>

    <ul v-else class="news-list">
      <li v-for="(item, idx) in news" :key="idx" class="news-item">
        <a :href="item.url" target="_blank" rel="noopener noreferrer" class="news-headline">
          {{ item.headline }}
        </a>
        <p v-if="item.summary" class="news-summary">→ {{ item.summary }}</p>
        <span class="news-source">{{ item.source }}</span>
      </li>
    </ul>

    <div class="push-section">
      <button
        v-if="pushState === 'available'"
        @click="subscribePush"
        class="push-btn"
      >
        🔔 오전 8시 알림 받기
      </button>
      <p v-else-if="pushState === 'subscribed'" class="push-status">✅ 알림 설정 완료</p>
      <p v-else-if="pushState === 'denied'" class="push-status">알림이 차단되어 있습니다</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const SERVER_URL = 'http://localhost:12010';
const VAPID_PUBLIC_KEY = process.env.VUE_APP_VAPID_PUBLIC_KEY || '';

export default {
  name: 'NewsTab',
  setup() {
    const news = ref([]);
    const date = ref('');
    const loading = ref(true);
    const error = ref('');
    const pushState = ref('unavailable'); // unavailable | available | subscribed | denied

    async function fetchNews() {
      try {
        const res = await axios.get(`${SERVER_URL}/api/news`);
        news.value = res.data.news || [];
        date.value = res.data.date || '';
      } catch (err) {
        error.value = '뉴스를 불러오지 못했습니다. 서버를 확인해주세요.';
      } finally {
        loading.value = false;
      }
    }

    function urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
    }

    async function subscribePush() {
      if (!('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        await axios.post(`${SERVER_URL}/api/push/subscribe`, sub.toJSON());
        pushState.value = 'subscribed';
      } catch (err) {
        if (Notification.permission === 'denied') {
          pushState.value = 'denied';
        }
        console.error('Push subscription failed:', err);
      }
    }

    onMounted(() => {
      fetchNews();
      if ('Notification' in window && 'serviceWorker' in navigator) {
        if (Notification.permission === 'granted') {
          pushState.value = 'subscribed';
        } else if (Notification.permission !== 'denied') {
          pushState.value = 'available';
        } else {
          pushState.value = 'denied';
        }
      }
    });

    return { news, date, loading, error, pushState, subscribePush };
  },
};
</script>

<style scoped>
.news-tab {
  padding: 20px;
  max-width: 700px;
  margin: 0 auto;
  text-align: left;
}
.news-date {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 16px;
}
.news-list {
  list-style: none;
  padding: 0;
}
.news-item {
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 16px;
}
.news-headline {
  font-weight: bold;
  font-size: 1rem;
  color: #1a1a1a;
  text-decoration: none;
  display: block;
  margin-bottom: 4px;
}
.news-headline:hover {
  color: #007bff;
}
.news-summary {
  color: #444;
  font-size: 0.95rem;
  margin: 4px 0;
}
.news-source {
  font-size: 0.8rem;
  color: #999;
}
.news-loading, .news-error {
  padding: 20px;
  text-align: center;
  color: #666;
}
.push-section {
  margin-top: 24px;
}
.push-btn {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}
.push-btn:hover {
  background: #0056b3;
}
.push-status {
  color: #555;
  font-size: 0.9rem;
}
</style>
```

- [ ] **Step 2: Set VAPID public key as env var for client**

Create `client/.env.local`:
```
VUE_APP_VAPID_PUBLIC_KEY=<your VAPID public key from Task 1>
```

Add `client/.env.local` to `.gitignore` — in the project root `.gitignore`, replace:
```
node_modules/
```
With:
```
node_modules/
client/.env.local
```

- [ ] **Step 3: Commit**

```bash
cd .. && git add client/src/components/NewsTab.vue .gitignore && git commit -m "feat: add NewsTab Vue component with push subscription UI"
```

> Do NOT commit `client/.env.local` — it is listed in `.gitignore` and contains your VAPID key.

---

## Task 8: Add News Tab to App.vue

**Files:**
- Modify: `client/src/App.vue`

The existing `App.vue` has a `name` ref for tab switching but `setName` is called in the template without being returned from `setup()` (existing bug). We fix this and add the news tab.

- [ ] **Step 1: Add NewsTab import**

In `client/src/App.vue`, replace this exact line:
```javascript
import axios from "axios";
```

With:
```javascript
import axios from "axios";
import NewsTab from "./components/NewsTab.vue";
```

- [ ] **Step 2: Register NewsTab component**

Replace:
```javascript
  components: {},
```

With:
```javascript
  components: { NewsTab },
```

- [ ] **Step 3: Add `setName` function inside `setup()` and fix missing `return`**

The current `setup()` ends with the `draw` function body closing brace followed by `},` — there is no `return` statement. Replace the end of `setup()`:

Replace:
```javascript
      group
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-2em")
        .text("목표까지");
    };
  },
```

With:
```javascript
      group
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-2em")
        .text("목표까지");
    };

    const setName = (newName) => { name.value = newName; };

    return { name, message, targetCur, herestk, herestksise, loading, setName, draw };
  },
```

- [ ] **Step 4: Add news tab `<li>` to the nav**

In the `<template>`, replace:
```html
        <li
          @click="setName('네이버')"
          :class="{ 'nav-active': name === '네이버' }"
        >
          삼성전자
        </li>
      </ul>
```

With:
```html
        <li
          @click="setName('네이버')"
          :class="{ 'nav-active': name === '네이버' }"
        >
          네이버
        </li>
        <li
          @click="setName('경제뉴스')"
          :class="{ 'nav-active': name === '경제뉴스' }"
        >
          경제 뉴스
        </li>
      </ul>
```

(This also fixes the existing bug where all nav labels read "삼성전자".)

- [ ] **Step 5: Add NewsTab component and wrap stock content**

Replace:
```html
    <div class="back" v-if="loading">
```

With:
```html
    <NewsTab v-if="name === '경제뉴스'" />
    <template v-if="name !== '경제뉴스'">
    <div class="back" v-if="loading">
```

And replace the closing `</article>` tag:
```html
  </article>
```

With:
```html
  </template>
  </article>
```

- [ ] **Step 6: Verify the app runs with the new tab (manual step)**

> If running as an agent, skip the browser verification; just confirm `npm run serve` starts without compile errors.

```bash
cd client && npm run serve
```

Expected: Compiles successfully. Open `http://localhost:8080` — "경제 뉴스" tab appears in nav and renders the NewsTab component when clicked.

- [ ] **Step 7: Commit**

```bash
cd .. && git add client/src/App.vue && git commit -m "feat: add 경제뉴스 tab to main navigation"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run all server tests**

```bash
cd server && npx jest --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 2: Start both server and client**

```bash
# Terminal 1
cd server && node stock-server.js

# Terminal 2
cd client && npm run serve
```

- [ ] **Step 3: End-to-end verification checklist**

- [ ] Navigate to `http://localhost:8080`, click "경제 뉴스" tab
- [ ] News items appear (headline + Korean summary)
- [ ] "알림 받기" button visible
- [ ] Click "알림 받기" → browser permission dialog appears
- [ ] Grant permission → button changes to "✅ 알림 설정 완료"
- [ ] Check DevTools → Network → confirm `/api/news` returns valid JSON
- [ ] Check DevTools → Application → Service Workers → `sw.js` registered

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "feat: complete morning economic news tab with push notifications"
```
