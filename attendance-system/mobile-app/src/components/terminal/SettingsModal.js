import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Settings, Server, Fingerprint, Save, X, Activity, Cpu, LayoutGrid, Radio, ShieldCheck, RefreshCw } from 'lucide-react-native';
import * as Network from 'expo-network';
import { Theme, Glows } from '../../theme/theme';
import { deviceApi, getDefaultApiConfig, updateApiConfig } from '../../services/api';

export default function SettingsModal({ visible, onClose, onSave, onStartRegistration, onOpenAdmin, currentConfig }) {
  const [config, setConfig] = useState(currentConfig || {
    ...getDefaultApiConfig(),
    terminalId: 'CAM-042',
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [deviceIp, setDeviceIp] = useState('0.0.0.0');

  useEffect(() => {
    // Lấy IP thật của thiết bị khi mount
    Network.getIpAddressAsync().then(ip => setDeviceIp(ip)).catch(() => {});
  }, []);

  useEffect(() => {
    if (visible && currentConfig) {
      setConfig(currentConfig);
    }
  }, [visible, currentConfig]);

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
      alert(result.message || 'Yêu cầu đã được gửi!');
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
            {/* Section: Connection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Server color={Theme.colors.cyan.container} size={18} />
                <Text style={styles.sectionTitle}>KẾT NỐI ADMIN</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SERVER URL</Text>
                <TextInput
                  style={styles.input}
                  value={config.adminUrl}
                  onChangeText={(text) => setConfig({ ...config, adminUrl: text })}
                  placeholder="http://..."
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
                <Text style={styles.sectionTitle}>AI SERVICE</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>AI ENDPOINT</Text>
                <TextInput
                  style={styles.input}
                  value={config.aiServiceUrl}
                  onChangeText={(text) => setConfig({ ...config, aiServiceUrl: text })}
                  placeholder="http://..."
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
                <Text style={styles.sectionTitle}>ATTENDANCE SERVICE</Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ATTENDANCE ENDPOINT</Text>
                <TextInput
                  style={styles.input}
                  value={config.attendanceUrl}
                  onChangeText={(text) => setConfig({ ...config, attendanceUrl: text })}
                  placeholder="http://.../api"
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
              <Text style={styles.statusText}>Hệ thống đang hoạt động ổn định</Text>
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
    padding: 15,
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
