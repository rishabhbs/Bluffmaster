export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

export interface Player {
  id: string;              // For humans: authUid, for bots: bot-{roomCode}-{index}
  authUid: string;         // Authenticated user ID (same as id for humans, empty for bots)
  name: string;
  isBot: boolean;
  isHost: boolean;
  cardCount: number;
  isActive: boolean;
  lastSeen: number;
}

export interface LastPlay {
  playerId: string;
  playerName: string;
  cardCount: number;
  declaredRank: Rank;
  actualCards: Card[];     // Only revealed during bluff_reveal phase
}

export type GamePhase = 'waiting' | 'playing' | 'bluff_reveal' | 'round_end' | 'game_over';

export interface GameState {
  roomCode: string;
  stateVersion: number;    // Incremented on every mutation for optimistic concurrency
  players: Player[];
  hands: Record<string, Card[]>;  // Server-side only, never sent to clients
  pile: Card[];
  pileCount: number;       // Public count, actual cards hidden unless revealed
  activeRank: Rank | null;
  currentTurn: string;
  roundStartedBy: string;
  passCount: number;
  lastPlay: LastPlay | null;
  gamePhase: GamePhase;
  votes: Record<string, 'redistribute' | 'wait'>;
  inactivePlayerId: string | null;
  maxPlayers: number;
  winnerId: string | null;
  bluffCallerId: string | null;
  bluffResult: {
    wasBluffing: boolean;
    loserPlayerId: string;
    cards: Card[];
  } | null;
}

// Public game state - safe to send to all clients
export interface PublicGameState {
  roomCode: string;
  stateVersion: number;
  players: Player[];
  // hands: NEVER included
  pileCount: number;
  activeRank: Rank | null;
  currentTurn: string;
  roundStartedBy: string;
  passCount: number;
  lastPlay: {
    playerId: string;
    playerName: string;
    cardCount: number;
    declaredRank: Rank;
    // actualCards only during bluff_reveal
    actualCards?: Card[];
  } | null;
  gamePhase: GamePhase;
  votes: Record<string, 'redistribute' | 'wait'>;
  inactivePlayerId: string | null;
  maxPlayers: number;
  winnerId: string | null;
  bluffCallerId: string | null;
  bluffResult: {
    wasBluffing: boolean;
    loserPlayerId: string;
    cards: Card[];
  } | null;
}

export interface RoomConfig {
  maxPlayers: number;
  botSlots: boolean[];
  isPrivate: boolean;
}
