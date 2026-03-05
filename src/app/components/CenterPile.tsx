import PlayingCard from './PlayingCard';
import { Rank } from '../types/game';
import { RANK_LABELS } from '../utils/deck';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState, useRef } from 'react';

interface CenterPileProps {
  pileCount: number;
  activeRank: Rank | null;
  lastPlayInfo: string;
  lastPlayerId?: string;
  currentPlayerId: string;
  opponentPositions?: { [playerId: string]: { x: number; y: number } };
}

export default function CenterPile({ 
  pileCount, 
  activeRank, 
  lastPlayInfo, 
  lastPlayerId,
  currentPlayerId,
  opponentPositions = {}
}: CenterPileProps) {
  const [animatingCards, setAnimatingCards] = useState<number>(0);
  const [animationOrigin, setAnimationOrigin] = useState<{ x: number; y: number }>({ x: 0, y: 200 });
  const prevPileCountRef = useRef(pileCount);
  const animationTriggerRef = useRef<number>(0);

  // Detect when new cards are added to the pile
  useEffect(() => {
    const prevCount = prevPileCountRef.current;
    
    if (pileCount > prevCount) {
      const newCards = pileCount - prevCount;
      
      // Determine animation origin based on who played
      let origin = { x: 0, y: 200 }; // Default: from bottom (current player)
      
      if (lastPlayerId && lastPlayerId !== currentPlayerId && opponentPositions[lastPlayerId]) {
        // From opponent's position
        origin = opponentPositions[lastPlayerId];
      }
      
      // Trigger animation with unique identifier
      animationTriggerRef.current += 1;
      setAnimationOrigin(origin);
      setAnimatingCards(newCards);
      
      // Clear animation after it completes
      const timer = setTimeout(() => {
        setAnimatingCards(0);
      }, 400); // Reduced from 800ms
      
      // Update the ref for next comparison
      prevPileCountRef.current = pileCount;
      
      return () => clearTimeout(timer);
    } else if (pileCount !== prevCount) {
      // Pile was cleared (bluff resolution) or cards removed
      prevPileCountRef.current = pileCount;
    }
  }, [pileCount, lastPlayerId, currentPlayerId, opponentPositions]);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Active Rank Pill */}
      {activeRank ? (
        <motion.div
          key={activeRank} // Force re-render when rank changes
          className="px-6 py-2 rounded-full font-['Courier_Prime'] font-bold text-lg shadow-lg"
          style={{
            background: 'var(--pill-bg)',
            color: 'var(--gold-accent)',
            boxShadow: '0 0 20px rgba(201, 168, 76, 0.5)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {RANK_LABELS[activeRank]}
        </motion.div>
      ) : (
        <div
          className="px-4 py-2 rounded font-['Courier_Prime'] text-sm text-center"
          style={{
            background: 'var(--pill-bg)',
            color: 'var(--text-parchment)',
          }}
        >
          New Round — First player picks any rank
        </div>
      )}

      {/* Card Pile */}
      <div className="relative" style={{ width: '120px', height: '160px' }}>
        {pileCount > 0 ? (
          <>
            {/* Stacked cards effect */}
            {Array.from({ length: Math.min(5, pileCount) }).map((_, i) => (
              <motion.div
                key={`pile-${i}`}
                className="absolute"
                style={{
                  top: `${i * 2}px`,
                  left: `${i * 2}px`,
                  zIndex: i,
                }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
              >
                <PlayingCard
                  card={{ id: `pile-${i}`, rank: 'A', suit: '♠' }}
                  faceDown
                  rotation={Math.random() * 10 - 5}
                  style={{ width: '80px', height: '120px' }}
                />
              </motion.div>
            ))}
            
            {/* Animated flying cards */}
            <AnimatePresence>
              {animatingCards > 0 && Array.from({ length: animatingCards }).map((_, i) => (
                <motion.div
                  key={`flying-${animationTriggerRef.current}-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    top: '50%',
                    left: '50%',
                    marginTop: '-60px',
                    marginLeft: '-40px',
                    zIndex: 100 + i,
                  }}
                  initial={{
                    x: animationOrigin.x + (i * 20 - (animatingCards * 10)),
                    y: animationOrigin.y,
                    scale: 1.2,
                    opacity: 1,
                  }}
                  animate={{
                    x: i * 2,
                    y: i * 2,
                    scale: 1,
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  transition={{
                    duration: 0.3, // Reduced from 0.5
                    delay: i * 0.04, // Reduced from 0.06
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                >
                  <PlayingCard
                    card={{ id: `flying-${i}`, rank: 'A', suit: '♠' }}
                    faceDown
                    rotation={0}
                    style={{ width: '80px', height: '120px' }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Pile count badge */}
            <motion.div
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center font-['Courier_Prime'] font-bold shadow-lg z-10"
              style={{
                background: 'var(--gold-accent)',
                color: 'black',
              }}
              key={pileCount} // Force re-render when count changes
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.3 }}
            >
              {pileCount}
            </motion.div>
          </>
        ) : (
          <div
            className="w-full h-full border-4 border-dashed rounded-lg flex items-center justify-center font-['Courier_Prime'] text-sm opacity-50"
            style={{
              borderColor: 'var(--gold-accent)',
              color: 'var(--text-parchment)',
            }}
          >
            Empty
          </div>
        )}
      </div>

      {/* Last play info */}
      {lastPlayInfo && (
        <motion.p
          className="font-['Courier_Prime'] text-xs text-center"
          style={{ color: 'var(--text-parchment)' }}
          key={lastPlayInfo}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {lastPlayInfo}
        </motion.p>
      )}
    </div>
  );
}