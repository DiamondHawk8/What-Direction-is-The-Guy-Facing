import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ComponentType } from 'react';
import { AppearanceProvider } from './src/ui/AppearanceProvider.tsx';
import { AppShell } from './src/ui/AppShell.tsx';

export default function App({ Shell = AppShell }: { Shell?: ComponentType }) {
  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <Shell />
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}
