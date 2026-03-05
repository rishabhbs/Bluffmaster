import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { GameState, Card, Rank } from '../types/game';
import { apiCall, supabase } from '../utils/supabase';
import { audioManager } from '../utils/audio';
import { RANK_LABELS } from '../utils/deck';
import PlayingCard from '../components/PlayingCard';
import OpponentPanel from '../components/OpponentPanel';
import CenterPile from '../components/CenterPile';
import BevelButton from '../components/BevelButton';
import ConnectionStatus from '../components/ConnectionStatus';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Volume2, VolumeX, LogOut, Crown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { RealtimeChannel } from '@supabase/supabase-js';

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Helper function to sort cards by rank
const sortCardsByRank = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => {
    const rankA = RANKS.indexOf(a.rank);
    const rankB = RANKS.indexOf(b.rank);
    return rankA - rankB;
  });
};

export default function GameScreen() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const [playerId] = useState(localStorage.getItem('bluff-player-id') || '');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showBluffReveal, setShowBluffReveal] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isResolvingBluff, setIsResolvingBluff] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const isMyTurn = gameState?.currentTurn === playerId;
  const currentPlayer = gameState?.players.find(p => p.id === playerId);
  const canCallBluff = isMyTurn && gameState?.lastPlay && gameState?.lastPlay.playerId !== playerId && gameState.pile.length > 0;
  const canPass = isMyTurn && gameState?.roundStartedBy !== playerId;

  useEffect(() => {
    if (!roomCode || !playerId) {
      navigate('/');
      return;
    }

    // Initial load
    loadCombinedState();
    
    // Set up Supabase Realtime subscription
    const roomChannel = supabase.channel(`room:${roomCode}`, {
      config: {
        broadcast: { self: true },
      },
    });

    // Subscribe to game state updates
    roomChannel
      .on('broadcast', { event: 'game_update' }, (payload: any) => {
        console.log('🔥 WebSocket: Game state updated', payload);
        if (payload.payload?.gameState) {
          setGameState(payload.payload.gameState);
        }
      })
      .on('broadcast', { event: 'hand_update' }, (payload: any) => {
        console.log('🔥 WebSocket: Hand updated for player', playerId);
        if (payload.payload?.playerId === playerId && payload.payload?.hand) {
          setMyHand(sortCardsByRank(payload.payload.hand));
        }
      })
      .subscribe((status) => {
        console.log('🔥 WebSocket subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to room:', roomCode);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ WebSocket channel error');
          setConnectionError('Real-time connection error');
        }
      });

    setChannel(roomChannel);
    
    // Heartbeat to keep player active
    const heartbeatInterval = setInterval(sendHeartbeat, 5000);
    
    return () => {
      console.log('🔌 Unsubscribing from room:', roomCode);
      roomChannel.unsubscribe();
      clearInterval(heartbeatInterval);
    };
  }, [roomCode, playerId]);

  useEffect(() => {
    if (gameState?.gamePhase === 'bluff_reveal') {
      setShowBluffReveal(true);
      audioManager.play('bluff_correct');
    } else {
      setShowBluffReveal(false);
    }

    if (gameState?.gamePhase === 'game_over') {
      setShowGameOver(true);
      audioManager.play('game_win');
    }
  }, [gameState?.gamePhase]);

  // Bot turn handler
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== 'playing') return;
    
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurn);
    if (currentPlayer?.isBot && gameState.currentTurn !== playerId) {
      // Trigger bot turn after delay
      const timeout = setTimeout(() => {
        handleBotTurn(currentPlayer.id);
      }, 500 + Math.random() * 500); // Reduced from 1500-2500ms to 500-1000ms
      
      return () => clearTimeout(timeout);
    }
  }, [gameState?.currentTurn, gameState?.gamePhase]);

  // Handle round_end phase auto-transition
  useEffect(() => {
    if (gameState?.gamePhase === 'round_end') {
      const timeout = setTimeout(() => {
        loadGameState(); // Will refresh and show new phase
      }, 800); // Reduced from 2000ms
      
      return () => clearTimeout(timeout);
    }
  }, [gameState?.gamePhase]);

  const loadCombinedState = async () => {
    try {
      const response = await apiCall(`/rooms/${roomCode}/state/${playerId}`);
      setGameState(response.gameState);
      setMyHand(sortCardsByRank(response.hand));
      setIsLoadingInitial(false);
      setConnectionError(null);
    } catch (error: any) {
      console.error('Error loading combined state:', error);
      setConnectionError(error.message);
      // Don't navigate away, just log the error and keep trying
    }
  };

  const loadGameState = async () => {
    try {
      const response = await apiCall(`/rooms/${roomCode}/state/${playerId}`);
      setGameState(response.gameState);
      setMyHand(sortCardsByRank(response.hand));
    } catch (error: any) {
      console.error('Error loading game state:', error);
      setConnectionError(error.message);
    }
  };

  const loadMyHand = async () => {
    try {
      const response = await apiCall(`/rooms/${roomCode}/hand/${playerId}`);
      setMyHand(sortCardsByRank(response.hand));
    } catch (error: any) {
      console.error('Error loading hand:', error);
    }
  };

  const sendHeartbeat = async () => {
    try {
      await apiCall(`/rooms/${roomCode}/heartbeat`, 'POST', { playerId });
    } catch (error: any) {
      console.error('Error sending heartbeat:', error);
      setConnectionError(error.message);
      // Silently fail - heartbeat is not critical
    }
  };

  const handleBotTurn = async (botId: string) => {
    try {
      await apiCall(`/rooms/${roomCode}/bot-turn`, 'POST', { botId });
      loadGameState();
    } catch (error: any) {
      console.error('Error executing bot turn:', error);
      setConnectionError(error.message);
    }
  };

  const toggleCardSelection = (cardId: string) => {
    if (!isMyTurn) return;
    
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
    audioManager.play('card_select');
  };

  const handlePlayCards = () => {
    if (selectedCards.size === 0) return;
    
    // If activeRank is already set, play automatically with that rank
    if (gameState?.activeRank) {
      handleDeclareAndPlay(gameState.activeRank);
    } else {
      // Starting a new round, need to choose a rank
      setShowDeclarationModal(true);
    }
  };

  const handleDeclareAndPlay = async (declaredRank: Rank) => {
    try {
      setShowDeclarationModal(false);
      
      await apiCall(`/rooms/${roomCode}/play`, 'POST', {
        playerId,
        cardIds: Array.from(selectedCards),
        declaredRank,
      });

      audioManager.play('card_place');
      setSelectedCards(new Set());
      loadGameState();
      loadMyHand();
    } catch (error: any) {
      console.error('Error playing cards:', error);
      alert('Failed to play cards: ' + error.message);
    }
  };

  const handlePass = async () => {
    try {
      await apiCall(`/rooms/${roomCode}/pass`, 'POST', { playerId });
      audioManager.play('pass');
      loadGameState();
    } catch (error: any) {
      console.error('Error passing:', error);
      alert('Failed to pass: ' + error.message);
    }
  };

  const handleCallBluff = async () => {
    try {
      await apiCall(`/rooms/${roomCode}/bluff`, 'POST', { callerId: playerId });
      loadGameState();
    } catch (error: any) {
      console.error('Error calling bluff:', error);
      alert('Failed to call bluff: ' + error.message);
    }
  };

  const handleResolveBluff = async () => {
    // Prevent duplicate calls
    if (isResolvingBluff) return;
    
    // Check if there's actually a bluff to resolve
    if (!gameState?.bluffResult) {
      console.log('No bluff result found, closing modal');
      setShowBluffReveal(false);
      return;
    }
    
    try {
      setIsResolvingBluff(true);
      await apiCall(`/rooms/${roomCode}/resolve-bluff`, 'POST');
      setShowBluffReveal(false);
      
      if (gameState?.bluffResult?.wasBluffing) {
        audioManager.play('bluff_correct');
      } else {
        audioManager.play('bluff_wrong');
      }
      
      setTimeout(() => {
        audioManager.play('pickup_pile');
      }, 500);
      
      loadGameState();
      loadMyHand();
    } catch (error: any) {
      console.error('Error resolving bluff:', error);
      // If bluff was already resolved, just close the modal
      if (error.message.includes('No bluff to resolve')) {
        setShowBluffReveal(false);
        loadGameState();
      }
    } finally {
      setIsResolvingBluff(false);
    }
  };

  const toggleSound = () => {
    const newState = audioManager.toggleSound();
    setSoundEnabled(newState);
  };

  const opponents = gameState?.players.filter(p => p.id !== playerId) || [];
  const lastPlayInfo = gameState?.lastPlay
    ? `${gameState.lastPlay.playerName} played ${gameState.lastPlay.cardCount} card${gameState.lastPlay.cardCount > 1 ? 's' : ''}`
    : '';

  // Show loading or error state
  if (!gameState) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: 'radial-gradient(ellipse at center, var(--table-green) 0%, #1a4a35 100%)',
        }}
      >
        <div className="text-center">
          {connectionError ? (
            <div className="max-w-md">
              <div
                className="p-8 rounded-lg mb-4"
                style={{
                  background: 'var(--walnut-wood)',
                  border: '3px solid var(--danger-red)',
                }}
              >
                <h2 className="font-['Playfair_Display'] text-2xl font-bold mb-4" style={{ color: 'var(--danger-red)' }}>
                  Connection Error
                </h2>
                <p className="font-['Courier_Prime'] text-sm mb-4" style={{ color: 'var(--text-parchment)' }}>
                  {connectionError}
                </p>
                <p className="font-['Courier_Prime'] text-xs mb-6" style={{ color: 'var(--text-parchment)' }}>
                  The Supabase Edge Function may need to be deployed or is cold-starting. Please wait a moment and try again.
                </p>
                <BevelButton
                  variant="primary"
                  onClick={() => {
                    setConnectionError(null);
                    loadGameState();
                    loadMyHand();
                  }}
                  className="w-full mb-3"
                >
                  RETRY CONNECTION
                </BevelButton>
                <BevelButton
                  variant="secondary"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  BACK TO MENU
                </BevelButton>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  <Sparkles className="w-12 h-12" style={{ color: 'var(--gold-accent)' }} />
                </motion.div>
              </div>
              <p className="font-['Courier_Prime'] text-xl" style={{ color: 'var(--text-parchment)' }}>
                {isLoadingInitial ? 'Connecting to game server...' : 'Loading game...'}
              </p>
              <p className="font-['Courier_Prime'] text-sm mt-2" style={{ color: 'var(--text-parchment)', opacity: 0.7 }}>
                This may take a moment if the server is starting up
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        background: 'radial-gradient(ellipse at center, var(--table-green) 0%, #1a4a35 100%)',
        backgroundImage: `
          radial-gradient(ellipse at center, var(--table-green) 0%, #1a4a35 100%),
          url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")
        `,
      }}
    >
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4">
        <div className="font-['Courier_Prime'] text-sm" style={{ color: 'var(--text-parchment)' }}>
          Room: <span className="font-bold">{roomCode}</span>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={toggleSound}
            className="p-2 rounded hover:brightness-110 transition-all"
            style={{ background: 'var(--walnut-wood)', border: '2px solid var(--gold-accent)' }}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" style={{ color: 'var(--gold-accent)' }} />
            ) : (
              <VolumeX className="w-5 h-5" style={{ color: 'var(--gold-accent)' }} />
            )}
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded hover:brightness-110 transition-all"
            style={{ background: 'var(--walnut-wood)', border: '2px solid var(--gold-accent)' }}
          >
            <LogOut className="w-5 h-5" style={{ color: 'var(--gold-accent)' }} />
          </button>
        </div>
      </div>

      {/* Game Table */}
      <div className="flex-1 flex flex-col items-center justify-between p-4 pb-32">
        {/* Opponents */}
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" id="opponents-container">
            {opponents.map((opponent, index) => (
              <OpponentPanel
                key={opponent.id}
                player={opponent}
                isCurrentTurn={gameState.currentTurn === opponent.id}
              />
            ))}
          </div>
        </div>

        {/* Center Pile */}
        <div className="my-8">
          <CenterPile
            pileCount={gameState.pile.length}
            activeRank={gameState.activeRank}
            lastPlayInfo={lastPlayInfo}
            lastPlayerId={gameState.lastPlay?.playerId}
            currentPlayerId={playerId}
            opponentPositions={
              opponents.reduce((acc, opponent, index) => {
                // Calculate positions based on grid layout
                // Top opponents come from above (negative Y)
                // Grid is 2x2 or 4x1 depending on screen size
                const totalOpponents = opponents.length;
                let x = 0;
                let y = -300; // Default: from above
                
                if (totalOpponents <= 2) {
                  // 2 opponents: both at top
                  x = (index - 0.5) * 200;
                  y = -300;
                } else if (totalOpponents === 3) {
                  // 3 opponents: spread across top
                  x = (index - 1) * 200;
                  y = -300;
                } else {
                  // 4 opponents: grid layout
                  x = (index % 2 === 0 ? -200 : 200);
                  y = (index < 2 ? -300 : -150);
                }
                
                acc[opponent.id] = { x, y };
                return acc;
              }, {} as { [key: string]: { x: number; y: number } })
            }
          />
        </div>

        {/* Player Hand */}
        <div className="w-full max-w-4xl">
          <div className="mb-4 text-center">
            <p className="font-['Courier_Prime'] font-bold" style={{ color: 'var(--text-parchment)' }}>
              {currentPlayer?.name} {isMyTurn && <span className="text-[var(--gold-accent)]">(YOUR TURN)</span>}
            </p>
          </div>

          {/* Cards */}
          <div className="flex justify-center gap-2 flex-wrap mb-4 min-h-[120px]">
            {myHand.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PlayingCard
                  card={card}
                  selected={selectedCards.has(card.id)}
                  onClick={() => toggleCardSelection(card.id)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4 shadow-2xl"
        style={{
          background: 'var(--walnut-wood)',
          borderTop: '3px solid var(--gold-accent)',
        }}
      >
        <div className="max-w-4xl mx-auto flex gap-3 justify-center">
          <BevelButton
            variant="secondary"
            onClick={handlePass}
            disabled={!canPass}
            className="flex-1 max-w-xs"
          >
            PASS
          </BevelButton>

          <BevelButton
            variant="primary"
            onClick={handlePlayCards}
            disabled={!isMyTurn || selectedCards.size === 0}
            className="flex-1 max-w-xs"
          >
            PLAY SELECTED ({selectedCards.size})
          </BevelButton>

          <BevelButton
            variant="danger"
            onClick={handleCallBluff}
            disabled={!canCallBluff}
            className="flex-1 max-w-xs"
          >
            CALL BLUFF 🔥
          </BevelButton>
        </div>
      </div>

      {/* Declaration Modal */}
      <Dialog open={showDeclarationModal} onOpenChange={setShowDeclarationModal}>
        <DialogContent
          className="max-w-3xl"
          style={{ background: 'var(--walnut-wood)', border: '3px solid var(--gold-accent)' }}
        >
          <DialogHeader>
            <DialogTitle className="font-['Playfair_Display'] text-2xl font-bold text-center" style={{ color: 'var(--gold-accent)' }}>
              You're playing {selectedCards.size} card{selectedCards.size > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription className="font-['Courier_Prime'] text-center" style={{ color: 'var(--text-parchment)' }}>
              What are you calling them?
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 flex-wrap justify-center mb-6">
            {RANKS.map((rank) => {
              const isDisabled = gameState.activeRank && gameState.activeRank !== rank;
              const isActive = gameState.activeRank === rank || !gameState.activeRank;

              return (
                <button
                  key={rank}
                  onClick={() => !isDisabled && handleDeclareAndPlay(rank)}
                  disabled={isDisabled}
                  className={`px-4 py-3 rounded font-['Libre_Baskerville'] font-bold text-lg transition-all ${
                    isActive
                      ? 'bg-[var(--gold-accent)] text-black hover:brightness-110'
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  }`}
                  title={isDisabled ? `Must play ${RANK_LABELS[gameState.activeRank!]}` : ''}
                >
                  {rank}
                </button>
              );
            })}
          </div>

          {gameState.activeRank && (
            <p className="text-center text-sm font-['Courier_Prime']" style={{ color: 'var(--text-parchment)' }}>
              Current round: {RANK_LABELS[gameState.activeRank]}
            </p>
          )}

          <BevelButton
            variant="secondary"
            onClick={() => setShowDeclarationModal(false)}
            className="w-full mt-4"
          >
            Cancel
          </BevelButton>
        </DialogContent>
      </Dialog>

      {/* Bluff Reveal Animation */}
      <AnimatePresence>
        {showBluffReveal && gameState.bluffResult && (() => {
          // The winner of the bluff starts the next round
          // Winner is whoever is NOT the loser
          const loserId = gameState.bluffResult.loserPlayerId;
          const callerId = gameState.bluffCallerId;
          const playerId = gameState.lastPlay?.playerId;
          const winnerId = loserId === callerId ? playerId : callerId;
          const winnerName = gameState.players.find(p => p.id === winnerId)?.name || 'Winner';
          const loserName = gameState.players.find(p => p.id === loserId)?.name || 'Loser';
          
          return (
            <motion.div
              className="fixed inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.8)', zIndex: 9999 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="text-center p-8 rounded-lg max-w-2xl"
                style={{ background: 'var(--walnut-wood)', border: '5px solid var(--gold-accent)' }}
                initial={{ scale: 0.5, y: -100 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <motion.h2
                  className="font-['Playfair_Display'] text-4xl font-black mb-6"
                  style={{ color: 'var(--danger-red)' }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  {gameState.players.find(p => p.id === gameState.bluffCallerId)?.name} CALLS BLUFF!
                </motion.h2>

                <div className="flex justify-center gap-3 mb-6">
                  {gameState.bluffResult.cards.map((card, index) => (
                    <motion.div
                      key={index}
                      initial={{ rotateY: 180, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      <PlayingCard card={card} style={{ width: '80px', height: '120px' }} />
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className="p-6 rounded-lg mb-6"
                  style={{
                    background: gameState.bluffResult.wasBluffing
                      ? 'var(--danger-red)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                >
                  <h3 className="font-['Playfair_Display'] text-3xl font-bold text-white mb-2">
                    {gameState.bluffResult.wasBluffing ? 'CAUGHT! 😈' : 'WRONG CALL! 😅'}
                  </h3>
                  <p className="font-['Courier_Prime'] text-xl text-white mb-1">
                    {loserName} picks up the pile!
                  </p>
                  <p className="font-['Courier_Prime'] text-sm text-white opacity-80">
                    {winnerName} starts the next round
                  </p>
                </motion.div>

                <BevelButton variant="primary" onClick={handleResolveBluff} className="text-xl px-8">
                  CONTINUE
                </BevelButton>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Game Over Screen */}
      <AnimatePresence>
        {showGameOver && gameState.winnerId && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.9)', zIndex: 9999 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Confetti effect */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    background: ['var(--gold-accent)', 'var(--danger-red)', '#4CAF50', '#2196F3'][i % 4],
                    left: `${Math.random() * 100}%`,
                    top: '-10%',
                  }}
                  animate={{
                    y: ['0vh', '110vh'],
                    rotate: [0, 360],
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    delay: Math.random() * 0.5,
                    repeat: Infinity,
                  }}
                />
              ))}
            </div>

            <motion.div
              className="text-center p-12 rounded-lg max-w-2xl relative z-10"
              style={{ background: 'var(--walnut-wood)', border: '5px solid var(--gold-accent)' }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 100 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Crown className="w-24 h-24 mx-auto mb-4" style={{ color: 'var(--gold-accent)' }} />
              </motion.div>

              <h2 className="font-['Playfair_Display'] text-6xl font-black mb-4" style={{ color: 'var(--gold-accent)' }}>
                {gameState.players.find(p => p.id === gameState.winnerId)?.name}
              </h2>

              <p className="font-['Playfair_Display'] text-4xl mb-8" style={{ color: 'var(--text-parchment)' }}>
                WINS THE GAME!
              </p>

              <div className="mb-8 p-4 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <h3 className="font-['Courier_Prime'] text-xl mb-4" style={{ color: 'var(--gold-accent)' }}>
                  Final Standings
                </h3>
                {[...gameState.players]
                  .sort((a, b) => a.cardCount - b.cardCount)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className="flex justify-between items-center py-2 font-['Courier_Prime']"
                      style={{ color: 'var(--text-parchment)' }}
                    >
                      <span>
                        {index + 1}. {player.name}
                      </span>
                      <span>{player.cardCount} cards</span>
                    </div>
                  ))}
              </div>

              <div className="flex gap-4">
                <BevelButton variant="primary" onClick={() => window.location.reload()} className="flex-1">
                  Play Again
                </BevelButton>
                <BevelButton variant="secondary" onClick={() => navigate('/')} className="flex-1">
                  Leave Table
                </BevelButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}