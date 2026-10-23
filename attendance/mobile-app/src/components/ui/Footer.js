import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Footer({ info, connectionStatus = 'connected', onRetryConnection }) {
  const insets = useSafeAreaInsets();
  const isDisconnected = connectionStatus === 'disconnected';

  if (isDisconnected) {
    return (
      <View 
        style={[styles.footerContainer, { bottom: Math.max(insets.bottom + 10, 16) }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity 
          style={styles.alertPill}
          onPress={onRetryConnection}
          activeOpacity={0.8}
        >
          <AlertCircle color="#EF4444" size={14} />
          <Text style={styles.alertText}>
            Máy chủ mất kết nối • Chạm vào đây để kết nối lại
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View 
      style={[styles.footerContainer, { bottom: Math.max(insets.bottom + 10, 16) }]}
      pointerEvents="box-none"
    >
      <View style={styles.hintPill}>
        <Text style={styles.hintText}>
          Nhìn thẳng vào khung hình • Chạm màn hình để điểm danh
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 900,
    elevation: 30,
  },
  hintPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  hintText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  alertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  alertText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
  },
});
