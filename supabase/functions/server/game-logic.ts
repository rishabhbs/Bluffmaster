// Game logic utilities for Bluff card game

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

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

export function dealCards(deck: Card[], playerIds: string[]): Record<string, Card[]> {
  const hands: Record<string, Card[]> = {};
  const cardsPerPlayer = Math.floor(deck.length / playerIds.length);
  const extraCards = deck.length % playerIds.length; // Remaining cards after even distribution
  
  let currentIndex = 0;
  
  playerIds.forEach((playerId, i) => {
    // Calculate how many cards this player gets
    // Give extra cards to first players (distribute extras as evenly as possible)
    const cardCount = cardsPerPlayer + (i < extraCards ? 1 : 0);
    hands[playerId] = deck.slice(currentIndex, currentIndex + cardCount);
    currentIndex += cardCount;
  });
  
  return hands;
}

export function getNextPlayer(currentPlayerId: string, players: any[]): string {
  const activePlayers = players.filter(p => p.isActive);
  const currentIndex = activePlayers.findIndex(p => p.id === currentPlayerId);
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex].id;
}

export function shouldCallBluff(gameState: any, botPlayerId: string): boolean {
  // Bot logic: calculate probability of bluffing
  if (!gameState.lastPlay || !gameState.activeRank) return false;
  
  const { cardCount, declaredRank } = gameState.lastPlay;
  const deckCount = gameState.maxPlayers >= 6 ? 2 : 1;
  const totalCardsOfRank = 4 * deckCount;
  
  // Count how many of this rank are in the pile (visible to bot through memory)
  const cardsInPile = gameState.pile.filter((c: Card) => c.rank === declaredRank).length;
  
  // If player claimed more cards than exist, definitely call bluff
  if (cardCount > totalCardsOfRank) return true;
  
  // If too many cards of that rank are already in pile, high chance to call
  if (cardsInPile + cardCount > totalCardsOfRank && Math.random() > 0.3) return true;
  
  // Random chance based on number of cards played (more cards = more suspicious)
  if (cardCount >= 3 && Math.random() > 0.6) return true;
  if (cardCount === 4 && Math.random() > 0.4) return true;
  
  return false;
}

export function chooseBotPlay(gameState: any, botPlayerId: string): {
  cardIds: string[];
  declaredRank: Rank;
} {
  const botHand = gameState.hands[botPlayerId] || [];
  const activeRank = gameState.activeRank;
  
  // If bot is starting the round, pick the rank it has most of
  if (!activeRank) {
    const rankCounts: Record<Rank, number> = {} as any;
    botHand.forEach((card: Card) => {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    });
    
    const bestRank = Object.entries(rankCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Rank;
    if (!bestRank) return { cardIds: [], declaredRank: 'A' };
    
    const cardsOfRank = botHand.filter((c: Card) => c.rank === bestRank);
    return {
      cardIds: cardsOfRank.slice(0, Math.min(3, cardsOfRank.length)).map((c: Card) => c.id),
      declaredRank: bestRank,
    };
  }
  
  // Round is in progress, must play activeRank
  const cardsOfActiveRank = botHand.filter((c: Card) => c.rank === activeRank);
  
  if (cardsOfActiveRank.length > 0) {
    // Bot has the cards, 70% chance to play them honestly
    if (Math.random() < 0.7) {
      const playCount = Math.min(2, cardsOfActiveRank.length);
      return {
        cardIds: cardsOfActiveRank.slice(0, playCount).map((c: Card) => c.id),
        declaredRank: activeRank,
      };
    }
  }
  
  // Bot doesn't have cards or chooses to bluff
  const randomCards = [...botHand].sort(() => Math.random() - 0.5);
  const playCount = Math.min(2, randomCards.length);
  
  return {
    cardIds: randomCards.slice(0, playCount).map((c: Card) => c.id),
    declaredRank: activeRank,
  };
}