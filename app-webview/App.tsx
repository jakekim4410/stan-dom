import { StatusBar } from 'expo-status-bar';
import { StyleSheet, BackHandler, Platform, Alert, Linking, Share } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useRef, useEffect, useState } from 'react';
import { RewardedAd, RewardedAdEventType, TestIds, AdEventType } from 'react-native-google-mobile-ads';
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
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          window.dispatchEvent(new CustomEvent('adLoadedStatus', { detail: { loaded: true } }));
          true;
        `);
      }
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

    const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      // 사용자가 창을 닫으면 상태 리셋 (여기서 다음 광고를 강제로 load()하지 않고, 다음 모달 진입 시에 load함)
      setAdLoaded(false);
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          window.dispatchEvent(new CustomEvent('adLoadedStatus', { detail: { loaded: false } }));
          true;
        `);
      }
    });

    const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('광고 로드 실패:', error);
      setAdLoaded(false);
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          window.dispatchEvent(new CustomEvent('adLoadedStatus', { detail: { loaded: false, error: "${error?.message || 'Unknown error'}" } }));
          true;
        `);
      }
    });

    // 앱 진입 시 자동 로드를 비활성화하여 불필요한 요청수 증가를 막습니다. (유저가 모달에 진입했을 때 PRELOAD_AD를 받으면 로드)

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
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
      console.log('[ImageSave] Starting download, dataUrl length:', dataUrl?.length);

      // 1. data:image/xxx;base64,... → base64 데이터 추출
      const commaIndex = dataUrl.indexOf(',');
      if (commaIndex === -1) {
        console.error('[ImageSave] Invalid dataUrl: no comma separator found');
        Alert.alert('오류', '이미지 데이터를 처리할 수 없습니다.');
        return;
      }
      const base64Data = dataUrl.substring(commaIndex + 1);
      if (!base64Data || base64Data.length < 100) {
        console.error('[ImageSave] Invalid base64 data, length:', base64Data?.length);
        Alert.alert('오류', '이미지 데이터가 손상되었습니다. 다시 시도해주세요.');
        return;
      }
      console.log('[ImageSave] Base64 data extracted, length:', base64Data.length);

      // 2. 파일 확장자 감지 및 임시 파일 저장
      const header = dataUrl.substring(0, commaIndex);
      const extension = header.includes('jpeg') || header.includes('jpg') ? 'jpg' : 'png';
      const fileName = `standom_card_${Date.now()}.${extension}`;
      const fileUri = FileSystem.cacheDirectory + fileName;
      console.log('[ImageSave] Saving to:', fileUri);

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 파일이 정상적으로 저장되었는지 확인
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      console.log('[ImageSave] File written:', JSON.stringify(fileInfo));

      if (!fileInfo.exists || (fileInfo as any).size === 0) {
        console.error('[ImageSave] File write verification failed');
        Alert.alert('저장 실패', '파일 저장에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      // 3. 갤러리 저장 권한 처리
      let { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
      console.log('[ImageSave] Current permission status:', status, 'canAskAgain:', canAskAgain);

      if (status !== 'granted') {
        if (canAskAgain) {
          const request = await MediaLibrary.requestPermissionsAsync(true); // writeOnly
          status = request.status;
          console.log('[ImageSave] Permission request result:', status);
        }
      }

      if (status === 'granted') {
        try {
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          console.log('[ImageSave] Asset created successfully:', asset.uri);
          Alert.alert('저장 완료! ✅', '이미지가 갤러리에 저장되었습니다.');
        } catch (saveErr: any) {
          console.warn('[ImageSave] createAssetAsync failed:', saveErr?.message || saveErr);
          // Fallback: Share sheet
          try {
            await Share.share({ url: fileUri, title: 'STAN.DOM Card' });
          } catch (shareErr) {
            console.error('[ImageSave] Share fallback also failed:', shareErr);
            Alert.alert('저장 실패', '갤러리 저장에 실패했습니다. 앱 설정에서 저장소 권한을 확인해주세요.');
          }
        }
      } else {
        console.log('[ImageSave] Permission not granted, using Share sheet');
        // Permission denied: show Share sheet as fallback
        try {
          await Share.share({ url: fileUri, title: 'STAN.DOM Card' });
        } catch (shareErr) {
          console.error('[ImageSave] Share fallback failed:', shareErr);
          Alert.alert('저장 실패', '앱 설정에서 저장소 권한을 허용해주세요.');
        }
      }

      // 4. 성공 신호를 웹뷰로 전달
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          window.dispatchEvent(new CustomEvent('image-saved-success'));
          true;
        `);
      }
    } catch (error: any) {
      console.error('[ImageSave] Critical error:', error?.message || error, error?.stack);
      Alert.alert('저장 실패', `이미지 저장 중 문제가 발생했습니다.\n\n오류: ${error?.message || '알 수 없는 오류'}`);
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
            
            // ── Bypassing JSON.parse for large image data to prevent parser memory crashes ──
            if (message && message.startsWith('DOWNLOAD_IMAGE:')) {
              const dataUrl = message.substring('DOWNLOAD_IMAGE:'.length);
              handleImageDownload(dataUrl);
              return;
            }
            
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

            if (message === 'PRELOAD_AD') {
              if (!adLoaded) {
                console.log('광고 프리로드 시작...');
                rewarded.load();
              } else {
                console.log('광고가 이미 로드되어 있습니다. 웹에 재전송합니다.');
                if (webviewRef.current) {
                  webviewRef.current.injectJavaScript(`
                    window.dispatchEvent(new CustomEvent('adLoadedStatus', { detail: { loaded: true } }));
                    true;
                  `);
                }
              }
            } else if (message === 'SHOW_REWARDED_AD') {
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
          allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
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
            window.STAN_DOM_APP_VERSION = "v1.0.5 (v13)";
            
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
