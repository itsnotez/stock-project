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
