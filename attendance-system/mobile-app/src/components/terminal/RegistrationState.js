import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, CheckCircle, Fingerprint, User } from 'lucide-react-native';
import { Theme, Glows } from '../../theme/theme';
import { attendanceApi } from '../../services/api';

const { width } = Dimensions.get('window');

const STEPS = [
  { id: 'CENTER', label: 'NHIN THANG', detail: 'Vui long nhin truc dien vao camera' },
  { id: 'LEFT', label: 'QUAY TRAI', detail: 'Nghieng mat sang trai 30 do' },
  { id: 'RIGHT', label: 'QUAY PHAI', detail: 'Nghieng mat sang phai 30 do' },
  { id: 'UP', label: 'NHIN LEN', detail: 'Nguoc mat len tren mot chut' },
];

const getEmployeeName = (employee) =>
  employee?.full_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim();

const getEmployeeId = (employee) => employee?._id || employee?.employee_id || employee?.employee_code;

export default function RegistrationState({ employee, terminalId, captureEmbedding, onCancel, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  const handleFinalizeRegistration = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const employeeId = getEmployeeId(employee);
      const fullName = getEmployeeName(employee);

      if (!employeeId) {
        throw new Error('Missing employee id');
      }
      if (!captureEmbedding) {
        throw new Error('Camera capture is not available');
      }

      // The four visual steps are a positioning guide; one embedding is captured
      // after the guide completes. Multi-angle enrollment can average per-step captures.
      const embedding = await captureEmbedding();

      await attendanceApi.enrollFace(employeeId, fullName, embedding, terminalId);
      setIsFinished(true);
    } catch (err) {
      setError(err?.message || 'Loi khi luu du lieu dang ky');
    } finally {
      setIsSaving(false);
    }
  }, [captureEmbedding, employee, terminalId]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (isFinished || isSaving || error) return undefined;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 100) return prev + 5;

        if (currentStep < STEPS.length - 1) {
          setCurrentStep((step) => step + 1);
          return 0;
        }

        clearInterval(interval);
        handleFinalizeRegistration();
        return 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStep, error, handleFinalizeRegistration, isFinished, isSaving]);

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: progress,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [barWidth, progress]);

  if (isFinished) {
    return (
      <View style={styles.container}>
        <View style={styles.successBox}>
          <CheckCircle color={Theme.colors.green.container} size={80} />
          <Text style={styles.successTitle}>DANG KY THANH CONG</Text>
          <Text style={styles.successDetail}>
            Nhan vien: {getEmployeeName(employee)}
            {'\n'}
            Du lieu khuon mat da duoc luu tru an toan tai may.
          </Text>
          <TouchableOpacity style={styles.finishBtn} onPress={onComplete}>
            <Text style={styles.finishBtnText}>HOAN TAT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.successBox}>
          <AlertCircle color="#FF4444" size={80} />
          <Text style={[styles.successTitle, styles.errorTitle]}>LOI DANG KY</Text>
          <Text style={styles.successDetail}>{error}</Text>
          <TouchableOpacity style={[styles.finishBtn, styles.errorBtn]} onPress={onCancel}>
            <Text style={styles.finishBtnText}>QUAY LAI</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.employeeHeader}>
        <Text style={styles.registeringText}>DANG DANG KY CHO:</Text>
        <Text style={styles.employeeNameText}>{getEmployeeName(employee)}</Text>
        <Text style={styles.employeeIdText}>ID: {getEmployeeId(employee)}</Text>
      </View>

      <View style={styles.enrollFrame}>
        <Animated.View style={[styles.guideCircle, { transform: [{ scale: pulseAnim }] }]} />
        <View style={styles.hudOverlay}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          <View style={styles.stepIndicator}>
            <Fingerprint color={Theme.colors.green.container} size={24} />
            <Text style={styles.stepText}>STEP {currentStep + 1}/{STEPS.length}</Text>
          </View>
        </View>
        <User color={Theme.colors.onSurface} size={120} opacity={0.3} />

        {isSaving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator color={Theme.colors.green.container} size="large" />
            <Text style={styles.savingText}>DANG MA HOA...</Text>
          </View>
        )}
      </View>

      <View style={styles.guideContent}>
        <Text style={styles.guideTitle}>{STEPS[currentStep].label}</Text>
        <Text style={styles.guideDetail}>{STEPS[currentStep].detail}</Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: barWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }) }]} />
          </View>
          <Text style={styles.percentageText}>{progress}%</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelBtnText}>HUY BO</Text>
      </TouchableOpacity>
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
  employeeHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  registeringText: {
    color: Theme.colors.onSurfaceVariant,
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  employeeNameText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  employeeIdText: {
    color: Theme.colors.green.container,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  enrollFrame: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    borderWidth: 2,
    borderColor: Theme.colors.green.container,
    backgroundColor: 'rgba(52, 255, 141, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Glows.green,
  },
  guideCircle: {
    position: 'absolute',
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: (width * 0.55) / 2,
    borderWidth: 1,
    borderColor: 'rgba(96, 255, 153, 0.3)',
    borderStyle: 'dashed',
  },
  hudOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    borderRadius: (width * 0.7) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 20,
  },
  savingText: {
    color: Theme.colors.green.container,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: Theme.colors.green.container,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    top: 20,
    left: 20,
  },
  stepText: {
    color: Theme.colors.green.container,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  guideContent: {
    alignItems: 'center',
    gap: 5,
    width: '80%',
  },
  guideTitle: {
    color: Theme.colors.green.container,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    ...Glows.green,
  },
  guideDetail: {
    color: Theme.colors.onSurfaceVariant,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  progressContainer: {
    width: '100%',
    marginTop: 10,
    alignItems: 'center',
    gap: 5,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Theme.colors.green.container,
    ...Glows.green,
  },
  percentageText: {
    color: Theme.colors.green.container,
    fontSize: 9,
    fontFamily: 'monospace',
  },
  cancelBtn: {
    padding: 10,
  },
  cancelBtnText: {
    color: Theme.colors.onSurfaceVariant,
    fontSize: 11,
    letterSpacing: 2,
    textDecorationLine: 'underline',
  },
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 30,
  },
  successTitle: {
    color: Theme.colors.green.container,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    ...Glows.green,
  },
  successDetail: {
    color: Theme.colors.onSurfaceVariant,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  finishBtn: {
    marginTop: 20,
    backgroundColor: Theme.colors.green.container,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 2,
    ...Glows.green,
  },
  finishBtnText: {
    color: Theme.colors.background,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 2,
  },
  errorTitle: {
    color: '#FF4444',
  },
  errorBtn: {
    backgroundColor: '#FF4444',
  },
});
