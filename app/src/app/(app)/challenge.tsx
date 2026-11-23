import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Bar, Btn, Card, Disp, Lbl, Row, Small, Txt } from '@/components/ui';
import { useApp, useContent, useMember } from '@/store/app';
import { useTheme } from '@/theme';

export default function Challenge() {
  const { c } = useTheme();
  const m = useMember();
  const ranking = useContent().ranking;
  const ink = '#0a0a0b';
  return (
    <Screen title="Challenges">
      <View style={{ backgroundColor: '#F2611D', borderRadius: 20, padding: 16 }}>
        <Lbl c="rgba(10,10,11,0.6)">Läuft · bis 30.11.</Lbl>
        <Disp s={30} lh={32} c={ink} style={{ marginTop: 4 }}>
          {'12 Einheiten\nim November'}
        </Disp>
        <Row style={{ marginTop: 10 }}>
          <Txt f="bold" s={13} c={ink} style={{ flex: 1 }}>
            Du: {m.user.monthUnits}/12
          </Txt>
          <Txt f="bold" s={13} c={ink}>
            +200 Punkte
          </Txt>
        </Row>
        <Bar value={m.user.monthUnits / 12} color={ink} track="rgba(10,10,11,0.2)" style={{ marginTop: 6 }} />
      </View>
      <Lbl>Bestenliste</Lbl>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        {ranking.map(([name, units, me], i) => (
          <Row
            key={name}
            gap={10}
            style={[
              { paddingVertical: 10, borderBottomWidth: i === ranking.length - 1 || me ? 0 : StyleSheet.hairlineWidth * 2, borderBottomColor: c.line },
              me ? { backgroundColor: c.soft, marginHorizontal: -14, paddingHorizontal: 14, borderRadius: 12 } : null,
            ]}
          >
            <Txt f="display" s={18} c={me ? c.acc : c.muted} style={{ width: 26, textAlign: 'center' }}>
              {i + 1}
            </Txt>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.card2, alignItems: 'center', justifyContent: 'center' }}>
              <Txt f="heavy" s={11}>
                {name.split(' ').map((x) => x[0]).join('')}
              </Txt>
            </View>
            <Txt f="semibold" s={13.5} style={{ flex: 1 }}>
              {me ? 'Du' : name}
            </Txt>
            <Txt f="heavy" s={14}>
              {units}
            </Txt>
          </Row>
        ))}
      </Card>
      <Card>
        <Lbl>Ab 1. Dezember</Lbl>
        <Txt f="bold" s={15} style={{ marginTop: 4 }}>
          Ruderduell 2.000 m
        </Txt>
        <Small style={{ marginTop: 4 }}>Beste Zeit zählt, eingetragen vom Coach. Wer sich verbessert, bekommt +150 Punkte.</Small>
        <Btn
          small
          kind={m.challengeJoin ? 'ghost' : 'primary'}
          icon={m.challengeJoin ? 'check' : undefined}
          title={m.challengeJoin ? 'Angemeldet' : 'Mitmachen'}
          onPress={() => useApp.getState().toggleChallenge()}
          style={{ marginTop: 12 }}
        />
      </Card>
    </Screen>
  );
}
