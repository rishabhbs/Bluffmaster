import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import WalnutPanel from '../components/WalnutPanel';
import BevelButton from '../components/BevelButton';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { apiCall } from '../utils/supabase';
import { audioManager } from '../utils/audio';

export default function JoinRoom() {
  const navigate = useNavigate();
  const { roomCode: urlRoomCode } = useParams();
  const [roomCode, setRoomCode] = useState(urlRoomCode?.toUpperCase() || '');
  const [playerName, setPlayerName] = useState('');
  const [step, setStep] = useState<'code' | 'name'>(urlRoomCode ? 'name' : 'code');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlRoomCode) {
      setRoomCode(urlRoomCode.toUpperCase());
      setStep('name');
    }
  }, [urlRoomCode]);

  const handleCheckRoom = async () => {
    if (!roomCode.trim()) {
      alert('Please enter a room code');
      return;
    }

    setLoading(true);
    try {
      const response = await apiCall(`/rooms/${roomCode.toUpperCase()}`);
      if (response.gameState) {
        setStep('name');
      }
    } catch (error: any) {
      alert('Room not found. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const playerId = `player-${Date.now()}-${Math.random()}`;
      
      await apiCall('/rooms/join', 'POST', {
        roomCode: roomCode.toUpperCase(),
        playerId,
        playerName,
      });

      localStorage.setItem('bluff-player-id', playerId);
      localStorage.setItem('bluff-player-name', playerName);
      
      audioManager.play('room_join');
      navigate(`/lobby/${roomCode.toUpperCase()}`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      alert('Failed to join room: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at center, var(--table-green) 0%, #1a4a35 100%)',
      }}
    >
      <WalnutPanel className="w-full max-w-md">
        <h2 className="font-['Playfair_Display'] text-4xl font-bold text-center mb-6" style={{ color: 'var(--gold-accent)' }}>
          Join Room
        </h2>

        {step === 'code' ? (
          <div className="space-y-6">
            <div>
              <Label className="font-['Courier_Prime'] mb-2 block" style={{ color: 'var(--text-parchment)' }}>
                Enter Room Code
              </Label>
              <Input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="font-['Courier_Prime'] text-2xl text-center bg-[var(--btn-gray)] text-black border-2 border-[var(--gold-accent)] uppercase"
                maxLength={6}
              />
              <p className="text-xs mt-2 font-['Courier_Prime'] text-center" style={{ color: 'var(--text-parchment)' }}>
                Or paste a link
              </p>
            </div>

            <BevelButton
              variant="primary"
              onClick={handleCheckRoom}
              disabled={loading}
              className="w-full text-lg"
            >
              {loading ? 'Checking...' : 'CONTINUE'}
            </BevelButton>

            <BevelButton
              variant="secondary"
              onClick={() => navigate('/')}
              className="w-full"
            >
              BACK
            </BevelButton>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <p className="font-['Courier_Prime'] text-sm" style={{ color: 'var(--text-parchment)' }}>
                Joining room:
              </p>
              <p className="font-['Courier_Prime'] text-3xl font-bold" style={{ color: 'var(--gold-accent)' }}>
                {roomCode}
              </p>
            </div>

            <div>
              <Label className="font-['Courier_Prime'] mb-2 block" style={{ color: 'var(--text-parchment)' }}>
                Your Name
              </Label>
              <Input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="font-['Courier_Prime'] bg-[var(--btn-gray)] text-black border-2 border-[var(--gold-accent)]"
                maxLength={20}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>

            <BevelButton
              variant="primary"
              onClick={handleJoin}
              disabled={loading}
              className="w-full text-lg"
            >
              {loading ? 'Joining...' : 'JOIN GAME'}
            </BevelButton>

            <BevelButton
              variant="secondary"
              onClick={() => setStep('code')}
              className="w-full"
            >
              BACK
            </BevelButton>
          </div>
        )}
      </WalnutPanel>
    </div>
  );
}
