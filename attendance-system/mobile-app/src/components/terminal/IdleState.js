import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { User, CheckCircle } from 'lucide-react-native';
import { Theme, Glows } from '../../theme/theme';

const { width } = Dimensions.get('window');

export default function IdleState({ onStartScan }) {
  const [time, setTime] = useState(new Date());
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

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

    return () => clearInterval(timer);
  }, [rotateAnim, scanLineAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.75],
  });

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={onStartScan}>
      {/* Camera Frame Area */}
      <View style={styles.cameraFrame}>
        <View style={styles.gridBackground} />
        
        {/* Corner Brackets */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />

        {/* Center Content */}
        <View style={styles.centerContent}>
          <Animated.View style={[styles.rotatingCircle, { transform: [{ rotate: rotation }] }]} />
          <User color={Theme.colors.cyan.dim} size={80} opacity={0.6} />
          <Text style={styles.frameTitle}>ĐƯA MẶT VÀO KHUNG HÌNH</Text>
        </View>

        {/* Scanning Line */}
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]} />
      </View>

      {/* Clock Area */}
      <View style={styles.clockContainer}>
        <Text style={styles.clockText}>
          {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </Text>
      </View>

      {/* Ready Badge */}
      <View style={styles.readyBadge}>
        <CheckCircle color={Theme.colors.cyan.container} size={32} />
        <Text style={styles.readyText}>HỆ THỐNG SẴN SÀNG</Text>
      </View>
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
  }
});
