import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
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
    const response = await fetchWithRetry(`${serverUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

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