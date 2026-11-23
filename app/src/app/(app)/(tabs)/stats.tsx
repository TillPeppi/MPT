/** Statistik (S.stats): Körper, Übungen, Checkup, MPT Score. Nur Ansicht. */
import { ScrollView, View } from 'react-native';

import { LineChart, Ring } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Tap } from '@/components/Tap';
import { Btn, Card, Chip, Chk, Disp, Grow, IconBox, Lbl, Li, ListCard, LiText, Pill, Row, Small, Txt, useCardStyle } from '@/components/ui';
import type { MetricKey } from '@/data/types';
import { fmtEx, lastScore } from '@/lib/domain';
import { num } from '@/lib/format';
import { go } from '@/lib/nav';
import { useContent, useMember } from '@/store/app';
import { useUi, type StatTab } from '@/store/ui';
import { useTheme } from '@/theme';

import { SubScores } from '@/features/parts';

const TABS: [StatTab, string][] = [['body', 'Körper'], ['ex', 'Übungen'], ['checkup', 'Checkup'], ['score', 'MPT Score']];

export default function Stats() {
  const t = useUi((s) => s.statTab);
  return (
    <Screen root title="Statistik" sub={t === 'checkup' ? 'Letzter Checkup 26.10.' : t === 'score' ? 'Wöchentlich nach dem Recap' : 'Letzte Messung 26.10.'}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0 }}>
        {TABS.map(([k, l]) => (
          <Chip key={k} label={l} on={t === k} onPress={() => useUi.setState({ statTab: k })} />
        ))}
      </ScrollView>
      {t === 'body' ? <Body /> : t === 'ex' ? <Exercises /> : t === 'checkup' ? <Checkup /> : <Score />}
    </Screen>
  );
}

function Body() {
  const { c } = useTheme();
  const cs = useCardStyle();
  const body = useContent().body;
  const metric = useUi((s) => s.metric);
  const mt = body.metrics[metric];
  const last = mt.v[mt.v.length - 1];
  const d = last - mt.v[0];
  const good = Math.sign(d) === mt.good;
  return (
    <>
      <Card>
        <Lbl>{mt.l}</Lbl>
        <Row gap={8} style={{ alignItems: 'baseline', marginTop: 4 }}>
          <Txt f="display" s={58} lh={60}>
            {num(last)}
          </Txt>
          <Disp s={20}>{mt.u}</Disp>
          <Pill tone={good ? 'acc' : 'grey'} text={`${d > 0 ? '+' : ''}${num(d)} ${mt.u} seit Juni`} style={{ marginLeft: 'auto', alignSelf: 'center' }} />
        </Row>
        <View style={{ marginTop: 8 }}>
          <LineChart vals={mt.v} labels={body.dates} />
        </View>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {(['weight', 'lean', 'kfa', 'skin'] as MetricKey[]).map((k) => {
          const x = body.metrics[k];
          const l = x.v[x.v.length - 1];
          const dd = l - x.v[x.v.length - 2];
          const sel = metric === k;
          return (
            <Tap key={k} onPress={() => useUi.setState({ metric: k })} accessibilityState={{ selected: sel }}
              style={[cs, { width: '48.4%' }, sel ? { borderColor: c.acc, borderWidth: 2, padding: 15 } : null]}>
              <Lbl>{x.l}</Lbl>
              <Txt f="display" s={26} style={{ marginTop: 4 }}>
                {num(l)}
                <Txt f="semibold" s={12} c={c.muted}>
                  {' '}
                  {x.u}
                </Txt>
              </Txt>
              <Txt f="bold" s={11} c={Math.sign(dd) === x.good ? c.ok : c.acc} style={{ marginTop: 2 }}>
                {dd > 0 ? '+' : ''}
                {num(dd)} {x.u}
              </Txt>
            </Tap>
          );
        })}
      </View>
      <Card style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
        <Row>
          <IconBox name="pulse" />
          <Grow>
            <Txt f="bold" s={13.5}>
              Nächste Messung
            </Txt>
            <Small>Fr 27.11., 08:00 beim Checkup</Small>
          </Grow>
        </Row>
      </Card>
      <Small center>Gemessen und eingetragen von deinem Coach</Small>
    </>
  );
}

function Exercises() {
  const { c } = useTheme();
  const ex = useContent().exercises;
  return (
    <>
      <Card style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
        <Row>
          <IconBox name="cam" />
          <Grow>
            <Txt f="bold" s={13.5}>
              Plan 4 · Kraftaufbau
            </Txt>
            <Small>Vergleich mit Plan 3. Plan-Fotos werden am Planende per AI eingelesen.</Small>
          </Grow>
        </Row>
      </Card>
      <ListCard>
        {ex.map((e, i) => {
          const cur = e.v[3];
          const prev = e.v[2];
          const better = e.lower ? cur < prev : cur > prev;
          const dd = e.u === 'time' ? Math.abs(cur - prev) + ' s' : num(Math.abs(cur - prev)) + ' ' + e.u;
          const sign = e.lower ? (better ? '−' : '+') : better ? '+' : '−';
          return (
            <Li key={e.id} last={i === ex.length - 1} onPress={() => go(`exercise|${e.id}`)}>
              <LiText title={e.n} sub={e.p} />
              <Row gap={6}>
                <Txt f="bold" s={12}>
                  {fmtEx(e, cur)}
                </Txt>
                <Txt f="heavy" s={12} c={better ? c.ok : c.acc}>
                  {sign}
                  {dd}
                </Txt>
                <Icon name="chev" size={16} color={c.muted} />
              </Row>
            </Li>
          );
        })}
      </ListCard>
      <Small center>Nur Ansicht. Werte trägt dein Coach ein.</Small>
    </>
  );
}

function Checkup() {
  const { c } = useTheme();
  const ch = useContent().checkup;
  const pts = ch.joints.reduce((a, j) => a + j.items.filter((i) => i[1]).length, 0);
  return (
    <>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Ring value={pts * 10} size={84} sw={8} label="" />
        <Grow>
          <Lbl>{`Checkup ${ch.date}`}</Lbl>
          <Txt f="heavy" s={16} style={{ marginTop: 2 }}>
            Gelenk-Screen {pts}/10
          </Txt>
          <Small>Überkopfkniebeuge · vorher {ch.prev}/10</Small>
        </Grow>
      </Card>
      {ch.joints.map((j) => {
        const ok = j.items.filter((i) => i[1]).length;
        return (
          <Card key={j.n}>
            <Row>
              <Txt f="bold" s={14} style={{ flex: 1 }}>
                {j.n}
              </Txt>
              <Pill tone={ok === j.items.length ? 'ok' : 'acc'} text={`${ok}/${j.items.length}`} />
            </Row>
            <View style={{ marginTop: 4 }}>
              {j.items.map(([t, good], i) => (
                <Li key={t} last={i === j.items.length - 1} style={{ paddingVertical: 8 }}>
                  <Chk ok={good} icon={good ? 'check' : 'alert'} />
                  <Txt f="medium" s={13} style={{ flex: 1 }}>
                    {t}
                  </Txt>
                  {!good ? <Small>auffällig</Small> : null}
                </Li>
              ))}
            </View>
            <Small style={{ marginTop: 6 }}>{j.note}</Small>
          </Card>
        );
      })}
      <Card>
        <Lbl>Planübersicht</Lbl>
        <Txt f="bold" style={{ marginTop: 4 }}>
          Plan 4 · Kraftaufbau Unterkörper
        </Txt>
        <Small>26.10. bis 06.12. · 3 Einheiten pro Woche</Small>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {['Kniebeuge-Technik', 'Sprunggelenk-Mobility', 'Rumpf'].map((x) => (
            <Pill key={x} tone="grey" text={x} />
          ))}
        </View>
      </Card>
      <View style={{ backgroundColor: c.soft, borderRadius: 20, padding: 16 }}>
        <Lbl c={c.acc}>Notizen vom Coach</Lbl>
        <Txt s={13.5} lh={20} style={{ marginTop: 6 }}>
          Super Entwicklung beim Körperfett! Bitte vor jeder Einheit 5 Minuten Sprunggelenk und Brustwirbelsäule mobilisieren. Beim nächsten Checkup testen wir die
          Überkopfkniebeuge erneut. – Marc-Luca
        </Txt>
      </View>
      <NextCheckup />
    </>
  );
}

function NextCheckup() {
  const { c } = useTheme();
  const b = useMember().bookings.find((x) => x.type === 'checkup');
  return (
    <Card onPress={() => (b ? useUi.getState().openSheet({ t: 'booking', id: b.id }) : go('book-checkup'))} style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
      <Row>
        <IconBox name="cal" />
        <Grow>
          <Txt f="bold" s={13.5}>
            Nächster Checkup
          </Txt>
          <Small>{b ? `Fr 27.11., ${b.time} mit ${b.coach}` : 'Noch nicht gebucht · jetzt anfragen'}</Small>
        </Grow>
        <Icon name="chev" size={16} color={c.muted} />
      </Row>
    </Card>
  );
}

function Score() {
  const m = useMember();
  const ls = lastScore(m);
  return (
    <>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring value={ls.s} size={118} sw={10} />
        <SubScores s={ls} />
      </Card>
      <Card>
        <Lbl style={{ marginBottom: 10 }}>Verlauf</Lbl>
        <LineChart vals={m.scores.map((s) => s.s)} labels={m.scores.map((s) => 'KW' + s.kw)} showVals />
      </Card>
      <Card>
        <Lbl>So entsteht dein Score</Lbl>
        <Txt s={12.5} lh={18} style={{ marginTop: 6 }}>
          Aus deinem Wochenrecap: Schlaf, Energie, Zufriedenheit mit dem Essen und wie gut du dein Training selbst fandest. Dazu kommt, wie viele Einheiten du geschafft hast.
          Alles zusammen ergibt 0 bis 100.
        </Txt>
        {!m.recapDone ? <Btn small title="Recap KW 48 ausfüllen" onPress={() => go('recap')} style={{ marginTop: 12 }} /> : null}
      </Card>
    </>
  );
}
