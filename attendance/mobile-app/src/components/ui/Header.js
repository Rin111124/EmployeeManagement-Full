import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity } from 'react-native';
import { ScanFace, Settings, Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header({ 
  status, 
  connectionStatus = 'connected',
  onRetryConnection,
  onOpenSettings, 
}) {
  const insets = useSafeAreaInsets();
  const [pulseAnim] = useState(() => new Animated.Value(0.6));
  const [spinAnim] = useState(() => new Animated.Value(0));

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const isDisconnected = connectionStatus === 'disconnected';

  useEffect(() => {
    // Soft pulsing animation for connection indicator
    const pulseDuration = isDisconnected ? 600 : isConnecting ? 800 : 1800;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: pulseDuration, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: isDisconnected ? 0.2 : 0.5, duration: pulseDuration, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    // Spinner animation for connecting status
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
      pulseLoop.stop();
      if (spinLoop) spinLoop.stop();
    };
  }, [pulseAnim, spinAnim, connectionStatus, isDisconnected, isConnecting]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const statusColor = isConnected 
    ? '#10B981' // Emerald
    : isConnecting 
      ? '#F59E0B' // Amber
      : '#EF4444'; // Rose

  const statusBg = isConnected
    ? 'rgba(16, 185, 129, 0.12)'
    : isConnecting
      ? 'rgba(245, 158, 11, 0.15)'
      : 'rgba(239, 68, 68, 0.15)';

  const statusBorder = isConnected
    ? 'rgba(16, 185, 129, 0.25)'
    : isConnecting
      ? 'rgba(245, 158, 11, 0.3)'
      : 'rgba(239, 68, 68, 0.3)';

  const displayLabel = isConnected 
    ? (status === 'SCANNING...' ? 'ĐANG QUÉT' : 'TRỰC TUYẾN')
    : isConnecting 
      ? 'ĐANG KẾT NỐI' 
      : 'MẤT KẾT NỐI';

  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 8, 16) }]}>
      <View style={styles.header}>
        {/* Brand / Title */}
        <View style={styles.leftSection}>
          <View style={styles.logoBadge}>
            <ScanFace color="#38BDF8" size={22} />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={styles.brandTitle} numberOfLines={1}>SECURE KIOSK</Text>
            <Text style={styles.brandSubtitle} numberOfLines={1}>Điểm Danh Khuôn Mặt AI</Text>
          </View>
        </View>

        {/* Status & Actions */}
        <View style={styles.rightSection}>
          {/* Status Pill Badge */}
          <TouchableOpacity 
            style={[
              styles.statusBadge, 
              { backgroundColor: statusBg, borderColor: statusBorder }
            ]}
            onPress={onRetryConnection}
            activeOpacity={0.7}
          >
            {isConnected && <Wifi size={13} color={statusColor} />}
            {isConnecting && (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw size={13} color={statusColor} />
              </Animated.View>
            )}
            {isDisconnected && <WifiOff size={13} color={statusColor} />}

            <Animated.View 
              style={[
                styles.statusDot, 
                { backgroundColor: statusColor, opacity: pulseAnim }
              ]} 
            />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{displayLabel}</Text>
          </TouchableOpacity>

          {/* Settings Button - High Contrast & Guaranteed Visible */}
          <TouchableOpacity 
            onPress={onOpenSettings} 
            style={styles.settingsBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Settings color="#38BDF8" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 40,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  titleWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  rightSection: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
