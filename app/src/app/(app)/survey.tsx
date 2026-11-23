/** Umfrage „Trainingszeiten 2027". Nicht Pflicht; nach dem Absenden gesperrt. */
import { TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Btn, Card, Chip, Empty, Lbl, Small, Txt } from '@/components/ui';
import { SURVEY } from '@/data/demo';
import { useMember } from '@/store/app';
import { useUi } from '@/store/ui';
import { font, useTheme } from '@/theme';

export default function Survey() {
  const { c } = useTheme();
  const m = useMember();
  const sv = useUi((s) => s.sv);
  const set = (p: Partial<typeof sv>) => useUi.setState((s) => ({ sv: { ...s.sv, ...p } }));
  if (m.survey)
    return (
      <Screen title="Umfrage">
        <Empty>Schon ausgefüllt. Antworten sind nicht mehr änderbar.</Empty>
      </Screen>
    );
  const Q = (t: string) => (
    <Txt f="bold" style={{ marginTop: 4, marginBottom: 10 }}>
      {t}
    </Txt>
  );
  return (
    <Screen title="Umfrage" sub={SURVEY.title}>
      <Card>
        <Lbl>Frage 1 · Mehrfachauswahl</Lbl>
        {Q('Wann trainierst du am liebsten?')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {SURVEY.times.map((t) => (
            <Chip key={t} label={t} on={sv.times.includes(t)} onPress={() => set({ times: sv.times.includes(t) ? sv.times.filter((x) => x !== t) : [...sv.times, t] })} />
          ))}
        </View>
      </Card>
      <Card>
        <Lbl>Frage 2</Lbl>
        {Q('Bock auf was Neues?')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {SURVEY.neu.map((t) => (
            <Chip key={t} label={t} on={sv.neu === t} onPress={() => set({ neu: t })} />
          ))}
        </View>
      </Card>
      <Card>
        <Lbl>Frage 3 · optional</Lbl>
        {Q('Was möchtest du uns noch sagen?')}
        <TextInput
          multiline
          value={sv.text}
          onChangeText={(text) => set({ text })}
          accessibilityLabel="Was möchtest du uns noch sagen?"
          style={{ minHeight: 80, textAlignVertical: 'top', backgroundColor: c.card2, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 14, fontSize: 14, color: c.text, fontFamily: font.regular }}
        />
      </Card>
      <Btn title="Absenden" disabled={!sv.times.length || !sv.neu} onPress={() => useUi.getState().openSheet({ t: 'svConfirm' })} />
      <Small center>Nach dem Absenden kannst du nichts mehr ändern.</Small>
    </Screen>
  );
}
