import { StatusBar } from 'expo-status-bar';
import { StyleSheet, BackHandler, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useRef, useEffect, useState } from 'react';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

// 실제 출시 전까지는 구글이 제공하는 테스트 광고 ID를 사용해야 정지를 당하지 않습니다.
const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-xxxxxxxxxxxxx/xxxxxxx';

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
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
            }
          }}
          allowsBackForwardNavigationGestures={true}
          bounces={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          backgroundColor="#000000"
          // User-Agent 뒤에 'STAN_DOM_APP'을 붙여 웹에서 앱 환경인지 인식할 수 있게 함
          userAgent={Platform.OS === 'android' ? 'Chrome/18.0.1025.133 Mobile Safari/535.19 STAN_DOM_APP_ANDROID' : 'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 STAN_DOM_APP_IOS'}
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
