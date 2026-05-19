import { StatusBar } from 'expo-status-bar';
import { StyleSheet, BackHandler, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useRef, useEffect, useState } from 'react';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

// 개발 환경에서는 테스트 광고, 프로덕션에서는 실제 애드몹 광고를 노출합니다.
const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-7904032658716092/1586676306';

const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  keywords: ['music', 'kpop', 'entertainment'],
});

export default function App() {
  const webviewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);

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

  // 2. 안드로이드 뒤로가기 버튼 처리
  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true; // 앱 종료 방지
      }
      return false; // 첫 화면이면 앱 종료
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [canGoBack]);

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
          backgroundColor="#000000"
          onConsoleMessage={(event) => {
            console.log('[Web Console]', event.nativeEvent.message);
          }}
          // 깨끗한 기본 User-Agent를 사용하고, window 전역에 앱 환경 플래그를 사전에 주입하여 YouTube 임베드 재생 및 구글 로그인 오류를 원천 방지합니다.
          injectedJavaScriptBeforeContentLoaded={`
            window.isAppEnv = true;
            window.STAN_DOM_APP = true;
            true;
          `}
          // 유튜브의 악랄한 WebView 차단 로직(0:00 멈춤)을 우회하기 위해 순수 모바일 브라우저로 위장합니다. (구글 로그인 오류 방지를 위해 뒤에 커스텀 텍스트는 빼고 순정 텍스트만 넣습니다.)
          userAgent={Platform.OS === 'android' 
            ? 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' 
            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'}
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
