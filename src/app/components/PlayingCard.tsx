import { Card as CardType } from '../types/game';
import { isRedSuit } from '../utils/deck';
import { motion } from 'motion/react';

interface PlayingCardProps {
  card: CardType;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  rotation?: number;
  style?: React.CSSProperties;
}

export default function PlayingCard({
  card,
  faceDown = false,
  selected = false,
  onClick,
  rotation = 0,
  style = {},
}: PlayingCardProps) {
  const cardColor = isRedSuit(card.suit) ? 'text-[var(--card-red)]' : 'text-black';

  if (faceDown) {
    return (
      <motion.div
        className="relative cursor-pointer"
        style={{
          width: '70px',
          height: '100px',
          transformStyle: 'preserve-3d',
          transform: `rotate(${rotation}deg)`,
          ...style,
        }}
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
      >
        <div
          className="absolute inset-0 rounded-lg shadow-[0_6px_12px_rgba(0,0,0,0.5)]"
          style={{
            background: 'var(--card-back-burgundy)',
            backgroundImage: `repeating-linear-gradient(
              45deg,
              var(--card-back-burgundy),
              var(--card-back-burgundy) 10px,
              var(--card-back-pattern) 10px,
              var(--card-back-pattern) 20px
            )`,
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`relative cursor-pointer font-['Libre_Baskerville'] ${selected ? '-translate-y-4' : ''} transition-transform`}
      style={{
        width: '70px',
        height: '100px',
        background: 'var(--card-face)',
        borderRadius: '8px',
        boxShadow: selected
          ? '0 6px 12px rgba(0,0,0,0.5), 0 0 20px var(--gold-accent)'
          : '0 6px 12px rgba(0,0,0,0.5)',
        border: selected ? '2px solid var(--gold-accent)' : '1px solid #ccc',
        transform: `rotate(${rotation}deg)`,
        ...style,
      }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
    >
      <div className={`absolute top-1 left-1 text-sm font-bold ${cardColor}`}>
        <div>{card.rank}</div>
        <div className="text-xs leading-none">{card.suit}</div>
      </div>
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl ${cardColor}`}>
        {card.suit}
      </div>
      <div className={`absolute bottom-1 right-1 text-sm font-bold ${cardColor} rotate-180`}>
        <div>{card.rank}</div>
        <div className="text-xs leading-none">{card.suit}</div>
      </div>
      {selected && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[var(--gold-accent)] flex items-center justify-center text-xs text-black">
          ✓
        </div>
      )}
    </motion.div>
  );
}
