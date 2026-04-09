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
    globeNodes: 'FAN SYNC REGIONS',

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
    countryVotes: 'Votes',
    closePopup: 'Close',
    noCountryData: 'Awaiting Fan Sync...',

    // Footer
    footer: '© 2026 STANDOM GLOBAL NETWORK',

    // Shared
    showMore: 'Show More',
    showLess: 'Show Less',
    page: 'Page',
    prev: 'Prev',
    next: 'Next',

    // Inquiry
    contactAdmin: 'Contact Admin',
    inquiryTitle: 'Message to Admin',
    inquiryPlaceholder: 'Enter your inquiry details...',
    sendInquiry: 'Send Message',
    inquirySuccess: 'Message sent successfully. Admin will review it shortly.',
  },
  KO: {
    // Navbar
    searchPlaceholder: '아티스트 검색...',
    login: '로그인',

    // Globe
    globeFrequency: '실시간 글로벌 현황',
    globeTitle: '실시간 화력 지도',
    globeNodes: '팬 싱크 지역',

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
    noCountryData: '지구본에서 팬 동기화 대기 중...',

    // Footer
    footer: '© 2026 STANDOM GLOBAL NETWORK',

    // Loading
    loadingGlobe: '글로벌 팬덤 연결 중...',

    // Artist Detail
    artistSync: '공식 아티스트 프로필',
    globalPower: '글로벌 화력',
    coverage: '활동 국가',
    regions: '개국',
    shareSync: '공유하기',
    nowScanning: '현재 재생 중',
    audioUnavailable: '오디오 없음',
    curatePhoto: '사진 수정',
    reportNode: '신고하기',
    fandomDensity: '팬덤 분포 데이터',
    liveHub: '팬 커뮤니티',
    transmit: '전송',

    // Photo Modal (Simplified)
    photoModalTitle: '사진 수정',
    photoModalSub: '아티스트의 프로필 사진을 검색하거나 변경하세요',
    searchLabel: '이미지 검색',
    searchPlaceholder: '아티스트 이름을 검색하세요...',
    manualLabel: '사진 링크 (URL)',
    manualPlaceholder: '이미지 주소를 입력하세요...',
    previewLabel: '미리보기',
    awaitingSignal: '이미지를 선택해주세요',
    establishSync: '변경사항 적용',
    abort: '취소',
    photoWarning: '적절한 이미지를 사용해 주세요. 부적절한 이미지는 관리자에 의해 삭제될 수 있습니다.',
    accessRestricted: '접근 제한',
    votesRequired: '사진을 수정하려면 더 많은 투표가 필요합니다.',
    loginRequired: '사진을 수정하려면 로그인이 필요합니다.',

    // Report Modal
    reportTitle: '아티스트 신고',
    reportSub: '신고 사유를 선택해주세요',
    reportReason_INAPPROPRIATE: '부적절한 콘텐츠',
    reportReason_WRONG_ARTIST: '잘못된 아티스트 정보',
    reportReason_LOW_QUALITY: '낮은 화질 / UI 오류',
    reportReason_DUPLICATE: '중복 등록',
    reportReason_OTHER: '기타 사유',
    reportDescription: '상세 내용을 입력해주세요...',
    transmitReport: '신고 제출',

    // Shared
    showMore: '더보기',
    showLess: '접기',
    page: '페이지',
    prev: '이전',
    next: '다음',

    // Inquiry
    contactAdmin: '관리자 문의',
    inquiryTitle: '관리자에게 문의하기',
    inquiryPlaceholder: '문의 내용을 입력해주세요...',
    sendInquiry: '메시지 전송',
    inquirySuccess: '메시지가 성공적으로 전송되었습니다.',
  }
};

export const getT = (lang: Language) => (key: string): string => {
  return i18n[lang][key] ?? key;
};
