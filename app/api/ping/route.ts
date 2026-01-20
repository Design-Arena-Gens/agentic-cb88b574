import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const target = searchParams.get('target');

  if (!target) {
    return NextResponse.json({ error: 'Target parameter is required' }, { status: 400 });
  }

  try {
    // Validate target to prevent injection
    const sanitizedTarget = target.replace(/[^a-zA-Z0-9.-]/g, '');

    // Add protocol if not present
    let url = sanitizedTarget;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Battleship-Pinger/1.0',
      },
    });

    clearTimeout(timeoutId);

    const endTime = Date.now();
    const latency = endTime - startTime;

    return NextResponse.json({
      success: true,
      latency,
      status: response.status,
      target: sanitizedTarget,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      target,
    }, { status: 500 });
  }
}
