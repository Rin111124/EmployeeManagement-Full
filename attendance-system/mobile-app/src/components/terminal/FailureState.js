import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Image, Dimensions, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { Theme, Glows } from '../../theme/theme';

const { width } = Dimensions.get('window');

export default function FailureState({ onRetry, error }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, [scaleAnim, scanLineAnim]);

  return (
    <View style={styles.container}>
      {/* Error Frame Section */}
      <View style={styles.errorFrame}>
        <Image 
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcVhNkJo_SVH_TyOGdkmiuXVIkDsXRIsvHSB_BJAwehARoCBkA9ls9i51wst4zsrc5ikHOAYSFB3nq3ViiXj8fwhl4ibHFr3ATSfyxuLVzaoGQ8WZupluVqug7hBXSnRojCrjpeBR4IJMO_3J6PcKLzFTGslrUg6iN2hpawOFWNeEr2SYeDcdJ1tyWEUD_8rMF2XxaBF-ayZE3zZz6RB8_a1U8B0DTMpe2BF1GDiPXp5QmWjTDD-PeV2YhvFlPh4aNnD_x4hqzzVc' }}
          style={styles.errorPlaceholder}
          blurRadius={10}
        />
        
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 300]
        }) }] }]} />

        <Animated.View style={[styles.xContainer, { transform: [{ scale: scaleAnim }] }]}>
           <X color={Theme.colors.red.tertiary} size={150} strokeWidth={1} />
        </Animated.View>

        {/* Corner Brackets */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>

      {/* Error Text Section */}
      <View style={styles.errorTextSection}>
         <View style={styles.errorBox}>
            <View style={styles.errorLineTop} />
            <Text style={styles.errorTitle}>{error?.message || 'KHÔNG NHẬN DIỆN ĐƯỢC'}</Text>
            <View style={styles.errorDetails}>
               <Text style={styles.errorCode}>ERROR CODE: {error?.code || '0x??'}</Text>
               <Text style={styles.errorHint}>Thử lại hoặc liên hệ quản trị viên</Text>
            </View>

            <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
               <Text style={styles.retryBtnText}>THỬ LẠI</Text>
            </TouchableOpacity>
         </View>

         {/* Local Clock Secondary */}
         <View style={styles.clockContainer}>
            <Text style={styles.clockLabel}>GIỜ ĐỊA PHƯƠNG</Text>
            <Text style={styles.clockTime}>14:42:09</Text>
            <Text style={styles.clockDate}>24 THÁNG 10, 2023</Text>
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
    justifyContent: 'space-between',
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 51, 102, 0.05)',
  },
  errorFrame: {
    width: width * 0.75,
    height: width * 0.75,
    backgroundColor: '#14141F',
    borderWidth: 2,
    borderColor: Theme.colors.red.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...Glows.red,
  },
  errorPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Theme.colors.red.tertiary,
    opacity: 0.2,
    ...Glows.red,
  },
  xContainer: {
    zIndex: 10,
    ...Glows.red,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: Theme.colors.red.tertiary,
    margin: 10,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  topRight: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  errorTextSection: {
    alignItems: 'center',
    gap: 30,
    width: '100%',
  },
  errorBox: {
    width: '85%',
    backgroundColor: '#14141F',
    padding: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
    alignItems: 'center',
    gap: 20,
    ...Glows.red,
  },
  errorLineTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Theme.colors.red.tertiary,
  },
  errorTitle: {
    color: Theme.colors.red.tertiary,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
    ...Glows.red,
  },
  errorDetails: {
    alignItems: 'center',
    gap: 5,
  },
  errorCode: {
    color: 'rgba(255, 51, 102, 0.6)',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  errorHint: {
    color: Theme.colors.onSurfaceVariant,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  retryBtn: {
    marginTop: 10,
    width: '100%',
    height: 60,
    borderWidth: 2,
    borderColor: Theme.colors.red.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Glows.red,
  },
  retryBtnText: {
    color: Theme.colors.red.tertiary,
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  clockContainer: {
    alignItems: 'center',
    gap: 5,
  },
  clockLabel: {
    color: Theme.colors.outline,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  clockTime: {
    color: Theme.colors.onSurface,
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    ...Glows.red,
  },
  clockDate: {
    color: Theme.colors.outlineVariant,
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: 1,
  }
});
