// Authentication helper for anonymous Supabase auth
import { supabase } from './supabase';

let authInitialized = false;

/**
 * Ensures the user has an anonymous Supabase session.
 * Call this on app load or before any API calls.
 */
export async function ensureAuth(): Promise<void> {
  if (authInitialized) return;

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('🔐 No session found, signing in anonymously...');
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      console.error('❌ Anonymous sign-in failed:', error);
      throw new Error('Failed to authenticate');
    }
    
    console.log('✅ Anonymous session created:', data.session?.user.id);
  } else {
    console.log('✅ Existing session found:', session.user.id);
  }
  
  authInitialized = true;
}

/**
 * Gets the current access token for API calls.
 * Ensures auth is initialized first.
 */
export async function getSessionToken(): Promise<string> {
  await ensureAuth();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    // Try to refresh or re-authenticate
    console.log('🔄 No access token, refreshing session...');
    const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
    
    if (error || !newSession) {
      // Last resort: sign in anonymously again
      const { data, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError || !data.session) {
        throw new Error('Failed to get access token');
      }
      return data.session.access_token;
    }
    
    return newSession.access_token;
  }
  
  return session.access_token;
}

/**
 * Gets the authenticated user ID (authUid).
 * This is the canonical identity for the player.
 */
export async function getAuthUserId(): Promise<string> {
  await ensureAuth();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.id) {
    throw new Error('No authenticated user');
  }
  
  return session.user.id;
}

/**
 * Refreshes the current session.
 * Call this if you get a 401 from the API.
 */
export async function refreshAuth(): Promise<void> {
  console.log('🔄 Refreshing authentication...');
  const { error } = await supabase.auth.refreshSession();
  
  if (error) {
    console.log('⚠️ Refresh failed, signing in anonymously...');
    await supabase.auth.signInAnonymously();
  }
}
