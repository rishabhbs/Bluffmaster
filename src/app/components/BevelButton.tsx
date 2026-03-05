import { motion } from 'motion/react';

interface BevelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  type?: 'button' | 'submit';
}

export default function BevelButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
  type = 'button',
}: BevelButtonProps) {
  const baseStyles = 'px-6 py-3 font-["Roboto_Condensed"] font-bold text-base rounded-sm transition-all';
  
  const variants = {
    primary: disabled
      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
      : 'bg-[var(--gold-accent)] text-black shadow-[inset_2px_2px_0_rgba(255,255,255,0.5),inset_-2px_-2px_0_rgba(0,0,0,0.3)] hover:brightness-110 active:shadow-[inset_-2px_-2px_0_rgba(255,255,255,0.5),inset_2px_2px_0_rgba(0,0,0,0.3)]',
    secondary: disabled
      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
      : 'bg-[var(--btn-gray)] text-[var(--walnut-wood)] border-2 border-[var(--gold-accent)] shadow-[inset_2px_2px_0_rgba(255,255,255,0.5),inset_-2px_-2px_0_rgba(0,0,0,0.3)] hover:brightness-110 active:shadow-[inset_-2px_-2px_0_rgba(255,255,255,0.5),inset_2px_2px_0_rgba(0,0,0,0.3)]',
    danger: disabled
      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
      : 'bg-[var(--danger-red)] text-white shadow-[inset_2px_2px_0_rgba(255,255,255,0.5),inset_-2px_-2px_0_rgba(0,0,0,0.3)] hover:brightness-110 active:shadow-[inset_-2px_-2px_0_rgba(255,255,255,0.5),inset_2px_2px_0_rgba(0,0,0,0.3)]',
  };

  return (
    <motion.button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      {children}
    </motion.button>
  );
}
