import { NextResponse } from 'next/server';

/**
 * API endpoint to provide Passage configuration without exposing environment variables to the client
 */
export async function GET() {
  try {
    // Get Passage App ID from server-side environment variables
    const passageAppId = process.env.PASSAGE_APP_ID;

    if (!passageAppId) {
      return NextResponse.json(
        { error: 'Passage App ID is not configured on the server' },
        { status: 500 }
      );
    }

    // Return the App ID to the client
    return NextResponse.json({
      appId: passageAppId
    });
  } catch (error) {
    console.error('Error providing Passage configuration:', error);
    return NextResponse.json(
      { error: 'Failed to provide Passage configuration' },
      { status: 500 }
    );
  }
} 