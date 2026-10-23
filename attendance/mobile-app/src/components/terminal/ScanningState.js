import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Animated, ActivityIndicator, useWindowDimensions } from 'react-native';
import { ScanFace } from 'lucide-react-native';

export default function ScanningState() {
  const { width, height } = useWindowDimensions();
  const [scanLineAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  const isLandscape = width > height;
  const targetOvalHeight = Math.min(Math.max(height * (isLandscape ? 0.35 : 0.38), 190), 320);
  const targetOvalWidth = Math.min(targetOvalHeight * 0.74, width * 0.72);

  useEffect(() => {
    // Scanning beam up and down animation
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    scanLoop.start();

    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
    };
  }, [scanLineAnim, pulseAnim]);

  const scanTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, targetOvalHeight - 32],
  });

  return (
    <View style={styles.container}>
      {/* Oval Frame with Scanning Beam (Camera fully visible behind) */}
      <View style={styles.faceGuideArea}>
        <Animated.View 
          style={[
            styles.ovalFrame,
            { 
              width: targetOvalWidth,
              height: targetOvalHeight,
              borderRadius: targetOvalWidth / 2,
              transform: [{ scale: pulseAnim }] 
            }
          ]}
        >
          {/* Scanning Beam */}
          <Animated.View 
            style={[
              styles.scanBeam, 
              { transform: [{ translateY: scanTranslateY }] }
            ]} 
          />

          <View style={styles.scanningBadge}>
            <ScanFace color="#10B981" size={14} />
            <Text style={styles.scanningBadgeText}>ĐANG QUÉT KHUÔN MẶT</Text>
          </View>
        </Animated.View>
      </View>

      {/* Status Card (Clamped responsive max width) */}
      <View style={styles.statusCardWrapper}>
        <View style={[styles.statusCard, { width: Math.min(width * 0.88, 380) }]}>
          <ActivityIndicator size="small" color="#10B981" />
          <View style={styles.statusTextBox}>
            <Text style={styles.statusTitle}>Đang phân tích đặc trưng...</Text>
            <Text style={styles.statusSubtitle}>Vui lòng giữ yên và nhìn vào camera</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 10,
  },
  faceGuideArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalFrame: {
    borderWidth: 3,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 16,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  scanBeam: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#34D399',
    borderRadius: 2,
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  scanningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  scanningBadgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusCardWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  statusTextBox: {
    flexDirection: 'column',
    flex: 1,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  statusSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
