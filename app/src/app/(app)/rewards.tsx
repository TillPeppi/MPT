import { View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Tap } from '@/components/Tap';
import { Bar, Card, Grow, IconBox, Lbl, Li, ListCard, Row, Small, Txt } from '@/components/ui';
import { Hex } from '@/features/sheets';
import { challengeStats, fmtChallenge, fmtPoints, level, levelProgress } from '@/lib/domain';
import { go } from '@/lib/nav';
import { useContent, useMember } from '@/store/app';
import { useUi } from '@/store/ui';
import { useTheme } from '@/theme';

const EARN: [string, string][] = [
  ['Einheit (bis 3× pro Woche)', '+10'],
  ['Wochen-Streak gehalten', '+25'],
  ['Wochenrecap ausgefüllt', '+30'],
  ['50. Einheit', '+250'],
  ['Challenge geschafft', '+100 bis 200'],
];

export default function Rewards() {
  const { c } = useTheme();
  const m = useMember();
  const { badges, challenge: ch } = useContent();
  const st = challengeStats(ch);
  const L = level(m.points);
  return (
    <Screen title="Belohnungen">
      <Card>
        <Lbl>Deine Punkte</Lbl>
        <Txt f="display" s={58} lh={60} style={{ marginTop: 4 }}>
          {fmtPoints(m.points)}
        </Txt>
        <Row style={{ marginTop: 10 }}>
          <Txt f="bold" s={12} style={{ flex: 1 }}>
            Level {L.n} · {L.name}
          </Txt>
          <Small>
            {L.to - m.points} bis {L.next}
          </Small>
        </Row>
        <Bar value={levelProgress(m.points)} style={{ marginTop: 6 }} />
      </Card>
      <Card onPress={() => go('challenge')}>
        <Row>
          <IconBox name="target" />
          <Grow>
            <Lbl>{`${ch.month}-Challenge`}</Lbl>
            <Txt f="bold" s={14}>
              {ch.title}
            </Txt>
            <Small style={{ marginTop: 2 }}>
              {`Bestzeit ${st.best !== undefined ? fmtChallenge(ch, st.best) : '–'} · Platz ${st.rank} von ${ch.participants} · noch ${ch.daysLeft} Tage`}
            </Small>
          </Grow>
          <Icon name="chev" size={16} color={c.muted} />
        </Row>
      </Card>
      <Lbl>Badges</Lbl>
      <Card style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
        {badges.map((b, i) => (
          <Tap key={b.n} onPress={() => useUi.getState().openSheet({ t: 'badge', i })} style={{ width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 3 }}
            accessibilityLabel={`${b.n}, ${b.got ? 'freigeschaltet' : 'gesperrt'}`}>
            <Hex got={b.got}>
              <Icon name={b.i} color={b.got ? '#0a0a0b' : c.muted} />
            </Hex>
            <Txt f="semibold" s={10.5} lh={13} c={b.got ? c.text : c.muted} center>
              {b.n}
            </Txt>
          </Tap>
        ))}
      </Card>
      <Lbl>So sammelst du Punkte</Lbl>
      <ListCard>
        {EARN.map(([a, p], i) => (
          <Li key={a} last={i === EARN.length - 1}>
            <Txt f="semibold" s={14} style={{ flex: 1 }}>
              {a}
            </Txt>
            <Txt f="heavy" s={12} c={c.acc}>
              {p}
            </Txt>
          </Li>
        ))}
      </ListCard>
      <View />
    </Screen>
  );
}
