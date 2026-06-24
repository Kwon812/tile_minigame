# Quiz Survival Arena - Project Specification

## 1. Project Overview

### Project Name
Quiz Survival Arena

### Introduction
Quiz Survival Arena는 다수의 플레이어가 동일한 3D 공간에 접속하여 제한 시간 내 정답이라고 생각하는 바닥 타일 위로 이동하는 실시간 멀티플레이 퀴즈 서바이벌 게임이다. 시간이 종료되면 정답 타일만 남고 나머지 타일은 제거되며, 오답 타일 위 플레이어는 탈락한다. 마지막까지 살아남은 플레이어가 승리한다.

본 프로젝트는 웹 기반 3D 렌더링, 실시간 웹소켓 통신, 서버 authoritative 구조, 관리자 CMS를 통한 문제 관리 시스템 구현을 목표로 한다.

---

## 2. Project Goals

- 웹 기반 3D 멀티플레이 게임 구현
- 실시간 위치 동기화 시스템 구축
- 서버 authoritative 구조 기반 게임 판정 시스템 구현
- 관리자 페이지를 통한 문제 관리 시스템 구축
- 다수 동시 접속 환경 성능 최적화

---

## 3. Core Features

### Player Features

- 닉네임 입력 후 게임 참가
- 실시간 플레이어 이동
- 문제 확인 후 정답 타일 이동
- 라운드 생존 여부 판정
- 마지막 1인 승리

### Admin Features

- 문제 CRUD
- 테마별 문제 관리
- 게임 생성
- 게임 생성 시 문제 테마 선택
- 최대 플레이어 수 설정
- 문제 개수 설정

---

## 4. Technical Stack

### Frontend

- Next.js
- React
- React Three Fiber
- Three.js
- TypeScript
- TailwindCSS

### Backend

- Node.js
- Socket.IO

### Database

- Supabase (PostgreSQL)

### Deployment

- Render

---

## 5. Architecture

```text
Admin Client
   |
   | REST API
   v
Next.js Server
   |
   | Query
   v
Supabase Database
   |
   | Load Quiz Data
   v
Socket Server
   |
   | WebSocket
   v
Player Clients
```

Architecture Principle

- Persistent Data → Database (Supabase)
- Real-time Data → Socket Server Memory

---

## 6. Database Design

Database는 문제 관리 용도로만 사용한다.

### quizzes table

```sql
quizzes

id UUID PRIMARY KEY
question TEXT
options JSONB
correct_answer INTEGER
theme VARCHAR(50)
difficulty VARCHAR(20)
is_active BOOLEAN
created_at TIMESTAMP
```

Example

```json
{
  "question": "대한민국 수도는?",
  "options": ["서울", "부산", "대전", "광주"],
  "correct_answer": 0,
  "theme": "geography"
}
```

---

## 7. Admin System

### Quiz Management

Functions

- 문제 생성
- 문제 수정
- 문제 삭제
- 테마 설정
- 활성화 여부 변경

API

```text
POST /api/admin/quizzes
GET /api/admin/quizzes
PATCH /api/admin/quizzes/:id
DELETE /api/admin/quizzes/:id
```

---

### Game Creation

관리자가 게임 생성 시 설정

```text
Theme: science
Question Count: 10
Max Players: 30
```

API

```text
POST /api/admin/game/create
```

Request

```json
{
  "theme": "science",
  "questionCount": 10,
  "maxPlayers": 30
}
```

---

## 8. Room Management

Room 데이터는 DB에 저장하지 않고 서버 메모리에 저장한다.

```javascript
rooms = {
  room_1: {
    theme: 'science',
    maxPlayers: 30,
    round: 1,
    players: {},
    questionList: [],
    currentQuestion: null,
    gameState: 'waiting'
  }
}
```

게임 종료 시

```javascript
delete rooms[roomId]
```

---

## 9. Player State Management

서버가 모든 플레이어 상태 관리

```javascript
player = {
  x: 10,
  y: 0,
  z: 5,
  rotationY: 1.2,
  alive: true,
  connected: true
}
```

State Rules

Server stores

- position
- alive status
- connection status
- rotation

Client stores

- camera state
- UI state
- effect state

---

## 10. Game Flow

```text
WAITING ROOM
      ↓
GAME START
      ↓
LOAD QUESTIONS FROM SUPABASE
      ↓
QUESTION START
      ↓
PLAYER MOVEMENT
      ↓
TIMER END
      ↓
SERVER CHECK POSITION
      ↓
REMOVE WRONG TILES
      ↓
ELIMINATE PLAYERS
      ↓
NEXT ROUND
      ↓
FINAL WINNER
```

---

## 11. Multiplayer Synchronization

Player position sent every 100ms

```javascript
socket.emit('playerMove', {
  x,
  y,
  z,
  rotationY
})
```

10 updates/sec

Server stores latest position

```javascript
players[socket.id] = {
  x,
  z,
  alive
}
```

---

## 12. Answer Validation System

서버 authoritative 구조 사용

Server stores safe tiles

```javascript
safeTiles = [3, 7, 12, 20, 31]
```

Timer ends

```text
Timer End
→ Check player coordinates
→ Compare with safe tiles
→ alive = false if incorrect
```

Client cannot determine survival state.

---

## 13. Tile Removal System

When timer ends

Server emits

```javascript
socket.emit('revealAnswer', {
  safeTiles,
  eliminatedPlayers
})
```

Client animation

- wrong tiles disappear
- eliminated players fall down

Example

```javascript
player.position.y -= 0.15
```

---

## 14. Socket Events

| Event | Description |
|---------|------------|
| createGame | 관리자 게임 생성 |
| joinRoom | 플레이어 참가 |
| gameStart | 게임 시작 |
| questionStart | 문제 출제 |
| playerMove | 위치 전송 |
| revealAnswer | 정답 공개 |
| roundResult | 탈락자 공개 |
| nextRound | 다음 라운드 |
| gameEnd | 게임 종료 |

---

## 15. Functional Requirements

### FR-01 Quiz Management

관리자는 문제를 생성, 수정, 삭제할 수 있어야 한다.

### FR-02 Theme System

문제는 테마별로 분류되어야 한다.

### FR-03 Game Creation

관리자는 특정 테마를 선택하여 게임을 생성할 수 있어야 한다.

### FR-04 Player Join

플레이어는 생성된 방에 참가할 수 있어야 한다.

### FR-05 Movement Sync

플레이어 위치가 실시간 동기화되어야 한다.

### FR-06 Timer System

모든 플레이어는 동일한 타이머를 공유해야 한다.

### FR-07 Answer Validation

서버는 플레이어 위치를 기준으로 생존 여부를 판정해야 한다.

### FR-08 Elimination

오답 타일 플레이어는 탈락해야 한다.

### FR-09 Round System

생존자만 다음 라운드로 이동해야 한다.

### FR-10 Final Winner

마지막 생존자가 승리해야 한다.

---

## 16. Non Functional Requirements

### Performance

- 30 concurrent players
- 100ms synchronization interval
- low latency websocket communication

### Security

- server authoritative architecture
- client cannot manipulate survival state

### Reliability

- player disconnect handling
- room cleanup after game ends

### Scalability

- multiple game rooms possible
- future ranking system support

---

## 17. Portfolio Technical Highlights

- Real-time multiplayer game architecture
- WebSocket communication using Socket.IO
- Server authoritative game state management
- 3D rendering using React Three Fiber
- Admin CMS architecture
- Database design using Supabase
- Performance optimization with low frequency synchronization
- Separation of persistent and real-time data architecture
