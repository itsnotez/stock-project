# Stock Project

국내 주요 종목의 주가 현황을 확인하고, 매일 아침 글로벌 경제 뉴스를 AI 요약으로 받아볼 수 있는 웹 애플리케이션입니다.

## 주요 기능

- **주가 조회** — 삼성전자, 네이버, 현대모비스, 카카오의 당일 주가 및 최근 시세 확인
- **목표 매수 금액 설정** — 종목별 목표가 대비 현재가 도달률을 도넛 차트로 시각화
- **글로벌 경제 뉴스 탭** — Reuters, CNBC, AP 등 해외 경제 뉴스를 한국어 한 줄 요약으로 제공
- **아침 알림** — 매일 오전 8시 Web Push 알림으로 뉴스 도착 안내

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Vue 3 (Composition API), D3.js, Axios |
| 백엔드 | Node.js, Express |
| 뉴스 수집 | rss-parser (Reuters / CNBC / AP RSS) |
| AI 요약 | OpenRouter API (기본 모델: `openai/gpt-4o-mini`) |
| 알림 | Web Push API, Service Worker |
| 스케줄링 | node-cron |
| 테스트 | Jest |

## 프로젝트 구조

```
stock-project/
├── client/                        # Vue 3 프론트엔드
│   ├── public/
│   │   ├── index.html
│   │   └── sw.js                  # Service Worker (Web Push 수신)
│   └── src/
│       ├── App.vue                # 탭 네비게이션 (주식 4종목 + 경제뉴스)
│       ├── main.js                # 앱 진입점, Service Worker 등록
│       └── components/
│           └── NewsTab.vue        # 경제 뉴스 탭 컴포넌트
│
├── server/                        # Node.js 백엔드
│   ├── stock-server.js            # Express 서버 (포트 12010)
│   ├── news-crawler.js            # RSS 피드 크롤링
│   ├── news-summarizer.js         # OpenRouter API 한국어 요약
│   ├── push-manager.js            # Web Push 구독 관리 및 발송
│   ├── news-crawler.test.js
│   ├── news-summarizer.test.js
│   ├── push-manager.test.js
│   ├── .env.example               # 환경변수 템플릿
│   └── package.json
│
└── docs/
    └── superpowers/
        ├── specs/                 # 기능 설계 문서
        └── plans/                 # 구현 계획 문서
```

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/stocks/today` | 당일 주가 조회 |
| GET | `/stocks/days` | 최근 시세 목록 조회 |
| GET | `/api/news` | 오늘의 경제 뉴스 조회 (캐시 기반) |
| POST | `/api/push/subscribe` | Web Push 구독 등록 |
| DELETE | `/api/push/subscribe` | Web Push 구독 해제 |

## 뉴스 동작 흐름

```
매일 07:50  →  RSS 크롤링 (Reuters / CNBC / AP)
            →  OpenRouter API로 한국어 요약
            →  news-cache.json 저장

매일 08:00  →  Web Push 알림 발송 (구독된 브라우저)

앱 접속 시  →  GET /api/news 호출
            →  캐시 반환 (24시간 초과 시 백그라운드 갱신)
```

## 시작하기

### 1. 환경변수 설정

```bash
cp server/.env.example server/.env
```

`server/.env` 파일에 아래 값을 입력합니다:

```env
OPENROUTER_API_KEY=sk-or-...          # https://openrouter.ai 에서 발급
OPENROUTER_MODEL=openai/gpt-4o-mini   # 원하는 모델로 변경 가능
VAPID_PUBLIC_KEY=...                  # web-push 키 (최초 1회 생성)
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:your@email.com
```

VAPID 키가 없다면 아래 명령으로 생성합니다:

```bash
cd server && node -e "const wp = require('web-push'); const k = wp.generateVAPIDKeys(); console.log(k);"
```

그리고 생성된 공개 키를 `client/.env.local`에도 추가합니다:

```env
VUE_APP_VAPID_PUBLIC_KEY=<VAPID_PUBLIC_KEY와 동일한 값>
```

### 2. 서버 실행

```bash
cd server
npm install
node stock-server.js
```

서버가 `http://localhost:12010` 에서 실행됩니다.

### 3. 클라이언트 실행

```bash
cd client
npm install
npm run serve
```

브라우저에서 `http://localhost:8080` 접속.

### 4. 테스트 실행

```bash
cd server
npx jest
```

## 주요 메모

- 뉴스 캐시 파일(`server/news-cache.json`)은 서버 최초 실행 후 `/api/news` 첫 호출 시 자동 생성됩니다.
- Web Push 알림은 브라우저에서 "알림 받기" 버튼을 눌러 허용해야 활성화됩니다.
- `OPENROUTER_MODEL` 환경변수로 모델을 교체할 수 있습니다. (예: `google/gemini-flash-1.5`, `anthropic/claude-haiku-3`)
