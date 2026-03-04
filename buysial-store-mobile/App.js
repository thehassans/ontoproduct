import React, { useRef, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  Text,
  BackHandler,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SITE_URL = 'https://buysial.com';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Handle Android hardware back button
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [canGoBack]);

  const onLoadEnd = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const onError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const retry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#111827" />

      {hasError ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorEmoji}>📡</Text>
          <Text style={styles.errorTitle}>No Connection</Text>
          <Text style={styles.errorMsg}>Please check your internet and try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.8}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <WebView
        ref={webViewRef}
        source={{ uri: SITE_URL }}
        style={hasError ? styles.hidden : styles.webview}
        onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
        onLoadEnd={onLoadEnd}
        onError={onError}
        onHttpError={onError}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#f97316" />
          </View>
        )}
      />

      {isLoading && !hasError && (
        <View style={styles.splash}>
          <Text style={styles.splashTitle}>BuySial</Text>
          <Text style={styles.splashSub}>Premium Shopping</Text>
          <ActivityIndicator size="small" color="#f97316" style={{ marginTop: 24 }} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  webview: {
    flex: 1,
  },
  hidden: {
    flex: 0,
    height: 0,
    opacity: 0,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  splashSub: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  errorWrap: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    backgroundColor: '#f97316',
    borderRadius: 12,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
