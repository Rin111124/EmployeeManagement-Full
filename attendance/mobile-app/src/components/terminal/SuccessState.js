import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Image, Dimensions, TouchableOpacity } from 'react-native';
import { BadgeCheck, Clock, Check } from 'lucide-react-native';
import { Theme, Glows } from '../../theme/theme';

const { width } = Dimensions.get('window');

export default function SuccessState({ employee, onReset }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Tự động quay lại màn hình idle sau 5 giây
    const timer = setTimeout(() => {
      onReset();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onReset, scaleAnim]);

  const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={onReset}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarWrapper}>
           <Image 
             source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
             style={styles.avatar}
           />
           <Animated.View style={[styles.badgeContainer, { transform: [{ scale: scaleAnim }] }]}>
              <Check color={Theme.colors.green.container} size={40} strokeWidth={4} />
           </Animated.View>
        </View>
      </View>

      {/* Greeting Section */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>
          CHÀO, <Text style={styles.nameText}>{employee?.full_name || 'NHÂN VIÊN'}!</Text>
        </Text>
        
        <View style={styles.infoBadge}>
           <View style={[styles.badgeCorner, styles.topLeft]} />
           <View style={[styles.badgeCorner, styles.bottomRight]} />
           <Clock color={Theme.colors.outline} size={20} />
           <Text style={styles.infoText}>XÁC NHẬN CHẤM CÔNG: <Text style={{color: '#FFF'}}>{currentTime}</Text></Text>
        </View>

        <View style={styles.statusPill}>
           <BadgeCheck color={Theme.colors.onSurface} size={20} />
           <Text style={styles.pillText}>HỆ THỐNG GHI NHẬN</Text>
        </View>
      </View>

      {/* Terminal Footer */}
      <View style={styles.terminalInfo}>
         <View style={styles.infoLeft}>
            <Text style={styles.debugText}>ID: {employee?.employee_id}</Text>
            <Text style={styles.debugText}>CONFIDENCE: {employee?.confidence || '99.9%'}</Text>
            <Text style={[styles.debugText, {color: Theme.colors.green.container}]}>ACCESS GRANTED: SECTOR_MAIN</Text>
         </View>
         <View style={styles.infoRight}>
            <Text style={styles.bigTime}>{currentTime}</Text>
            <Text style={styles.timezoneText}>LOCAL SYSTEM TIME</Text>
         </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 30,
  },
  profileSection: {
    marginTop: 10,
  },
  avatarWrapper: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: (width * 0.5) / 2,
    borderWidth: 4,
    borderColor: Theme.colors.green.container,
    padding: 5,
    backgroundColor: '#12121A',
    alignItems: 'center',
    justifyContent: 'center',
    ...Glows.green,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: (width * 0.5) / 2,
    backgroundColor: '#000',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#12121A',
    borderWidth: 2,
    borderColor: Theme.colors.green.container,
    alignItems: 'center',
    justifyContent: 'center',
    ...Glows.green,
  },
  greetingSection: {
    alignItems: 'center',
    gap: 15,
  },
  greetingText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  nameText: {
    color: Theme.colors.green.container,
    ...Glows.green,
  },
  infoBadge: {
    backgroundColor: '#1B1B20',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.outlineVariant,
  },
  badgeCorner: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: Theme.colors.green.container,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  infoText: {
    color: Theme.colors.onSurface,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  statusPill: {
    backgroundColor: Theme.colors.green.container,
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
    ...Glows.green,
  },
  pillText: {
    color: Theme.colors.background,
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  terminalInfo: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    opacity: 0.6,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.outlineVariant,
    paddingTop: 10,
  },
  infoLeft: {
    gap: 2,
  },
  debugText: {
    color: Theme.colors.outline,
    fontSize: 8,
    fontFamily: 'monospace',
  },
  infoRight: {
    alignItems: 'flex-end',
  },
  bigTime: {
    color: Theme.colors.onSurfaceVariant,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  timezoneText: {
    color: Theme.colors.outline,
    fontSize: 7,
    fontFamily: 'monospace',
  }
});
