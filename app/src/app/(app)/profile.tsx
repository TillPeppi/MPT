/** Profil mit Aktivität, Push-Einstellungen und Darstellung (Hell/Dunkel/System). */
import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Avatar, Btn, Disp, Grow, Lbl, Li, ListCard, Pill, Seg, Small, Switch, Txt } from '@/components/ui';
import { SEED } from '@/data/demo';
import type { PushPrefs } from '@/data/types';
import { level } from '@/lib/domain';
import { useApp, useMember } from '@/store/app';
import { emptySurvey, toast, useUi } from '@/store/ui';
import { useTheme, type ThemeMode } from '@/theme';

const PUSH: [keyof PushPrefs, string][] = [
  ['training', 'Trainingserinnerung'],
  ['booking', 'Buchungen & Warteliste'],
  ['streak', 'Streak & Punkte'],
  ['measure', 'Messung steht an'],
  ['supps', 'Supplements bald leer'],
  ['news', 'Studio News'],
];

export default function Profile() {
  const { c } = useTheme();
  const m = useMember();
  const u = m.user;
  const L = level(m.points);
  const mode = useApp((s) => s.themeMode);
  const app = useApp.getState();
  const info: [string, string][] = [['E-Mail', u.mail], ['Telefon', u.phone], ['Geburtstag', u.birth], ['Mitglied seit', u.since], ['Vertrag', u.contract], ['Coach', u.coach], ['Ziel', u.goal]];
  const act: [string, string, boolean][] = [
    ['Letztes Training', m.inactive ? 'vor 12 Tagen' : 'gestern', m.inactive],
    ['Einheiten gesamt', String(u.units), false],
    ['Ø pro Woche (8 Wochen)', '2,6', false],
    ['Wochen-Streak', String(u.streak), false],
  ];
  return (
    <Screen title="Profil">
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 6 }}>
        <Avatar ini={u.ini} size={76} />
        <Disp s={26}>{u.name}</Disp>
        <Pill text={`Level ${L.n} · ${L.name}`} style={{ alignSelf: 'center' }} />
      </View>
      <ListCard>
        {info.map(([k, v], i) => (
          <Li key={k} last={i === info.length - 1}>
            <Grow>
              <Small style={{ marginBottom: 2 }}>{k}</Small>
              <Txt f="semibold" s={14}>
                {v}
              </Txt>
            </Grow>
          </Li>
        ))}
      </ListCard>
      <Lbl>Aktivität</Lbl>
      <ListCard>
        {act.map(([k, v, hot], i) => (
          <Li key={k} last={i === act.length - 1}>
            <Txt f="semibold" s={14} style={{ flex: 1 }}>
              {k}
            </Txt>
            <Txt f="medium" s={12} c={hot ? c.acc : c.muted}>
              {v}
            </Txt>
          </Li>
        ))}
      </ListCard>
      <Lbl>Push-Benachrichtigungen</Lbl>
      <ListCard>
        {PUSH.map(([k, l], i) => (
          <Li key={k} last={i === PUSH.length - 1}>
            <Txt f="semibold" s={14} style={{ flex: 1 }}>
              {l}
            </Txt>
            <Switch label={l} on={m.push[k]} onToggle={() => app.togglePush(k)} />
          </Li>
        ))}
      </ListCard>
      <Lbl>Darstellung</Lbl>
      <Seg<ThemeMode> items={[['dark', 'Dunkel'], ['light', 'Hell'], ['system', 'System']]} value={mode} onChange={(v) => app.setTheme(v)} />
      <Btn kind="danger" icon="out" title="Abmelden" onPress={() => app.logout()} />

      <Lbl style={{ marginTop: 18 }}>Demo</Lbl>
      <Small>Nur für die Demo: Abläufe erneut auslösen.</Small>
      <Btn
        kind="ghost"
        small
        title="Recap & Umfrage wieder öffnen"
        onPress={() => {
          app.patch((x) => ({ recapDone: false, survey: null, scores: x.scores.filter((s) => s.kw !== 48) }));
          useUi.setState({ sv: emptySurvey() });
        }}
      />
      <Btn
        kind="ghost"
        small
        title={m.inactive ? 'Inaktivität aus' : 'Inaktivität simulieren'}
        onPress={() => {
          app.patch((x) => ({ inactive: !x.inactive }));
          toast(m.inactive ? 'Inaktivität aus' : 'Inaktivität simuliert');
        }}
      />
      <Btn
        kind="ghost"
        small
        title="Push: Messung steht an"
        onPress={() => app.notify('Messung steht an', 'Übermorgen, Fr 27.11. um 08:00: Checkup mit Marc-Luca. Bitte nüchtern kommen.', 'stats-checkup', 'me')}
      />
      <Btn
        kind="ghost"
        small
        title="Demo zurücksetzen"
        onPress={() => {
          app.patch(() => SEED());
          toast('Demo zurückgesetzt');
        }}
      />
    </Screen>
  );
}
