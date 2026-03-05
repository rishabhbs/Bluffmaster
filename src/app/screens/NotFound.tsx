import { useNavigate } from 'react-router';
import BevelButton from '../components/BevelButton';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, var(--table-green) 0%, #1a4a35 100%)',
      }}
    >
      <div className="text-center">
        <h1 className="font-['Playfair_Display'] text-8xl font-black mb-4" style={{ color: 'var(--gold-accent)' }}>
          404
        </h1>
        <p className="font-['Courier_Prime'] text-xl mb-8" style={{ color: 'var(--text-parchment)' }}>
          Room not found
        </p>
        <BevelButton variant="primary" onClick={() => navigate('/')}>
          GO HOME
        </BevelButton>
      </div>
    </div>
  );
}
