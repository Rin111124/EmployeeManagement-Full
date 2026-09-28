import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { User, CheckCircle, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react-native';
import { Theme, Glows } from '../../theme/theme';

const { width } = Dimensions.get('window');

export default function IdleState({ 
  onStartScan, 
  connectionStatus = 'connected', 
  serverHost = '', 
  onRetryConnection 
}) {
  const [time, setTime] = useState(new Date());
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const alertPulseAnim = useRef(new Animated.Value(1)).current;

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const isDisconnected = connectionStatus === 'disconnected';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();

    // Scanning line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();

    // Spin animation for connecting
    let spinLoop;
    if (isConnecting) {
      spinLoop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      );
      spinLoop.start();
    } else {
      spinAnim.setValue(0);
    }

    // Alert pulse for disconnected state
    let alertLoop;
    if (isDisconnected) {
      alertLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(alertPulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(alertPulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      alertLoop.start();
    } else {
      alertPulseAnim.setValue(1);
    }

    return () => {
      clearInterval(timer);
      if (spinLoop) spinLoop.stop();
      if (alertLoop) alertLoop.stop();
    };
  }, [rotateAnim, scanLineAnim, spinAnim, alertPulseAnim, connectionStatus, isConnecting, isDisconnected]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.75],
  });

  // Dynamic Theme Colors based on connection
  const frameBorderColor = isConnected 
    ? Theme.colors.cyan.container 
    : isConnecting 
      ? Theme.colors.amber.container 
      : Theme.colors.red.tertiary;

  const frameGlow = isConnected 
    ? Glows.cyan 
    : isConnecting 
      ? Glows.amber 
      : Glows.red;

  const badgeBg = isConnected
    ? '#14141F'
    : isConnecting
      ? 'rgba(245, 158, 11, 0.12)'
      : 'rgba(255, 51, 102, 0.15)';

  const badgeBorderColor = isConnected
    ? Theme.colors.outlineVariant
    : isConnecting
      ? Theme.colors.amber.container
      : Theme.colors.red.tertiary;

  const handleMainPress = () => {
    if (isDisconnected) {
      if (onRetryConnection) onRetryConnection();
    } else {
      if (onStartScan) onStartScan();
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={1} 
      onPress={handleMainPress}
    >
      {/* Camera Frame Area */}
      <View style={[styles.cameraFrame, { borderColor: frameBorderColor }, frameGlow]}>
        <View style={styles.gridBackground} />
        
        {/* Warning Banner inside camera frame when disconnected */}
        {isDisconnected && (
          <Animated.View style={[styles.bannerContainer, { opacity: alertPulseAnim }]}>
            <View style={styles.disconnectedBanner}>
              <AlertTriangle color={Theme.colors.red.tertiary} size={15} />
              <Text style={styles.disconnectedBannerText}>
                MÁY CHỦ NGOẠI TUYẾN ({serverHost || 'LAN'})
              </Text>
            </View>
          </Animated.View>
        )}

        {isConnecting && (
          <View style={styles.bannerContainer}>
            <View style={styles.connectingBanner}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw color={Theme.colors.amber.container} size={13} />
              </Animated.View>
              <Text style={styles.connectingBannerText}>
                ĐANG KẾT NỐI TỚI {serverHost || 'MÁY CHỦ'}...
              </Text>
            </View>
          </View>
        )}

        {/* Corner Brackets */}
        <View style={[styles.corner, styles.topLeft, { borderColor: frameBorderColor }]} />
        <View style={[styles.corner, styles.topRight, { borderColor: frameBorderColor }]} />
        <View style={[styles.corner, styles.bottomLeft, { borderColor: frameBorderColor }]} />
        <View style={[styles.corner, styles.bottomRight, { borderColor: frameBorderColor }]} />

        {/* Center Content */}
        <View style={styles.centerContent}>
          <Animated.View style={[styles.rotatingCircle, { transform: [{ rotate: rotation }] }]} />
          {isDisconnected ? (
            <AlertTriangle color={Theme.colors.red.tertiary} size={80} opacity={0.8} />
          ) : (
            <User color={Theme.colors.cyan.dim} size={80} opacity={0.6} />
          )}
          
          <Text style={[
            styles.frameTitle, 
            isDisconnected && { color: Theme.colors.red.tertiary },
            isConnecting && { color: Theme.colors.amber.container }
          ]}>
            {isDisconnected 
              ? 'MẤT KẾT NỐI VỚI SERVER' 
              : isConnecting 
                ? 'ĐANG THIẾT LẬP KẾT NỐI' 
                : 'ĐƯA MẶT VÀO KHUNG HÌNH'}
          </Text>
          {isDisconnected && (
            <Text style={styles.frameSubtitle}>
              Chạm vào màn hình để kết nối lại
            </Text>
          )}
        </View>

        {/* Scanning Line (only when connected/connecting) */}
        {!isDisconnected && (
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]} />
        )}
      </View>

      {/* Clock Area */}
      <View style={styles.clockContainer}>
        <Text style={styles.clockText}>
          {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </Text>
      </View>

      {/* Ready Badge / Connection Action Badge */}
      <TouchableOpacity 
        style={[
          styles.readyBadge, 
          { backgroundColor: badgeBg, borderColor: badgeBorderColor },
          frameGlow
        ]}
        onPress={handleMainPress}
        activeOpacity={0.7}
      >
        {isConnected && (
          <>
            <CheckCircle color={Theme.colors.cyan.container} size={28} />
            <View style={styles.badgeTextCol}>
              <Text style={styles.readyText}>HỆ THỐNG SẴN SÀNG</Text>
              <Text style={styles.readySubtext}>CHẠM ĐỂ BẮT ĐẦU ĐIỂM DANH</Text>
            </View>
          </>
        )}

        {isConnecting && (
          <>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw color={Theme.colors.amber.container} size={28} />
            </Animated.View>
            <View style={styles.badgeTextCol}>
              <Text style={[styles.readyText, { color: Theme.colors.amber.container }]}>
                ĐANG KẾT NỐI MÁY CHỦ...
              </Text>
              <Text style={[styles.readySubtext, { color: Theme.colors.amber.dim }]}>
                ĐANG LIÊN LẠC {serverHost || 'SERVER'}:5000
              </Text>
            </View>
          </>
        )}

        {isDisconnected && (
          <>
            <Animated.View style={{ opacity: alertPulseAnim }}>
              <WifiOff color={Theme.colors.red.tertiary} size={28} />
            </Animated.View>
            <View style={styles.badgeTextCol}>
              <Text style={[styles.readyText, { color: Theme.colors.red.tertiary }]}>
                MẤT KẾT NỐI MÁY CHỦ
              </Text>
              <Text style={[styles.readySubtext, { color: Theme.colors.red.container }]}>
                CHẠM VÀO ĐÂY ĐỂ THỬ LẠI KẾT NỐI
              </Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  cameraFrame: {
    width: width * 0.85,
    height: width * 0.85,
    backgroundColor: '#14141F',
    borderWidth: 2,
    borderColor: Theme.colors.cyan.container,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...Glows.cyan,
  },
  gridBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    // Native doesn't support svg patterns easily, so we use a simple grid effect
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Theme.colors.cyan.container,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5 },
  topRight: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5 },
  centerContent: {
    alignItems: 'center',
    gap: 15,
  },
  rotatingCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    borderStyle: 'dashed',
  },
  frameTitle: {
    color: Theme.colors.cyan.container,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
    textAlign: 'center',
    ...Glows.cyan,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Theme.colors.cyan.container,
    opacity: 0.5,
    ...Glows.cyan,
  },
  clockContainer: {
    alignItems: 'center',
  },
  clockText: {
    color: Theme.colors.cyan.dim,
    fontSize: 80,
    fontWeight: '800',
    fontFamily: 'monospace',
    ...Glows.cyan,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: '#14141F',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
    ...Glows.cyan,
  },
  readyText: {
    color: Theme.colors.cyan.container,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    ...Glows.cyan,
  },
  bannerContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    alignItems: 'center',
  },
  disconnectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: Theme.colors.red.tertiary,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disconnectedBannerText: {
    color: Theme.colors.red.tertiary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  connectingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 179, 0, 0.2)',
    borderWidth: 1,
    borderColor: Theme.colors.amber.container,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  connectingBannerText: {
    color: Theme.colors.amber.container,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  frameSubtitle: {
    color: Theme.colors.red.container,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: -5,
  },
  badgeTextCol: {
    flexDirection: 'column',
  },
  readySubtext: {
    color: Theme.colors.cyan.dim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'monospace',
    marginTop: 2,
  },
});
