import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Check, CheckCircle2, User, Clock, ShieldCheck } from 'lucide-react-native';

export default function SuccessState({ employee, onReset }) {
  const { width, height } = useWindowDimensions();
  const [scaleAnim] = useState(() => new Animated.Value(0.7));
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
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto reset to idle screen after 2.8 seconds
    const timer = setTimeout(() => {
      onReset();
    }, 2800);

    return () => clearTimeout(timer);
  }, [onReset, scaleAnim, opacityAnim]);

  const now = new Date();
  const timeString = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={onReset}>
      {/* Success Oval Target Guide */}
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
          <Animated.View style={[styles.checkCircleLarge, { transform: [{ scale: scaleAnim }] }]}>
            <Check color="#FFFFFF" size={42} strokeWidth={3.5} />
          </Animated.View>
        </View>
      </View>

      {/* Modern Glassmorphic Result Card (Clamped max-width) */}
      <View style={styles.resultCardWrapper}>
        <Animated.View 
          style={[
            styles.resultCard,
            { 
              width: Math.min(width * 0.88, 400),
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.statusHeader}>
            <ShieldCheck color="#10B981" size={17} />
            <Text style={styles.statusHeaderText}>ĐIỂM DANH THÀNH CÔNG</Text>
          </View>

          <Text style={styles.employeeName} numberOfLines={1}>
            {employee?.full_name || 'Nhân Viên'}
          </Text>

          <View style={styles.detailsRow}>
            {employee?.employee_id && (
              <View style={styles.detailBadge}>
                <User color="#94A3B8" size={13} />
                <Text style={styles.detailText}>{employee.employee_id}</Text>
              </View>
            )}

            <View style={styles.detailBadge}>
              <Clock color="#94A3B8" size={13} />
              <Text style={styles.detailText}>{timeString} • {dateString}</Text>
            </View>
          </View>

          <View style={styles.recordedBanner}>
            <CheckCircle2 color="#10B981" size={15} />
            <Text style={styles.recordedText}>Đã lưu trữ dữ liệu điểm danh</Text>
          </View>
        </Animated.View>
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
  },
  faceGuideArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalFrame: {
    borderWidth: 3,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 8,
  },
  checkCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  resultCardWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
  },
  resultCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statusHeaderText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  employeeName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 10,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  detailText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  recordedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  recordedText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
});
