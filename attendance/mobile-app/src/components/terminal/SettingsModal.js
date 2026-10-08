import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Settings, Server, Fingerprint, Save, X, Activity, Cpu, LayoutGrid, Radio, ShieldCheck, RefreshCw, Wifi, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react-native';
import * as Network from 'expo-network';
import { Theme, Glows } from '../../theme/theme';
import { deviceApi, getDefaultApiConfig, updateApiConfig } from '../../services/api';
import { discoverServerHost } from '../../services/discovery';
import { reconnectSocketWithToken } from '../../services/socket';

export default function SettingsModal({ visible, onClose, onSave, onStartRegistration, onOpenAdmin, currentConfig }) {
  const [config, setConfig] = useState(currentConfig || {
    ...getDefaultApiConfig(),
    terminalId: 'CAM-042',
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [deviceIp, setDeviceIp] = useState('');

  useEffect(() => {
    // Lấy IP thật của thiết bị khi mount
    Network.getIpAddressAsync().then(ip => setDeviceIp(ip)).catch(() => {});
  }, []);

  useEffect(() => {
    if (visible && currentConfig) {
      setConfig(currentConfig);
      setScanResult(null);
      setScanProgress('');
    }
  }, [visible, currentConfig]);

  const handleAutoDiscover = async () => {
    setIsScanning(true);
    setScanResult(null);
    setScanProgress('Đang chuẩn bị quét mạng...');

    try {
      const result = await discoverServerHost((msg) => setScanProgress(msg));
      if (result.success && result.host) {
        const updated = {
          ...config,
          adminUrl: result.adminUrl,
          aiServiceUrl: result.aiServiceUrl,
          attendanceUrl: result.attendanceUrl,
        };
        setConfig(updated);
        updateApiConfig(updated);
        setScanResult({
          success: true,
          message: `Đã tìm thấy máy chủ tại: ${result.host}`,
          host: result.host,
        });
      } else {
        setScanResult({
          success: false,
          message: result.message || 'Không tìm thấy máy chủ trong mạng LAN.',
        });
      }
    } catch (err) {
      setScanResult({
        success: false,
        message: 'Lỗi trong quá trình quét: ' + err.message,
      });
    } finally {
      setIsScanning(false);
      setScanProgress('');
    }
  };

  const handleUseLocalhost = () => {
    const updated = {
      ...config,
      adminUrl: 'http://localhost:5000',
      aiServiceUrl: 'http://localhost:8000',
      attendanceUrl: 'http://localhost:5001/api',
    };
    setConfig(updated);
    updateApiConfig(updated);
    setScanResult({
      success: true,
      message: 'Đã chuyển về địa chỉ localhost (127.0.0.1)',
      host: 'localhost',
    });
  };

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    try {
      // Cập nhật cấu hình động trước khi gọi API
      updateApiConfig(config);

      const deviceInfo = {
        device_name: config.terminalId || 'Mobile Terminal',
        ip_address: deviceIp,
        port: 8080,
        location: config.location || 'Khu vực chưa xác định',
        device_type: 'face'
      };

      const result = await deviceApi.requestAccess(deviceInfo);
      const deviceStatus = result?.device?.status;

      if (deviceStatus === 'approved') {
        // Device đã được approve — thử claim token ngay
        const deviceId = result?.device?.id;
        if (deviceId) {
          const token = await deviceApi.claimToken(deviceId, deviceInfo.device_name);
          if (token) {
            await reconnectSocketWithToken(config.adminUrl);
            alert('Thiết bị đã được xác thực thành công! Ứng dụng sẵn sàng sử dụng.');
            return;
          }
        }
        alert('Thiết bị đã được duyệt nhưng thiếu thông tin claim cũ. Trong Admin Portal, hãy Revoke thiết bị; sau đó bấm Yêu cầu truy cập trên kiosk và phê duyệt yêu cầu mới.');
      } else if (deviceStatus === 'pending') {
        alert(`✅ Yêu cầu đã gửi!

Thiết bị đang chờ phê duyệt. Vui lòng:
1. Mở Admin Portal (http://localhost:3000)
2. Vào Quản lý Thiết bị
3. Phê duyệt thiết bị "${deviceInfo.device_name}"
4. Quay lại đây và bấm "XÁC THỰC THIẾT BỊ" lần nữa`);
      } else {
        alert(result.message || 'Yêu cầu đã được gửi thành công!');
      }
    } catch (error) {
      alert('Lỗi kết nối: ' + (error.message || 'Không thể kết nối tới Admin Portal'));
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Settings color={Theme.colors.cyan.dim} size={24} />
              <Text style={styles.headerText}>CẤU HÌNH HỆ THỐNG</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={Theme.colors.onSurfaceVariant} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Section: Auto-Discovery */}
            <View style={[styles.section, styles.highlightSection]}>
              <View style={styles.sectionHeader}>
                <Wifi color={Theme.colors.cyan.dim} size={18} />
                <Text style={[styles.sectionTitle, { color: Theme.colors.cyan.dim }]}>TỰ ĐỘNG TÌM KIẾM IP MÁY CHỦ</Text>
              </View>

              <Text style={styles.description}>
                Tự động quét mạng nội bộ (LAN / Wi-Fi) để dò tìm địa chỉ IP máy chủ Backend & Admin đang hoạt động và tự động điền vào cấu hình.
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.scanBtn, { opacity: isScanning ? 0.7 : 1 }]}
                  onPress={handleAutoDiscover}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <ActivityIndicator color={Theme.colors.background} size="small" />
                  ) : (
                    <Sparkles color={Theme.colors.background} size={18} />
                  )}
                  <Text style={styles.scanBtnText}>
                    {isScanning ? 'ĐANG QUÉT MẠNG...' : 'DÒ TÌM & TỰ ĐIỀN IP'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.localBtn]}
                  onPress={handleUseLocalhost}
                  disabled={isScanning}
                >
                  <Text style={styles.localBtnText}>DÙNG LOCALHOST</Text>
                </TouchableOpacity>
              </View>

              {/* Tiến trình quét */}
              {isScanning && scanProgress ? (
                <View style={styles.progressBox}>
                  <ActivityIndicator color={Theme.colors.cyan.dim} size="small" />
                  <Text style={styles.progressText}>{scanProgress}</Text>
                </View>
              ) : null}

              {/* Kết quả quét */}
              {scanResult ? (
                <View style={[styles.resultBox, scanResult.success ? styles.resultSuccess : styles.resultError]}>
                  {scanResult.success ? (
                    <CheckCircle2 color={Theme.colors.green.container} size={18} />
                  ) : (
                    <AlertCircle color="#ff5252" size={18} />
                  )}
                  <Text style={[styles.resultText, { color: scanResult.success ? Theme.colors.green.container : '#ff5252' }]}>
                    {scanResult.message}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Section: Connection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Server color={Theme.colors.cyan.container} size={18} />
                <Text style={styles.sectionTitle}>KẾT NỐI ADMIN (PORT 5000)</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SERVER URL</Text>
                <TextInput
                  style={styles.input}
                  value={config.adminUrl}
                  onChangeText={(text) => setConfig({ ...config, adminUrl: text })}
                  placeholder="http://192.168.1.x:5000"
                  placeholderTextColor="#4A4A5F"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TERMINAL ID</Text>
                <TextInput
                  style={styles.input}
                  value={config.terminalId}
                  onChangeText={(text) => setConfig({ ...config, terminalId: text })}
                  placeholder="CAM-XXX"
                  placeholderTextColor="#4A4A5F"
                />
              </View>
            </View>

            {/* Section: AI Service */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Cpu color={Theme.colors.cyan.container} size={18} />
                <Text style={styles.sectionTitle}>AI SERVICE (PORT 8000)</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>AI ENDPOINT</Text>
                <TextInput
                  style={styles.input}
                  value={config.aiServiceUrl}
                  onChangeText={(text) => setConfig({ ...config, aiServiceUrl: text })}
                  placeholder="http://192.168.1.x:8000"
                  placeholderTextColor="#4A4A5F"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>AI API KEY</Text>
                <TextInput
                  style={styles.input}
                  value={config.aiApiKey || ''}
                  onChangeText={(text) => setConfig({ ...config, aiApiKey: text })}
                  placeholder="optional"
                  placeholderTextColor="#4A4A5F"
                  secureTextEntry
                />
              </View>
            </View>

            {/* Section: Attendance Service */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Activity color={Theme.colors.cyan.container} size={18} />
                <Text style={styles.sectionTitle}>ATTENDANCE SERVICE (PORT 5001)</Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ATTENDANCE ENDPOINT</Text>
                <TextInput
                  style={styles.input}
                  value={config.attendanceUrl}
                  onChangeText={(text) => setConfig({ ...config, attendanceUrl: text })}
                  placeholder="http://192.168.1.x:5001/api"
                  placeholderTextColor="#4A4A5F"
                />
              </View>
            </View>

            {/* Section: Face Registration */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Fingerprint color={Theme.colors.green.container} size={18} />
                <Text style={styles.sectionTitle}>ĐĂNG KÝ BIOMETRIC</Text>
              </View>

              <Text style={styles.description}>
                Bắt đầu quy trình lấy mẫu khuôn mặt để thêm nhân viên mới vào hệ thống.
              </Text>

              <TouchableOpacity style={styles.actionBtn} onPress={() => onStartRegistration(config)}>
                <Fingerprint color={Theme.colors.background} size={20} />
                <Text style={styles.actionBtnText}>BẮT ĐẦU ĐĂNG KÝ</Text>
              </TouchableOpacity>
            </View>

            {/* Section: Device Authentication */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ShieldCheck color={Theme.colors.cyan.dim} size={18} />
                <Text style={styles.sectionTitle}>XÁC THỰC THIẾT BỊ</Text>
              </View>
              <Text style={styles.description}>
                Gửi mã định danh thiết bị này tới Admin Portal để được cấp quyền truy cập hệ thống.
              </Text>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: Theme.colors.cyan.dim, opacity: isRequesting ? 0.6 : 1 }]} 
                onPress={handleRequestAccess}
                disabled={isRequesting}
              >
                {isRequesting ? (
                  <RefreshCw color={Theme.colors.background} size={20} />
                ) : (
                  <ShieldCheck color={Theme.colors.background} size={20} />
                )}
                <Text style={styles.actionBtnText}>
                  {isRequesting ? 'ĐANG GỬI...' : 'GỬI YÊU CẦU KẾT NỐI'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Section: Admin Console */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LayoutGrid color={Theme.colors.cyan.dim} size={18} />
                <Text style={styles.sectionTitle}>QUẢN TRỊ VIÊN</Text>
              </View>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#131318', borderWidth: 1, borderColor: Theme.colors.cyan.dim }]} onPress={onOpenAdmin}>
                <Radio color={Theme.colors.cyan.dim} size={20} />
                <Text style={[styles.actionBtnText, { color: Theme.colors.cyan.dim }]}>MỞ BẢNG ĐIỀU KHIỂN TRUNG TÂM</Text>
              </TouchableOpacity>
            </View>

            {/* System Status Info */}
            <View style={styles.statusBox}>
              <Activity color={Theme.colors.cyan.dim} size={16} />
              <Text style={styles.statusText}>IP Thiết bị: {deviceIp || 'Đang dò mạng'} | Sẵn sàng hoạt động</Text>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(config)}>
              <Save color={Theme.colors.background} size={24} />
              <Text style={styles.saveBtnText}>LƯU CẤU HÌNH</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#0A0A0F',
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
    borderRadius: 2,
    ...Glows.cyan,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.outlineVariant,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    color: Theme.colors.cyan.dim,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 20,
    gap: 25,
  },
  section: {
    gap: 15,
  },
  highlightSection: {
    backgroundColor: 'rgba(0, 229, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    padding: 15,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.cyan.container,
    paddingLeft: 10,
  },
  sectionTitle: {
    color: Theme.colors.cyan.container,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  scanBtn: {
    flex: 2,
    backgroundColor: Theme.colors.cyan.dim,
    ...Glows.cyan,
  },
  scanBtnText: {
    color: Theme.colors.background,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  localBtn: {
    flex: 1,
    backgroundColor: '#1E1E2A',
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
  },
  localBtnText: {
    color: Theme.colors.onSurfaceVariant,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#14141F',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  progressText: {
    color: Theme.colors.cyan.dim,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  resultError: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: Theme.colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#14141F',
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
    color: '#FFF',
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  description: {
    color: Theme.colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  actionBtn: {
    backgroundColor: Theme.colors.green.container,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 10,
    borderRadius: 2,
    ...Glows.green,
  },
  actionBtnText: {
    color: Theme.colors.background,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.1)',
  },
  statusText: {
    color: Theme.colors.cyan.dim,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.outlineVariant,
  },
  saveBtn: {
    backgroundColor: Theme.colors.cyan.dim,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 12,
    ...Glows.cyan,
  },
  saveBtnText: {
    color: Theme.colors.background,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 5,
  }
});
