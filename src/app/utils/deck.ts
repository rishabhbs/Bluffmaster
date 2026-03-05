import { Card, Rank, Suit } from '../types/game';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(deckCount: number = 1): Card[] {
  const deck: Card[] = [];
  
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: `${rank}${suit}-${d}`,
          rank,
          suit,
        });
      }
    }
  }
  
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[], playerCount: number): Record<string, Card[]> {
  const hands: Record<string, Card[]> = {};
  const cardsPerPlayer = Math.floor(deck.length / playerCount);
  
  for (let i = 0; i < playerCount; i++) {
    const playerId = `player${i}`;
    hands[playerId] = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
  }
  
  return hands;
}

export const RANK_LABELS: Record<Rank, string> = {
  'A': 'ACES',
  '2': 'TWOS',
  '3': 'THREES',
  '4': 'FOURS',
  '5': 'FIVES',
  '6': 'SIXES',
  '7': 'SEVENS',
  '8': 'EIGHTS',
  '9': 'NINES',
  '10': 'TENS',
  'J': 'JACKS',
  'Q': 'QUEENS',
  'K': 'KINGS',
};

export const RANK_SYMBOLS: Record<Rank, string> = {
  'A': '♔',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  'J': '♗',
  'Q': '♕',
  'K': '♚',
};

export function isRedSuit(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}
