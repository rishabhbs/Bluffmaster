import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { ensureAuth } from './utils/auth';

export default function App() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Initialize anonymous auth on app load
    ensureAuth()
      .then(() => {
        console.log('✅ Auth initialized');
        setAuthReady(true);
      })
      .catch((error) => {
        console.error('❌ Auth initialization failed:', error);
        // Still set ready to allow app to load, will retry on API calls
        setAuthReady(true);
      });
  }, []);

  if (!authReady) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#2D6A4F',
        color: '#F5E6C8',
        fontFamily: 'Courier Prime, monospace',
      }}>
        Initializing...
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
