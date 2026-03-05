// Helper to convert full game state to public game state (safe for all clients)

export function toPublicGameState(fullGameState: any): any {
  const publicState = {
    ...fullGameState,
    // Remove hands completely
    hands: undefined,
    // Replace pile with just count (hide face-down cards)
    pile: undefined,
    pileCount: fullGameState.pile?.length || 0,
  };

  // During bluff_reveal phase, include the revealed cards in lastPlay
  if (fullGameState.gamePhase === 'bluff_reveal' && fullGameState.lastPlay) {
    publicState.lastPlay = {
      ...fullGameState.lastPlay,
      actualCards: fullGameState.lastPlay.actualCards, // Show revealed cards
    };
  } else if (fullGameState.lastPlay) {
    // During normal play, hide actualCards
    publicState.lastPlay = {
      playerId: fullGameState.lastPlay.playerId,
      playerName: fullGameState.lastPlay.playerName,
      cardCount: fullGameState.lastPlay.cardCount,
      declaredRank: fullGameState.lastPlay.declaredRank,
      // actualCards: omitted
    };
  }

  // During bluff_reveal, include revealed cards in bluffResult
  if (fullGameState.gamePhase === 'bluff_reveal' && fullGameState.bluffResult) {
    publicState.bluffResult = {
      ...fullGameState.bluffResult,
      cards: fullGameState.bluffResult.cards, // Show revealed cards
    };
  }

  return publicState;
}
