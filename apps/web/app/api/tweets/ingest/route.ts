import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { IngestRequestSchema } from '@shared/schemas/ingest';
import { MAX_INGEST_BATCH_SIZE } from '@shared/constants';
import { ingestTweets } from '@/lib/services/tweet-ingestion';

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET / NEXTAUTH_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Validate Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  let userId: string;

  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) {
      return NextResponse.json(
        { error: 'Invalid token: missing sub claim' },
        { status: 401 }
      );
    }
    userId = payload.sub;
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Check batch size before full validation for a clear error message
  if (
    body &&
    typeof body === 'object' &&
    'tweets' in body &&
    Array.isArray((body as { tweets: unknown }).tweets) &&
    (body as { tweets: unknown[] }).tweets.length > MAX_INGEST_BATCH_SIZE
  ) {
    return NextResponse.json(
      { error: `Batch size exceeds maximum of ${MAX_INGEST_BATCH_SIZE} tweets` },
      { status: 400 }
    );
  }

  const parseResult = IngestRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { tweets } = parseResult.data;

  const result = await ingestTweets(userId, tweets);

  return NextResponse.json({
    inserted: result.inserted,
    updated: result.updated,
    errors: result.errors,
    total: result.inserted + result.updated,
  });
}
