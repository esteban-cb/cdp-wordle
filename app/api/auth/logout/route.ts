import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Clear the auth token cookie
    const response = NextResponse.json({ success: true });
    
    // Set cookie expiration to a past date to remove it
    response.cookies.set('psg_auth_token', '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
} 