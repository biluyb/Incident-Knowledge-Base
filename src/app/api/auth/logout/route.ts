import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await clearSessionCookie();
    return NextResponse.json({ message: 'Logged out' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await clearSessionCookie();
    return NextResponse.json({ message: 'Logged out' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
