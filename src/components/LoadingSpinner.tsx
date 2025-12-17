import { useColorScheme } from '@/components/useColorScheme';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    View
} from 'react-native';

export default function LoadingSpinner() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
