import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setStatusBarStyle } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PushHost, ToastHost } from '@/components/Overlays';
import { SheetHost } from '@/features/sheets';
import { gateNeeded } from '@/lib/domain';
import { api } from '@/services';
import { useApp } from '@/store/app';
import { useUi } from '@/store/ui';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fonts] = useFonts({ Anton_400Regular, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const hydrated = useApp((s) => s.hydrated);
  const content = useApp((s) => s.content);
  const ready = fonts && hydrated && !!content;

  useEffect(() => {
    useApp.getState().init();
    return api.subscribe((e) => useApp.getState().handleServerEvent(e));
  }, []);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <AppStack />
        <SheetHost />
        <ToastHost />
        <PushHost />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

function AppStack() {
  const { c, name } = useTheme();
  const loggedIn = useApp((s) => s.loggedIn);
  const member = useApp((s) => s.member);
  const gateResult = useUi((s) => s.gateResult);
  // Wochenrecap ist Pflicht: solange offen, kommt er als Vollbild-Ablauf vor Home.
  const gate = loggedIn && (gateNeeded(member) || gateResult);

  useEffect(() => {
    setStatusBarStyle(name === 'dark' ? 'light' : 'dark');
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => undefined);
  }, [name, c.bg]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Protected guard={!loggedIn}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={gate}>
        <Stack.Screen name="gate" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn && !gate}>
        <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}
