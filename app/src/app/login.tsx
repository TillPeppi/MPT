import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Shade } from '@/components/Shade';
import { Btn, Txt } from '@/components/ui';
import { IMAGES } from '@/data/images';
import { useApp } from '@/store/app';
import { font, ORANGE } from '@/theme';

export default function Login() {
  const ins = useSafeAreaInsets();
  const [mail, setMail] = useState('lena.meyer@demo.mpt');
  const [pw, setPw] = useState('demo-demo');
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0b' }}>
      <Image source={IMAGES['studio-gym']} style={StyleSheet.absoluteFill} contentFit="cover" />
      <Shade stops={[[0, 0.35], [0.62, 0.97], [1, 0.97]]} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: ins.bottom + 40 }}>
        <Txt f="display" s={64} lh={60} c="#fff" accessibilityLabel="MPT">
          M<Txt f="display" s={64} c={ORANGE}>P</Txt>T
        </Txt>
        <Txt f="semibold" s={13} ls={1.8} up c="#a1a1aa" style={{ marginTop: 8 }}>
          Metsch Personal Training
        </Txt>
        <Txt f="semibold" s={12} c="#a1a1aa" style={styles.label}>
          E-Mail
        </Txt>
        <TextInput value={mail} onChangeText={setMail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={styles.field} accessibilityLabel="E-Mail" />
        <Txt f="semibold" s={12} c="#a1a1aa" style={styles.label}>
          Passwort
        </Txt>
        <TextInput value={pw} onChangeText={setPw} secureTextEntry autoComplete="password" style={styles.field} accessibilityLabel="Passwort" />
        <Btn
          title={busy ? 'Anmelden …' : 'Anmelden'}
          disabled={busy}
          style={{ marginTop: 20 }}
          onPress={async () => {
            setBusy(true);
            await useApp.getState().login(mail, pw);
          }}
        />
        <Txt s={12} c="#a1a1aa" center style={{ marginTop: 14 }}>
          Demo-User: Lena Meyer · Passwort egal
        </Txt>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 14, marginBottom: 6 },
  field: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: '#fff', fontFamily: font.regular },
});
