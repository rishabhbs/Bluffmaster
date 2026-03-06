// Authentication middleware for Edge Functions
import { createClient } from "jsr:@supabase/supabase-js@2";

export interface AuthContext {
  authUid: string;
}

/**
 * Verifies the JWT token from the Authorization header
 * and extracts the authenticated user ID.
 */
export async function verifyAuth(authHeader: string | null): Promise<AuthContext> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Create Supabase client for JWT verification
  // Use service role key to verify user tokens
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  // Verify the token and get the user
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('Auth verification failed:', error);
    throw new Error('Invalid or expired token');
  }

  return {
    authUid: user.id,
  };
}
