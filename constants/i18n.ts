// ============================================================
// STAN.DOM 다국어 지원 (i18n) 딕셔너리
// 언어 추가 시 이 파일에 키/값 쌍을 추가하면 됩니다.
// ============================================================

export type Language = 'EN' | 'KO' | 'ES';

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
    nominateArtist: 'NOMINATE ARTIST',
    registerArtist: 'Register Artist',

    // Card Labels
    totalVotes: 'Total Votes',
    vote: 'VOTE',
    score: 'SCORE',
    rank: 'RANK',
    add: 'ADD',

    // Country Popup
    countryTop3: 'Top Artists',
    countryVotes: 'Votes',
    closePopup: 'Close',
    noCountryData: 'Awaiting Fan Sync...',

    // System Status
    logout: 'Logout',
    connectNode: 'CONNECT COUNTRY NODE TO JOIN',
    nodeStable: 'NODE STABLE',
    remainingVotes: 'REMAINING VOTE',
    visMode: 'VIS_MODE',
    globe: 'GLOBE',
    flatMap: 'FLAT',
    voteTransmitted: 'VOTE TRANSMITTED',
    voltageIncreased: 'ARTIST VOLTAGE INCREASED',
    voteFailed: 'Vote failed',

    // Footer
    footer: '© 2026 STANDOM GLOBAL NETWORK',

    // Loading
    loadingGlobe: 'Connecting Global Fandom...',

    // Artist Detail
    artistSync: 'Official Artist Profile',
    globalPower: 'Global Power',
    coverage: 'Active Countries',
    regions: 'Countries',
    shareSync: 'Share',
    nowScanning: 'Now Scanning',
    audioUnavailable: 'Audio Unavailable',
    curatePhoto: 'Edit Photo',
    reportNode: 'Report Artist',
    fandomDensity: 'Fandom Distribution Data',
    liveHub: 'Fan Community',
    transmit: 'Transmit',
    returnToRankings: 'Return to Rankings',
    systemOnline: 'System Online',
    linkCopied: 'TRANSMISSION LINK COPIED',
    syncSuccess: 'SYNC_PROTOCOL_SUCCESS',
    authRequired: 'AUTHENTICATION_REQUIRED',
    loginToTransmit: 'LOGIN TO TRANSMIT SIGNALS',
    transmissionFailed: 'TRANSMISSION FAILED',
    networkError: 'NETWORK ERROR',
    commentPlaceholder: 'Transmit message to the fan community...',
    loginRequiredPlaceholder: 'Login to join the global fan synchronization...',
    dailyLimitExceeded: 'Daily vote limit exceeded.',
    transmitVote: 'TRANSMIT VOTE',
    voltage: 'VOLTAGE',
    repTrackPreview: 'Representative Track Preview',
    noAudioLicensed: 'No licensed preview on Deezer',
    noFandomPatterns: 'No Fandom Patterns Detected',
    voteNowToMap: 'VOTE NOW TO MAP THIS SYNC',
    hits: 'Hits',
    verifiedSync: 'Verified Sync',
    awaitingFirstTransmission: 'Awaiting First Transmission...',
    quota: 'QUOTA',

    // Photo Modal
    photoModalTitle: 'Edit Photo',
    photoModalSub: 'Search for or change the artist\'s profile picture',
    searchLabel: 'Image Search',
    photoModalSearchPlaceholder: 'Search for the artist\'s name...',
    manualLabel: 'Photo Link (URL)',
    manualPlaceholder: 'Enter the image address...',
    previewLabel: 'Preview',

    // Onboarding
    welcomeToStandom: 'WELCOME TO STAN.DOM',
    onboardingStep1Title: 'CONNECT REGION NODE',
    onboardingStep1Sub: 'Select your country to join the global fandom ranking. Your power represents your region.',
    onboardingStep2Title: 'VOTING PROTOCOL',
    onboardingStep2Sub: 'Every vote increases the artist\'s VOLTAGE.',
    ruleMember: 'Member: 10 Votes / Day',
    ruleGuest: 'Guest: 3 Votes / Day',
    ruleMemberSub: 'Become a member for maximum influence and support your artist daily.',
    ruleGuestSub: 'Join as a guest to experience the sync protocol with limited transmissions.',
    voltageSub: 'Collect and transmit voltage to increase your artist\'s global rank.',
    startSyncing: 'START SYNCING',
    selectYourRegion: 'Select Your Region',
    searchRegion: 'Search region code or name...',
    autoDetectIP: 'AUTO DETECT (IP)',
    continue: 'CONTINUE',
    awaitingSignal: 'Please select an image',
    establishSync: 'Establish Sync',
    abort: 'Abort',
    photoWarning: 'Please use appropriate images. Inappropriate images may be removed by the administrator.',
    accessRestricted: 'Access Restricted',
    votesRequired: 'More votes are required to edit photos.',
    loginRequired: 'Login is required to edit photos.',

    // Report Modal
    reportTitle: 'Report Artist',
    reportSub: 'Please select a reason',
    reportReason_INAPPROPRIATE: 'Inappropriate Content',
    reportReason_WRONG_ARTIST: 'Wrong Artist Info',
    reportReason_LOW_QUALITY: 'Low Quality / UI Error',
    reportReason_DUPLICATE: 'Duplicate Entry',
    reportReason_OTHER: 'Other Reason',
    reportDescription: 'Enter details here...',
    transmitReport: 'Transmit Report',

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
    directTransmission: 'Direct Transmission to Network Admin',
    networkLogUpdated: 'Network Log Updated',
    supportTeamNotice: 'Our support team monitors this channel 24/7. Response priority is calculated based on network activity and reputation.',
    reportFailed: 'Failed to submit report.',
    photoUpdateFailed: 'Failed to update photo.',
    autoDetectTitle: 'Auto-detect Location',
    autoDetectBtn: 'AUTO',
    clickCountryHint: 'Click country for details',
    
    // Auth
    loginNote: 'Please login to nominate artists.',
    hubSub: 'Global K-POP Fandom Hub',
    continueGoogle: 'Continue with Google',
    orContinueEmail: 'OR CONTINUE WITH EMAIL',
    guest: 'START AS GUEST',
    email: 'Email Address',
    password: 'Password',
    name: 'Full Name',
    nickname: 'User ID',
    selectCountry: 'Select Parent Node (Country)',
    privacyRequired: '(Required) I agree to the TERMS & PRIVACY. Collected info is solely for global fandom network building.',
    authEmailVerify: 'Email Verification Required',
    authEmailNote: 'After clicking Register, you MUST check your email inbox and click the [Confirm your signup] link to fully activate your STAN.DOM membership.',
    register: 'Register User',
    back: 'Back',
    hasAccount: 'Existing User?',
    authenticating: 'Authenticating...',
    initializing: 'Initializing Node...',
    fillEmailPass: 'Please enter email and password.',
    fillAll: 'Please fill out all registration fields.',
    agreePrivacy: 'You must agree to the Privacy Policy.',
    emailExists: 'Email already exists.',
    signUpSuccess: 'Registration complete! Check your email to confirm your account before logging in.',
    verifyFirst: 'Please verify your email address before signing in.',
    
    // Battle Zone
    battleZoneTitle: 'MONTHLY BATTLE ZONE',
    battleZoneSub: 'This Month: 5th Gen Rising Popcorn Battle (RIIZE vs BOYNEXTDOOR vs TWS)',
    votingRuleNotice: 'Members: 10 votes/day, Non-members: 3 votes/day',
    pastBattles: 'View Past Battles',
    hidePastBattles: 'Hide',
    battleWinner: 'Winner',
    artistAlreadyExists: 'This artist has already been nominated.',

    // Hot Issue Section
    hotIssueTitle: "TODAY'S K-POP HOT ISSUE",
    hotIssueSub: 'Latest trending topics from the global K-pop scene',
    hotIssueWatchYT: 'Watch on YouTube',
    hotIssueDateLabel: 'Published',
    hotIssueCategoryLabel: 'Category',
    viewPastIssues: 'View Past Issues',
    hidePastIssues: 'Hide',
    updateSchedule: 'Updated daily · KST 09:00 & EST 09:00',
    newTag: 'NEW',

    // Hologram Card & Takeover
    takeoverTooltip: 'The top ranked global artist takes over the entire website theme!',
    hologramRank: 'GLOBAL RANK',
    fueledMsg: 'Your voltage successfully fueled global rankings on STAN.DOM!',
    shareToX: 'Share Card to X',
    tweetTemplate: 'I just fueled global rank {rank} for {artist} on STAN.DOM! Vote for your favorite K-POP artist now!',
    required: 'REQUIRED',
    close: 'Close',

    // Missing Keys
    globalLeader: 'GLOBAL LEADER',
    localLeader: 'LOCAL LEADER',
    scanArtist: 'SCAN FOR ARTIST NODE...',
    nominate: 'NOMINATE',
    voted: 'Voted',
    alreadyVoted: 'Already voted',
    selectCountryFirst: 'Select your country first',
    cancel: 'Cancel',
    noCommentsYet: 'No messages transmitted yet.',
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
    nominateArtist: '새 아티스트 노미네이트',
    registerArtist: '아티스트 등록',

    // Card Labels
    totalVotes: '총 투표수',
    vote: '투표',
    score: '점수',
    rank: '순위',
    add: '추가',

    // Country Popup
    countryTop3: 'TOP 아티스트',
    countryVotes: '표',
    closePopup: '닫기',
    noCountryData: '지구본에서 팬 동기화 대기 중...',

    // System Status
    logout: '로그아웃',
    connectNode: '참여를 위해 국가를 연결하세요',
    nodeStable: '안정적으로 연결됨',
    remainingVotes: '남은 투표',
    visMode: '시각화 모드',
    globe: '지구본',
    flatMap: '평면지도',
    voteTransmitted: '투표 완료',
    voltageIncreased: '아티스트 볼티지가 상승했습니다.',
    voteFailed: '투표 실패',

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
    returnToRankings: '순위로 돌아가기',
    systemOnline: '시스템 온라인',
    linkCopied: '공유 링크가 복사되었습니다',
    syncSuccess: '동기화 성공',
    authRequired: '인증 필요',
    loginToTransmit: '메시지를 전송하려면 로그인하세요',
    transmissionFailed: '전송 실패',
    networkError: '네트워크 오류',
    commentPlaceholder: '팬 커뮤니티에 메시지를 전송하세요...',
    loginRequiredPlaceholder: '로그인하고 글로벌 팬 허브에 참여하세요...',
    dailyLimitExceeded: '하루 투표 제한을 초과했습니다.',
    transmitVote: '투표 전송',
    voltage: '볼티지',
    repTrackPreview: '대표곡 미리듣기',
    noAudioLicensed: '미리듣기를 제공하지 않는 곡입니다',
    noFandomPatterns: '해당 지역의 데이터가 아직 없습니다',
    voteNowToMap: '지금 투표하여 지도에 표시하세요',
    hits: '표',
    verifiedSync: '인증 완료',
    awaitingFirstTransmission: '첫 번째 메시지를 기다리고 있습니다...',
    quota: '남은 투표',

    // Photo Modal
    photoModalTitle: '사진 수정',
    photoModalSub: '아티스트의 프로필 사진을 검색하거나 변경하세요',
    searchLabel: '이미지 검색',
    photoModalSearchPlaceholder: '아티스트 이름을 검색하세요...',
    manualLabel: '사진 링크 (URL)',
    manualPlaceholder: '이미지 주소를 입력하세요...',
    previewLabel: '미리보기',

    // Onboarding
    welcomeToStandom: 'STAN.DOM에 오신 것을 환영합니다',
    onboardingStep1Title: '국가 노드 연결',
    onboardingStep1Sub: '글로벌 팬덤 랭킹에 참여하기 위해 국가를 선택해주세요. 당신의 투표는 지역의 힘이 됩니다.',
    onboardingStep2Title: '투표 프로토콜',
    onboardingStep2Sub: '모든 투표는 아티스트의 전압(VOLTAGE)을 상승시킵니다.',
    ruleMember: '회원: 하루 10표',
    ruleGuest: '비회원: 하루 3표',
    ruleMemberSub: '회원이 되어 매일 아티스트를 최대로 지원하고 영향력을 행사하세요.',
    ruleGuestSub: '비회원으로 참여하여 제한된 횟수 내에서 투표 프로토콜을 경험해보세요.',
    voltageSub: '볼티지를 모아 전송하여 아티스트의 글로벌 랭킹을 높이세요.',
    startSyncing: '동기화 시작하기',
    selectYourRegion: '국가 선택',
    searchRegion: '국가 이름 또는 코드 검색...',
    autoDetectIP: '자동 감지 (IP)',
    continue: '계속하기',
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
    directTransmission: '관리자 노드 직접 전송',
    networkLogUpdated: '네트워크 로그 업데이트됨',
    supportTeamNotice: '지원 팀이 24/7 모니터링 중입니다. 응답 우선순위는 네트워크 활동 및 평판을 기반으로 계산됩니다.',
    reportFailed: '보고서 제출 실패',
    photoUpdateFailed: '사진 업데이트 실패',
    autoDetectTitle: '현재 위치 자동 감지',
    autoDetectBtn: '자동',
    clickCountryHint: '국가를 클릭하여 상세 정보 확인',
    
    // Auth
    loginNote: '아티스트 노미네이트를 위해 로그인이 필요합니다.',
    hubSub: '글로벌 초연결 팬덤 허브',
    continueGoogle: 'Google 연동하여 시작하기',
    orContinueEmail: '또는 이메일로 시작하기',
    guest: '비회원으로 시작하기',
    email: '이메일 주소',
    password: '비밀번호',
    name: '이름',
    nickname: '닉네임 (ID)',
    selectCountry: '소속 국가 선택',
    privacyRequired: '(필수) STAN.DOM 서비스 이용약관 및 개인정보 수집 및 이용에 동의합니다. 수집된 정보는 글로벌 팬덤 네트워크 구축 외에 다른 용도로 사용되지 않습니다.',
    authEmailVerify: '이메일 인증 필수 안내',
    authEmailNote: '회원가입 완료 후, 해당 이메일함에 도착한 [Confirm your signup] 가입 인증 링크를 직접 클릭하셔야만 STAN.DOM 네크워크의 회원 승인이 완전히 완료됩니다.',
    register: '회원가입 완료',
    back: '뒤로',
    hasAccount: '이미 계정이 있나요?',
    authenticating: '인증 중...',
    initializing: '가입 승인 중...',
    fillEmailPass: '이메일과 비밀번호를 입력해주세요.',
    fillAll: '모든 가입 정보를 입력해주세요.',
    agreePrivacy: '개인정보 수집 및 이용에 동의해야 합니다.',
    emailExists: '이미 존재하는 이메일입니다.',
    signUpSuccess: '회원가입 완료! 가입하신 이메일함에서 STAN.DOM 계정 이메일 인증을 완료한 후 로그인해주세요.',
    verifyFirst: '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.',
    
    // Battle Zone
    // Battle Zone
    battleZoneTitle: 'MONTHLY BATTLE ZONE (월간 배틀존)',
    battleZoneSub: '이달의 주제: 5세대 라이징 팝콘 배틀 (RIIZE vs BOYNEXTDOOR vs TWS)',
    votingRuleNotice: '회원가입 시 1일 10회, 비회원은 3회 투표 가능',
    pastBattles: '지난 배틀 보기',
    hidePastBattles: '접기',
    battleWinner: '우승',
    artistAlreadyExists: '이미 등록된 아티스트입니다.',

    // Hot Issue Section
    hotIssueTitle: '오늘의 K-POP 핫이슈',
    hotIssueSub: '글로벌 K-POP 씬 최신 핫 토픽',
    hotIssueWatchYT: '유튜브에서 보기',
    hotIssueDateLabel: '발행',
    hotIssueCategoryLabel: '카테고리',
    viewPastIssues: '지난이슈 보기',
    hidePastIssues: '접기',
    updateSchedule: '매일 업데이트 · KST 09:00 & EST 09:00',
    newTag: 'NEW',

    // Hologram Card & Takeover
    takeoverTooltip: '현재 1위에 랭크된 글로벌 아티스트가 웹사이트 테마를 점령합니다!',
    hologramRank: '글로벌 랭킹',
    fueledMsg: '당신의 볼티지가 글로벌 순위 상승에 성공적으로 기여했습니다!',
    shareToX: 'X에 카드 공유',
    tweetTemplate: '제가 방금 STAN.DOM에서 {artist}의 글로벌 랭킹을 {rank}위로 끌어올렸어요! 지금 바로 최애 아티스트에게 투표하세요!',
    required: '필수 선택',
    close: '닫기',

    // Missing Keys
    globalLeader: '글로벌 뱅가드',
    localLeader: '로컬 유닛',
    scanArtist: '아티스트를 스캔하세요...',
    nominate: '노미네이트',
    voted: '투표함',
    alreadyVoted: '이미 투표함',
    selectCountryFirst: '국가를 먼저 선택하세요',
    cancel: '취소',
    noCommentsYet: '메시지가 아직 없습니다.',
  },

  ES: {
    // Navbar
    searchPlaceholder: 'Buscar artistas...',
    login: 'Iniciar sesión',

    // Globe
    globeFrequency: 'Estado Global en Vivo',
    globeTitle: 'FRECUENCIA EN TIEMPO REAL',
    globeNodes: 'REGIONES DE FAN SYNC',

    // Dashboard Titles
    globalRanking: 'RANKING GLOBAL',
    realTimeTrends: 'Tendencias en Tiempo Real',
    upcomingArtists: 'ARTISTAS EMERGENTES',
    artists: 'ARTISTAS',
    nominateArtist: 'NOMINAR ARTISTA',
    registerArtist: 'Registrar Artista',

    // Card Labels
    totalVotes: 'Votos Totales',
    vote: 'VOTAR',
    score: 'PUNTUACIÓN',
    rank: 'RANGO',
    add: 'AÑADIR',

    // Country Popup
    countryTop3: 'Artistas Top',
    countryVotes: 'Votos',
    closePopup: 'Cerrar',
    noCountryData: 'Esperando Fan Sync...',

    // System Status
    logout: 'CERRAR SESIÓN',
    connectNode: 'CONECTA TU NODO DE PAÍS',
    nodeStable: 'NODO ESTABLE',
    remainingVotes: 'VOTOS RESTANTES',
    visMode: 'MODO_VIS',
    globe: 'GLOBO',
    flatMap: 'PLANO',
    voteTransmitted: 'VOTO TRANSMITIDO',
    voltageIncreased: 'VOLTAJE DEL ARTISTA AUMENTADO',
    voteFailed: 'Voto fallido',

    // Footer
    footer: '© 2026 STANDOM GLOBAL NETWORK',

    // Loading
    loadingGlobe: 'Conectando Fandom Global...',

    // Artist Detail
    artistSync: 'Perfil Oficial del Artista',
    globalPower: 'Poder Global',
    coverage: 'Países Activos',
    regions: 'Países',
    shareSync: 'Compartir',
    nowScanning: 'Reproduciendo Ahora',
    audioUnavailable: 'Sin audio',
    curatePhoto: 'Editar Foto',
    reportNode: 'Reportar Artista',
    fandomDensity: 'Datos de Distribución del Fandom',
    liveHub: 'Comunidad de Fans',
    transmit: 'Enviar',
    returnToRankings: 'Volver al Ranking',
    systemOnline: 'Sistema en Línea',
    linkCopied: 'ENLACE DE TRANSMISIÓN COPIADO',
    syncSuccess: 'ÉXITO_PROTOCOLO_SYNC',
    authRequired: 'AUTENTICACIÓN REQUERIDA',
    loginToTransmit: 'INICIA SESIÓN PARA TRANSMITIR',
    transmissionFailed: 'TRANSMISIÓN FALLIDA',
    networkError: 'ERROR DE RED',
    commentPlaceholder: 'Transmitir mensaje a la comunidad...',
    loginRequiredPlaceholder: 'Inicia sesión para unirte al hub global...',
    dailyLimitExceeded: 'Límite de votos diarios excedido.',
    transmitVote: 'TRANSMITIR VOTO',
    voltage: 'VOLTAJE',
    repTrackPreview: 'Vista previa de pista',
    noAudioLicensed: 'No se ofrece vista previa de esta canción',
    noFandomPatterns: 'No se detectaron patrones de fans en esta región',
    voteNowToMap: '¡VOTA AHORA PARA MARCAR EN EL MAPA!',
    hits: 'Votos',
    verifiedSync: 'Verificado',
    awaitingFirstTransmission: 'Esperando la primera transmisión...',
    quota: 'Votos restantes',

    // Photo Modal
    photoModalTitle: 'Editar Foto',
    photoModalSub: 'Busca o cambia la foto de perfil del artista',
    searchLabel: 'Búsqueda de Imagen',
    photoModalSearchPlaceholder: 'Busca el nombre del artista...',
    manualLabel: 'Enlace de Foto (URL)',
    manualPlaceholder: 'Ingresa la dirección de la imagen...',
    previewLabel: 'Vista previa',

    // Onboarding
    welcomeToStandom: 'BIENVENIDO A STAN.DOM',
    onboardingStep1Title: 'CONECTAR NODO DE REGIÓN',
    onboardingStep1Sub: 'Selecciona tu país para unirte al ranking global. Tu poder representa a tu región.',
    onboardingStep2Title: 'PROTOCOLO DE VOTACIÓN',
    onboardingStep2Sub: 'Cada voto aumenta el VOLTAJE del artista.',
    ruleMember: 'Miembro: 10 Votos / Día',
    ruleGuest: 'Invitado: 3 Votos / Día',
    ruleMemberSub: 'Conviértete en miembro para tener la máxima influencia y apoyar a tu artista diariamente.',
    ruleGuestSub: 'Únete como invitado para experimentar el protocolo de sincronización con transmisiones limitadas.',
    voltageSub: 'Recoge y transmite voltaje para aumentar el rango global de tu artista.',
    startSyncing: 'INICIAR SINCRONIZACIÓN',
    selectYourRegion: 'Selecciona tu Región',
    searchRegion: 'Buscar código o nombre de región...',
    autoDetectIP: 'DETECCIÓN AUTO (IP)',
    continue: 'CONTINUAR',
    awaitingSignal: 'Por favor selecciona una imagen',
    establishSync: 'Aplicar Cambios',
    abort: 'Cancelar',
    photoWarning: 'Por favor usa imágenes apropiadas. Las imágenes inapropiadas pueden ser eliminadas por el administrador.',
    accessRestricted: 'Acceso Restringido',
    votesRequired: 'Se requieren más votos para editar fotos.',
    loginRequired: 'Es necesario iniciar sesión para editar fotos.',

    // Report Modal
    reportTitle: 'Reportar Artista',
    reportSub: 'Por favor selecciona un motivo',
    reportReason_INAPPROPRIATE: 'Contenido Inapropiado',
    reportReason_WRONG_ARTIST: 'Información de Artista Incorrecta',
    reportReason_LOW_QUALITY: 'Baja Calidad / Error de UI',
    reportReason_DUPLICATE: 'Registro Duplicado',
    reportReason_OTHER: 'Otro Motivo',
    reportDescription: 'Ingresa los detalles aquí...',
    transmitReport: 'Enviar Reporte',

    // Shared
    showMore: 'Mostrar Más',
    showLess: 'Mostrar Menos',
    page: 'Página',
    prev: 'Anterior',
    next: 'Siguiente',

    // Inquiry
    contactAdmin: 'Contactar Administrador',
    inquiryTitle: 'Mensaje al Administrador',
    inquiryPlaceholder: 'Ingresa los detalles de tu consulta...',
    sendInquiry: 'Enviar Mensaje',
    inquirySuccess: 'Mensaje enviado con éxito. El administrador lo revisará pronto.',
    directTransmission: 'Transmisión Directa al Administrador',
    networkLogUpdated: 'Registro de Red Actualizado',
    supportTeamNotice: 'Nuestro equipo de soporte monitorea este canal 24/7. La prioridad de respuesta se calcula según la actividad y reputación.',
    reportFailed: 'Error al enviar reporte.',
    photoUpdateFailed: 'Error al actualizar foto.',
    autoDetectTitle: 'Auto-detectar ubicación',
    autoDetectBtn: 'AUTO',
    clickCountryHint: 'Haz clic en el país para ver detalles',
    
    // Auth
    loginNote: 'Por favor inicia sesión para nominar artistas.',
    hubSub: 'Centro Global del Fandom K-POP',
    continueGoogle: 'Continuar con Google',
    orContinueEmail: 'O CONTINUAR CON EMAIL',
    guest: 'COMENZAR COMO INVITADO',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    name: 'Nombre Completo',
    nickname: 'ID de Usuario',
    selectCountry: 'Seleccionar Nodo Padre (País)',
    privacyRequired: '(Obligatorio) Acepto los TÉRMINOS Y PRIVACIDAD. La info se usa solo para construir la red global de fandom.',
    authEmailVerify: 'Verificación de Email Requerida',
    authEmailNote: 'Después de registrarte, DEBES revisar tu email y hacer clic en el enlace [Confirm your signup] para activar tu membresía.',
    register: 'Registrar Usuario',
    back: 'Atrás',
    hasAccount: '¿Ya tienes cuenta?',
    authenticating: 'Autenticando...',
    initializing: 'Iniciando Nodo...',
    fillEmailPass: 'Por favor, ingresa email y contraseña.',
    fillAll: 'Por favor, completa todos los campos de registro.',
    agreePrivacy: 'Debes aceptar la política de privacidad.',
    emailExists: 'El email ya existe.',
    signUpSuccess: '¡Registro completo! Revisa tu email para confirmar tu cuenta antes de iniciar sesión.',
    verifyFirst: 'Por favor, verifica tu email antes de iniciar sesión.',
    
    // Battle Zone
    // Battle Zone
    battleZoneTitle: 'ZONA DE BATALLA MENSUAL',
    battleZoneSub: 'Este Mes: Batalla de la 5.ª Generación (RIIZE vs BOYNEXTDOOR vs TWS)',
    votingRuleNotice: 'Miembros: 10 votos/día, No miembros: 3 votos/día',
    pastBattles: 'Ver Batallas Anteriores',
    hidePastBattles: 'Ocultar',
    battleWinner: 'Ganador',
    artistAlreadyExists: 'Este artista ya ha sido nominado.',

    // Hot Issue Section
    hotIssueTitle: 'TEMA VIRAL K-POP DE HOY',
    hotIssueSub: 'Últimas tendencias de la escena K-pop global',
    hotIssueWatchYT: 'Ver en YouTube',
    hotIssueDateLabel: 'Publicado',
    hotIssueCategoryLabel: 'Categoría',
    viewPastIssues: 'Ver Temas Anteriores',
    hidePastIssues: 'Ocultar',
    updateSchedule: 'Actualizado diariamente · KST 09:00 & EST 09:00',
    newTag: 'NUEVO',

    // Hologram Card & Takeover
    takeoverTooltip: '¡El artista global mejor clasificado se apodera del tema del sitio web!',
    hologramRank: 'RANGO GLOBAL',
    fueledMsg: '¡Tu voltaje impulsó con éxito las clasificaciones en STAN.DOM!',
    shareToX: 'Compartir en X',
    tweetTemplate: '¡Acabo de impulsar el rango global {rank} de {artist} en STAN.DOM! ¡Vota por tu artista de K-POP favorito ahora!',
    required: 'REQUERIDO',
    close: 'Cerrar',

    // Missing Keys
    globalLeader: 'LÍDER GLOBAL',
    localLeader: 'LÍDER LOCAL',
    scanArtist: 'ESCANEAR NODO DE ARTISTA...',
    nominate: 'NOMINAR',
    voted: 'Votado',
    alreadyVoted: 'Ya votado',
    selectCountryFirst: 'Selecciona tu país primero',
    cancel: 'Cancelar',
  }

};

export const getT = (lang: Language) => (key: string): string => {
  return i18n[lang][key] ?? key;
};