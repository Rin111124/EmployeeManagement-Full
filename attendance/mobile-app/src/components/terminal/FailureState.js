import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity, useWindowDimensions } from 'react-native';
import { AlertCircle, RotateCcw, UserX } from 'lucide-react-native';

export default function FailureState({ onRetry, error }) {
  const { width, height } = useWindowDimensions();
  const [scaleAnim] = useState(() => new Animated.Value(0.8));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  const isLandscape = width > height;
  const targetOvalHeight = Math.min(Math.max(height * (isLandscape ? 0.35 : 0.38), 190), 320);
  const targetOvalWidth = Math.min(targetOvalHeight * 0.74, width * 0.72);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto retry/reset to idle after 4 seconds
    const timer = setTimeout(() => {
      onRetry();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onRetry, scaleAnim, opacityAnim]);

  return (
    <View style={styles.container}>
      {/* Oval Frame with Red Outline (Camera fully visible behind) */}
      <View style={styles.faceGuideArea}>
        <View 
          style={[
            styles.ovalFrame,
            {
              width: targetOvalWidth,
              height: targetOvalHeight,
              borderRadius: targetOvalWidth / 2,
            }
          ]}
        >
          <Animated.View style={[styles.alertIconBox, { transform: [{ scale: scaleAnim }] }]}>
            <UserX color="#FFFFFF" size={40} strokeWidth={2} />
          </Animated.View>
        </View>
      </View>

      {/* Modern Glassmorphic Alert Card (Clamped max-width) */}
      <View style={styles.alertCardWrapper}>
        <Animated.View 
          style={[
            styles.alertCard,
            {
              width: Math.min(width * 0.88, 400),
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.alertHeader}>
            <AlertCircle color="#EF4444" size={17} />
            <Text style={styles.alertHeaderText}>CHƯA NHẬN DIỆN ĐƯỢC</Text>
          </View>

          <Text style={styles.alertMessage} numberOfLines={2}>
            {error?.message || 'Không tìm thấy khuôn mặt phù hợp'}
          </Text>

          <Text style={styles.alertHint}>
            Vui lòng đứng thẳng, nhìn vào camera và thử lại
          </Text>

          <TouchableOpacity 
            style={styles.retryBtn} 
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <RotateCcw color="#FFFFFF" size={16} />
            <Text style={styles.retryBtnText}>THỬ LẠI NGAY</Text>
          </TouchableOpacity>
        </Animated.View>
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
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  alertIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  alertCardWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
  },
  alertCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  alertHeaderText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  alertMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  alertHint: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 11,
    paddingHorizontal: 26,
    borderRadius: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
