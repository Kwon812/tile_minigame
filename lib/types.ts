// Shared types used by both the Next.js app and the Socket.IO game server.

export type Difficulty = "easy" | "normal" | "hard";

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  theme: string;
  difficulty: Difficulty;
  is_active: boolean;
  created_at: string;
}

/** Quiz as exposed to players during a round — never includes the answer. */
export interface PublicQuestion {
  question: string;
  options: string[];
}

export type GameState =
  | "waiting"
  | "question"
  | "reveal"
  | "intermission"
  | "ended";

/** Server-authoritative player record. */
export interface Player {
  id: string;
  nickname: string;
  /** Index into PLAYER_COLORS. */
  color: number;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  alive: boolean;
  connected: boolean;
}

/** Player view sent to clients (everything here is public). */
export interface PlayerView {
  id: string;
  nickname: string;
  /** Index into PLAYER_COLORS. */
  color: number;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  alive: boolean;
  connected: boolean;
}

/** Arena layout the client needs to render the tile grid. */
export interface ArenaConfig {
  /** Number of selectable answer zones (== number of quiz options). */
  optionCount: number;
  /** Tile grid columns (across X). */
  cols: number;
  /** Tile grid rows (across Z). */
  rows: number;
  /** Side length of a single tile in world units. */
  tileSize: number;
  /**
   * Zone (answer option index) for every tile, in row-major order
   * (index = row * cols + col). Server-generated so all clients render the
   * same shuffled board and the server can judge by the tile a player stands on.
   */
  tileZones: number[];
}

export interface RoomPublicState {
  roomId: string;
  theme: string;
  maxPlayers: number;
  round: number;
  totalRounds: number;
  gameState: GameState;
  players: PlayerView[];
  arena: ArenaConfig;
}

// ---- Socket payloads ----

export interface JoinRoomPayload {
  roomId: string;
  nickname: string;
  /** Index into PLAYER_COLORS. */
  color: number;
}

export interface PlayerMovePayload {
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

export interface QuestionStartPayload {
  round: number;
  totalRounds: number;
  question: PublicQuestion;
  /** Round duration in milliseconds. */
  duration: number;
  /** Epoch ms when movement/timer begins (after the 3·2·1 countdown). */
  startsAt: number;
  /** Absolute end timestamp (ms epoch) so clients share one countdown. */
  endsAt: number;
  arena: ArenaConfig;
}

export interface RevealAnswerPayload {
  correctAnswer: number;
  eliminatedPlayerIds: string[];
}

export interface RoundResultPayload {
  round: number;
  alive: PlayerView[];
  eliminated: PlayerView[];
}

export interface GameEndPayload {
  /** Single winner when exactly one survivor remains, else null. */
  winner: PlayerView | null;
  /** All surviving players at game end (co-winners on a tie). Empty if none. */
  winners: PlayerView[];
}

// Client -> Server events
export interface ClientToServerEvents {
  joinRoom: (payload: JoinRoomPayload) => void;
  startGame: () => void;
  playerMove: (payload: PlayerMovePayload) => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  joined: (state: RoomPublicState & { selfId: string }) => void;
  joinError: (message: string) => void;
  roomState: (state: RoomPublicState) => void;
  gameStart: () => void;
  questionStart: (payload: QuestionStartPayload) => void;
  playersUpdate: (players: PlayerView[]) => void;
  revealAnswer: (payload: RevealAnswerPayload) => void;
  roundResult: (payload: RoundResultPayload) => void;
  nextRound: (round: number) => void;
  gameEnd: (payload: GameEndPayload) => void;
}
