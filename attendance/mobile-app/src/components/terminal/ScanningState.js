import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Image } from 'react-native';
import { ScanFace } from 'lucide-react-native';
import { Theme, Glows } from '../../theme/theme';

const { width } = Dimensions.get('window');

export default function ScanningState() {
  const scanAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scan line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 0.85,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [progressAnim, rotateAnim, scanAnim]);

  const scanLineTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.7],
  });

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Scanning Frame */}
      <View style={styles.scanFrame}>
        <Image 
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKmpTXYoJw6OiSPJfvAQe-Scl5nEFEvLNsJncdabX3F9iJjhpwUtICC-irVFlcnhkNO59IWTHivIxGOLNdCJfYO8NRZ6ICbJ3XvTPyanInfRu31B4CEFtVnu2pvgbCVG3a8x_8qcheXbv2QIeEX4VJTeXqLccvMkImywo_zE3b7iKm-whfhedOXoXzypEL-Kh4iEXZDcQcNuz6taPInZDqGdd76iU6C2tYx8iDqGKxzju7-J5rQTptrNuG1AIJOtANPEK-o0dmgBs' }}
          style={styles.scanPlaceholder}
          blurRadius={5}
        />
        <View style={styles.hudOverlay}>
           {/* Corner Brackets */}
           <View style={[styles.corner, styles.topLeft]} />
           <View style={[styles.corner, styles.topRight]} />
           <View style={[styles.corner, styles.bottomLeft]} />
           <View style={[styles.corner, styles.bottomRight]} />

           <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]} />

           <View style={styles.hudLabels}>
              <Text style={styles.hudText}>ID: UNKNOWN</Text>
              <Text style={styles.hudText}>POS: X42.8 Y91.3</Text>
           </View>
           <View style={styles.hudLabelsBottom}>
              <Text style={styles.hudText}>AQ: 98.4%</Text>
              <Text style={styles.hudText}>TRACKING...</Text>
           </View>
        </View>
      </View>

      {/* Status Center */}
      <View style={styles.statusCenter}>
        <View style={styles.spinnerContainer}>
           <Animated.View style={[styles.spinner, { transform: [{ rotate: rotation }] }]} />
           <ScanFace color={Theme.colors.cyan.container} size={40} />
        </View>

        <View style={styles.progressSection}>
          <Text style={styles.scanningText}>ĐANG NHẬN DIỆN...</Text>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            }) }]} />
          </View>
        </View>
      </View>

      {/* Terminal Footer Info */}
      <View style={styles.dataBadge}>
        <Text style={styles.timeText}>14:28:45.32</Text>
        <View style={styles.dataRow}>
          <Text style={styles.dataText}>ZONE: ALPHA</Text>
          <View style={styles.dataDivider} />
          <Text style={styles.dataText}>NODE: 77X-BETA</Text>
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
  },
  scanFrame: {
    width: width * 0.8,
    height: width * 0.7,
    backgroundColor: '#14141F',
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
    overflow: 'hidden',
    position: 'relative',
  },
  scanPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  hudOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 15,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: Theme.colors.cyan.container,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Theme.colors.cyan.container,
    ...Glows.cyan,
  },
  hudLabels: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  hudLabelsBottom: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    alignItems: 'flex-end',
  },
  hudText: {
    color: Theme.colors.cyan.dim,
    fontSize: 8,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  statusCenter: {
    alignItems: 'center',
    gap: 20,
  },
  spinnerContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Theme.colors.cyan.container,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    opacity: 0.6,
  },
  progressSection: {
    alignItems: 'center',
    gap: 10,
  },
  scanningText: {
    color: Theme.colors.cyan.container,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    ...Glows.cyan,
  },
  progressBarBg: {
    width: 250,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Theme.colors.cyan.container,
    ...Glows.cyan,
  },
  dataBadge: {
    backgroundColor: '#14141F',
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
    width: width * 0.85,
  },
  timeText: {
    color: Theme.colors.onSurface,
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginTop: 5,
  },
  dataText: {
    color: Theme.colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  dataDivider: {
    width: 1,
    height: 10,
    backgroundColor: Theme.colors.outlineVariant,
  }
});
