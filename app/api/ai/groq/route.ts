import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api')
  .replace(/\/api\/?$/, '/api');

export async function POST(req: NextRequest) {
  const body = await req.json();

  const cookieStore = await cookies();
  const token =
    cookieStore.get('ct_auth_token')?.value ??
    req.headers.get('authorization')?.replace('Bearer ', '') ??
    body._token ??
    '';

  const res = await fetch(`${API_BASE}/ai/groq`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      systemPrompt: body.systemPrompt,
      userPrompt:   body.userPrompt,
      maxTokens:    body.maxTokens ?? 600,
    }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}