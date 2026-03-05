import { Player } from '../types/game';
import { Bot, Loader2 } from 'lucide-react';
import PlayingCard from './PlayingCard';
import { motion } from 'motion/react';

interface OpponentPanelProps {
  player: Player;
  isCurrentTurn: boolean;
}

export default function OpponentPanel({ player, isCurrentTurn }: OpponentPanelProps) {
  return (
    <motion.div
      className={`relative p-3 rounded-lg ${isCurrentTurn ? 'ring-4 ring-[var(--gold-accent)] animate-pulse' : ''}`}
      style={{
        background: 'var(--walnut-wood)',
        border: '2px solid var(--gold-accent)',
        boxShadow: isCurrentTurn ? '0 0 20px var(--gold-accent)' : 'none',
      }}
      animate={isCurrentTurn ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <div className="flex items-center gap-2 mb-2">
        {player.isBot && <Bot className="w-4 h-4" style={{ color: 'var(--gold-accent)' }} />}
        <span className="font-['Courier_Prime'] font-bold text-sm" style={{ color: 'var(--text-parchment)' }}>
          {player.name}
        </span>
      </div>

      {/* Card count badge */}
      <div
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-['Courier_Prime'] font-bold mb-2"
        style={{ background: 'var(--pill-bg)', color: 'var(--gold-accent)' }}
      >
        🃏 {player.cardCount}
      </div>

      {/* Decorative card fan */}
      <div className="flex gap-[-10px] mt-2">
        {Array.from({ length: Math.min(5, player.cardCount) }).map((_, i) => (
          <div
            key={i}
            style={{
              marginLeft: i > 0 ? '-30px' : '0',
              transform: `rotate(${(i - 2) * 5}deg)`,
            }}
          >
            <PlayingCard
              card={{ id: `dummy-${i}`, rank: 'A', suit: '♠' }}
              faceDown
              style={{ width: '40px', height: '60px' }}
            />
          </div>
        ))}
      </div>

      {isCurrentTurn && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--gold-accent)' }} />
        </div>
      )}
    </motion.div>
  );
}
