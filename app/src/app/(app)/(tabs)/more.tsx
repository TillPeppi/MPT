/** Mehr · Variante D (moreD()) mit Hero „2 · Level". */
import { Linking, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Tap } from '@/components/Tap';
import { Avatar, Bar, Grow, Group, GroupLabel, GroupRow, IconBox, Lbl, Pill, Row, SecTitle, Small, Txt, useCardStyle } from '@/components/ui';
import type { IconName } from '@/data/types';
import { fmtPoints, level, levelProgress, upcoming } from '@/lib/domain';
import { go } from '@/lib/nav';
import { useApp, useContent, useMember } from '@/store/app';
import { toast } from '@/store/ui';
import { useTheme } from '@/theme';

type Item = { v: string; i: IconName; t: string; s?: string; hot?: boolean };

export default function More() {
  return (
    <Screen root title="Mehr" sub="Alles rund um MPT">
      <LevelHero />
      <ForYou />
      <Lists />
    </Screen>
  );
}

function LevelHero() {
  const { c } = useTheme();
  const cs = useCardStyle();
  const m = useMember();
  const u = m.user;
  const L = level(m.points);
  const stats: [string, string, boolean][] = [[String(u.units), 'Einheiten', false], [String(u.streak), 'Wo.-Streak', true], [fmtPoints(m.points), 'Punkte', false]];
  return (
    <Tap onPress={() => go('rewards')} style={cs} accessibilityLabel={`${u.name}, Level ${L.n} ${L.name}, ${fmtPoints(m.points)} Punkte`}>
      <Row>
        <Avatar ini={u.ini} size={54} />
        <Grow>
          <Txt f="bold" s={17} ls={-0.2}>
            {u.name}
          </Txt>
          <Small>Mitglied seit {u.since}</Small>
        </Grow>
        <Pill tone="solid" text={`Level ${L.n}`} style={{ alignSelf: 'center' }} />
      </Row>
      <Row style={{ marginTop: 18, alignItems: 'baseline' }}>
        <Txt f="display" s={34} lh={36} up style={{ flex: 1 }}>
          {L.name}
        </Txt>
        <Small>
          {L.to - m.points} P bis {L.next}
        </Small>
      </Row>
      <Bar value={levelProgress(m.points)} height={8} style={{ marginTop: 8 }} />
      <View style={{ flexDirection: 'row', marginTop: 16 }}>
        {stats.map(([v, l, acc], i) => (
          <View key={l} style={{ flex: 1, alignItems: 'center', gap: 2, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.line }}>
            <Txt f="display" s={24} c={acc ? c.acc : c.text}>
              {v}
            </Txt>
            <Lbl>{l}</Lbl>
          </View>
        ))}
      </View>
    </Tap>
  );
}

function ForYou() {
  const { c } = useTheme();
  const cs = useCardStyle();
  const m = useMember();
  const a1 = useContent().articles[0];
  const f: Item[] = [];
  if (!m.survey) f.push({ i: 'poll', t: 'Umfrage: Trainingszeiten 2027', s: '3 Fragen · offen', v: 'survey', hot: true });
  m.supps.filter((s) => s.days <= 7).forEach((s) => f.push({ i: 'pill', t: `${s.name.split(' ')[0]} bald leer`, s: 'Nachbestellen', v: 'supps' }));
  f.push(
    { i: 'target', t: 'Challenge: Platz 4', s: `${m.user.monthUnits}/12 Einheiten`, v: 'challenge' },
    { i: 'leaf', t: a1.t, s: 'Neu bei Ernährung', v: `article|${a1.id}` },
    { i: 'trophy', t: 'Belohnungen', s: `${fmtPoints(m.points)} Punkte`, v: 'rewards' },
  );
  return (
    <>
      <SecTitle title="Für dich" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {f.slice(0, 4).map((x) => (
          <Tap key={x.v} onPress={() => go(x.v)} accessibilityLabel={`${x.t}, ${x.s}`}
            style={[cs, { width: '48.4%', minHeight: 118, padding: 14, gap: 8 }, x.hot ? { backgroundColor: c.acc, borderColor: c.acc } : null]}>
            <IconBox name={x.i} tone={x.hot ? { bg: 'rgba(10,10,11,0.12)', fg: '#0a0a0b' } : undefined} />
            <Txt f="bold" s={13.5} lh={17} c={x.hot ? '#0a0a0b' : c.text}>
              {x.t}
            </Txt>
            <Txt f="medium" s={11.5} c={x.hot ? 'rgba(10,10,11,0.65)' : c.muted} style={{ marginTop: 'auto' }}>
              {x.s}
            </Txt>
          </Tap>
        ))}
      </View>
    </>
  );
}

function Lists() {
  const m = useMember();
  const content = useContent();
  const low = m.supps.filter((s) => s.days <= 7).length;
  const all: Item[] = [
    { v: 'rewards', i: 'trophy', t: 'Belohnungen', s: `${fmtPoints(m.points)} P` },
    { v: 'challenge', i: 'target', t: 'Challenges & Bestenliste', s: 'Platz 4' },
    { v: 'supps', i: 'pill', t: 'Meine Supps', s: low ? '1 bald leer' : '', hot: !!low },
    { v: 'mybookings', i: 'cal', t: 'Meine Termine', s: String(upcoming(m).length) },
    { v: 'shop', i: 'bag', t: 'Shop', s: 'Anfragen' },
    { v: 'nutrition', i: 'leaf', t: 'Ernährung', s: `${content.articles.length} Artikel` },
    { v: 'news', i: 'mega', t: 'Studio News' },
    { v: 'wa', i: 'chat', t: 'WhatsApp-Kanal' },
    { v: 'videos', i: 'play', t: 'Video-Bibliothek', s: 'bald' },
    { v: 'surveys', i: 'poll', t: 'Umfragen', s: m.survey ? 'erledigt' : '1 offen', hot: !m.survey },
  ];
  const konto: Item[] = [
    { v: 'profile', i: 'gear', t: 'Einstellungen & Push' },
    { v: 'call', i: 'phone', t: 'Kontakt zum Studio' },
    { v: 'logout', i: 'out', t: 'Abmelden' },
  ];
  const act = (v: string) => () => {
    if (v === 'wa') return toast('Öffnet den MPT WhatsApp-Kanal');
    if (v === 'call') return Linking.openURL('tel:+4917645982476').catch(() => toast('Ruft +49 176 45982476 an'));
    if (v === 'logout') return useApp.getState().logout();
    go(v);
  };
  return (
    <>
      <GroupLabel>Alles</GroupLabel>
      <Group>
        {all.map((x, i) => (
          <GroupRow key={x.v} first={i === 0} icon={x.i} title={x.t} value={x.s} valueAcc={x.hot} onPress={act(x.v)} />
        ))}
      </Group>
      <GroupLabel>Konto</GroupLabel>
      <Group>
        {konto.map((x, i) => (
          <GroupRow key={x.v} first={i === 0} icon={x.i} title={x.t} chevron={x.v !== 'logout'} onPress={act(x.v)} />
        ))}
      </Group>
    </>
  );
}
