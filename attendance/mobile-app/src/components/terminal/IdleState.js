import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity, useWindowDimensions } from 'react-native';
import { ScanFace, WifiOff, RefreshCw, Sparkles } from 'lucide-react-native';

export default function IdleState({ 
  onStartScan, 
  connectionStatus = 'connected', 
  serverHost = '', 
  onRetryConnection 
}) {
  const { width, height } = useWindowDimensions();
  const [time, setTime] = useState(new Date());
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [spinAnim] = useState(() => new Animated.Value(0));

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const isDisconnected = connectionStatus === 'disconnected';

  // Responsive oval dimensions: never overflow screen, adapt for tablet & landscape
  const isLandscape = width > height;
  const minOvalHeight = height < 500 ? 130 : 190;
  const targetOvalHeight = Math.min(Math.max(height * (isLandscape ? 0.35 : 0.38), minOvalHeight), 320);
  const targetOvalWidth = Math.min(targetOvalHeight * 0.74, width * 0.72);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);

    // Soft breathing pulse animation for the face oval guide
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

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

    return () => {
      clearInterval(timer);
      pulseLoop.stop();
      if (spinLoop) spinLoop.stop();
    };
  }, [pulseAnim, spinAnim, isConnecting]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handlePress = () => {
    if (isDisconnected) {
      if (onRetryConnection) onRetryConnection();
    } else {
      if (onStartScan) onStartScan();
    }
  };

  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(time);

  const ovalBorderColor = isConnected 
    ? 'rgba(56, 189, 248, 0.7)' // Sky blue
    : isConnecting 
      ? 'rgba(245, 158, 11, 0.7)' 
      : 'rgba(239, 68, 68, 0.7)';

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={1} 
      onPress={handlePress}
    >
      {/* Modern Oval Face Biometric Guide (Responsive clamping) */}
      <View style={styles.faceGuideArea}>
        <Animated.View 
          style={[
            styles.ovalFrame, 
            { 
              width: targetOvalWidth,
              height: targetOvalHeight,
              borderRadius: targetOvalWidth / 2,
              borderColor: ovalBorderColor,
              transform: [{ scale: pulseAnim }]
            }
          ]}
        >
          {/* Subtle Corner Brackets for alignment */}
          <View style={[styles.cornerMark, styles.cornerTL, { top: targetOvalHeight * 0.1, left: targetOvalWidth * 0.05 }]} />
          <View style={[styles.cornerMark, styles.cornerTR, { top: targetOvalHeight * 0.1, right: targetOvalWidth * 0.05 }]} />
          <View style={[styles.cornerMark, styles.cornerBL, { bottom: targetOvalHeight * 0.1, left: targetOvalWidth * 0.05 }]} />
          <View style={[styles.cornerMark, styles.cornerBR, { bottom: targetOvalHeight * 0.1, right: targetOvalWidth * 0.05 }]} />

          {/* Guide Chip */}
          <View style={styles.guideChip}>
            <Sparkles color="#38BDF8" size={12} />
            <Text style={styles.guideChipText}>
              {isDisconnected ? 'MẤT KẾT NỐI' : isConnecting ? 'ĐANG ĐỒNG BỘ...' : 'HƯỚNG MẶT VÀO KHUNG'}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Clock & Date Section */}
      <View style={styles.clockSection}>
        <Text style={[styles.clockTime, height < 700 && { fontSize: 38 }]}>
          {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </Text>
        <Text style={styles.clockDate}>{formattedDate}</Text>
      </View>

      {/* Action Check-in Card (Responsive max width) */}
      <View style={styles.actionCardWrapper}>
        <TouchableOpacity 
          style={[
            styles.actionCard,
            { width: Math.min(width * 0.88, 380) },
            isDisconnected && styles.actionCardDanger,
            isConnecting && styles.actionCardWarning
          ]}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          {isConnected && (
            <>
              <View style={styles.actionIconBox}>
                <ScanFace color="#10B981" size={24} />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>CHẠM ĐỂ ĐIỂM DANH</Text>
                <Text style={styles.actionSubtitle}>Nhận diện khuôn mặt tức thì</Text>
              </View>
            </>
          )}

          {isConnecting && (
            <>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <RefreshCw color="#F59E0B" size={22} />
                </Animated.View>
              </View>
              <View style={styles.actionTextBox}>
                <Text style={[styles.actionTitle, { color: '#F59E0B' }]}>ĐANG KẾT NỐI MÁY CHỦ</Text>
                <Text style={styles.actionSubtitle}>Vui lòng chờ trong giây lát...</Text>
              </View>
            </>
          )}

          {isDisconnected && (
            <>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <WifiOff color="#EF4444" size={22} />
              </View>
              <View style={styles.actionTextBox}>
                <Text style={[styles.actionTitle, { color: '#EF4444' }]}>MẤT KẾT NỐI MÁY CHỦ</Text>
                <Text style={styles.actionSubtitle}>Chạm vào đây để kết nối lại</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 10,
    zIndex: 20,
    elevation: 20,
  },
  faceGuideArea: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 21,
    elevation: 21,
  },
  ovalFrame: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 16,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  cornerMark: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#38BDF8',
  },
  cornerTL: {
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  guideChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  guideChipText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clockSection: {
    alignItems: 'center',
    zIndex: 22,
    elevation: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  clockTime: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    zIndex: 24,
    elevation: 24,
  },
  clockDate: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'capitalize',
    zIndex: 24,
    elevation: 24,
  },
  actionCardWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
    zIndex: 22,
    elevation: 22,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  actionCardWarning: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    shadowColor: '#F59E0B',
  },
  actionCardDanger: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    shadowColor: '#EF4444',
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextBox: {
    flexDirection: 'column',
    flex: 1,
    zIndex: 23,
    elevation: 23,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    zIndex: 24,
    elevation: 24,
  },
  actionSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    zIndex: 24,
    elevation: 24,
  },
});
