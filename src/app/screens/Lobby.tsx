import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import WalnutPanel from '../components/WalnutPanel';
import BevelButton from '../components/BevelButton';
import { apiCall } from '../utils/supabase';
import { audioManager } from '../utils/audio';
import { getRoomUrl } from '../utils/roomCode';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, Crown, Bot, Loader2 } from 'lucide-react';
import { GameState } from '../types/game';

export default function Lobby() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId] = useState(localStorage.getItem('bluff-player-id') || '');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const isHost = gameState?.players.find(p => p.id === playerId)?.isHost;
  const roomUrl = getRoomUrl(roomCode || '');

  useEffect(() => {
    if (!roomCode || !playerId) {
      navigate('/');
      return;
    }

    loadGameState();
    const interval = setInterval(loadGameState, 1000);
    return () => clearInterval(interval);
  }, [roomCode, playerId]);

  const loadGameState = async () => {
    try {
      const response = await apiCall(`/rooms/${roomCode}`);
      setGameState(response.gameState);
      setLoading(false);

      // If game has started, navigate to game screen
      if (response.gameState.gamePhase === 'playing') {
        navigate(`/game/${roomCode}`);
      }
    } catch (error: any) {
      console.error('Error loading game state:', error);
      setLoading(false);
      // Don't navigate away on error, just show the error in console
      // The interval will keep trying to reconnect
    }
  };

  const handleStartGame = async () => {
    if (!isHost) return;

    const humanPlayers = gameState?.players.filter(p => !p.isBot) || [];
    const totalPlayers = gameState?.players.length || 0;

    if (totalPlayers < 3) {
      alert('Need at least 3 players to start');
      return;
    }

    setStarting(true);
    try {
      await apiCall(`/rooms/${roomCode}/start`, 'POST');
      audioManager.play('card_deal');
      navigate(`/game/${roomCode}`);
    } catch (error: any) {
      console.error('Error starting game:', error);
      alert('Failed to start game: ' + error.message);
      setStarting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    audioManager.play('card_select');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my BLUFF game!',
          text: `Join my BLUFF card game with code: ${roomCode}`,
          url: roomUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      copyToClipboard(roomUrl);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at center, var(--table-green) 0%, #1a4a35 100%)',
        }}
      >
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--gold-accent)' }} />
      </div>
    );
  }

  const humanSlots = gameState?.config.botSlots.filter((b: boolean) => !b).length || gameState?.maxPlayers || 4;
  const filledSlots = gameState?.players.length || 0;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at center, var(--table-green) 0%, #1a4a35 100%)',
      }}
    >
      <WalnutPanel className="w-full max-w-4xl">
        <h2 className="font-['Playfair_Display'] text-4xl font-bold text-center mb-6" style={{ color: 'var(--gold-accent)' }}>
          Lobby
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Panel - Players */}
          <div>
            <h3 className="font-['Courier_Prime'] text-xl mb-4" style={{ color: 'var(--text-parchment)' }}>
              Players ({filledSlots} / {gameState?.maxPlayers})
            </h3>
            <div className="space-y-2">
              {gameState?.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded"
                  style={{
                    background: 'var(--btn-gray)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {player.isHost && <Crown className="w-4 h-4 text-[var(--gold-accent)]" />}
                    {player.isBot && <Bot className="w-4 h-4" />}
                    <span className="font-['Courier_Prime'] font-bold text-[var(--walnut-wood)]">
                      {player.name}
                    </span>
                  </div>
                  {!player.isBot && (
                    <span className="text-xs font-['Courier_Prime'] text-green-700">READY</span>
                  )}
                  {player.isBot && (
                    <span className="text-xs font-['Courier_Prime'] italic text-gray-600">
                      Will Auto-Play
                    </span>
                  )}
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: Math.max(0, (gameState?.maxPlayers || 4) - filledSlots) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center justify-center p-3 rounded border-2 border-dashed"
                  style={{
                    borderColor: 'var(--gold-accent)',
                    opacity: 0.5,
                  }}
                >
                  <span className="font-['Courier_Prime'] text-sm animate-pulse" style={{ color: 'var(--text-parchment)' }}>
                    Waiting...
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Room Info */}
          <div>
            <h3 className="font-['Courier_Prime'] text-xl mb-4" style={{ color: 'var(--text-parchment)' }}>
              Room Info
            </h3>

            <div className="space-y-4">
              {/* Room Code */}
              <div>
                <label className="font-['Courier_Prime'] text-sm block mb-1" style={{ color: 'var(--text-parchment)' }}>
                  Room Code
                </label>
                <div className="flex gap-2">
                  <div
                    className="flex-1 p-3 rounded font-['Courier_Prime'] text-2xl font-bold text-center"
                    style={{ background: 'var(--btn-gray)' }}
                  >
                    {roomCode}
                  </div>
                  <button
                    onClick={() => copyToClipboard(roomCode || '')}
                    className="p-3 rounded hover:brightness-110 transition-all"
                    style={{ background: 'var(--gold-accent)' }}
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Share Link */}
              <div>
                <label className="font-['Courier_Prime'] text-sm block mb-1" style={{ color: 'var(--text-parchment)' }}>
                  Share Link
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(roomUrl)}
                    className="flex-1 p-2 rounded font-['Courier_Prime'] text-xs text-left truncate hover:brightness-110 transition-all"
                    style={{ background: 'var(--btn-gray)' }}
                  >
                    {roomUrl}
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded hover:brightness-110 transition-all"
                    style={{ background: 'var(--gold-accent)' }}
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center p-4 rounded" style={{ background: 'white' }}>
                <QRCodeSVG value={roomUrl} size={150} />
              </div>
            </div>
          </div>
        </div>

        {/* Start/Waiting Button */}
        <div className="mt-8">
          {isHost ? (
            <BevelButton
              variant="primary"
              onClick={handleStartGame}
              disabled={starting || filledSlots < 3}
              className="w-full text-xl py-4"
            >
              {starting ? 'STARTING...' : 'START GAME'}
            </BevelButton>
          ) : (
            <div className="text-center">
              <p className="font-['Courier_Prime'] text-lg mb-4" style={{ color: 'var(--text-parchment)' }}>
                Waiting for host to start...
              </p>
              <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: 'var(--gold-accent)' }} />
            </div>
          )}
        </div>

        {filledSlots < 3 && isHost && (
          <p className="text-center mt-4 font-['Courier_Prime'] text-sm" style={{ color: 'var(--danger-red)' }}>
            Need at least 3 players (human + bots) to start
          </p>
        )}
      </WalnutPanel>
    </div>
  );
}