# Quiz Survival Arena

실시간 멀티플레이 3D 퀴즈 서바이벌 게임. 플레이어들은 같은 3D 공간에 접속해
제한 시간 안에 정답이라고 생각하는 바닥 타일 구역으로 이동한다. 타이머가 끝나면
서버가 위치를 판정하여 오답 구역의 플레이어를 탈락시키고, 마지막 1인이 승리한다.

> 자세한 기획은 [`structure.md`](./structure.md) 참고.

## 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, React Three Fiber, Three.js, TypeScript, TailwindCSS
- **Realtime**: Socket.IO (독립 Node 서버)
- **Database**: Supabase (PostgreSQL) — **문제 데이터 전용**
- **Deploy**: 웹 앱 → **Vercel**, 소켓 서버 → **Render** (분리 배포)

## 아키텍처

```
                Player/Admin Browser
              │                    │
   REST(quiz CRUD)            WebSocket(gameplay)
              ▼                    │
   Vercel  (Next.js 앱)           │
   ├ /admin, /game, 페이지         │
   ├ /api/admin/quizzes → Supabase│  (문제 CRUD)
   └ /api/admin/game/create ──proxy──┐
              │                    │  │
              ▼                    ▼  ▼
        Supabase(quizzes)   Render (socket-server.ts)
                            ├ Socket.IO (게임 진행)
                            ├ POST /game/create (Supabase에서 문제 로드 → 방 생성)
                            └ 메모리 게임 상태 (server/store.ts)
```

왜 분리하는가: **Vercel은 서버리스라 상시 WebSocket·커스텀 서버를 못 띄우고**, 또
Vercel 함수와 Render 프로세스는 메모리를 공유할 수 없다. 따라서 **모든 실시간 게임
상태(방·플레이어·위치)와 방 생성은 Render 소켓 서버가 단독으로 소유**한다.

- **영속 데이터(문제)** → Supabase
- **실시간 데이터(방·플레이어·위치)** → Render 소켓 서버 메모리 (`server/store.ts`)
- 브라우저는 게임플레이용 Socket.IO를 **Render URL로 직접** 연결
  (`NEXT_PUBLIC_SOCKET_URL`). 게임 생성은 Vercel 라우트가 Render로 프록시한다
  (`SOCKET_SERVER_URL`).
- **Server-authoritative**: 생존 판정은 전적으로 서버가 저장한 좌표로 계산된다.
  클라이언트는 정답을 알 수 없으며 생존 여부를 조작할 수 없다.

## 디렉터리

| 경로 | 설명 |
| --- | --- |
| `socket-server.ts` | **Render**에 배포되는 독립 소켓 서버 (Socket.IO + `/game/create` + `/health`) |
| `server/store.ts` | 메모리 게임 스토어 |
| `server/gameEngine.ts` | 라운드/게임 루프, 서버 판정 |
| `server/socket.ts` | 소켓 이벤트 핸들러, 100ms 위치 브로드캐스트 |
| `server/createGame.ts` | Supabase에서 문제 로드 → 방 생성 |
| `render.yaml` | Render 배포 블루프린트 |
| `lib/types.ts` | 클라이언트·서버 공유 타입 & 소켓 이벤트 |
| `lib/gameConfig.ts` | 아레나 좌표/존 계산 등 공유 상수 |
| `lib/supabase.ts` | Supabase 클라이언트 |
| `lib/useGameSocket.ts` | 클라이언트 소켓 상태 훅 |
| `app/page.tsx` | 홈(닉네임·방코드 입장) |
| `app/admin/page.tsx` | 관리자 CMS (문제 CRUD · 게임 생성) |
| `app/game/[roomId]/` | 3D 게임 화면 (Arena/HUD) |
| `app/api/admin/**` | 관리자 REST 라우트 |
| `supabase/schema.sql` | DB 스키마 + 샘플 문제 |

## 시작하기

### 1. 환경 변수

[`.env.example`](./.env.example) 참고. 로컬 `.env` 에는 Supabase 값과 소켓 서버
URL이 들어 있다.

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000   # 브라우저가 연결할 소켓 서버
SOCKET_SERVER_URL=http://localhost:4000        # /game/create 프록시 대상
```

### 2. DB 초기화 (최초 1회)

Supabase 프로젝트의 **SQL Editor** 에서 [`supabase/schema.sql`](./supabase/schema.sql)
전체를 실행한다. `quizzes` 테이블과 샘플 문제 10개가 생성된다.

> 이 단계를 건너뛰면 문제 API가 `Could not find the table 'public.quizzes'` 오류를
> 반환한다.

### 3. 로컬 실행 (터미널 2개)

```bash
npm install
npm run socket   # 소켓 서버   → http://localhost:4000
npm run dev      # Next.js 앱  → http://localhost:3000
```

## 배포

### 소켓 서버 → Render

- [`render.yaml`](./render.yaml) 블루프린트 사용 (또는 Web Service 수동 생성).
- **Build**: `npm install` · **Start**: `npm run socket:start` · **Health**: `/health`
- 환경변수: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLIENT_ORIGIN`(Vercel URL 또는 `*`).
  `PORT` 는 Render가 자동 주입.

### 웹 앱 → Vercel

- 프레임워크 자동 감지(Next.js). **Build**: `next build`.
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SOCKET_URL`(Render URL), `SOCKET_SERVER_URL`(Render URL).

## 플레이 흐름

1. `/admin` 에서 문제를 관리하고 **게임 생성**(테마·문제수·최대인원) → `roomId` 발급.
2. 생성된 `roomId`로 플레이어들이 `/game/<roomId>` 입장 (또는 홈에서 방코드 입력).
3. 대기실에서 **게임 시작**.
4. 매 라운드: 문제 표시 → WASD/방향키로 정답 구역 이동 → 타이머 종료 →
   서버 판정 → 오답 타일 제거 & 탈락 → 다음 라운드.
5. 생존자 1명 또는 문제 소진 시 종료, 우승자 표시.

## 주요 소켓 이벤트

| 방향 | 이벤트 | 설명 |
| --- | --- | --- |
| C→S | `joinRoom` | 방 참가 |
| C→S | `startGame` | 게임 시작 |
| C→S | `playerMove` | 위치 전송(100ms 주기) |
| S→C | `questionStart` | 문제 출제(정답 미포함) |
| S→C | `playersUpdate` | 위치 동기화(10/sec) |
| S→C | `revealAnswer` | 정답·탈락자 공개 |
| S→C | `roundResult` | 라운드 결과 |
| S→C | `gameEnd` | 게임 종료/우승자 |

## 보안 / 신뢰성 메모

- 정답은 `questionStart` 페이로드에 **포함되지 않으며**, `revealAnswer` 시점에만 공개된다.
- 위치는 서버가 아레나 경계로 클램프하고, 판정은 서버 저장 좌표로만 수행한다.
- 연결 종료 시 대기 중이면 제거, 게임 중이면 탈락 처리하여 라운드가 멈추지 않게 한다.
- 게임 종료 후 일정 시간 뒤 방 메모리를 정리한다.
- 현재 관리자 API는 anon 키만 사용한다. 실배포 전에는 RLS 정책을 강화하거나
  service-role 키 기반 관리자 인증을 적용할 것. (`supabase/schema.sql` 주석 참고)
