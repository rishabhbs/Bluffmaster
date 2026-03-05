import { useNavigate } from 'react-router';
import BevelButton from '../components/BevelButton';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showRules, setShowRules] = useState(false);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, var(--table-green) 0%, #1a4a35 100%)',
      }}
    >
      {/* Animated floating cards background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-16 h-24 rounded-lg opacity-20"
            style={{
              background: 'var(--card-back-burgundy)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 10, -10, 0],
              x: [0, 20, -20, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1
            className="font-['Playfair_Display'] font-black text-8xl mb-4"
            style={{
              color: 'var(--gold-accent)',
              textShadow: '4px 4px 8px rgba(0,0,0,0.7)',
            }}
          >
            BLUFF
          </h1>
          <p className="font-['Courier_Prime'] text-xl" style={{ color: 'var(--text-parchment)' }}>
            Cards don't lie. Players do.
          </p>
        </motion.div>

        <motion.div
          className="space-y-4 flex flex-col items-center"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <BevelButton variant="primary" onClick={() => navigate('/create')} className="w-64 text-lg">
            CREATE ROOM
          </BevelButton>
          <BevelButton variant="secondary" onClick={() => navigate('/join')} className="w-64 text-lg">
            JOIN ROOM
          </BevelButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <button
            onClick={() => setShowRules(true)}
            className="font-['Courier_Prime'] text-sm underline hover:text-[var(--gold-accent)] transition-colors"
            style={{ color: 'var(--text-parchment)' }}
          >
            How to Play
          </button>
        </motion.div>
      </div>

      {/* Rules modal */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" style={{ background: 'var(--walnut-wood)', border: '3px solid var(--gold-accent)' }}>
          <DialogHeader>
            <DialogTitle className="font-['Playfair_Display'] text-3xl" style={{ color: 'var(--gold-accent)' }}>
              How to Play BLUFF
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 font-['Courier_Prime']" style={{ color: 'var(--text-parchment)' }}>
            <div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--gold-accent)' }}>Objective</h3>
              <p>Be the first player to get rid of all your cards.</p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--gold-accent)' }}>Setup</h3>
              <p>Each player is dealt an equal number of cards. Players can see their own cards but not others'.</p>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--gold-accent)' }}>Gameplay</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>The first player chooses a rank (e.g., "Kings") and plays 1-4 cards face-down, declaring them as that rank.</li>
                <li>For the rest of the round, all players must play cards and declare them as the same rank.</li>
                <li>You can play cards honestly OR bluff by playing different ranks.</li>
                <li>On your turn, you can: PLAY cards, PASS (if you're not the round starter), or CALL BLUFF on the previous player.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--gold-accent)' }}>Calling Bluff</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>If you think the previous player lied about their cards, call BLUFF!</li>
                <li>The cards are revealed. If they were lying, they pick up the entire pile.</li>
                <li>If they were honest, YOU pick up the pile.</li>
                <li>The winner starts the next round with a new rank.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--gold-accent)' }}>Winning</h3>
              <p>The first player to empty their hand wins the game!</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}