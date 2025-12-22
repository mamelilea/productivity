import { useColorScheme } from '@/components/useColorScheme';
import { PasswordPrompt } from '@/src/components';
import { resetDatabase } from '@/src/db/database';
import * as authService from '@/src/services/authService';
import { formatCurrency, getAllTransactions, getMonthlyBudget } from '@/src/services/financeService';
import { getAllCategories, getAllLogbookEntries } from '@/src/services/logbookService';
import * as settingsService from '@/src/services/settingsService';
import { useAppStore } from '@/src/store/appStore';
import { APP_NAME, APP_VERSION, COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { tasks, notes, schedules, refreshTaskData, fetchNotes, fetchSchedules } = useAppStore();
  
  // Auth state for settings access
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showAuthPasswordPrompt, setShowAuthPasswordPrompt] = useState(false);
  const [biometricName, setBiometricName] = useState('Biometric');
  
  // Password states for managing passwords
  const [hasNotePassword, setHasNotePassword] = useState(false);
  const [hasFinancePassword, setHasFinancePassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalType, setPasswordModalType] = useState<'note' | 'finance'>('note');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Check auth when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        checkAuth();
      }
    }, [isAuthenticated])
  );
  
  useEffect(() => {
    if (isAuthenticated) {
      checkPasswords();
    }
  }, [isAuthenticated]);
  
  // Auth functions
  const checkAuth = async () => {
    const preferredMethod = await authService.getPreferredAuthMethod();
    
    if (preferredMethod === 'none') {
      // No auth required, allow access
      setIsAuthenticated(true);
      return;
    }
    
    if (preferredMethod === 'biometric') {
      const bioName = await authService.getBiometricType();
      setBiometricName(bioName);
      await authenticateWithBiometric();
    } else {
      setShowAuthPasswordPrompt(true);
    }
  };
  
  const authenticateWithBiometric = async () => {
    setIsAuthenticating(true);
    const result = await authService.authenticateWithBiometric();
    setIsAuthenticating(false);
    
    if (result.success) {
      setIsAuthenticated(true);
    } else if (result.error !== 'Dibatalkan') {
      // Try password fallback
      const hasPass = await authService.hasFinancePassword();
      if (hasPass) {
        setShowAuthPasswordPrompt(true);
      }
    }
  };
  
  const handleAuthPasswordSubmit = async (password: string): Promise<boolean> => {
    const valid = await authService.verifyFinancePassword(password);
    if (valid) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };
  
  const checkPasswords = async () => {
    const [notePass, financePass] = await Promise.all([
      settingsService.hasNotePassword(),
      authService.hasFinancePassword()
    ]);
    setHasNotePassword(notePass);
    setHasFinancePassword(financePass);
  };
  
  const openPasswordModal = (type: 'note' | 'finance') => {
    setPasswordModalType(type);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowPasswordModal(true);
  };
  
  const handleSetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Sandi tidak boleh kosong');
      return;
    }
    if (newPassword.length < 4) {
      Alert.alert('Error', 'Sandi minimal 4 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Konfirmasi sandi tidak cocok');
      return;
    }
    
    try {
      if (passwordModalType === 'note') {
        await settingsService.setNotePassword(newPassword);
      } else {
        await authService.setFinancePassword(newPassword);
      }
      await checkPasswords();
      setShowPasswordModal(false);
      Alert.alert('Berhasil', 'Sandi berhasil diatur');
    } catch (error) {
      Alert.alert('Error', 'Gagal menyimpan sandi');
    }
  };
  
  const handleRemoveNotePassword = () => {
    Alert.alert(
      'Hapus Sandi Catatan',
      'Catatan private tidak akan bisa diakses sampai sandi baru diatur. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await settingsService.removeNotePassword();
            await checkPasswords();
          }
        }
      ]
    );
  };
  
  const handleRemoveFinancePassword = () => {
    Alert.alert(
      'Hapus Sandi Keuangan',
      'Keuangan tidak akan terkunci lagi. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await authService.removeFinancePassword();
            await checkPasswords();
          }
        }
      ]
    );
  };
  
  const handleResetData = async (password: string): Promise<boolean> => {
    // Verify with any password (note or finance)
    const noteValid = await settingsService.verifyNotePassword(password);
    const financeValid = await authService.verifyFinancePassword(password);
    
    if (!noteValid && !financeValid) {
      return false;
    }
    
    try {
      await resetDatabase();
      await refreshTaskData();
      await fetchNotes();
      await fetchSchedules();
      await checkPasswords();
      Alert.alert('Berhasil', 'Semua data telah dihapus');
      return true;
    } catch (error) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat reset data');
      return true; // Close modal anyway
    }
  };
  
  const handleSendBackupEmail = async () => {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'Email tidak tersedia di perangkat ini');
      return;
    }
    
    try {
      const today = new Date();
      const dateStr = today.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Get all data
      const transactions = await getAllTransactions(1000); // Get more transactions
      const budget = await getMonthlyBudget(today.getFullYear(), today.getMonth() + 1);
      
      // Calculate totals
      const totalIncome = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Build comprehensive email body
      let body = `📊 BACKUP DATA LENGKAP ${APP_NAME}\n`;
      body += `📅 ${dateStr}\n`;
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      // ========== RINGKASAN ==========
      body += `📈 RINGKASAN DATA\n`;
      body += `• Tugas: ${tasks.length} item\n`;
      body += `• Catatan: ${notes.length} item\n`;
      body += `• Jadwal: ${schedules.length} item\n`;
      body += `• Transaksi: ${transactions.length} item\n\n`;
      
      // ========== TUGAS - DETAIL LENGKAP ==========
      body += `\n${'═'.repeat(40)}\n`;
      body += `📋 DAFTAR TUGAS (DETAIL LENGKAP)\n`;
      body += `${'═'.repeat(40)}\n\n`;
      
      tasks.forEach((task, idx) => {
        const status = task.status === 'DONE' ? '✅' : task.status === 'PROGRESS' ? '🔄' : '⬜';
        const priority = task.priority === 'HIGH' ? '🔴' : task.priority === 'MEDIUM' ? '🟡' : '🟢';
        body += `${idx + 1}. ${status} ${task.title}\n`;
        body += `   Tipe: ${task.type}${task.custom_type ? ` (${task.custom_type})` : ''}\n`;
        body += `   Status: ${task.status} | Prioritas: ${priority} ${task.priority}\n`;
        if (task.description) body += `   Deskripsi: ${task.description}\n`;
        if (task.deadline) body += `   Deadline: ${task.deadline}\n`;
        body += `   Dibuat: ${task.created_at}\n`;
        if (task.completed_at) body += `   Selesai: ${task.completed_at}\n`;
        body += `\n`;
      });
      
      // ========== CATATAN - ISI LENGKAP ==========
      body += `\n${'═'.repeat(40)}\n`;
      body += `📝 DAFTAR CATATAN (ISI LENGKAP)\n`;
      body += `${'═'.repeat(40)}\n\n`;
      
      notes.forEach((note, idx) => {
        const privacyIcon = note.is_private ? '🔒' : '📄';
        body += `${idx + 1}. ${privacyIcon} ${note.title}\n`;
        body += `   ${note.is_private ? '[PRIVATE] ' : ''}Kategori: ${note.category_name || 'Tanpa kategori'}\n`;
        body += `   Dibuat: ${note.created_at}\n`;
        body += `   Diupdate: ${note.updated_at}\n`;
        body += `   --- ISI CATATAN ---\n`;
        // Include full content, indent each line
        if (note.content) {
          const contentLines = note.content.split('\n');
          contentLines.forEach(line => {
            body += `   ${line}\n`;
          });
        } else {
          body += `   (kosong)\n`;
        }
        body += `   --- END ---\n\n`;
      });
      
      // ========== JADWAL - DETAIL LENGKAP ==========
      body += `\n${'═'.repeat(40)}\n`;
      body += `📅 DAFTAR JADWAL (DETAIL LENGKAP)\n`;
      body += `${'═'.repeat(40)}\n\n`;
      
      const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      
      schedules.forEach((schedule, idx) => {
        body += `${idx + 1}. 📆 ${schedule.title}\n`;
        body += `   Tipe: ${schedule.type}${schedule.custom_type ? ` (${schedule.custom_type})` : ''}\n`;
        if (schedule.description) body += `   Deskripsi: ${schedule.description}\n`;
        body += `   Waktu Mulai: ${schedule.start_time}\n`;
        if (schedule.end_time) body += `   Waktu Selesai: ${schedule.end_time}\n`;
        if (schedule.location) body += `   Lokasi: ${schedule.location}\n`;
        
        // Recurrence details
        if (schedule.recurrence_type !== 'none') {
          body += `   🔄 PERULANGAN:\n`;
          body += `      Tipe: ${schedule.recurrence_type}\n`;
          body += `      Interval: Setiap ${schedule.recurrence_interval} ${schedule.recurrence_type === 'daily' ? 'hari' : schedule.recurrence_type === 'weekly' ? 'minggu' : schedule.recurrence_type === 'monthly' ? 'bulan' : 'tahun'}\n`;
          if (schedule.recurrence_days && schedule.recurrence_days.length > 0) {
            const dayNames = schedule.recurrence_days.map(d => NAMA_HARI[d]).join(', ');
            body += `      Hari: ${dayNames}\n`;
          }
          body += `      Batas: ${schedule.recurrence_end_type}\n`;
          if (schedule.recurrence_end_date) body += `      Sampai: ${schedule.recurrence_end_date}\n`;
          if (schedule.recurrence_end_count) body += `      Jumlah: ${schedule.recurrence_end_count} kali\n`;
        } else {
          body += `   Tidak berulang (sekali saja)\n`;
        }
        body += `   Dibuat: ${schedule.created_at}\n\n`;
      });
      
      // ========== LOGBOOK - SEMUA ENTRI ==========
      const logbookCategories = await getAllCategories();
      const logbookEntries = await getAllLogbookEntries();
      
      body += `\n${'═'.repeat(40)}\n`;
      body += `📓 DATA LOGBOOK (LENGKAP)\n`;
      body += `${'═'.repeat(40)}\n\n`;
      
      body += `Kategori: ${logbookCategories.length} | Entri: ${logbookEntries.length}\n\n`;
      
      // Group entries by category
      logbookCategories.forEach((cat, idx) => {
        const categoryEntries = logbookEntries.filter(e => e.category_id === cat.id);
        body += `${idx + 1}. ${cat.icon || '📝'} ${cat.name}\n`;
        body += `   Warna: ${cat.color || '#6366F1'} | Jumlah Entri: ${categoryEntries.length}\n`;
        
        if (categoryEntries.length > 0) {
          body += `   --- ENTRI ---\n`;
          categoryEntries.forEach(entry => {
            body += `   📅 ${entry.date}\n`;
            if (entry.content) {
              const contentLines = entry.content.split('\n');
              contentLines.forEach(line => {
                body += `      ${line}\n`;
              });
            }
            if (entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0) {
              const tagLabels = entry.tags.map(t => `#${t.label || t}`).join(' ');
              body += `      Tags: ${tagLabels}\n`;
            }
            body += `\n`;
          });
        }
        body += `\n`;
      });
      
      // ========== KEUANGAN - SEMUA TRANSAKSI ==========
      body += `\n${'═'.repeat(40)}\n`;
      body += `💰 DATA KEUANGAN (LENGKAP)\n`;
      body += `${'═'.repeat(40)}\n\n`;
      
      body += `RINGKASAN:\n`;
      body += `• Total Pemasukan: ${formatCurrency(totalIncome)}\n`;
      body += `• Total Pengeluaran: ${formatCurrency(totalExpense)}\n`;
      body += `• Saldo: ${formatCurrency(totalIncome - totalExpense)}\n`;
      if (budget) {
        body += `• Budget Bulanan: ${formatCurrency(budget.planned_expense)}\n`;
        body += `• Budget Harian: ${formatCurrency(budget.daily_budget)}\n`;
      }
      body += `\n`;
      
      body += `DAFTAR TRANSAKSI:\n`;
      transactions.forEach((t, idx) => {
        const icon = t.type === 'INCOME' ? '➕' : '➖';
        body += `${idx + 1}. ${icon} ${t.date}\n`;
        body += `   ${t.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}: ${formatCurrency(t.amount)}\n`;
        body += `   Kategori: ${t.category_name || 'Tanpa kategori'}\n`;
        if (t.description) body += `   Deskripsi: ${t.description}\n`;
        body += `\n`;
      });
      
      // ========== FOOTER ==========
      body += `\n${'━'.repeat(40)}\n`;
      body += `Backup dibuat pada: ${new Date().toLocaleString('id-ID')}\n`;
      body += `Dikirim dari ${APP_NAME} v${APP_VERSION}\n`;
      body += `\n⚠️ SIMPAN EMAIL INI SEBAGAI BACKUP DATA ANDA\n`;
      
      await MailComposer.composeAsync({
        subject: `[${APP_NAME}] Backup Data Lengkap - ${dateStr}`,
        body: body,
      });
      
    } catch (error: any) {
      console.error('Backup error:', error);
      Alert.alert('Gagal Backup', `Error: ${error?.message || 'Tidak dapat mengirim email backup'}`);
    }
  };
  
  const confirmResetData = () => {
    // Check if any password is set
    if (hasNotePassword || hasFinancePassword) {
      setShowResetConfirm(true);
    } else {
      // No password set, just confirm with alert
      Alert.alert(
        'Hapus Semua Data',
        'Semua data akan dihapus permanen. Pastikan Anda sudah yakin!',
        [
          { text: 'Batal', style: 'cancel' },
          { 
            text: 'Hapus Semua', 
            style: 'destructive',
            onPress: async () => {
              try {
                await resetDatabase();
                await refreshTaskData();
                await fetchNotes();
                await fetchSchedules();
                Alert.alert('Berhasil', 'Semua data telah dihapus');
              } catch (error) {
                Alert.alert('Gagal', 'Terjadi kesalahan');
              }
            }
          }
        ]
      );
    }
  };

  const renderSettingItem = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle: string,
    onPress: () => void,
    iconColor: string = colors.primary,
    danger: boolean = false
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingTitle, 
          { color: danger ? colors.danger : colors.textPrimary }
        ]}>
          {title}
        </Text>
        <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  // Lock Screen - show when not authenticated
  if (!isAuthenticated) {
    return (
      <View style={[styles.lockContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.lockCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.lockIconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="settings" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.lockTitle, { color: colors.textPrimary }]}>
            Pengaturan Terkunci
          </Text>
          <Text style={[styles.lockSubtitle, { color: colors.textMuted }]}>
            Verifikasi identitas untuk mengakses pengaturan
          </Text>
          
          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: colors.primary }]}
            onPress={checkAuth}
            disabled={isAuthenticating}
          >
            <Ionicons 
              name="finger-print" 
              size={22} 
              color={colors.textInverse} 
            />
            <Text style={[styles.unlockButtonText, { color: colors.textInverse }]}>
              {isAuthenticating ? 'Memverifikasi...' : `Buka dengan ${biometricName}`}
            </Text>
          </TouchableOpacity>
        </View>
        
        <PasswordPrompt
          visible={showAuthPasswordPrompt}
          onClose={() => setShowAuthPasswordPrompt(false)}
          onSubmit={handleAuthPasswordSubmit}
          title="Masukkan Sandi"
        />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* App Info */}
      <View style={[styles.appInfo, { backgroundColor: colors.primary }]}>
        <View style={styles.appIconContainer}>
          <Ionicons name="checkbox" size={48} color={colors.textInverse} />
        </View>
        <Text style={styles.appName}>{APP_NAME}</Text>
        <Text style={styles.appVersion}>Versi {APP_VERSION}</Text>
      </View>
      
      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{tasks.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Tugas</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.secondary }]}>{notes.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Catatan</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.info }]}>{schedules.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Jadwal</Text>
        </View>
      </View>
      
      {/* Privacy Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          KEAMANAN
        </Text>
        
        {renderSettingItem(
          hasNotePassword ? 'lock-closed' : 'lock-open-outline',
          hasNotePassword ? 'Ubah Sandi Catatan' : 'Atur Sandi Catatan',
          hasNotePassword ? 'Sandi sudah diatur' : 'Lindungi catatan private',
          () => openPasswordModal('note'),
          colors.warning
        )}
        
        {hasNotePassword && renderSettingItem(
          'trash-outline',
          'Hapus Sandi Catatan',
          'Catatan private tidak terkunci',
          handleRemoveNotePassword,
          colors.danger,
          true
        )}
        
        {renderSettingItem(
          hasFinancePassword ? 'wallet' : 'wallet-outline',
          hasFinancePassword ? 'Ubah Sandi Keuangan' : 'Atur Sandi Keuangan',
          hasFinancePassword ? 'Sandi sudah diatur' : 'Lindungi data keuangan',
          () => openPasswordModal('finance'),
          colors.success
        )}
        
        {hasFinancePassword && renderSettingItem(
          'trash-outline',
          'Hapus Sandi Keuangan',
          'Keuangan tidak terkunci',
          handleRemoveFinancePassword,
          colors.danger,
          true
        )}
      </View>
      
      {/* Backup Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          BACKUP DATA
        </Text>
        
        {renderSettingItem(
          'mail',
          'Kirim Backup ke Email',
          'Ringkasan data dikirim ke email Anda',
          handleSendBackupEmail,
          colors.info
        )}
      </View>
      
      {/* Data Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.danger }]}>
          ZONA BERBAHAYA
        </Text>
        
        {renderSettingItem(
          'trash',
          'Hapus Semua Data',
          'Menghapus semua data secara permanen',
          confirmResetData,
          colors.danger,
          true
        )}
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Dibuat dengan ❤️ untuk produktivitas
        </Text>
      </View>
      
      <View style={{ height: 40 }} />
      
      {/* Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {passwordModalType === 'note' ? 'Sandi Catatan' : 'Sandi Keuangan'}
              </Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              {passwordModalType === 'note' 
                ? 'Untuk melindungi catatan private Anda.'
                : 'Untuk mengunci akses ke fitur keuangan.'}
            </Text>
            
            <View style={[styles.inputContainer, { 
              backgroundColor: colors.surfaceVariant,
              borderColor: colors.border,
            }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Sandi baru"
                placeholderTextColor={colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? 'eye-off' : 'eye'} 
                  size={22} 
                  color={colors.textMuted} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.inputContainer, { 
              backgroundColor: colors.surfaceVariant,
              borderColor: colors.border,
            }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Konfirmasi sandi"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.saveButton, { 
                backgroundColor: passwordModalType === 'note' ? colors.warning : colors.success 
              }]}
              onPress={handleSetPassword}
            >
              <Text style={[styles.saveButtonText, { color: '#FFF' }]}>
                Simpan Sandi
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Reset Confirmation with Password */}
      <PasswordPrompt
        visible={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onSubmit={handleResetData}
        title="Konfirmasi Hapus Data"
        subtitle="Masukkan sandi Anda untuk menghapus semua data."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockCard: {
    width: '100%',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    padding: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  appIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  footer: {
    alignItems: 'center',
    padding: 32,
  },
  footerText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
