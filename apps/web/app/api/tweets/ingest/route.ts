import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, getLocalUserId } from '@/lib/auth/local-user';
import { IngestRequestSchema } from '@shared/schemas/ingest';
import { MAX_INGEST_BATCH_SIZE } from '@shared/constants';
import { ingestTweets } from '@/lib/services/tweet-ingestion';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Validate Authorization header
  const authHeader = request.headers.get('authorization');
  if (!validateApiKey(authHeader)) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401, headers: corsHeaders }
    );
  }

  const userId = await getLocalUserId();

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: corsHeaders }
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
      { status: 400, headers: corsHeaders }
    );
  }

  const parseResult = IngestRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400, headers: corsHeaders }
    );
  }

  const { tweets } = parseResult.data;

  const result = await ingestTweets(userId, tweets);

  return NextResponse.json({
    inserted: result.inserted,
    updated: result.updated,
    errors: result.errors,
    total: result.inserted + result.updated,
  }, { headers: corsHeaders });
}
