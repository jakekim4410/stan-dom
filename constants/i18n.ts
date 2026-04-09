// ============================================================
// STAN.DOM 다국어 지원 (i18n) 딕셔너리
// 언어 추가 시 이 파일에 키/값 쌍을 추가하면 됩니다.
// ============================================================

export type Language = 'EN' | 'KO';

export const i18n: Record<Language, Record<string, string>> = {
  EN: {
    // Navbar
    searchPlaceholder: 'Search artists...',
    login: 'Login',

    // Globe
    globeFrequency: 'Live Global Status',
    globeTitle: 'REAL-TIME FREQUENCY',
    globeNodes: 'ACTIVE NODES',

    // Dashboard Titles
    globalRanking: 'GLOBAL RANKING',
    realTimeTrends: 'Real-time Trends',
    upcomingArtists: 'UPCOMING ARTISTS',
    artists: 'ARTISTS',

    // Card Labels
    totalVotes: 'Total Votes',
    vote: 'VOTE',
    score: 'SCORE',
    rank: 'RANK',

    // Country Popup
    countryTop3: 'Top Artists',
    countryVotes: 'votes',
    closePopup: 'Close',
    noCountryData: 'No votes yet from this region.',

    // Footer
    footer: '© 2026 STANDOM GLOBAL NETWORK',
    
    // Loading
    loadingGlobe: 'Syncing Global Nodes...',
  },
  KO: {
    // Navbar
    searchPlaceholder: '아티스트 검색...',
    login: '로그인',

    // Globe
    globeFrequency: '실시간 글로벌 현황',
    globeTitle: '실시간 화력 지도',
    globeNodes: '활성 노드',

    // Dashboard Titles
    globalRanking: '글로벌 랭킹',
    realTimeTrends: '실시간 트렌드',
    upcomingArtists: '주목 아티스트',
    artists: '아티스트',

    // Card Labels
    totalVotes: '총 투표수',
    vote: '투표',
    score: '점수',
    rank: '순위',

    // Country Popup
    countryTop3: 'TOP 아티스트',
    countryVotes: '표',
    closePopup: '닫기',
    noCountryData: '아직 이 지역의 투표 데이터가 없습니다.',

    // Footer
    footer: '© 2026 스탠덤 글로벌 네트워크',

    // Loading
    loadingGlobe: '글로벌 노드 동기화 중...',
  }
};

export const getT = (lang: Language) => (key: string): string => {
  return i18n[lang][key] ?? key;
};
