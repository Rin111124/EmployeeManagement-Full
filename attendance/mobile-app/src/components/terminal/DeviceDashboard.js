import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { 
  Plus, Search, MapPin, Users, Settings, Bell,
  UserCircle, LayoutDashboard,
  CalendarCheck,
  Package, Cpu,
  CircleCheck, Timer, AlertTriangle, XCircle 
} from 'lucide-react-native';
import { Theme, Glows } from '../../theme/theme';

// Mock Data từ giao diện bạn cung cấp
const MOCK_CAMERAS = [
  { id: 'cam-01', name: 'Camera Cổng Chính', location: 'Cổng số 1', ip: '192.168.1.10', status: 'ONLINE', uptime: '42d 16h', recognitionsToday: 842 },
  { id: 'cam-02', name: 'Camera Xưởng A', location: 'Khu vực sản xuất 1', ip: '192.168.1.11', status: 'ONLINE', uptime: '15d 08h', recognitionsToday: 1204 },
  { id: 'cam-03', name: 'Camera Nhà Ăn', location: 'Căn tin tầng 2', ip: '192.168.1.15', status: 'MAINTENANCE', uptime: '0h 0m', recognitionsToday: 0 },
];

const MOCK_LOGS = [
  { id: 'log-01', timestamp: '14:31:45', employeeName: 'Nguyễn Văn A', employeeId: 'NV-2041', confidence: 0.98, status: 'SUCCESS', thumbnailUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
  { id: 'log-02', timestamp: '14:28:12', employeeName: 'Trần Thị B', employeeId: 'NV-1832', confidence: 0.95, status: 'SUCCESS', thumbnailUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
  { id: 'log-03', timestamp: '14:15:03', employeeName: 'Không xác định', employeeId: '-', confidence: 0.65, status: 'FAILURE', thumbnailUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100' },
];

export default function DeviceDashboard({ onBack }) {
  const [selectedCam, setSelectedCam] = useState(MOCK_CAMERAS[0]);
  const [activeNav, setActiveNav] = useState('Assets');

  return (
    <View style={styles.container}>
      {/* Header Profile Section */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search color={Theme.colors.outline} size={18} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search HR records..."
            placeholderTextColor={Theme.colors.outline}
          />
        </View>
        <View style={styles.headerActions}>
           <TouchableOpacity style={styles.iconBtn}>
              <Bell color={Theme.colors.outline} size={20} />
              <View style={styles.notifDot} />
           </TouchableOpacity>
           <View style={styles.profileBtn}>
              <Text style={styles.adminText}>Admin</Text>
              <UserCircle color={Theme.colors.outline} size={28} />
           </View>
        </View>
      </View>

      <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
        {/* Device Management Section */}
        <View style={styles.sectionHeader}>
           <View>
              <Text style={styles.sectionTitle}>Quản lý thiết bị</Text>
              <Text style={styles.sectionSubtitle}>{MOCK_CAMERAS.length} thiết bị đang hoạt động</Text>
           </View>
           <TouchableOpacity style={styles.addBtn}>
              <Plus color="#FFF" size={18} />
              <Text style={styles.addBtnText}>Thêm</Text>
           </TouchableOpacity>
        </View>

        {/* Device Horizontal List */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deviceList}>
           {MOCK_CAMERAS.map(cam => (
             <TouchableOpacity 
               key={cam.id} 
               style={[styles.deviceCard, selectedCam.id === cam.id && styles.activeCard]}
               onPress={() => setSelectedCam(cam)}
             >
                <View style={styles.cardTop}>
                   <Text style={[styles.cardName, selectedCam.id === cam.id && styles.activeText]}>{cam.name}</Text>
                   <View style={[styles.statusPill, cam.status === 'ONLINE' ? styles.onlinePill : styles.offlinePill]}>
                      <Text style={styles.statusText}>{cam.status}</Text>
                   </View>
                </View>
                <Text style={styles.cardLoc}><MapPin size={10} color={Theme.colors.outline} /> {cam.location}</Text>
                <View style={styles.cardFooter}>
                   <Text style={styles.cardIp}>{cam.ip}</Text>
                   <Text style={styles.cardStat}>{cam.recognitionsToday} lượt</Text>
                </View>
             </TouchableOpacity>
           ))}
        </ScrollView>

        {/* Live Feed Visualization */}
        <View style={styles.feedContainer}>
           <View style={styles.feedHeader}>
              <View>
                 <Text style={styles.feedTitle}>{selectedCam.name}</Text>
                 <Text style={styles.feedMeta}>IP: {selectedCam.ip} • Uptime: {selectedCam.uptime}</Text>
              </View>
              <TouchableOpacity onPress={onBack}>
                 <XCircle color={Theme.colors.red.tertiary} size={24} />
              </TouchableOpacity>
           </View>

           <View style={styles.videoBox}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1541888941259-7927de14a9e5?q=80&w=800' }}
                style={styles.video}
              />
              {/* OSD Overlay */}
              <View style={styles.osdTop}>
                 <Text style={styles.osdText}>CAM-01_GATE_NORTH</Text>
                 <Text style={styles.osdTextHighlight}>REC • 1080P 30FPS</Text>
              </View>
              <View style={styles.osdBottom}>
                 <Text style={styles.osdText}>{new Date().toLocaleTimeString()}</Text>
              </View>

              {/* Bounding Box Simulation */}
              <View style={styles.boundingBox}>
                 <View style={styles.boxLabel}>
                    <Text style={styles.boxLabelText}>Worker ID: 2041 [98%]</Text>
                 </View>
              </View>
           </View>

           <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn}><Cpu size={16} color={Theme.colors.onSurface} /><Text style={styles.actionText}>Ping</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}><Settings size={16} color={Theme.colors.onSurface} /><Text style={styles.actionText}>Cấu hình</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]}><AlertTriangle size={16} color="#FFF" /><Text style={styles.dangerText}>Khởi động lại</Text></TouchableOpacity>
           </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
           <StatCard title="Nhận diện" value={selectedCam.recognitionsToday} icon={<Users size={18} color={Theme.colors.cyan.dim} />} />
           <StatCard title="Thành công" value="98.5%" icon={<CircleCheck size={18} color={Theme.colors.green.container} />} />
           <StatCard title="Phản hồi" value="145ms" icon={<Timer size={18} color={Theme.colors.outline} />} />
        </View>

        {/* Recent Logs Table Adaptation */}
        <View style={styles.logsSection}>
           <Text style={styles.logsTitle}>NHẬT KÝ NHẬN DIỆN</Text>
           {MOCK_LOGS.map(log => (
             <View key={log.id} style={styles.logRow}>
                <Image source={{ uri: log.thumbnailUrl }} style={styles.logThumb} />
                <View style={styles.logInfo}>
                   <Text style={styles.logName}>{log.employeeName}</Text>
                   <Text style={styles.logTime}>{log.timestamp} • {log.employeeId}</Text>
                </View>
                <View style={styles.logStatus}>
                   <Text style={[styles.statusTextSmall, log.status === 'SUCCESS' ? styles.successText : styles.errorText]}>
                      {log.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                   </Text>
                   <Text style={styles.confText}>{(log.confidence * 100).toFixed(0)}%</Text>
                </View>
             </View>
           ))}
        </View>
      </ScrollView>

      {/* Mini Sidebar Navigation (Bottom Style for Mobile) */}
      <View style={styles.navBar}>
         <NavIcon icon={<LayoutDashboard size={22} />} active={activeNav === 'Dash'} onPress={() => setActiveNav('Dash')} />
         <NavIcon icon={<Users size={22} />} active={activeNav === 'Emp'} onPress={() => setActiveNav('Emp')} />
         <NavIcon icon={<CalendarCheck size={22} />} active={activeNav === 'Att'} onPress={() => setActiveNav('Att')} />
         <NavIcon icon={<Package size={22} />} active={activeNav === 'Assets'} onPress={() => setActiveNav('Assets')} />
         <NavIcon icon={<Settings size={22} />} active={activeNav === 'Sys'} onPress={() => setActiveNav('Sys')} />
      </View>
    </View>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <View style={styles.statCard}>
       <View style={styles.statIcon}>{icon}</View>
       <View>
          <Text style={styles.statVal}>{value}</Text>
          <Text style={styles.statLabel}>{title}</Text>
       </View>
    </View>
  );
}

function NavIcon({ icon, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.navIcon, active && styles.activeNavIcon]} onPress={onPress}>
       {React.cloneElement(icon, { color: active ? Theme.colors.cyan.container : Theme.colors.outline })}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#131318',
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F25',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 15,
  },
  searchInput: {
    flex: 1,
    height: 36,
    color: '#FFF',
    fontSize: 13,
    marginLeft: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconBtn: {
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 6,
    height: 6,
    backgroundColor: Theme.colors.red.tertiary,
    borderRadius: 3,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mainScroll: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: Theme.colors.outline,
    fontSize: 12,
  },
  addBtn: {
    backgroundColor: Theme.colors.cyan.dim,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  addBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  deviceList: {
    paddingLeft: 20,
    marginBottom: 25,
  },
  deviceCard: {
    width: 220,
    backgroundColor: '#131318',
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#1F1F25',
  },
  activeCard: {
    borderColor: Theme.colors.cyan.dim,
    ...Glows.cyan,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardName: {
    color: Theme.colors.outline,
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeText: {
    color: '#FFF',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  onlinePill: { backgroundColor: 'rgba(52, 255, 141, 0.1)' },
  offlinePill: { backgroundColor: 'rgba(255, 51, 102, 0.1)' },
  statusText: {
    fontSize: 8,
    fontWeight: 'black',
    color: Theme.colors.cyan.container,
  },
  cardLoc: {
    color: Theme.colors.outline,
    fontSize: 10,
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1F1F25',
    paddingTop: 10,
  },
  cardIp: {
    color: Theme.colors.onSurfaceVariant,
    fontSize: 9,
    fontFamily: 'monospace',
  },
  cardStat: {
    color: Theme.colors.cyan.dim,
    fontSize: 9,
    fontWeight: 'bold',
  },
  feedContainer: {
    padding: 20,
    backgroundColor: '#131318',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F1F25',
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  feedTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  feedMeta: {
    color: Theme.colors.outline,
    fontSize: 11,
  },
  videoBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  osdTop: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  osdBottom: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  osdText: {
    color: '#FFF',
    fontSize: 8,
    fontFamily: 'monospace',
    opacity: 0.8,
  },
  osdTextHighlight: {
    color: Theme.colors.cyan.dim,
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  boundingBox: {
    position: 'absolute',
    top: '30%',
    left: '35%',
    width: '30%',
    height: '40%',
    borderWidth: 1,
    borderColor: Theme.colors.cyan.dim,
    borderStyle: 'dashed',
  },
  boxLabel: {
    position: 'absolute',
    top: -15,
    left: 0,
    backgroundColor: Theme.colors.cyan.dim,
    paddingHorizontal: 4,
  },
  boxLabelText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1C1C25',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 5,
    borderRadius: 8,
  },
  dangerBtn: {
    backgroundColor: 'rgba(255, 51, 102, 0.2)',
    borderColor: Theme.colors.red.tertiary,
    borderWidth: 1,
  },
  actionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dangerText: {
    color: Theme.colors.red.tertiary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#131318',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#1F1F25',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  statLabel: {
    color: Theme.colors.outline,
    fontSize: 9,
  },
  logsSection: {
    padding: 20,
    backgroundColor: '#131318',
    marginHorizontal: 20,
    marginBottom: 100,
    borderRadius: 16,
  },
  logsTitle: {
    color: Theme.colors.outline,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 15,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F25',
  },
  logThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logTime: {
    color: Theme.colors.outline,
    fontSize: 11,
  },
  logStatus: {
    alignItems: 'flex-end',
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  successText: { color: Theme.colors.green.container },
  errorText: { color: Theme.colors.red.tertiary },
  confText: {
    color: Theme.colors.outline,
    fontSize: 9,
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#131318',
    paddingBottom: 25,
    paddingTop: 15,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#1F1F25',
  },
  navIcon: {
    padding: 10,
  },
  activeNavIcon: {
    borderTopWidth: 2,
    borderTopColor: Theme.colors.cyan.dim,
  }
});
