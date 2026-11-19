import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ViewerScreen } from './src/ui/ViewerScreen.tsx';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ViewerScreen />
    </SafeAreaProvider>
  );
}
