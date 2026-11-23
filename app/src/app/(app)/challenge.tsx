/** Monats-Challenge mit Bestenliste (Zeiten trägt der Coach ein) und Ausblick auf die nächste. */
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Btn, Card, Disp, Lbl, Row, Small, Txt } from '@/components/ui';
import { challengeStats, fmtChallenge } from '@/lib/domain';
import { useApp, useContent, useMember } from '@/store/app';
import { useTheme } from '@/theme';

export default function Challenge() {
  const { c } = useTheme();
  const m = useMember();
  const ch = useContent().challenge;
  const st = challengeStats(ch);
  const ink = '#0a0a0b';
  return (
    <Screen title="Challenges">
      <View style={{ backgroundColor: '#F2611D', borderRadius: 20, padding: 16 }}>
        <Lbl c="rgba(10,10,11,0.6)">{`${ch.month}-Challenge · läuft bis ${ch.ends}`}</Lbl>
        <Disp s={30} lh={32} c={ink} style={{ marginTop: 4 }}>
          {ch.title}
        </Disp>
        <Txt s={12.5} c="rgba(10,10,11,0.7)">
          {ch.sub}
        </Txt>
        <Row style={{ marginTop: 12, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Lbl c="rgba(10,10,11,0.6)">Deine Bestzeit</Lbl>
            <Txt f="display" s={36} c={ink}>
              {st.best !== undefined ? fmtChallenge(ch, st.best) : '–'}
            </Txt>
          </View>
          <Txt f="bold" s={13} c={ink}>
            Platz {st.rank} von {ch.participants}
          </Txt>
        </Row>
        <Txt f="bold" s={12} c={ink} style={{ marginTop: 8 }}>
          {ch.reward}
        </Txt>
      </View>
      <Lbl>Bestenliste</Lbl>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        {ch.board.map(([name, v, me], i) => (
          <Row
            key={name}
            gap={10}
            style={[
              { paddingVertical: 10, borderBottomWidth: i === ch.board.length - 1 || me ? 0 : StyleSheet.hairlineWidth * 2, borderBottomColor: c.line },
              me ? { backgroundColor: c.soft, marginHorizontal: -14, paddingHorizontal: 14, borderRadius: 12 } : null,
            ]}
          >
            <Txt f="display" s={18} c={me || i === 0 ? c.acc : c.muted} style={{ width: 26, textAlign: 'center' }}>
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
            <Txt f="heavy" s={14} style={{ fontVariant: ['tabular-nums'] }}>
              {fmtChallenge(ch, v)}
            </Txt>
          </Row>
        ))}
      </Card>
      <Small center>
        {`Top ${ch.board.length} von ${ch.participants}. Deine Zeit trägt dein Coach nach jedem Lauf ein.`}
      </Small>
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
