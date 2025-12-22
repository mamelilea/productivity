import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { initializeDatabase } from '@/src/db/database';
import { requestNotificationPermissions } from '@/src/services/notificationService';
import { useAppStore } from '@/src/store/appStore';

export {
    ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  
  const initialize = useAppStore((state) => state.initialize);

  // Initialize database and app state
  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeDatabase();
        await requestNotificationPermissions();
        await initialize();
      } catch (e) {
        console.error('Failed to initialize app:', e);
      }
    };
    
    initApp();
  }, []);

  // Handle font loading errors
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="task/[id]" 
          options={{ 
            title: 'Detail Tugas',
            presentation: 'card' 
          }} 
        />
        <Stack.Screen 
          name="task/new" 
          options={{ 
            title: 'Tambah Tugas',
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="task/edit/[id]" 
          options={{ 
            title: 'Edit Tugas',
            presentation: 'card' 
          }} 
        />
        <Stack.Screen 
          name="note/[id]" 
          options={{ 
            title: 'Detail Catatan',
            presentation: 'card' 
          }} 
        />
        <Stack.Screen 
          name="note/new" 
          options={{ 
            title: 'Tambah Catatan',
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="schedule/[id]" 
          options={{ 
            title: 'Detail Jadwal',
            presentation: 'card' 
          }} 
        />
        <Stack.Screen 
          name="schedule/new" 
          options={{ 
            title: 'Tambah Jadwal',
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="logbook/[date]" 
          options={{ 
            title: 'Logbook',
            presentation: 'card' 
          }} 
        />
        <Stack.Screen 
          name="finance/new" 
          options={{ 
            title: 'Tambah Transaksi',
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="finance/report" 
          options={{ 
            title: 'Laporan Keuangan',
            presentation: 'card' 
          }} 
        />
        <Stack.Screen 
          name="finance/[id]" 
          options={{ 
            headerShown: false,
            presentation: 'card' 
          }} 
        />
        <Stack.Screen 
          name="finance/categories" 
          options={{ 
            title: 'Kelola Kategori',
            presentation: 'card' 
          }} 
        />
        <Stack.Screen 
          name="logbook/category/[id]" 
          options={{ 
            headerShown: false,
            presentation: 'card' 
          }} 
        />
        <Stack.Screen 
          name="calendar/[date]" 
          options={{ 
            headerShown: false,
            presentation: 'card' 
          }} 
        />
      </Stack>
    </ThemeProvider>
  );
}
