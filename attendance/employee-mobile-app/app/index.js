import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Briefcase,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Home,
  Laptop,
  LogOut,
  Plane,
  RefreshCcw,
  Send,
  Settings,
  UserRound,
  Wallet,
} from 'lucide-react-native';
import {
  createAdminClient,
  getDefaultAdminUrl,
  loadStoredSession,
  normalizeAdminUrl,
  saveAdminUrl,
} from '../src/services/adminApi';

const colors = {
  bg: '#F7F3FF',
  card: '#FFFFFF',
  text: '#172033',
  muted: '#697386',
  border: '#E8E1F6',
  primary: '#5140D6',
  primaryDark: '#3926B8',
  green: '#059669',
  amber: '#D97706',
  rose: '#E11D48',
  slate: '#475569',
  purpleSoft: '#EEE9FF',
  surface: '#FCFAFF',
};

function getEmployeeId(user) {
  return user?.employee_id?._id || user?.employee_id || '';
}

function toDateInput(value = new Date()) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthRange(value = new Date()) {
  const date = new Date(value);
  return {
    from: toDateInput(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: toDateInput(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

function sortByDateDesc(items, key) {
  return [...items].sort((a, b) => new Date(b?.[key] || 0) - new Date(a?.[key] || 0));
}

function addMonths(value, months) {
  return new Date(value.getFullYear(), value.getMonth() + months, 1);
}

function getMonthTitle(value) {
  return value.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

function isCurrentOrFutureMonth(value) {
  const now = new Date();
  return value.getFullYear() > now.getFullYear() ||
    (value.getFullYear() === now.getFullYear() && value.getMonth() >= now.getMonth());
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} VND`;
}

function requestDate(item) {
  return item.work_date || item.start_date || item.createdAt || item.updatedAt;
}

function statusTone(status) {
  if (status === 'Approved' || status === 'Finalized' || status === 'Signed') return 'green';
  if (status === 'Rejected' || status === 'Cancelled' || status === 'Terminated') return 'rose';
  if (status === 'Pending' || status === 'Draft') return 'amber';
  return 'neutral';
}

function extractItems(response) {
  const payload = response?.data || response || {};
  const items = payload.items || payload.data || payload;
  return Array.isArray(items) ? items : [];
}

async function loadSection(label, request, fallback) {
  try {
    return { label, value: await request(), error: null };
  } catch (error) {
    return { label, value: fallback, error };
  }
}

export default function EmployeeApp() {
  const [session, setSession] = useState({
    accessToken: null,
    refreshToken: null,
    user: null,
    adminUrl: getDefaultAdminUrl(),
  });
  const sessionRef = useRef(session);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardWarning, setDashboardWarning] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailModal, setDetailModal] = useState({ visible: false, title: '', rows: [] });
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState('home');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [urlDraft, setUrlDraft] = useState(getDefaultAdminUrl());
  const [data, setData] = useState({
    employee: null,
    attendance: [],
    payroll: [],
    contracts: [],
    assets: [],
    assignments: [],
    leaveRequests: [],
    overtimeRequests: [],
  });
  const [leaveForm, setLeaveForm] = useState({
    type: 'Annual',
    start_date: toDateInput(),
    end_date: toDateInput(),
    total_days: '1',
    reason: '',
  });
  const [otForm, setOtForm] = useState({
    work_date: toDateInput(),
    hours: '1',
    type: 'Weekday',
    reason: '',
  });

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const api = useMemo(() => createAdminClient(() => sessionRef.current, setSession), []);
  const employeeId = getEmployeeId(session.user);

  const loadDashboard = async () => {
    if (!employeeId) return;

    const { from, to } = getMonthRange(selectedMonth);
    const common = { employee_id: employeeId, limit: '100' };

    const results = await Promise.all([
      loadSection('Thong tin nhan vien', () => api.getEmployee(employeeId), null),
      loadSection('Cham cong', () => api.getAttendance({ ...common, from, to }), []),
      loadSection('Bang luong', () => api.getPayroll({ employee_id: employeeId, limit: '12' }), []),
      loadSection('Hop dong', () => api.getContracts({ employee_id: employeeId, limit: '20' }), []),
      loadSection('Tai san', () => api.getAssets({ employee_id: employeeId, limit: '20' }), []),
      loadSection('Ca lam', () => api.getShiftAssignments({ ...common, from, to }), []),
      loadSection('Nghi phep', () => api.getLeaveRequests({ employee_id: employeeId, limit: '20' }), []),
      loadSection('Tang ca', () => api.getOvertimeRequests({ employee_id: employeeId, limit: '20' }), []),
    ]);

    const [
      employee,
      attendance,
      payroll,
      contracts,
      assets,
      assignments,
      leaveRequests,
      overtimeRequests,
    ] = results;

    const failed = results.filter((result) => result.error);
    if (employee.error) {
      throw employee.error;
    }

    setData({
      employee: employee.value?.data || employee.value,
      attendance: sortByDateDesc(extractItems(attendance.value), 'work_date'),
      payroll: extractItems(payroll.value),
      contracts: extractItems(contracts.value),
      assets: extractItems(assets.value),
      assignments: sortByDateDesc(extractItems(assignments.value), 'work_date'),
      leaveRequests: sortByDateDesc(extractItems(leaveRequests.value), 'start_date'),
      overtimeRequests: sortByDateDesc(extractItems(overtimeRequests.value), 'work_date'),
    });

    if (failed.length) {
      const details = failed
        .map((result) => `${result.label}: ${result.error.message}`)
        .join('\n');
      setDashboardWarning(details);
    } else {
      setDashboardWarning('');
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const stored = await loadStoredSession();
        setSession(stored);
        setUrlDraft(stored.adminUrl);
      } finally {
        setBooting(false);
      }
    };

    boot();
  }, []);

  useEffect(() => {
    if (!booting && employeeId && session.accessToken) {
      setLoading(true);
      loadDashboard()
        .catch((error) => {
          if (error.status === 401) {
            Alert.alert('Phien dang nhap het han', error.message || 'Vui long dang nhap lai.');
            return;
          }
          Alert.alert('Khong tai duoc du lieu', error.message);
        })
        .finally(() => setLoading(false));
    }
  }, [booting, employeeId, session.accessToken, selectedMonth]);

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      Alert.alert('Thieu thong tin', 'Nhap username va password.');
      return;
    }

    setLoading(true);
    try {
      await saveAdminUrl(session.adminUrl);
      const result = await api.login(loginForm.username.trim(), loginForm.password);
      const roles = result.user?.roles || [];
      if (!roles.includes('Employee')) {
        Alert.alert('Tai khoan khong phu hop', 'App nay chi danh cho tai khoan nhan vien.');
        await api.logout();
        return;
      }
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      Alert.alert('Dang nhap that bai', error.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
    } catch (error) {
      if (error.status === 401) {
        Alert.alert('Phien dang nhap het han', error.message || 'Vui long dang nhap lai.');
        return;
      }
      Alert.alert('Khong tai duoc du lieu', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const submitLeave = async () => {
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason.trim()) {
      Alert.alert('Thieu thong tin', 'Nhap ngay nghi va ly do nghi phep.');
      return;
    }
    if (new Date(leaveForm.end_date) < new Date(leaveForm.start_date)) {
      Alert.alert('Ngay khong hop le', 'Ngay ket thuc phai sau hoac bang ngay bat dau.');
      return;
    }
    if (Number(leaveForm.total_days) <= 0) {
      Alert.alert('So ngay khong hop le', 'So ngay nghi phai lon hon 0.');
      return;
    }

    setLoading(true);
    try {
      await api.createLeaveRequest({
        ...leaveForm,
        total_days: Number(leaveForm.total_days || 1),
      });
      setLeaveForm((prev) => ({ ...prev, reason: '' }));
      await loadDashboard();
      Alert.alert('Da gui', 'Don nghi phep da duoc gui.');
    } catch (error) {
      Alert.alert('Gui that bai', error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitOvertime = async () => {
    if (!otForm.work_date || !otForm.reason.trim()) {
      Alert.alert('Thieu thong tin', 'Nhap ngay OT va ly do tang ca.');
      return;
    }
    if (Number(otForm.hours) <= 0) {
      Alert.alert('So gio khong hop le', 'So gio OT phai lon hon 0.');
      return;
    }

    setLoading(true);
    try {
      await api.createOvertimeRequest({
        ...otForm,
        hours: Number(otForm.hours || 1),
      });
      setOtForm((prev) => ({ ...prev, reason: '' }));
      await loadDashboard();
      Alert.alert('Da gui', 'Yeu cau OT da duoc gui.');
    } catch (error) {
      Alert.alert('Gui that bai', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!session.accessToken || !session.user) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMark}>
            <UserRound color="#FFFFFF" size={34} />
          </View>
          <Text style={styles.loginTitle}>IndustrialHR Employee</Text>
          <Text style={styles.loginSubtitle}>Dang nhap de xem thong tin ca nhan, cham cong, luong va yeu cau.</Text>

          <View style={styles.card}>
            <Input label="Username" value={loginForm.username} onChangeText={(username) => setLoginForm({ ...loginForm, username })} autoCapitalize="none" />
            <Input label="Password" value={loginForm.password} onChangeText={(password) => setLoginForm({ ...loginForm, password })} secureTextEntry />

            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Dang nhap</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setSettingsOpen(true)}>
              <Settings size={16} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Cau hinh API</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>Demo: an.nguyen / password123</Text>
        </ScrollView>
        <SettingsModal
          visible={settingsOpen}
          value={urlDraft}
          onChange={setUrlDraft}
          onClose={() => setSettingsOpen(false)}
          onSave={async () => {
            const normalized = normalizeAdminUrl(urlDraft);
            await saveAdminUrl(normalized);
            setSession((prev) => ({ ...prev, adminUrl: normalized }));
            setSettingsOpen(false);
          }}
        />
      </SafeAreaView>
    );
  }

  const employee = data.employee || session.user?.employee_id || {};
  const lateMinutes = data.attendance.reduce((sum, item) => sum + Number(item.late_minutes || 0), 0);
  const latestPayroll = data.payroll[0];
  const activeContract = data.contracts[0];
  const pendingRequests =
    data.leaveRequests.filter((item) => item.status === 'Pending').length +
    data.overtimeRequests.filter((item) => item.status === 'Pending').length;
  const approvedAnnualLeaveDays = data.leaveRequests
    .filter((item) => item.status === 'Approved' && item.type === 'Annual')
    .reduce((sum, item) => sum + Number(item.total_days || 0), 0);
  const annualLeaveTotal = activeContract?.annual_leave_days || 12;
  const annualLeaveLeft = Math.max(0, annualLeaveTotal - approvedAnnualLeaveDays);
  const allRequests = [...data.leaveRequests, ...data.overtimeRequests]
    .sort((a, b) => new Date(requestDate(b) || 0) - new Date(requestDate(a) || 0));
  const displayName = employee.full_name || session.user.username || 'Nhan vien';
  const firstName = displayName.split(' ').slice(-1)[0] || displayName;
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const todayAssignment = data.assignments[0];
  const todayKey = toDateInput();
  const todayAttendance = data.attendance.find((item) => toDateInput(item.work_date) === todayKey);
  const currentAssignment =
    data.assignments.find((item) => toDateInput(item.work_date) === todayKey) || todayAssignment;
  const currentMonth = getMonthTitle(selectedMonth);

  const openDetails = (title, rows) => {
    setDetailModal({ visible: true, title, rows: rows.filter((row) => row.value !== undefined && row.value !== null) });
  };

  const showAttendanceDetails = (item) => openDetails('Chi tiet cham cong', [
    { label: 'Ngay', value: formatDate(item.work_date) },
    { label: 'Check-in', value: formatDateTime(item.check_in) },
    { label: 'Check-out', value: formatDateTime(item.check_out) },
    { label: 'Trang thai', value: item.status },
    { label: 'Di muon', value: `${Number(item.late_minutes || 0)} phut` },
    { label: 'Gio cong', value: item.worked_hours ? `${item.worked_hours}h` : '-' },
    { label: 'Thiet bi', value: item.device_id },
  ]);

  const showPayrollDetails = (item) => openDetails(`Phieu luong ${item.month}/${item.year}`, [
    { label: 'Trang thai', value: item.status || 'Draft' },
    { label: 'Tong gio cong', value: `${Number(item.total_work_hours || 0)}h` },
    { label: 'Tong gio OT', value: `${Number(item.total_overtime_hours || 0)}h` },
    { label: 'Luong co ban', value: formatMoney(item.basic_salary) },
    { label: 'Luong OT', value: formatMoney(item.overtime_salary) },
    { label: 'Phu cap', value: formatMoney(item.allowance) },
    { label: 'Khau tru', value: formatMoney(item.deduction) },
    { label: 'Thuc lanh', value: formatMoney(item.net_salary) },
  ]);

  const showRequestDetails = (item) => openDetails(item.work_date ? 'Chi tiet tang ca' : 'Chi tiet nghi phep', [
    { label: 'Loai', value: item.type },
    { label: 'Ngay', value: item.work_date ? formatDate(item.work_date) : `${formatDate(item.start_date)} - ${formatDate(item.end_date)}` },
    { label: 'So ngay/gio', value: item.work_date ? `${item.hours}h` : `${item.total_days} ngay` },
    { label: 'Trang thai', value: item.status },
    { label: 'Ly do', value: item.reason },
    { label: 'Ghi chu duyet', value: item.review_note },
  ]);

  const showContractDetails = (item) => openDetails('Chi tiet hop dong', [
    { label: 'Loai hop dong', value: item.type },
    { label: 'Trang thai', value: item.status },
    { label: 'Ngay bat dau', value: formatDate(item.start_date) },
    { label: 'Ngay ket thuc', value: formatDate(item.end_date) },
    { label: 'Luong co ban', value: formatMoney(item.base_salary) },
    { label: 'Phu cap', value: item.allowances?.length ? item.allowances.map((allowance) => `${allowance.name}: ${formatMoney(allowance.amount)}`).join('\n') : '-' },
  ]);

  const showAssetDetails = (item) => openDetails('Chi tiet tai san', [
    { label: 'Ten tai san', value: item.asset_name },
    { label: 'Loai', value: item.category },
    { label: 'Serial', value: item.serial_number },
    { label: 'Trang thai', value: item.status },
    { label: 'Ngay ban giao', value: formatDate(item.assigned_date) },
    { label: 'Bao hanh den', value: formatDate(item.warranty_until) },
    { label: 'Vi tri', value: item.location },
    { label: 'Ghi chu', value: item.notes },
  ]);

  const renderHome = () => (
    <>
      <View style={styles.hero}>
        <Text style={styles.greeting}>Chao buoi sang, {firstName}</Text>
        <Text style={styles.subtitle}>{formatDate(new Date())}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Briefcase size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Ca lam hom nay</Text>
          </View>
          <Pill text={currentAssignment?.shift_id?.shift_name || 'Ca ngay'} tone="purple" />
        </View>
        <View style={styles.shiftBox}>
          <Text style={styles.mutedSmall}>Thoi gian</Text>
          <Text style={styles.shiftTime}>
            {currentAssignment?.shift_id?.start_time || '08:00'} - {currentAssignment?.shift_id?.end_time || '17:00'}
          </Text>
        </View>
        <View style={styles.successBox}>
          <CalendarCheck size={16} color={colors.green} />
          <Text style={styles.successText}>{todayAttendance?.check_in ? `Da check-in luc ${formatDateTime(todayAttendance.check_in)}` : 'Chua co check-in hom nay'}</Text>
        </View>
      </View>

      <View style={styles.quickGrid}>
        <QuickAction icon={Plane} label="Xin nghi phep" onPress={() => setActiveTab('leave')} />
        <QuickAction icon={Clock3} label="Dang ky tang ca" onPress={() => setActiveTab('leave')} />
        <QuickAction icon={Wallet} label="Xem luong thang" onPress={() => setActiveTab('salary')} />
        <QuickAction icon={CalendarCheck} label="Lich ca tuan nay" onPress={() => setActiveTab('attendance')} />
      </View>

      <Section title="Hoat dong gan day" icon={FileText}>
        {allRequests.slice(0, 3).map((item) => (
          <ListItem
            key={item._id}
            title={item.work_date ? `Dang ky OT ${formatDate(item.work_date)}` : `Don nghi ${formatDate(item.start_date)}`}
            subtitle={item.reason || item.type}
            meta={item.status}
            tone={statusTone(item.status)}
            onPress={() => showRequestDetails(item)}
          />
        ))}
        {!allRequests.length && <Empty text="Chua co hoat dong gan day." />}
      </Section>
    </>
  );

  const renderAttendance = () => (
    <>
      <View style={styles.pageTitleRow}>
        <Text style={styles.pageTitle}>Cham cong</Text>
        <MonthSwitch
          label={currentMonth}
          onPrev={() => setSelectedMonth((prev) => addMonths(prev, -1))}
          onNext={() => setSelectedMonth((prev) => addMonths(prev, 1))}
          disableNext={isCurrentOrFutureMonth(selectedMonth)}
        />
      </View>
      <View style={styles.statsGrid}>
        <Stat icon={CalendarCheck} label="Di lam" value={`${data.attendance.length}`} color={colors.green} />
        <Stat icon={Clock3} label="Tre / Ve som" value={`${lateMinutes}p`} color={lateMinutes > 0 ? colors.amber : colors.green} />
        <Stat icon={Plane} label="Nghi phep" value={data.leaveRequests.length} color={colors.slate} />
        <Stat icon={RefreshCcw} label="Tang ca" value={data.overtimeRequests.length} color={colors.primary} featured />
      </View>
      <Section title="Chi tiet lich trinh" icon={CalendarCheck}>
        {data.attendance.slice(0, 12).map((item) => (
          <ListItem
            key={item._id}
            title={formatDate(item.work_date)}
            subtitle={`${formatDateTime(item.check_in)} -> ${formatDateTime(item.check_out)}`}
            meta={item.late_minutes ? `${item.late_minutes}p muon` : item.status}
            tone={item.late_minutes ? 'amber' : statusTone(item.status)}
            onPress={() => showAttendanceDetails(item)}
          />
        ))}
        {!data.attendance.length && <Empty text="Chua co cham cong trong thang." />}
      </Section>
      <Section title="Lich ca" icon={Clock3}>
        {data.assignments.slice(0, 8).map((item) => (
          <ListItem
            key={item._id}
            title={formatDate(item.work_date)}
            subtitle={item.shift_id?.shift_name || 'Shift'}
            meta={`${item.shift_id?.start_time || ''} ${item.shift_id?.end_time ? `- ${item.shift_id.end_time}` : ''}`}
            onPress={() => openDetails('Chi tiet ca lam', [
              { label: 'Ngay', value: formatDate(item.work_date) },
              { label: 'Ca', value: item.shift_id?.shift_name || 'Shift' },
              { label: 'Bat dau', value: item.shift_id?.start_time },
              { label: 'Ket thuc', value: item.shift_id?.end_time },
              { label: 'Gio tieu chuan', value: item.shift_id?.standard_hours ? `${item.shift_id.standard_hours}h` : '-' },
            ])}
          />
        ))}
        {!data.assignments.length && <Empty text="Chua co ca lam trong thang." />}
      </Section>
    </>
  );

  const renderSalary = () => (
    <>
      <Text style={styles.pageTitle}>Luong & Thuong</Text>
      <Text style={styles.subtitle}>Quan ly thu nhap va chi tiet phieu luong cua ban.</Text>
      <TouchableOpacity style={styles.salaryCard} activeOpacity={0.85} onPress={() => latestPayroll && showPayrollDetails(latestPayroll)}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.mutedSmall}>THANG HIEN TAI</Text>
            <Text style={styles.salaryMonth}>{latestPayroll ? `Thang ${latestPayroll.month}/${latestPayroll.year}` : currentMonth}</Text>
          </View>
          <Pill text={latestPayroll?.status || 'Draft'} tone={statusTone(latestPayroll?.status || 'Draft')} />
        </View>
        <Text style={styles.netLabel}>Thuc lanh</Text>
        <Text style={styles.netSalary}>{formatMoney(latestPayroll?.net_salary)}</Text>
        <View style={styles.salaryLines}>
          <Row left="Luong co ban" right={formatMoney(latestPayroll?.basic_salary)} />
          <Row left="OT" right={formatMoney(latestPayroll?.overtime_salary)} />
          <Row left="Phu cap" right={formatMoney(latestPayroll?.allowance)} />
          <Row left="Khau tru" right={`-${formatMoney(latestPayroll?.deduction)}`} danger />
        </View>
      </TouchableOpacity>
      <Section title="Lich su 6 thang gan nhat" icon={Wallet}>
        {data.payroll.slice(0, 6).map((item) => (
          <ListItem
            key={item._id}
            title={`Thang ${item.month}/${item.year}`}
            subtitle={formatMoney(item.net_salary)}
            meta={item.status || 'Draft'}
            tone={statusTone(item.status || 'Draft')}
            onPress={() => showPayrollDetails(item)}
          />
        ))}
        {!data.payroll.length && <Empty text="Chua co bang luong." />}
      </Section>
    </>
  );

  const renderLeave = () => (
    <>
      <Text style={styles.pageTitle}>Nghi phep & Tang ca</Text>
      <View style={styles.leaveBalanceCard}>
        <View style={styles.leaveIcon}>
          <Plane size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.listTitle}>Annual Leave</Text>
          <Text style={styles.listSubtitle}>{approvedAnnualLeaveDays} / {annualLeaveTotal} ngay da duyet trong nam.</Text>
          <Text style={styles.leaveDays}>{annualLeaveLeft} ngay con lai</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (approvedAnnualLeaveDays / annualLeaveTotal) * 100)}%` }]} />
          </View>
        </View>
      </View>
      <Section title="Gui don nghi phep" icon={Send}>
        <Segmented
          value={leaveForm.type}
          options={['Annual', 'Sick', 'Unpaid']}
          onChange={(type) => setLeaveForm({ ...leaveForm, type })}
        />
        <View style={styles.twoCols}>
          <Input label="Tu ngay" value={leaveForm.start_date} onChangeText={(start_date) => setLeaveForm({ ...leaveForm, start_date })} />
          <Input label="Den ngay" value={leaveForm.end_date} onChangeText={(end_date) => setLeaveForm({ ...leaveForm, end_date })} />
        </View>
        <Input label="So ngay" value={leaveForm.total_days} onChangeText={(total_days) => setLeaveForm({ ...leaveForm, total_days })} keyboardType="decimal-pad" />
        <Input label="Ly do" value={leaveForm.reason} onChangeText={(reason) => setLeaveForm({ ...leaveForm, reason })} />
        <TouchableOpacity style={styles.primaryButton} onPress={submitLeave} disabled={loading}>
          <Text style={styles.primaryButtonText}>Nop don xin nghi</Text>
        </TouchableOpacity>
      </Section>
      <Section title="Dang ky tang ca" icon={Clock3}>
        <View style={styles.twoCols}>
          <Input label="Ngay OT" value={otForm.work_date} onChangeText={(work_date) => setOtForm({ ...otForm, work_date })} />
          <Input label="So gio" value={otForm.hours} onChangeText={(hours) => setOtForm({ ...otForm, hours })} keyboardType="decimal-pad" />
        </View>
        <Segmented
          value={otForm.type}
          options={['Weekday', 'Weekend', 'Holiday']}
          onChange={(type) => setOtForm({ ...otForm, type })}
        />
        <Input label="Ly do" value={otForm.reason} onChangeText={(reason) => setOtForm({ ...otForm, reason })} />
        <TouchableOpacity style={styles.secondaryButton} onPress={submitOvertime} disabled={loading}>
          <Text style={styles.secondaryButtonText}>Gui yeu cau OT</Text>
        </TouchableOpacity>
      </Section>
      <Section title="Yeu cau gan day" icon={FileText}>
        {allRequests.slice(0, 6).map((item) => (
          <ListItem
            key={item._id}
            title={item.work_date ? `Tang ca ${formatDate(item.work_date)}` : `${item.type} leave`}
            subtitle={item.reason || formatDate(item.start_date || item.work_date)}
            meta={item.status}
            tone={statusTone(item.status)}
            onPress={() => showRequestDetails(item)}
          />
        ))}
        {!allRequests.length && <Empty text="Chua co yeu cau." />}
      </Section>
    </>
  );

  const renderProfile = () => (
    <>
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileRole}>{employee.position || 'Senior UI/UX Designer'}</Text>
        <Pill text={employee.department || 'Phong ban'} tone="purple" />
      </View>
      <View style={styles.menuCard}>
        <ProfileMenu
          icon={UserRound}
          label="Thong tin ca nhan"
          onPress={() => openDetails('Thong tin ca nhan', [
            { label: 'Ma nhan vien', value: employee.employee_code },
            { label: 'Ho ten', value: displayName },
            { label: 'Email', value: employee.contact?.email || employee.email },
            { label: 'So dien thoai', value: employee.contact?.phone || employee.phone },
            { label: 'Ngay vao lam', value: formatDate(employee.hire_date) },
            { label: 'Phong ban', value: employee.department },
            { label: 'Chuc danh', value: employee.position },
          ])}
        />
        <ProfileMenu icon={Settings} label="Cau hinh API" onPress={() => setSettingsOpen(true)} />
        <ProfileMenu icon={Briefcase} label="Hop dong" onPress={() => activeContract && showContractDetails(activeContract)} />
        <ProfileMenu icon={Laptop} label="Tai san" onPress={() => data.assets[0] && showAssetDetails(data.assets[0])} />
        <ProfileMenu icon={LogOut} label="Dang xuat" danger onPress={api.logout} />
      </View>
      <Section title="Thong tin nhanh" icon={UserRound}>
        <Info label="Ma nhan vien" value={employee.employee_code} />
        <Info label="Email" value={employee.contact?.email || employee.email} />
        <Info label="Ngay vao lam" value={formatDate(employee.hire_date)} />
      </Section>
      <Section title="Hop dong" icon={Briefcase}>
        {data.contracts.slice(0, 4).map((item) => (
          <ListItem
            key={item._id}
            title={item.type}
            subtitle={`${formatDate(item.start_date)} - ${formatDate(item.end_date)}`}
            meta={item.status}
            tone={statusTone(item.status)}
            onPress={() => showContractDetails(item)}
          />
        ))}
        {!data.contracts.length && <Empty text="Chua co hop dong." />}
      </Section>
      <Section title="Tai san duoc giao" icon={Laptop}>
        {data.assets.slice(0, 6).map((item) => (
          <ListItem
            key={item._id}
            title={item.asset_name}
            subtitle={item.serial_number || item.category}
            meta={item.status}
            tone={statusTone(item.status)}
            onPress={() => showAssetDetails(item)}
          />
        ))}
        {!data.assets.length && <Empty text="Chua co tai san duoc giao." />}
      </Section>
    </>
  );

  const renderActiveTab = () => {
    if (activeTab === 'attendance') return renderAttendance();
    if (activeTab === 'salary') return renderSalary();
    if (activeTab === 'leave') return renderLeave();
    if (activeTab === 'profile') return renderProfile();
    return renderHome();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.headerIconButton} onPress={refresh}>
          <RefreshCcw size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.brandTitle}>EmployeePortal</Text>
        <TouchableOpacity style={styles.avatarSmall} onPress={() => setActiveTab('profile')}>
          <Text style={styles.avatarSmallText}>{initials}</Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Dang xu ly...</Text>
        </View>
      )}
      {!!dashboardWarning && (
        <View style={styles.warningBar}>
          <Text style={styles.warningTitle}>Mot so du lieu chua tai duoc</Text>
          <Text style={styles.warningText}>{dashboardWarning}</Text>
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {renderActiveTab()}
      </ScrollView>
      <View style={styles.bottomNav}>
        <TabButton icon={Home} label="Home" active={activeTab === 'home'} onPress={() => setActiveTab('home')} />
        <TabButton icon={CalendarCheck} label="Attendance" active={activeTab === 'attendance'} onPress={() => setActiveTab('attendance')} />
        <TabButton icon={Wallet} label="Salary" active={activeTab === 'salary'} onPress={() => setActiveTab('salary')} />
        <TabButton icon={FileText} label="Leave" active={activeTab === 'leave'} onPress={() => setActiveTab('leave')} badge={pendingRequests} />
        <TabButton icon={UserRound} label="Profile" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
      </View>
      <SettingsModal
        visible={settingsOpen}
        value={urlDraft}
        onChange={setUrlDraft}
        onClose={() => setSettingsOpen(false)}
        onSave={async () => {
          const normalized = normalizeAdminUrl(urlDraft);
          await saveAdminUrl(normalized);
          setSession((prev) => ({ ...prev, adminUrl: normalized }));
          setSettingsOpen(false);
        }}
      />
      <DetailModal
        visible={detailModal.visible}
        title={detailModal.title}
        rows={detailModal.rows}
        onClose={() => setDetailModal({ visible: false, title: '', rows: [] })}
      />
    </SafeAreaView>
  );
}

function SettingsModal({ visible, value, onChange, onClose, onSave }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.sectionTitle}>Admin API URL</Text>
          <Input label="URL" value={value} onChangeText={onChange} autoCapitalize="none" />
          <Text style={styles.hint}>Vi du: http://192.168.1.25:5000/api/v1</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Huy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButtonSmall} onPress={onSave}>
              <Text style={styles.primaryButtonText}>Luu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function IconButton({ icon: Icon, onPress, danger }) {
  return (
    <TouchableOpacity style={[styles.iconButton, danger && styles.iconButtonDanger]} onPress={onPress}>
      <Icon size={18} color={danger ? colors.rose : colors.primary} />
    </TouchableOpacity>
  );
}

function DetailModal({ visible, title, rows, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <TouchableOpacity style={styles.headerIconButton} onPress={onClose}>
              <Text style={styles.closeText}>X</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailRows}>
            {rows.map((row) => (
              <Info key={row.label} label={row.label} value={row.value} />
            ))}
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
            <Text style={styles.primaryButtonText}>Dong</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function MonthSwitch({ label, onPrev, onNext, disableNext }) {
  return (
    <View style={styles.monthSwitch}>
      <TouchableOpacity style={styles.monthButton} onPress={onPrev}>
        <ChevronLeft size={16} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.monthLabel}>{label}</Text>
      <TouchableOpacity style={[styles.monthButton, disableNext && styles.monthButtonDisabled]} onPress={onNext} disabled={disableNext}>
        <ChevronRight size={16} color={disableNext ? '#A6A0BC' : colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function Stat({ icon: Icon, label, value, color, featured }) {
  return (
    <View style={[styles.statCard, featured && styles.statCardFeatured]}>
      <View style={[styles.statIcon, { backgroundColor: featured ? 'rgba(255,255,255,0.18)' : `${color}18` }]}>
        <Icon size={18} color={featured ? '#FFFFFF' : color} />
      </View>
      <Text style={[styles.statValue, featured && styles.statValueFeatured]}>{value}</Text>
      <Text style={[styles.statLabel, featured && styles.statLabelFeatured]}>{label}</Text>
    </View>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Icon size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Input({ label, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput {...props} style={styles.input} placeholderTextColor="#94A3B8" />
    </View>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

function Row({ left, right, danger }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLeft}>{left}</Text>
      <Text style={[styles.rowRight, danger && styles.dangerText]}>{right || '-'}</Text>
    </View>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = value === option;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.segmentButton, active && styles.segmentButtonActive]}
            onPress={() => onChange(option)}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ListItem({ title, subtitle, meta, tone, onPress }) {
  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.75} disabled={!onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        <Text style={styles.listSubtitle}>{subtitle || '-'}</Text>
      </View>
      <View style={styles.listMetaWrap}>
        <Pill text={meta || '-'} tone={tone} />
        {onPress && <ChevronRight size={15} color="#A6A0BC" />}
      </View>
    </TouchableOpacity>
  );
}

function Empty({ text }) {
  return <Text style={styles.empty}>{text}</Text>;
}

function Pill({ text, tone = 'neutral' }) {
  return (
    <View style={[
      styles.pill,
      tone === 'purple' && styles.pillPurple,
      tone === 'green' && styles.pillGreen,
      tone === 'amber' && styles.pillAmber,
      tone === 'rose' && styles.pillRose,
    ]}>
      <Text style={[
        styles.pillText,
        tone === 'purple' && styles.pillPurpleText,
        tone === 'green' && styles.pillGreenText,
        tone === 'amber' && styles.pillAmberText,
        tone === 'rose' && styles.pillRoseText,
      ]}>{text || '-'}</Text>
    </View>
  );
}

function QuickAction({ icon: Icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Icon size={20} color={colors.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProfileMenu({ icon: Icon, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.profileMenuItem} onPress={onPress}>
      <View style={[styles.profileMenuIcon, danger && styles.profileMenuIconDanger]}>
        <Icon size={18} color={danger ? colors.rose : colors.primary} />
      </View>
      <Text style={[styles.profileMenuText, danger && styles.dangerText]}>{label}</Text>
      <ChevronRight size={18} color={danger ? colors.rose : '#A6A0BC'} />
    </TouchableOpacity>
  );
}

function TabButton({ icon: Icon, label, active, onPress, badge }) {
  return (
    <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <View>
        <Icon size={19} color={active ? colors.primary : '#A6A0BC'} />
        {badge > 0 && <View style={styles.tabBadge} />}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 104,
    gap: 14,
  },
  loginContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
    gap: 16,
  },
  brandMark: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  appHeader: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 16,
  },
  brandTitle: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D7F5F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarSmallText: {
    color: '#0F766E',
    fontWeight: '900',
    fontSize: 11,
  },
  hero: {
    paddingTop: 6,
    paddingBottom: 2,
  },
  greeting: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
    fontWeight: '900',
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageTitle: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 3,
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    color: colors.muted,
    fontWeight: '700',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonDanger: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FFE4E6',
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginBottom: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
  },
  loadingText: {
    color: colors.primary,
    fontWeight: '800',
  },
  warningBar: {
    marginHorizontal: 18,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 4,
  },
  warningTitle: {
    color: colors.amber,
    fontWeight: '900',
    fontSize: 12,
  },
  warningText: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 16,
  },
  monthSwitch: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 5,
  },
  monthButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purpleSoft,
  },
  monthButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  monthLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: '900',
    minWidth: 92,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '47.8%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#B9A8EA',
    shadowOpacity: 0.13,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  statCardFeatured: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    marginTop: 10,
    fontSize: 24,
    color: colors.text,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
    fontWeight: '800',
  },
  statValueFeatured: {
    color: '#FFFFFF',
  },
  statLabelFeatured: {
    color: 'rgba(255,255,255,0.78)',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    shadowColor: '#B9A8EA',
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  inputWrap: {
    gap: 6,
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  input: {
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.text,
    fontWeight: '700',
    backgroundColor: '#F8FAFC',
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  primaryButtonSmall: {
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '900',
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  infoValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  rowLeft: {
    color: colors.muted,
    fontWeight: '800',
  },
  rowRight: {
    color: colors.text,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },
  dangerText: {
    color: colors.rose,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  listTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 13,
  },
  listSubtitle: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 3,
  },
  meta: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 12,
    maxWidth: 110,
    textAlign: 'right',
  },
  listMetaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: 138,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    fontWeight: '800',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  pillPurple: {
    backgroundColor: colors.purpleSoft,
  },
  pillGreen: {
    backgroundColor: '#DCFCE7',
  },
  pillAmber: {
    backgroundColor: '#FEF3C7',
  },
  pillRose: {
    backgroundColor: '#FFE4E6',
  },
  pillText: {
    fontSize: 11,
    color: colors.slate,
    fontWeight: '900',
  },
  pillPurpleText: {
    color: colors.primary,
  },
  pillGreenText: {
    color: colors.green,
  },
  pillAmberText: {
    color: colors.amber,
  },
  pillRoseText: {
    color: colors.rose,
  },
  segmented: {
    minHeight: 42,
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F1ECFF',
  },
  segmentButton: {
    flex: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  shiftBox: {
    backgroundColor: '#F1ECFF',
    borderRadius: 10,
    padding: 14,
  },
  mutedSmall: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  shiftTime: {
    marginTop: 5,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  successBox: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#EAF8EF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successText: {
    color: colors.green,
    fontWeight: '900',
    flex: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAction: {
    width: '47.8%',
    minHeight: 98,
    backgroundColor: colors.card,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#B9A8EA',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0EEFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  salaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
    shadowColor: '#B9A8EA',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  salaryMonth: {
    marginTop: 4,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  netLabel: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  netSalary: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 26,
    fontWeight: '900',
  },
  salaryLines: {
    borderTopWidth: 1,
    borderTopColor: '#EFEAFB',
    paddingTop: 8,
  },
  leaveBalanceCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#B9A8EA',
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  leaveIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveDays: {
    marginTop: 10,
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#ECE7F8',
    borderRadius: 999,
    marginTop: 7,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '55%',
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 22,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarLarge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#D7F5F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    color: '#0F766E',
    fontSize: 25,
    fontWeight: '900',
  },
  profileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  profileRole: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileMenuItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1ECFA',
  },
  profileMenuIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purpleSoft,
  },
  profileMenuIconDanger: {
    backgroundColor: '#FFF1F2',
  },
  profileMenuText: {
    flex: 1,
    color: colors.text,
    fontWeight: '800',
  },
  bottomNav: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 14,
    height: 66,
    borderRadius: 14,
    backgroundColor: colors.card,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#7865D8',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  tabButton: {
    width: 62,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: colors.purpleSoft,
  },
  tabLabel: {
    fontSize: 9,
    color: '#A6A0BC',
    fontWeight: '900',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabBadge: {
    position: 'absolute',
    right: -3,
    top: -3,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.rose,
  },
  twoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    padding: 18,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  detailRows: {
    borderTopWidth: 1,
    borderTopColor: '#F1ECFA',
    paddingTop: 8,
    gap: 4,
  },
});
