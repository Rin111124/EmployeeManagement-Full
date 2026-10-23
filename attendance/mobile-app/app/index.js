import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, StatusBar, Text, TouchableOpacity, ActivityIndicator, useWindowDimensions, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera as CameraIcon, Settings as SettingsIcon } from 'lucide-react-native';
import { attendanceApi, deviceApi, getDefaultApiConfig, hasConfiguredApiEnv, updateApiConfig, probeHost, discoverServerHost } from '../src/services/api';
import { initSocket, disconnectSocket, getSocket, reconnectSocketWithToken } from '../src/services/socket';
import { capturePhotoFeatures } from '../src/services/capturePhotoFeatures';
import { offlineQueue } from '../src/services/offlineQueue';

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
  const { width, height } = useWindowDimensions();
  const compactLayout = height < 620 || width > height;
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState(TerminalState.IDLE);
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [recognizedEmployee, setRecognizedEmployee] = useState(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isRegModalVisible, setIsRegModalVisible] = useState(false);
  const [registrationConfig, setRegistrationConfig] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const currentHost = config.adminUrl.replace(/^https?:\/\//, '').split(':')[0];
  const [systemInfo, setSystemInfo] = useState({ ...SYSTEM_INFO, ip: currentHost });
  const displaySystemInfo = { ...systemInfo, ip: currentHost };
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected' | 'connecting' | 'disconnected'
  const isDiscoveringRef = useRef(false); // guard against concurrent discovery runs

  useEffect(() => {
    if (!permission?.granted || cameraReady || cameraError) return undefined;
    const timeoutId = setTimeout(() => {
      setCameraError('Camera preview không khởi động sau 12 giây. Hãy kiểm tra quyền camera hoặc thử mở lại.');
    }, 12000);
    return () => clearTimeout(timeoutId);
  }, [permission?.granted, cameraReady, cameraError]);

  // Shared auto-discovery helper — defined early so boot & heartbeat effects can both use it
  const runAutoDiscovery = useCallback(async (currentConfig, onDiscovered) => {
    if (isDiscoveringRef.current) return; // prevent concurrent scans
    isDiscoveringRef.current = true;
    setConnectionStatus('connecting');
    debugLog('[AUTO-DISCOVERY] Current host is offline, scanning network for active server...');
    try {
      const discovered = await discoverServerHost();
      if (discovered.success && discovered.host) {
        const next = {
          ...currentConfig,
          adminUrl: discovered.adminUrl,
          aiServiceUrl: discovered.aiServiceUrl,
          attendanceUrl: discovered.attendanceUrl,
        };
        debugLog('[AUTO-DISCOVERY] Auto-connected to discovered server:', discovered.host);
        if (onDiscovered) onDiscovered(next);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (discoveryError) {
      debugLog('[AUTO-DISCOVERY] Discovery failed:', discoveryError?.message || discoveryError);
      setConnectionStatus('disconnected');
    } finally {
      isDiscoveringRef.current = false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadSavedConfig = async () => {
      let activeConfig = { ...DEFAULT_CONFIG };
      try {
        const raw = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            activeConfig = {
              ...DEFAULT_CONFIG,
              ...(hasConfiguredApiEnv() ? {} : parsed),
              aiApiKey: '',
            };
          }
        }
      } catch (_e) {
        // Ignore invalid config and keep defaults.
      }

      if (!isMounted) return;
      setConfig(activeConfig); // apply config first so API URLs update immediately

      // Probe the configured host; fall back to network discovery if unreachable
      const isLive = await probeHost(activeConfig.adminUrl, 1200);
      if (!isMounted) return;

      if (isLive) {
        setConnectionStatus('connected');
      } else {
        await runAutoDiscovery(activeConfig, (next) => {
          if (isMounted) setConfig(next);
        });
      }
    };

    loadSavedConfig();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request camera permission as soon as the hook has loaded the permission status.
  // useCameraPermissions starts as null while it reads the OS state asynchronously.
  useEffect(() => {
    if (!permission) return; // hook still loading – wait for next render
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Đồng bộ cấu hình API và lưu trữ cục bộ khi config thay đổi
  useEffect(() => {
    updateApiConfig({
      adminUrl: config.adminUrl,
      aiServiceUrl: config.aiServiceUrl,
      attendanceUrl: config.attendanceUrl,
      aiApiKey: config.aiApiKey
    });

    AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(getPersistableConfig(config))).catch(() => { });
  }, [config]);

  // Khởi tạo socket và lắng nghe sự kiện kết nối
  useEffect(() => {
    let isMounted = true;
    let cleanupSocket = null;

    const setupSocket = async () => {
      try {
        const sock = await initSocket(config.adminUrl);
        if (!isMounted || !sock) return;

        const onConnect = () => {
          if (!isMounted) return;
          debugLog('[SOCKET] Connected to Admin Server');
          setConnectionStatus('connected');
        };

        const onDisconnect = (reason) => {
          if (!isMounted) return;
          debugLog('[SOCKET] Disconnected from Admin Server:', reason);
          setConnectionStatus('disconnected');
        };

        const onConnectError = () => {
          if (!isMounted) return;
          setConnectionStatus('disconnected');
        };

        sock.on('connect', onConnect);
        sock.on('disconnect', onDisconnect);
        sock.on('connect_error', onConnectError);

        if (sock.connected) {
          setConnectionStatus('connected');
        }

        cleanupSocket = () => {
          sock.off('connect', onConnect);
          sock.off('disconnect', onDisconnect);
          sock.off('connect_error', onConnectError);
        };
      } catch (_err) {
        if (isMounted) setConnectionStatus('disconnected');
      }
    };

    setupSocket();

    return () => {
      isMounted = false;
      if (cleanupSocket) cleanupSocket();
      disconnectSocket();
    };
  }, [config.adminUrl]);

  // Heartbeat probe định kỳ kiểm tra backend (mỗi 8 giây)
  // When the current host is dead it automatically re-runs network discovery.
  useEffect(() => {
    let isMounted = true;
    // Keep a stable ref to config so the interval closure always reads the latest value
    const configRef = { current: config };
    configRef.current = config;

    const checkServer = async () => {
      // Tránh probe khi đang scanning nhận diện để giữ băng thông mượt
      if (state === TerminalState.SCANNING) return;

      const isLive = await probeHost(configRef.current.adminUrl, 1000);
      if (!isMounted) return;

      if (isLive) {
        setConnectionStatus('connected');
      } else {
        // Host unreachable — try to find server on the network
        await runAutoDiscovery(configRef.current, (next) => {
          if (isMounted) setConfig(next);
        });
      }
    };

    const intervalId = setInterval(checkServer, 8000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.adminUrl, state]);

  // Xử lý thủ công nút kết nối lại khi người dùng bấm vào Header, Badge hoặc Footer
  const handleRetryConnection = async () => {
    setConnectionStatus('connecting');
    const isLive = await probeHost(config.adminUrl, 1200);

    if (isLive) {
      setConnectionStatus('connected');
      await reconnectSocketWithToken(config.adminUrl);
      return;
    }

    // Quét tìm máy chủ trong mạng LAN nếu host cũ không phản hồi
    const discovered = await discoverServerHost();
    if (discovered.success && discovered.host) {
      const nextConfig = {
        ...config,
        adminUrl: discovered.adminUrl,
        aiServiceUrl: discovered.aiServiceUrl,
        attendanceUrl: discovered.attendanceUrl,
      };
      setConfig(nextConfig);
      setConnectionStatus('connected');
      await reconnectSocketWithToken(discovered.adminUrl);
    } else {
      setConnectionStatus('disconnected');
    }
  };

  const captureEmbedding = async () => {
    const result = await capturePhotoFeatures(cameraRef, config);
    if (!Array.isArray(result?.embedding)) {
      throw new Error('AI service did not return an embedding');
    }
    return result;
  };

  // Tự động đồng bộ hàng đợi ngoại tuyến khi có kết nối mạng trở lại
  useEffect(() => {
    if (connectionStatus === 'connected') {
      offlineQueue.flushQueue(attendanceApi).catch((err) => {
        debugLog('[OFFLINE_QUEUE] Auto-flush background notice:', err.message);
      });
    }
  }, [connectionStatus]);

  const startScan = async () => {
    setState(TerminalState.SCANNING);
    setError(null);
    setRecognizedEmployee(null);
    setSystemInfo(prev => ({ ...prev, status: 'SCANNING' }));

    let featureResult = null;
    try {
      featureResult = await captureEmbedding();
      const embedding = featureResult.embedding;
      const livenessPayload = {
        liveness_score: featureResult.liveness_score,
        is_live: featureResult.is_live,
        ai_attestation: featureResult.ai_attestation,
      };

      try {
        const result = await attendanceApi.recognizeAndCheck(embedding, config.terminalId, livenessPayload);

        if (result && result.success) {
          setRecognizedEmployee(result.employee);
          setState(TerminalState.SUCCESS);
          setSystemInfo(prev => ({ ...prev, status: 'OPERATIONAL' }));
          return;
        }
      } catch (apiErr) {
        const errMessage = String(apiErr?.message || '').toLowerCase();
        const isNetworkDrop = !apiErr?.response || errMessage.includes('khong the ket noi') || errMessage.includes('network');

        if (isNetworkDrop) {
          // Lưu vào hàng đợi ngoại tuyến (Offline Queue) để chống mất dữ liệu giờ cao điểm
          await offlineQueue.enqueue({
            embedding,
            deviceId: config.terminalId,
            livenessPayload,
            capturedAt: new Date().toISOString(),
          });

          setRecognizedEmployee({
            full_name: 'Ghi nhận ngoại tuyến',
            employee_code: 'OFFLINE_SAVED',
            message: 'Đã lưu cục bộ an toàn, sẽ tự động đồng bộ khi có mạng',
          });
          setState(TerminalState.SUCCESS);
          setSystemInfo(prev => ({ ...prev, status: 'OFFLINE_SYNC' }));
          return;
        }
        throw apiErr;
      }
    } catch (err) {
      const message = err?.message || 'Khong nhan dien duoc khuon mat';
      setError({ code: mapErrorCode(message), message });
      setState(TerminalState.FAILURE);
      setSystemInfo(prev => ({ ...prev, status: 'ERROR' }));
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

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconBadge}>
            <CameraIcon color="#38BDF8" size={40} />
          </View>
          <Text style={styles.permissionTitle}>ĐANG KIỂM TRA CAMERA</Text>
          <Text style={styles.permissionSubtext}>
            Nếu trạng thái quyền không tải được, hãy yêu cầu lại hoặc mở cài đặt ứng dụng.
          </Text>
          {permissionError ? <Text style={styles.permissionErrorText}>{permissionError}</Text> : null}
          <ActivityIndicator size="small" color="#38BDF8" style={styles.permissionSpinner} />
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={() => {
              setPermissionError(null);
              requestPermission().catch((permissionRequestError) => {
                setPermissionError(permissionRequestError?.message || 'Không thể yêu cầu quyền camera.');
              });
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionBtnText}>THỬ CẤP QUYỀN CAMERA</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permissionSettingsBtn}
            onPress={() => Linking.openSettings().catch(() => {})}
            activeOpacity={0.7}
          >
            <Text style={styles.permissionSettingsText}>Mở cài đặt ứng dụng</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permissionSettingsBtn}
            onPress={() => setIsSettingsVisible(true)}
            activeOpacity={0.7}
          >
            <SettingsIcon color="#94A3B8" size={16} />
            <Text style={styles.permissionSettingsText}>Cấu hình máy chủ</Text>
          </TouchableOpacity>
        </View>
        <SettingsModal
          visible={isSettingsVisible}
          onClose={() => setIsSettingsVisible(false)}
          currentConfig={config}
          onStartRegistration={handleStartRegistration}
          onSave={(newConfig) => {
            setConfig(newConfig);
            setIsSettingsVisible(false);
          }}
        />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconBadge}>
            <CameraIcon color="#38BDF8" size={40} />
          </View>
          <Text style={styles.permissionTitle}>YÊU CẦU QUYỀN CAMERA</Text>
          <Text style={styles.permissionSubtext}>
            Ứng dụng Kiosk cần quyền truy cập camera để thực hiện nhận diện khuôn mặt điểm danh tự động.
          </Text>
          <TouchableOpacity 
            style={styles.permissionBtn}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionBtnText}>CẤP QUYỀN CAMERA</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.permissionSettingsBtn}
            onPress={() => setIsSettingsVisible(true)}
            activeOpacity={0.7}
          >
            <SettingsIcon color="#94A3B8" size={16} />
            <Text style={styles.permissionSettingsText}>Mở Cấu Hình Máy Chủ</Text>
          </TouchableOpacity>
        </View>

        <SettingsModal
          visible={isSettingsVisible}
          onClose={() => setIsSettingsVisible(false)}
          currentConfig={config}
          onStartRegistration={handleStartRegistration}
          onSave={(newConfig) => {
            setConfig(newConfig);
            setIsSettingsVisible(false);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden />

      {/* Layer 1 — Fullscreen camera, rendered first so all HUD sits above it */}
      {!cameraError ? (
        <CameraView
          ref={cameraRef}
          style={[StyleSheet.absoluteFillObject, styles.cameraPreview]}
          facing="front"
          onCameraReady={() => {
            setCameraReady(true);
            setCameraError(null);
          }}
          onMountError={(event) => setCameraError(event?.message || 'Không thể khởi tạo camera')}
        />
      ) : (
        <View style={styles.cameraError}>
          <CameraIcon color="#F87171" size={34} />
          <Text style={styles.cameraErrorTitle}>Không mở được camera</Text>
          <Text style={styles.cameraErrorText}>{cameraError}</Text>
          <TouchableOpacity onPress={() => {
            setCameraReady(false);
            setCameraError(null);
          }} style={styles.cameraRetryButton}>
            <Text style={styles.cameraRetryText}>Thử mở lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Layer 2 — Soft dark vignette scrim for contrast */}
      <View style={styles.cameraScrim} pointerEvents="none" />

      {/* Layer 3 — Main HUD content */}
      <View style={[styles.main, {
        paddingTop: compactLayout ? 56 : 85,
        paddingBottom: compactLayout ? 24 : 48,
      }]}>
        <View style={styles.hudOverlay}>
          {state === TerminalState.IDLE && (
            <IdleState
              onStartScan={startScan}
              connectionStatus={connectionStatus}
              serverHost={config.adminUrl.replace(/^https?:\/\//, '').split(':')[0]}
              onRetryConnection={handleRetryConnection}
            />
          )}
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
            <View style={styles.approvalCard}>
              <Text style={styles.approvalTitle}>CHỜ ADMIN PHÊ DUYỆT</Text>
              <Text style={styles.approvalSubtext}>
                Yêu cầu đăng ký khuôn mặt cho {selectedEmployee?.full_name} đã được gửi. Vui lòng nhờ Admin phê duyệt trên Web Dashboard.
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  const check = await deviceApi.checkRegistrationStatus(selectedEmployee._id);
                  if (check.status === 'approved') setState(TerminalState.REGISTRATION);
                }}
                style={styles.approvalCheckBtn}
              >
                <Text style={styles.approvalCheckText}>KIỂM TRA LẠI TRẠNG THÁI</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resetTerminal}>
                <Text style={styles.approvalCancelText}>HỦY BỎ</Text>
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

      {/* Layer 4 — Floating Footer */}
      <Footer
        info={displaySystemInfo}
        connectionStatus={connectionStatus}
        onRetryConnection={handleRetryConnection}
      />

      {/* Layer 5 — Floating Header (last = topmost on Android) */}
      <Header
        status={state === TerminalState.SCANNING ? 'SCANNING...' : 'ONLINE'}
        connectionStatus={connectionStatus}
        onRetryConnection={handleRetryConnection}
        onOpenSettings={() => setIsSettingsVisible(true)}
      />

      {/* Modals */}
      <SettingsModal
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        currentConfig={config}
        onStartRegistration={handleStartRegistration}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionLoadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '500',
  },
  permissionErrorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionSpinner: {
    marginBottom: 16,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  permissionIconBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  permissionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionSubtext: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  permissionSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  permissionSettingsText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  cameraBackground: {
    // kept for backward compat — no longer used in JSX but kept to avoid lint error
    ...StyleSheet.absoluteFillObject,
  },
  cameraScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    zIndex: 1,
    elevation: 1,
  },
  cameraPreview: {
    zIndex: 0,
    elevation: 0,
  },
  cameraError: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#0F172A',
    zIndex: 15,
    elevation: 15,
  },
  cameraErrorTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
  },
  cameraErrorText: {
    color: '#CBD5E1',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  cameraRetryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  cameraRetryText: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  main: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 12,
  },
  hudOverlay: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalCard: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    gap: 14,
  },
  approvalTitle: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  approvalSubtext: {
    color: '#CBD5E1',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  approvalCheckBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 6,
  },
  approvalCheckText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
  },
  approvalCancelText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
