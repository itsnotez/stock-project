# 아침 경제 뉴스 탭 — 설계 문서

**날짜:** 2026-03-20
**프로젝트:** stock-project (기존 Vue 3 + Node.js 앱에 기능 추가)

---

## 목표

기존 주식 앱에 글로벌 경제 뉴스 탭을 추가한다. 매일 오전 8시 브라우저 알림으로 뉴스를 알리고, 앱 접속 시에도 당일 뉴스를 표시한다. 각 뉴스는 원문 헤드라인과 한국어 한 줄 요약으로 구성된다.

---

## 아키텍처 개요

```
[RSS 피드]              [Claude API]
Reuters/CNBC/AP  →  Node.js 크론잡  →  news-cache.json (캐시)
                      (매일 07:50)           ↓
                                       GET /api/news
                                             ↓
                                  Vue 클라이언트 (뉴스 탭)
                                             ↓
                                  Service Worker (08:00 Web Push 알림)
```

**흐름:**
1. Node.js 서버가 매일 07:50에 RSS 크롤링 → Claude API로 요약 → `server/news-cache.json` 저장
2. 클라이언트가 앱 접속 시 `/api/news` 호출 → 캐시된 뉴스 표시
3. 서버가 오전 8시에 Web Push API로 구독된 클라이언트에 알림 발송

---

## 서버 컴포넌트

### 신규 파일

**`server/news-crawler.js`**
- 아래 3개 RSS 피드 파싱 (`rss-parser` 라이브러리)
  - Reuters Business: `https://feeds.reuters.com/reuters/businessNews`
  - CNBC Top News: `https://www.cnbc.com/id/100003114/device/rss/rss.html`
  - AP Business: `https://feeds.apnews.com/rss/apf-business`
- 각 소스에서 최신 3~4개씩, **총 10개 헤드라인** 추출 (소스별 균등 분배)
- 파싱 실패한 소스는 건너뛰고 나머지로 진행

**`server/news-summarizer.js`**
- Claude API (`@anthropic-ai/sdk`, 모델: `claude-haiku-4-5-20251001`) 호출
- **프롬프트 구조:**
  ```
  다음 영문 경제 뉴스 헤드라인들을 각각 한국어 한 문장(30자 이내)으로 요약해줘.
  JSON 배열로만 응답해. 각 항목: {"headline": "원문", "summary": "한국어 요약"}

  헤드라인 목록:
  1. [headline1]
  2. [headline2]
  ...
  ```
- 개별 헤드라인 요약 실패 시 해당 항목의 `summary`를 `null`로 설정 (헤드라인은 유지)
- 결과를 `server/news-cache.json`에 저장

**`server/push-manager.js`**
- Web Push API (`web-push` 라이브러리) 구독 정보 관리
- 구독 정보를 `server/push-subscriptions.json`에 저장
- 오전 8시에 구독된 클라이언트에 알림 발송: "오늘의 경제 뉴스가 준비됐습니다"

### 기존 파일 수정

**`stock-server.js`에 추가:**
- `node-cron`으로 매일 07:50 크롤링 → 요약 → 캐시 저장 실행
- `node-cron`으로 매일 08:00 Web Push 알림 발송 실행
- `GET /api/news` — 캐시 반환. 캐시 파일 없으면 즉시 수집 후 반환. 캐시가 24시간 초과면 백그라운드에서 갱신하되 일단 오래된 캐시 반환 (stale-while-revalidate)
- `POST /api/push/subscribe` — 클라이언트 구독 정보 등록
- `DELETE /api/push/subscribe` — 구독 해제

### 캐시 파일 처리
- `server/news-cache.json`: `.gitignore`에 추가 (런타임 데이터)
- `server/push-subscriptions.json`: `.gitignore`에 추가
- 서버 시작 시 파일 없어도 오류 없이 동작 (첫 크론잡 실행까지 대기 또는 즉시 수집)

### 환경변수
- `ANTHROPIC_API_KEY` — Claude API 인증
- `VAPID_PUBLIC_KEY` — Web Push 공개 키
- `VAPID_PRIVATE_KEY` — Web Push 비공개 키
- `VAPID_EMAIL` — Web Push 발신자 이메일

---

## 클라이언트 컴포넌트

### 신규 파일

**`client/src/components/NewsTab.vue`**
- 마운트 시 axios로 `http://localhost:12010/api/news` 호출 (기존 서버 포트 동일)
- 뉴스 목록 표시: 헤드라인(원문) + 한 줄 한국어 요약 (`summary`가 null이면 헤드라인만)
- 로딩 스피너, 에러 메시지 처리
- "알림 받기" 버튼 → Web Push 구독 요청 → `/api/push/subscribe` 등록

**`client/public/sw.js`** (Service Worker)
- Web Push 수신 처리 (`push` 이벤트)
- 알림 클릭 시 앱 URL로 포커스 이동
- Periodic Background Sync는 사용하지 않음 (브라우저 지원 미흡)

### 기존 파일 수정

**`client/src/App.vue`**
- 기존 탭 시스템 확인: 현재 `name` ref로 활성 탭을 관리하는 `v-if`/`v-show` 패턴 사용
- 동일 패턴으로 "경제 뉴스" 탭 추가: nav에 `<li>` 추가, 콘텐츠 영역에 `<NewsTab v-if="name === 'news'" />` 추가
- Vue Router는 설치되지 않았으므로 도입하지 않음

**`client/src/main.js`**
- Service Worker 등록 코드 추가 (브라우저 지원 시에만)

---

## 데이터 구조

**`server/news-cache.json`:**
```json
{
  "date": "2026-03-20",
  "updatedAt": "2026-03-20T07:50:00Z",
  "news": [
    {
      "headline": "Fed holds rates steady amid inflation concerns",
      "summary": "연준, 인플레이션 우려 속 금리 동결 결정",
      "source": "Reuters",
      "url": "https://..."
    },
    {
      "headline": "Oil prices drop 3% on demand slowdown fears",
      "summary": null,
      "source": "CNBC",
      "url": "https://..."
    }
  ]
}
```

**뉴스 표시 예시:**
```
📰 2026-03-20 글로벌 경제 뉴스

• Fed holds rates steady amid inflation concerns
  → 연준, 인플레이션 우려 속 금리 동결 결정

• Oil prices drop 3% on demand slowdown fears
  (요약 없음 — 헤드라인만 표시)
```

---

## 에러 처리

| 상황 | 처리 방식 |
|------|----------|
| RSS 파싱 실패 | 해당 소스 건너뛰고 나머지로 진행 |
| Claude API 전체 실패 | 요약 없이 헤드라인만 저장 |
| 개별 헤드라인 요약 실패 | 해당 항목 `summary: null`, 나머지는 정상 표시 |
| 캐시 없음 (첫 실행) | 즉시 크롤링 후 반환 |
| 캐시 24시간 초과 | 오래된 캐시 반환 + 백그라운드 갱신 (stale-while-revalidate) |
| Service Worker 미지원 | 알림 기능 조용히 비활성화, 앱 기능은 정상 동작 |
| Web Push 알림 거부 | "알림 받기" 버튼 숨김, 기능 비활성화 |

---

## 추가 의존성

**서버:**
- `rss-parser` — RSS 피드 파싱
- `node-cron` — 스케줄링
- `@anthropic-ai/sdk` — Claude API
- `web-push` — Web Push API

**클라이언트:**
- 추가 라이브러리 없음 (기존 axios 활용)
