import { useState, useEffect } from 'react';
import { apiCall } from '../utils/supabase';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await apiCall('/health');
        if (!isConnected) {
          setIsConnected(true);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      } catch (error) {
        setIsConnected(false);
        setShowStatus(true);
      }
    };

    // Check immediately
    checkConnection();

    // Then check every 10 seconds
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [isConnected]);

  if (!showStatus) return null;

  return (
    <div
      className="fixed top-20 right-4 p-3 rounded-lg shadow-lg z-50 flex items-center gap-2 font-['Courier_Prime'] text-sm"
      style={{
        background: isConnected ? '#4CAF50' : 'var(--danger-red)',
        color: 'white',
      }}
    >
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Connection lost - Retrying...</span>
        </>
      )}
    </div>
  );
}
