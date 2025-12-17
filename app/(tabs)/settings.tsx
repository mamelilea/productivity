import { useColorScheme } from '@/components/useColorScheme';
import { resetDatabase } from '@/src/db/database';
import * as exportService from '@/src/services/exportService';
import { useAppStore } from '@/src/store/appStore';
import { APP_NAME, APP_VERSION, COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { tasks, notes, schedules, refreshTaskData, fetchNotes, fetchSchedules } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const filePath = await exportService.exportToJson();
      await exportService.shareExportedFile(filePath);
      Alert.alert('Berhasil', 'Data berhasil di-export ke JSON');
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan saat export');
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleExportTasksCsv = async () => {
    setIsExporting(true);
    try {
      const filePath = await exportService.exportTasksToCsv();
      await exportService.shareExportedFile(filePath);
      Alert.alert('Berhasil', 'Tugas berhasil di-export ke CSV');
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan saat export');
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleExportNotesCsv = async () => {
    setIsExporting(true);
    try {
      const filePath = await exportService.exportNotesToCsv();
      await exportService.shareExportedFile(filePath);
      Alert.alert('Berhasil', 'Catatan berhasil di-export ke CSV');
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan saat export');
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleResetData = () => {
    Alert.alert(
      'Reset Data',
      'Apakah Anda yakin ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan.',
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
              Alert.alert('Gagal', 'Terjadi kesalahan saat reset data');
            }
          }
        }
      ]
    );
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
      disabled={isExporting}
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
      
      {/* Export Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          EKSPOR DATA
        </Text>
        
        {renderSettingItem(
          'download',
          'Backup Lengkap (JSON)',
          'Simpan semua data untuk backup',
          handleExportJson,
          colors.success
        )}
        
        {renderSettingItem(
          'document-text',
          'Ekspor Tugas (CSV)',
          'Bisa dibuka di Excel/Google Sheets',
          handleExportTasksCsv,
          colors.primary
        )}
        
        {renderSettingItem(
          'document',
          'Ekspor Catatan (CSV)',
          'Bisa dibuka di Excel/Google Sheets',
          handleExportNotesCsv,
          colors.secondary
        )}
      </View>
      
      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.danger }]}>
          ZONA BERBAHAYA
        </Text>
        
        {renderSettingItem(
          'trash',
          'Hapus Semua Data',
          'Menghapus semua tugas, catatan, dan jadwal',
          handleResetData,
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
});
