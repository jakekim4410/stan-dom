import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/fix-charts?secret=...
 * 잘못된 youtube_id (o97AnitLw74)를 올바른 임베딩 가능 ID로 직접 업데이트합니다.
 * YouTube API 할당량 불필요 — 수동으로 검증된 ID 리스트 사용.
 */


// 수동으로 확인된 임베딩 가능한 YouTube 공식 오디오 ID
// Topic 채널 또는 공식 오디오 버전 = 임베딩 제한 없음
const KNOWN_IDS: Record<string, string> = {
  'MAGNETIC|ILLIT':                'oKhkEKCl73o',
  'FATE|(G)I-DLE':                 'Zp804HSY03A',
  'SHEESH|BABYMONSTER':            'IHQrPTBeNLA',
  'LOVE WINS ALL|IU':              'wQFHwvfFCjk',
  'TO. X|TAEYEON':                 'bwmSjIXCMj8',
  'PLOT TWIST|TWS':                '3miXJqHHYdk',
  'BAM YANG GANG|BIBI':            'JxBYTrRxWF0',
  'SMART|LE SSERAFIM':             'wkZpBWkhbck',
  'EASY|LE SSERAFIM':              'YiXFn1RrAaQ',
  'SUPERNOVA|aespa':               'XXUU5JCBMys',
  'DEJA VU|TXT':                   'nRqV5q7mHPk',
  "SPOT!|ZICO (feat. JENNIE)":     'sqgxcCjD04s',
  'IMPOSSIBLE|RIIZE':              'uIkrIOnE3Eo',
  'HEYA|IVE':                      'DHuENOKEo3c',
  'SUPER SHY|NewJeans':            'ArmDp-zijuc',
  'SEVEN|Jungkook':                'QU9c0053UAU',
  'PERFECT NIGHT|LE SSERAFIM':     '5v696tHoqJ0',
  'WIFE|(G)I-DLE':                 'TfBnNHUL_s4',
  'DRAMA|aespa':                   'fFBNFcxUZqA',
  'ACCENDIO|IVE':                  '6FWi5XEb0Q0',
};

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tracks, error } = await supabase
    .from('kpop_charts')
    .select('id, rank, title, artist, youtube_id')
    .order('rank', { ascending: true });

  if (error || !tracks) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  const results: any[] = [];

  for (const track of tracks) {
    const key = `${track.title.toUpperCase()}|${track.artist}`;
    // 대소문자 무시 검색
    const matchKey = Object.keys(KNOWN_IDS).find(
      k => k.toUpperCase() === `${track.title.toUpperCase()}|${track.artist.toUpperCase()}`
    );
    const newId = matchKey ? KNOWN_IDS[matchKey] : null;

    if (!newId) {
      results.push({ rank: track.rank, title: track.title, status: 'no_mapping' });
      continue;
    }

    if (newId === track.youtube_id) {
      results.push({ rank: track.rank, title: track.title, status: 'already_correct', id: newId });
      continue;
    }

    const { error: updateErr } = await supabase
      .from('kpop_charts')
      .update({ youtube_id: newId })
      .eq('id', track.id);

    results.push({
      rank: track.rank,
      title: track.title,
      artist: track.artist,
      status: updateErr ? 'update_failed' : 'updated',
      oldId: track.youtube_id,
      newId,
      error: updateErr?.message,
    });
  }

  const summary = {
    total:           results.length,
    updated:         results.filter(r => r.status === 'updated').length,
    already_correct: results.filter(r => r.status === 'already_correct').length,
    no_mapping:      results.filter(r => r.status === 'no_mapping').length,
    update_failed:   results.filter(r => r.status === 'update_failed').length,
  };

  return NextResponse.json({ summary, results });
}
