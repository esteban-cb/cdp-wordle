import { NextResponse } from 'next/server';

/**
 * API endpoint to provide configuration without exposing environment variables to the client
 */
export async function GET() {
  try {
    // Get configuration from server-side environment variables
    const passageAppId = process.env.PASSAGE_APP_ID;
    const cdpProjectId = process.env.CDP_PROJECT_ID;

    // For now, we'll support both during migration
    // Later we'll remove Passage configuration
    const config: any = {};
    
    if (passageAppId) {
      config.passageAppId = passageAppId;
    }
    
    if (cdpProjectId) {
      config.cdpProjectId = cdpProjectId;
      console.log('CDP Project ID configured:', cdpProjectId);
    } else {
      console.error('CDP_PROJECT_ID environment variable not set');
    }

    // Return configuration to the client
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error providing configuration:', error);
    return NextResponse.json(
      { error: 'Failed to provide configuration' },
      { status: 500 }
    );
  }
} 