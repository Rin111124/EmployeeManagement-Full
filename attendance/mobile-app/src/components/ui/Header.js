import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity } from 'react-native';
import { Camera, Shield, Settings, Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
import { Theme, Glows } from '../../theme/theme';

export default function Header({ 
  status, 
  connectionStatus = 'connected',
  onRetryConnection,
  onOpenSettings, 
  onStreamFrame, 
  isStreaming 
}) {
  const sweepAnim = useRef(new Animated.Value(-1)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const isDisconnected = connectionStatus === 'disconnected';

  useEffect(() => {
    // Sweep animation for the decorative line
    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 2,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation for the status dot (faster if disconnected or connecting)
    const pulseDuration = isDisconnected ? 500 : isConnecting ? 700 : 1200;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: pulseDuration, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: isDisconnected ? 0.2 : 0.5, duration: pulseDuration, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    // Spin animation for connecting icon
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
  }, [pulseAnim, sweepAnim, spinAnim, connectionStatus, isDisconnected, isConnecting]);

  const sweepTranslateX = sweepAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-200, 500],
  });

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Color mapping based on connection state
  const statusColor = isConnected 
    ? Theme.colors.green.container 
    : isConnecting 
      ? Theme.colors.amber.container 
      : Theme.colors.red.tertiary;

  const statusGlow = isConnected 
    ? Glows.green 
    : isConnecting 
      ? Glows.amber 
      : Glows.red;

  const statusBg = isConnected
    ? 'rgba(52, 255, 141, 0.08)'
    : isConnecting
      ? 'rgba(245, 158, 11, 0.12)'
      : 'rgba(255, 51, 102, 0.15)';

  const statusBorderColor = isConnected
    ? 'rgba(52, 255, 141, 0.3)'
    : isConnecting
      ? 'rgba(245, 158, 11, 0.4)'
      : 'rgba(255, 51, 102, 0.5)';

  const displayLabel = isConnected 
    ? (status || 'ONLINE')
    : isConnecting 
      ? 'KẾT NỐI...' 
      : 'MẤT KẾT NỐI';

  return (
    <View style={styles.header}>
      {/* Decorative Sweep Line */}
      <Animated.View 
        style={[
          styles.sweepLine, 
          { transform: [{ translateX: sweepTranslateX }] }
        ]} 
      />

      <View style={styles.leftSection}>
        <Shield 
          color={Theme.colors.cyan.dim} 
          size={28} 
          fill={Theme.colors.cyan.dim} 
        />
        <Text style={styles.brandText}>SECURE-ID</Text>
      </View>

      <View style={styles.rightSection}>
        {/* Status Pill Badge - Clickable to reconnect */}
        <TouchableOpacity 
          style={[
            styles.statusBadge, 
            { backgroundColor: statusBg, borderColor: statusBorderColor },
            statusGlow
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

        <View style={styles.divider} />
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
        </Text>
        <TouchableOpacity onPress={onOpenSettings} style={styles.settingsBtn}>
          <Settings color={Theme.colors.onSurfaceVariant} size={20} />
        </TouchableOpacity>
        {onStreamFrame && (
          <TouchableOpacity
            onPress={onStreamFrame}
            disabled={isStreaming}
            style={[styles.streamBtn, isStreaming && styles.streamBtnDisabled]}
          >
            <Camera color={Theme.colors.cyan.container} size={16} />
            <Text style={styles.streamText}>{isStreaming ? 'SENDING' : 'STREAM'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    paddingTop: 40,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.outlineVariant,
    zIndex: 100,
  },
  sweepLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 150,
    height: 1,
    backgroundColor: Theme.colors.cyan.dim,
    opacity: 0.5,
    ...Glows.cyan,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandText: {
    color: Theme.colors.cyan.dim,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    ...Glows.cyan,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 0.8,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Theme.colors.outlineVariant,
  },
  dateText: {
    color: Theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  settingsBtn: {
    padding: 5,
    marginLeft: 5,
  },
  streamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Theme.colors.cyan.container,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
  },
  streamBtnDisabled: {
    opacity: 0.5,
  },
  streamText: {
    color: Theme.colors.cyan.container,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 1,
  }
});
