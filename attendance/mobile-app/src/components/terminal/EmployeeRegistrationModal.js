import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { User, Search, X, ChevronRight, Fingerprint } from 'lucide-react-native';
import { Theme, Glows } from '../../theme/theme';
import { deviceApi } from '../../services/api';

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const debugLog = (...args) => {
  if (isDev) console.log(...args);
};
const debugWarn = (...args) => {
  if (isDev) console.warn(...args);
};
const debugError = (...args) => {
  if (isDev) console.error(...args);
};

export default function EmployeeRegistrationModal({ visible, onClose, onSelectEmployee, currentConfig }) {
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      debugLog('[REG_MODAL] Fetching unregistered employees...');
      const response = await deviceApi.getUnregisteredEmployees(currentConfig);
      
      // Kiểm tra mọi cấu trúc có thể có: response.data, response.data.data, hoặc response trực tiếp
      let list = [];
      if (Array.isArray(response)) list = response;
      else if (response && Array.isArray(response.data)) list = response.data;
      else if (response && response.status === 'success' && Array.isArray(response.data)) list = response.data;

      debugLog(`[REG_MODAL] Received ${list.length} employees.`);
      setEmployees(list);
      
      if (list.length === 0) {
        debugWarn('[REG_MODAL] List is empty from server.');
      }
    } catch (error) {
      debugError('[REG_MODAL] Failed to fetch:', error);
      setErrorMsg(error.message || 'Lỗi kết nối Server');
    } finally {
      setLoading(false);
    }
  }, [currentConfig]);

  useEffect(() => {
    if (visible) {
      fetchEmployees();
    }
  }, [visible, fetchEmployees]);

  const filteredEmployees = employees.filter(emp => {
    const name = emp.full_name || '';
    const code = emp.employee_code || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderEmployee = ({ item }) => (
    <TouchableOpacity 
      style={styles.employeeItem} 
      onPress={() => onSelectEmployee(item)}
    >
      <View style={styles.employeeInfo}>
        <View style={styles.avatar}>
          <User color={Theme.colors.onSurface} size={20} />
        </View>
        <View>
          <Text style={styles.employeeName}>{item.full_name || 'Không tên'}</Text>
          <Text style={styles.employeeId}>MÃ: {item.employee_code || 'N/A'} • {item.department || 'Phòng ban khác'}</Text>
        </View>
      </View>
      <ChevronRight color={Theme.colors.onSurfaceVariant} size={20} />
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Fingerprint color={Theme.colors.green?.container || '#34FF8D'} size={24} />
              <Text style={styles.headerText}>CHỌN NHÂN VIÊN</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={Theme.colors.onSurfaceVariant} size={24} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Search color={Theme.colors.onSurfaceVariant} size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm tên hoặc mã nhân viên..."
              placeholderTextColor="#4A4A5F"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Error Message */}
          {errorMsg && (
            <View style={{ padding: 10, backgroundColor: 'rgba(255,0,0,0.1)', marginHorizontal: 20 }}>
              <Text style={{ color: '#FF4A4A', fontSize: 12, textAlign: 'center' }}>{errorMsg}</Text>
            </View>
          )}

          {/* List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Theme.colors.green?.container || '#34FF8D'} size="large" />
              <Text style={styles.loadingText}>Đang tải danh sách...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredEmployees}
              renderItem={renderEmployee}
              keyExtractor={item => (item._id || item.employee_code || Math.random().toString())}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'Không tìm thấy nhân viên' : 'Tất cả đã được đăng ký'}
                  </Text>
                  <TouchableOpacity onPress={fetchEmployees} style={{ marginTop: 20 }}>
                    <Text style={{ color: Theme.colors.green?.container || '#34FF8D', textDecorationLine: 'underline' }}>Thử tải lại</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}

          <View style={styles.footer}>
             <Text style={styles.footerNote}>Sẵn sàng: {filteredEmployees.length} nhân viên</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    height: '80%',
    backgroundColor: '#0A0A0F',
    borderWidth: 1,
    borderColor: 'rgba(52, 255, 141, 0.2)',
    borderRadius: 2,
    ...Glows.green,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    color: '#34FF8D',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14141F',
    margin: 20,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    marginLeft: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  employeeId: {
    color: '#8E8E9F',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  loadingText: {
    color: '#34FF8D',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E9F',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  footerNote: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
