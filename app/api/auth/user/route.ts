import { NextResponse } from 'next/server';
import Passage from '@passageidentity/passage-node';

// Define interface for userMetadata
interface UserMetadata {
  username?: string;
  [key: string]: unknown;
}

// Enhance the PassageUser type to include userMetadata
interface EnhancedPassageUser {
  id: string;
  email?: string;
  phone?: string;
  userMetadata?: UserMetadata;
  metadata?: Record<string, unknown>;
  [key: string]: unknown; // Allow other properties
}

// Define the type for device/passkey - using partial to not require all fields
interface PassageDevice {
  id: string;
  type: string;
  createdAt: string;
  lastUsedAt?: string; // Make this optional since it might not be present
  friendlyName?: string;
  [key: string]: unknown;
}

export async function GET(request: Request) {
  try {
    // Get request headers to extract auth token
    const headers = Object.fromEntries(request.headers);
    
    // Get your Passage API key from environment variables
    const passageApiKey = process.env.PASSAGE_API_KEY;
    const passageAppId = process.env.PASSAGE_APP_ID;
    
    if (!passageApiKey || !passageAppId) {
      return NextResponse.json(
        { error: 'Server misconfiguration - missing Passage credentials' },
        { status: 500 }
      );
    }

    // Create a new Passage instance
    const passage = new Passage({
      appId: passageAppId,
      apiKey: passageApiKey,
    });

    // Get auth token from the request cookie
    const authToken = headers.authorization?.split(' ')[1] || 
                     headers.cookie?.split('; ')
                       .find(row => row.startsWith('psg_auth_token='))
                       ?.split('=')[1];

    if (!authToken) {
      console.log('No auth token found in request');
      return NextResponse.json(
        { authenticated: false, error: 'No auth token found' },
        { status: 401 }
      );
    }

    // Authenticate the request with token
    try {
      // For Passage Node SDK v3
      const userId = await passage.auth.validateJwt(authToken);
      
      if (!userId) {
        console.log('Invalid auth token');
        return NextResponse.json(
          { authenticated: false, error: 'Invalid auth token' },
          { status: 401 }
        );
      }

      console.log('Valid auth token for user:', userId);

      // Get user information - use unknown as an intermediate cast
      const userResponse = await passage.user.get(userId);
      const user = userResponse as unknown as EnhancedPassageUser;
      console.log('User from Passage API:', user);
      
      // Get user's devices/passkeys
      let userDevices: PassageDevice[] = [];
      try {
        // Use unknown as an intermediate cast
        const devicesResponse = await passage.user.listDevices(userId);
        userDevices = devicesResponse as unknown as PassageDevice[];
        console.log('User devices/passkeys count:', userDevices.length);
        
        if (userDevices.length > 0) {
          console.log('User has registered passkeys');
          // Log the first device type to help with debugging
          console.log('First device type:', userDevices[0]?.type);
        } else {
          console.log('User has no registered passkeys');
        }
      } catch (error) {
        console.error('Error fetching user devices:', error);
      }
      
      // Extract display name from userMetadata.username first
      const displayName = 
        (user.userMetadata && user.userMetadata.username) || // First priority: userMetadata.username
        (user.metadata && user.metadata.username as string) || // Second priority: metadata.username
        (user.email ? user.email.split('@')[0] : null) ||    // Third priority: email username
        user.id.substring(0, 8);                             // Last resort: user ID prefix
      
      // Enhance user object with better username field and passkey information
      const enhancedUser = {
        ...user,
        // Keep the original username from API but add our display_name
        display_name: displayName,
        has_passkey: userDevices.length > 0,
        passkey_count: userDevices.length,
        device_types: userDevices.map(device => device.type)
      };
      
      return NextResponse.json({
        authenticated: true,
        user: enhancedUser
      });
    } catch (error) {
      console.error('Token validation error:', error);
      return NextResponse.json(
        { authenticated: false, error: 'Invalid auth token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
} 