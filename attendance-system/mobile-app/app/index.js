import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Theme } from '../src/theme/theme';
import { aiApi, attendanceApi, deviceApi, getDefaultApiConfig, hasConfiguredApiEnv, updateApiConfig } from '../src/services/api';
import { initSocket, disconnectSocket, getSocket } from '../src/services/socket';

// Import các thành phần
import Header from '../src/components/ui/Header';
import Footer from '../src/components/ui/Footer';
import IdleState from '../src/components/terminal/IdleState';
import ScanningState from '../src/components/terminal/ScanningState';
import SuccessState from '../src/components/terminal/SuccessState';
import FailureState from '../src/components/terminal/FailureState';
import SettingsModal from '../src/components/terminal/SettingsModal';
import RegistrationState from '../src/components/terminal/RegistrationState';
import EmployeeRegistrationModal from '../src/components/terminal/EmployeeRegistrationModal';

const TerminalState = {
  IDLE: 'IDLE',
  SCANNING: 'SCANNING',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  REGISTRATION: 'REGISTRATION',
  WAITING_FOR_APPROVAL: 'WAITING_FOR_APPROVAL'
};

const SYSTEM_INFO = {
  id: 'CAM-042',
  ip: getDefaultApiConfig().adminUrl.replace(/^https?:\/\//, '').split(':')[0],
  port: '8080',
  status: 'OPERATIONAL',
  gate: '1'
};

const DEFAULT_CONFIG = {
  ...getDefaultApiConfig(),
  terminalId: 'CAM-042',
};

const CONFIG_STORAGE_KEY = 'terminal_runtime_config_v1';
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const debugLog = (...args) => {
  if (isDev) console.log(...args);
};

const getPersistableConfig = (value) => {
  const { aiApiKey: _aiApiKey, ...safeConfig } = value || {};
  return safeConfig;
};

const mapErrorCode = (message = '') => {
  const normalized = String(message).toLowerCase();
  if (normalized.includes('ai service')) return '0x31';
  if (normalized.includes('attendance service')) return '0x32';
  if (normalized.includes('network error') || normalized.includes('khong the ket noi')) return '0x30';
  return '0x03';
};

export default function Index() {
  const router = useRouter();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState(TerminalState.IDLE);
  const [error, setError] = useState(null);
  const [recognizedEmployee, setRecognizedEmployee] = useState(null);
  const [systemInfo, setSystemInfo] = useState(SYSTEM_INFO);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isRegModalVisible, setIsRegModalVisible] = useState(false);
  const [registrationConfig, setRegistrationConfig] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isStreamingFrame, setIsStreamingFrame] = useState(false);

  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    const loadSavedConfig = async () => {
      try {
        const raw = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;
        setConfig((prev) => ({
          ...prev,
          ...(hasConfiguredApiEnv() ? {} : parsed),
          aiApiKey: prev.aiApiKey || '',
        }));
      } catch (_e) {
        // Ignore invalid config and keep defaults.
      }
    };

    loadSavedConfig();
  }, []);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  // Đồng bộ cấu hình ngay khi config thay đổi
  useEffect(() => {
    updateApiConfig({
      adminUrl: config.adminUrl,
      aiServiceUrl: config.aiServiceUrl,
      attendanceUrl: config.attendanceUrl,
      aiApiKey: config.aiApiKey
    });

    // Cập nhật thông tin hiển thị ở Footer
    const currentIp = config.adminUrl.replace(/^https?:\/\//, '').split(':')[0];
    setSystemInfo(prev => ({ ...prev, ip: currentIp }));

    AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(getPersistableConfig(config))).catch(() => { });
    
    // Khởi tạo socket khi adminUrl thay đổi
    initSocket(config.adminUrl);

    return () => disconnectSocket();
  }, [config]);

  const captureEmbedding = async () => {
    if (!cameraRef.current?.takePictureAsync) {
      throw new Error('Camera is not ready');
    }

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.7,
      base64: false,
      skipProcessing: true,
    });

    const result = await aiApi.extractFeatures(photo.uri);
    if (!Array.isArray(result?.embedding)) {
      throw new Error('AI service did not return an embedding');
    }

    return result.embedding;
  };

  const startScan = async () => {
    setState(TerminalState.SCANNING);
    setError(null);
    setRecognizedEmployee(null);
    setSystemInfo(prev => ({ ...prev, status: 'SCANNING' }));

    try {
      // Trong thực tế sẽ capture frame từ CameraView ở đây
      const embedding = await captureEmbedding();

      const result = await attendanceApi.recognizeAndCheck(embedding, config.terminalId);

      if (result.success) {
        setRecognizedEmployee(result.employee);
        setState(TerminalState.SUCCESS);
        setSystemInfo(prev => ({ ...prev, status: 'OPERATIONAL' }));
      }
    } catch (err) {
      const message = err?.message || 'Khong nhan dien duoc khuon mat';
      setError({ code: mapErrorCode(message), message });
      setState(TerminalState.FAILURE);
      setSystemInfo(prev => ({ ...prev, status: 'ERROR' }));
    }
  };

  const streamFrameOnce = async () => {
    if (isStreamingFrame) return;
    if (!cameraRef.current?.takePictureAsync) {
      setError({ code: '0x06', message: 'Camera is not ready' });
      setState(TerminalState.FAILURE);
      return;
    }

    setIsStreamingFrame(true);
    setSystemInfo(prev => ({ ...prev, status: 'STREAMING' }));

    try {
      await deviceApi.ensureAccess(config);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.18,
        base64: false,
        skipProcessing: true,
      });

      if (!photo?.uri) {
        throw new Error('Camera did not return a frame');
      }

      await deviceApi.uploadStreamFrame({
        imageUri: photo.uri,
        terminalId: config.terminalId,
        capturedAt: new Date().toISOString(),
      }, config);

      debugLog('[STREAM] Manual frame uploaded');
      setSystemInfo(prev => ({ ...prev, status: 'OPERATIONAL' }));
    } catch (err) {
      const message = err?.message || 'Khong gui duoc stream frame';
      setError({ code: mapErrorCode(message), message });
      setState(TerminalState.FAILURE);
      setSystemInfo(prev => ({ ...prev, status: 'ERROR' }));
    } finally {
      setIsStreamingFrame(false);
    }
  };

  // Socket Listener cho việc phê duyệt thời gian thực.
  // Dùng getSocket() thay vì initSocket() để tránh ngắt kết nối và tạo socket mới
  // mỗi khi state/selectedEmployee thay đổi (BUG-8 fix).
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (data) => {
      debugLog('[SOCKET] Received biometric-approved:', data);
      if (
        state === TerminalState.WAITING_FOR_APPROVAL &&
        selectedEmployee &&
        (selectedEmployee._id === data.employee_id || selectedEmployee.employee_id === data.employee_id)
      ) {
        debugLog('[SOCKET] Match found! Transitioning to REGISTRATION');
        setState(TerminalState.REGISTRATION);
      }
    };

    socket.on('biometric-approved', handler);
    return () => {
      socket.off('biometric-approved', handler);
    };
  }, [state, selectedEmployee]);

  const handleStartRegistration = (nextConfig) => {
    if (nextConfig) {
      setConfig(nextConfig);
      setRegistrationConfig(nextConfig);
      updateApiConfig(nextConfig);
    } else {
      setRegistrationConfig(config);
    }
    setIsSettingsVisible(false);
    setIsRegModalVisible(true);
  };

  const handleSelectEmployee = async (employee) => {
    setIsRegModalVisible(false);
    setState(TerminalState.WAITING_FOR_APPROVAL);
    setSelectedEmployee(employee);

    try {
      const statusCheck = await deviceApi.checkRegistrationStatus(employee._id);
      
      if (statusCheck.status === 'approved') {
        setState(TerminalState.REGISTRATION);
      } else if (statusCheck.status === 'pending') {
        // Stay in WAITING_FOR_APPROVAL
      } else {
        // Send request
        await deviceApi.requestRegistration(employee._id, config.terminalId);
        // Stay in WAITING_FOR_APPROVAL
      }
    } catch (err) {
      setError({ code: '0x05', message: 'Loi kiem tra phe duyet: ' + err.message });
      setState(TerminalState.FAILURE);
    }
  };

  const resetTerminal = () => {
    setState(TerminalState.IDLE);
    setError(null);
    setSelectedEmployee(null);
    setRecognizedEmployee(null);
    setSystemInfo(SYSTEM_INFO);
  };

  if (!permission?.granted) {
    return <View style={styles.permissionContainer} />;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <Header
          status={state === TerminalState.SCANNING ? 'SCANNING...' : isStreamingFrame ? 'STREAMING...' : 'ONLINE'}
          onOpenSettings={() => setIsSettingsVisible(true)}
          onStreamFrame={streamFrameOnce}
          isStreaming={isStreamingFrame}
        />

        <View style={styles.main}>
          {/* Camera Layer */}
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          </View>

          {/* HUD Overlay Layer */}
          <View style={styles.hudOverlay}>
            {state === TerminalState.IDLE && <IdleState onStartScan={startScan} />}
            {state === TerminalState.SCANNING && <ScanningState />}
            {state === TerminalState.SUCCESS && (
              <SuccessState
                employee={recognizedEmployee}
                onReset={resetTerminal}
              />
            )}
            {state === TerminalState.FAILURE && (
              <FailureState onRetry={resetTerminal} error={error} />
            )}
            {state === TerminalState.WAITING_FOR_APPROVAL && (
              <View style={{ alignItems: 'center', gap: 20 }}>
                <Text style={{ color: '#34FF8D', fontSize: 18, fontWeight: 'bold' }}>CHỜ PHÊ DUYỆT</Text>
                <Text style={{ color: '#FFF', textAlign: 'center', paddingHorizontal: 40 }}>
                  Yêu cầu đăng ký khuôn mặt cho {selectedEmployee?.full_name} đã được gửi. Vui lòng nhờ Admin phê duyệt trên hệ thống.
                </Text>
                <TouchableOpacity 
                  onPress={async () => {
                    const check = await deviceApi.checkRegistrationStatus(selectedEmployee._id);
                    if (check.status === 'approved') setState(TerminalState.REGISTRATION);
                  }}
                  style={{ padding: 15, backgroundColor: 'rgba(52, 255, 141, 0.1)', borderWidth: 1, borderColor: '#34FF8D' }}
                >
                  <Text style={{ color: '#34FF8D' }}>KIỂM TRA LẠI</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={resetTerminal}>
                  <Text style={{ color: '#8E8E9F', marginTop: 10 }}>HỦY BỎ</Text>
                </TouchableOpacity>
              </View>
            )}
            {state === TerminalState.REGISTRATION && (
              <RegistrationState
                employee={selectedEmployee}
                terminalId={config.terminalId}
                captureEmbedding={captureEmbedding}
                onCancel={resetTerminal}
                onComplete={resetTerminal}
              />
            )}
          </View>
        </View>

        <Footer info={systemInfo} />

        {/* Visual Decorative Overlays */}
        <View style={styles.gridOverlay} pointerEvents="none" />

        {/* Settings Modal */}
        <SettingsModal
          visible={isSettingsVisible}
          onClose={() => setIsSettingsVisible(false)}
          currentConfig={config}
          onStartRegistration={handleStartRegistration}
          onOpenAdmin={() => {
            setIsSettingsVisible(false);
            router.push('/admin');
          }}
          onSave={(newConfig) => {
            setConfig(newConfig);
            setIsSettingsVisible(false);
          }}
        />

        <EmployeeRegistrationModal
          visible={isRegModalVisible}
          onClose={() => setIsRegModalVisible(false)}
          onSelectEmployee={handleSelectEmployee}
          currentConfig={registrationConfig || config}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  main: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  camera: {
    flex: 1,
  },
  hudOverlay: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    backgroundColor: 'transparent',
  }
});
