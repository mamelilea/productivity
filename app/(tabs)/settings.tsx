import { useColorScheme } from '@/components/useColorScheme';
import { PasswordPrompt } from '@/src/components';
import { resetDatabase } from '@/src/db/database';
import * as authService from '@/src/services/authService';
import { formatCurrency, getAllTransactions, getMonthlyBudget } from '@/src/services/financeService';
import * as settingsService from '@/src/services/settingsService';
import { useAppStore } from '@/src/store/appStore';
import { APP_NAME, APP_VERSION, COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import React, { useEffect, useState } from 'react';
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
  
  // Password states
  const [hasNotePassword, setHasNotePassword] = useState(false);
  const [hasFinancePassword, setHasFinancePassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalType, setPasswordModalType] = useState<'note' | 'finance'>('note');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  useEffect(() => {
    checkPasswords();
  }, []);
  
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
      
      // Get transaction data
      const transactions = await getAllTransactions(100);
      const budget = await getMonthlyBudget(today.getFullYear(), today.getMonth() + 1);
      
      // Calculate totals
      const totalIncome = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Build email body
      let body = `📊 BACKUP DATA ${APP_NAME}\n`;
      body += `📅 ${dateStr}\n`;
      body += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      body += `📈 RINGKASAN DATA\n`;
      body += `• Tugas: ${tasks.length} item\n`;
      body += `• Catatan: ${notes.length} item\n`;
      body += `• Jadwal: ${schedules.length} item\n`;
      body += `• Transaksi: ${transactions.length} item\n\n`;
      
      body += `💰 RINGKASAN KEUANGAN\n`;
      body += `• Total Pemasukan: ${formatCurrency(totalIncome)}\n`;
      body += `• Total Pengeluaran: ${formatCurrency(totalExpense)}\n`;
      body += `• Saldo: ${formatCurrency(totalIncome - totalExpense)}\n`;
      if (budget) {
        body += `• Budget Bulanan: ${formatCurrency(budget.planned_expense)}\n`;
        body += `• Budget Harian: ${formatCurrency(budget.daily_budget)}\n`;
      }
      body += `\n`;
      
      body += `📝 DAFTAR TUGAS\n`;
      tasks.slice(0, 20).forEach((task) => {
        const status = task.status === 'DONE' ? '✅' : '⬜';
        body += `${status} ${task.title}\n`;
      });
      if (tasks.length > 20) body += `... dan ${tasks.length - 20} tugas lainnya\n`;
      body += `\n`;
      
      body += `📄 DAFTAR CATATAN\n`;
      notes.slice(0, 10).forEach((note, i) => {
        body += `• ${note.title}\n`;
      });
      if (notes.length > 10) body += `... dan ${notes.length - 10} catatan lainnya\n`;
      body += `\n`;
      
      body += `💸 TRANSAKSI TERAKHIR\n`;
      transactions.slice(0, 15).forEach((t) => {
        const icon = t.type === 'INCOME' ? '➕' : '➖';
        body += `${icon} ${t.description || t.category_name || 'Transaksi'}: ${formatCurrency(t.amount)}\n`;
      });
      if (transactions.length > 15) body += `... dan ${transactions.length - 15} transaksi lainnya\n`;
      
      body += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      body += `Dikirim dari ${APP_NAME} v${APP_VERSION}\n`;
      
      await MailComposer.composeAsync({
        subject: `[${APP_NAME}] Backup Data - ${dateStr}`,
        body: body,
      });
      
    } catch (error) {
      Alert.alert('Gagal', 'Tidak dapat mengirim email');
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
