export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

export interface Player {
  id: string;
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
  actualCards: Card[];
}

export type GamePhase = 'waiting' | 'playing' | 'bluff_reveal' | 'round_end' | 'game_over';

export interface GameState {
  roomCode: string;
  players: Player[];
  hands: Record<string, Card[]>;
  pile: Card[];
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

export interface RoomConfig {
  maxPlayers: number;
  botSlots: boolean[];
  isPrivate: boolean;
}
