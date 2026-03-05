import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { getSessionToken, refreshAuth } from './auth';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-2c8fcbf3`;

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      if (i === retries - 1) throw error;
      
      console.log(`Retry ${i + 1}/${retries} for ${url}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}

export async function apiCall(endpoint: string, method: string = 'GET', body?: any) {
  try {
    // Get the authenticated user's access token
    const accessToken = await getSessionToken();
    
    const response = await fetchWithRetry(`${serverUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle 401 - refresh auth and retry once
    if (response.status === 401) {
      console.log('🔄 Got 401, refreshing auth and retrying...');
      await refreshAuth();
      
      const newAccessToken = await getSessionToken();
      const retryResponse = await fetchWithRetry(`${serverUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newAccessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        console.error(`API call failed after retry for ${endpoint}:`, retryResponse.status, errorText);
        throw new Error(errorText || `API call failed: ${retryResponse.statusText}`);
      }
      
      return await retryResponse.json();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API call failed for ${endpoint}:`, response.status, errorText);
      
      // Try to parse error as JSON
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || errorText || `API call failed: ${response.statusText}`);
      } catch {
        throw new Error(errorText || `API call failed: ${response.statusText}`);
      }
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`API call error for ${endpoint}:`, error);
    
    // Provide more helpful error messages
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: The server took too long to respond. Please try again.');
    }
    
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      throw new Error('Network error: Unable to connect to game server. The server may be starting up or unavailable. Please wait a moment and try again.');
    }
    
    throw error;
  }
}