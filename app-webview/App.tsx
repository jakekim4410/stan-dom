import { StatusBar } from 'expo-status-bar';
import { StyleSheet, BackHandler, Platform, Alert, Linking, Share } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useRef, useEffect, useState } from 'react';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// 개발 환경에서는 테스트 광고, 프로덕션에서는 실제 애드몹 광고를 노출합니다.
const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-7904032658716092/1586676306';

const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  keywords: ['music', 'kpop', 'entertainment'],
});

export default function App() {
  const webviewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  
  // 하이브리드 앱 네비게이션 및 모달 동기화 상태
  const [isRoot, setIsRoot] = useState(true);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // 1. 애드몹 보상형 광고 설정
  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('광고 로드 완료!');
      setAdLoaded(true);
    });
    
    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      reward => {
        console.log('광고 시청 완료! 웹뷰로 신호 전송...');
        // 광고 시청 완료! 웹(Next.js)으로 보상 지급 신호를 보냅니다.
        if (webviewRef.current) {
          webviewRef.current.injectJavaScript(`
            window.dispatchEvent(new CustomEvent('adRewardEarned'));
            true;
          `);
        }
      },
    );

    const unsubscribeClosed = rewarded.addAdEventListener('closed', () => {
      // 사용자가 창을 닫으면 다음 번을 위해 새 광고 미리 로드
      setAdLoaded(false);
      rewarded.load();
    });

    // 첫 광고 로드 시작
    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
    };
  }, []);

  // 2. 안드로이드 뒤로가기 버튼 처리 (하이브리드 네비게이션 통합)
  useEffect(() => {
    const backAction = () => {
      // 1. 종료 확인 모달이 켜져있거나 다른 모달이 켜져있다면, 웹(Next.js)에 모달 닫기 이벤트 전송
      if (isExitModalOpen || isAnyModalOpen) {
        if (webviewRef.current) {
          webviewRef.current.injectJavaScript(`
            window.dispatchEvent(new CustomEvent('close-all-modals'));
            true;
          `);
        }
        return true; // 앱 종료 방지
      }

      // 2. 만약 루트 페이지가 아니라면 (예: 아티스트 상세페이지 등), 뒤로 가기
      if (!isRoot && canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true; // 앱 종료 방지
      }

      // 3. 루트 페이지이고 모달도 안 켜져있다면, 웹에 종료 확인 모달 띄우기 요청
      if (isRoot && webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          window.dispatchEvent(new CustomEvent('request-app-exit'));
          true;
        `);
        return true; // 앱 종료 방지 (모달의 '나가기' 버튼을 눌러야 EXIT_APP 메시지로 종료됨)
      }

      return false; // 기본 앱 종료
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [canGoBack, isRoot, isAnyModalOpen, isExitModalOpen]);

  // 3. 이미지 다운로드 핸들러 (data URL을 파일로 저장)
  const handleImageDownload = async (dataUrl: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진을 저장하려면 갤러리 접근 권한이 필요합니다.');
        return;
      }
      
      // data:image/png;base64,... → base64 데이터 추출
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) {
        Alert.alert('오류', '이미지 데이터를 처리할 수 없습니다.');
        return;
      }

      const fileName = `standom_card_${Date.now()}.png`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const asset = await MediaLibrary.createAssetAsync(fileUri);
      
      // 알림 및 성공 신호를 웹뷰로 전달
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          window.dispatchEvent(new CustomEvent('image-saved-success'));
          true;
        `);
      }
      
      Alert.alert('저장 완료! ✅', '이미지가 갤러리에 저장되었습니다.');
    } catch (error) {
      console.error('Image download error:', error);
      Alert.alert('저장 실패', '이미지 저장 중 문제가 발생했습니다.');
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" backgroundColor="#000000" />
        <WebView
          ref={webviewRef}
          source={{ uri: 'https://standom.online/' }}
          style={styles.webview}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
          // 웹(Next.js)에서 보내는 메시지 수신 (브릿지 역할)
          onMessage={(event) => {
            const message = event.nativeEvent.data;
            
            // JSON 기반 상태 메세지 파싱
            try {
              const data = JSON.parse(message);
              if (data.type === 'APP_STATE') {
                setIsRoot(data.isRoot);
                setIsAnyModalOpen(data.isAnyModalOpen);
                return;
              }
              if (data.type === 'EXIT_MODAL_STATE') {
                setIsExitModalOpen(data.isOpen);
                return;
              }
              if (data.type === 'DOWNLOAD_IMAGE' && data.dataUrl) {
                handleImageDownload(data.dataUrl);
                return;
              }
            } catch (e) {
              // 일반 텍스트 메세지 처리
            }

            if (message === 'SHOW_REWARDED_AD') {
              if (adLoaded) {
                rewarded.show();
              } else {
                Alert.alert('안내', '아직 광고가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
                rewarded.load(); // 재요청
              }
            } else if (message === 'EXIT_APP') {
              BackHandler.exitApp();
            }
          }}
          allowsBackForwardNavigationGestures={true}
          bounces={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          // ── 음악 재생 및 혼합 콘텐츠 허용 (YouTube iframe 등) ──
          mixedContentMode="always"
          allowFileAccess={true}
          allowsFullscreenVideo={true}
          // ── 흰색 깜빡임 방지를 위한 배경색 고정 ──
          backgroundColor="#000000"
          // 안드로이드에서 하드웨어 가속 활성화 (영상/음악 재생 안정화)
          androidLayerType="hardware"
          onConsoleMessage={(event) => {
            console.log('[Web Console]', event.nativeEvent.message);
          }}
          // 깨끗한 기본 User-Agent를 사용하고, window 전역에 앱 환경 플래그를 사전에 주입하여 YouTube 임베드 재생 및 구글 로그인 오류를 원천 방지합니다.
          injectedJavaScriptBeforeContentLoaded={`
            window.isAppEnv = true;
            window.STAN_DOM_APP = true;
            
            // 이미지 저장을 위한 기본 터치 동작 허용 (long-press 저장 활성화)
            document.addEventListener('DOMContentLoaded', function() {
              var style = document.createElement('style');
              style.textContent = 'img { -webkit-touch-callout: default !important; -webkit-user-select: auto !important; user-select: auto !important; }';
              document.head.appendChild(style);
            });
            true;
          `}
          // 유튜브의 악랄한 WebView 차단 로직(0:00 멈춤)을 우회하기 위해 순수 모바일 브라우저로 위장합니다. (구글 로그인 오류 방지를 위해 뒤에 커스텀 텍스트는 빼고 순정 텍스트만 넣습니다.)
          userAgent={Platform.OS === 'android' 
            ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Mobile Safari/537.36' 
            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'}
          // 외부 링크 (트위터, 인스타 등)를 시스템 브라우저에서 열기
          onShouldStartLoadWithRequest={(request) => {
            const url = request.url;
            // standom.online 내부 링크는 WebView에서 처리
            if (url.includes('standom.online') || url.includes('youtube.com') || url.includes('ytimg.com') || url.includes('supabase.co') || url.includes('accounts.google.com') || url.startsWith('about:blank')) {
              return true;
            }
            // 외부 링크는 시스템 브라우저로 열기
            if (url.startsWith('http://') || url.startsWith('https://')) {
              Linking.openURL(url);
              return false;
            }
            // blob: / data: URL은 허용
            if (url.startsWith('blob:') || url.startsWith('data:')) {
              return true;
            }
            return true;
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
