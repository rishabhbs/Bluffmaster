import { useState } from 'react';
import { useNavigate } from 'react-router';
import WalnutPanel from '../components/WalnutPanel';
import BevelButton from '../components/BevelButton';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { generateRoomCode } from '../utils/roomCode';
import { apiCall } from '../utils/supabase';
import { audioManager } from '../utils/audio';
import { Bot } from 'lucide-react';

export default function CreateRoom() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [botSlots, setBotSlots] = useState<boolean[]>(Array(7).fill(false));
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const roomCode = generateRoomCode();
      const hostId = `player-${Date.now()}-${Math.random()}`;
      
      // Only send bot slots relevant to maxPlayers
      const relevantBotSlots = botSlots.slice(0, maxPlayers - 1);

      await apiCall('/rooms/create', 'POST', {
        roomCode,
        hostId,
        hostName: playerName,
        maxPlayers,
        botSlots: relevantBotSlots,
        isPrivate,
      });

      localStorage.setItem('bluff-player-id', hostId);
      localStorage.setItem('bluff-player-name', playerName);
      
      audioManager.play('room_join');
      navigate(`/lobby/${roomCode}`);
    } catch (error: any) {
      console.error('Error creating room:', error);
      alert('Failed to create room: ' + error.message);
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
      <WalnutPanel className="w-full max-w-lg">
        <h2 className="font-['Playfair_Display'] text-4xl font-bold text-center mb-6" style={{ color: 'var(--gold-accent)' }}>
          Create Room
        </h2>

        <div className="space-y-6">
          {/* Player Name */}
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
            />
          </div>

          {/* Number of Players */}
          <div>
            <Label className="font-['Courier_Prime'] mb-3 block" style={{ color: 'var(--text-parchment)' }}>
              Number of Players
            </Label>
            <div className="flex gap-2 flex-wrap">
              {[3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setMaxPlayers(num);
                    setBotSlots(Array(num - 1).fill(false));
                  }}
                  className={`px-4 py-2 rounded font-['Roboto_Condensed'] font-bold transition-all ${
                    maxPlayers === num
                      ? 'bg-[var(--gold-accent)] text-black'
                      : 'bg-[var(--btn-gray)] text-[var(--walnut-wood)]'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            {maxPlayers >= 6 && (
              <p className="text-xs mt-2 font-['Courier_Prime']" style={{ color: 'var(--text-parchment)' }}>
                Note: 6+ players will automatically use 2 decks
              </p>
            )}
          </div>

          {/* Bot Slots */}
          <div>
            <Label className="font-['Courier_Prime'] mb-3 block" style={{ color: 'var(--text-parchment)' }}>
              Bot Players
            </Label>
            <div className="space-y-2">
              {Array.from({ length: maxPlayers - 1 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between bg-[var(--btn-gray)] p-3 rounded">
                  <span className="font-['Courier_Prime'] text-sm text-[var(--walnut-wood)]">
                    Slot {index + 2}
                  </span>
                  <div className="flex items-center gap-2">
                    {botSlots[index] && <Bot className="w-4 h-4 text-[var(--walnut-wood)]" />}
                    <Switch
                      checked={botSlots[index]}
                      onCheckedChange={(checked) => {
                        const newBotSlots = [...botSlots];
                        newBotSlots[index] = checked;
                        setBotSlots(newBotSlots);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Room Privacy */}
          <div className="flex items-center justify-between">
            <Label className="font-['Courier_Prime']" style={{ color: 'var(--text-parchment)' }}>
              Private Room (code-only access)
            </Label>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          {/* Create Button */}
          <BevelButton
            variant="primary"
            onClick={handleCreate}
            disabled={loading}
            className="w-full text-lg"
          >
            {loading ? 'Creating...' : 'CREATE ROOM'}
          </BevelButton>

          <BevelButton
            variant="secondary"
            onClick={() => navigate('/')}
            className="w-full"
          >
            BACK
          </BevelButton>
        </div>
      </WalnutPanel>
    </div>
  );
}
