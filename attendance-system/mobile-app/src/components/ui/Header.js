import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity } from 'react-native';
import { Camera, Shield, Settings } from 'lucide-react-native';
import { Theme, Glows } from '../../theme/theme';

export default function Header({ status, onOpenSettings, onStreamFrame, isStreaming }) {
  const sweepAnim = useRef(new Animated.Value(-1)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Sweep animation for the decorative line
    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 2,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation for the status dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim, sweepAnim]);

  const sweepTranslateX = sweepAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-200, 500],
  });

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
        <View style={styles.statusContainer}>
          <Animated.View style={[styles.statusDot, { opacity: pulseAnim }]} />
          <Text style={styles.statusLabel}>{status}</Text>
        </View>
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.green.fixed,
    ...Glows.green,
  },
  statusLabel: {
    color: Theme.colors.green.fixed,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 1,
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
