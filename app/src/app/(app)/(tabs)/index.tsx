/** Home · Variante „4 · Studio" mit Foto-Hero (homeH() + st.homeHero === 'photo'). */
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniWeek, PtsRing, Ring } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { NAV_H, Screen } from '@/components/Screen';
import { Shade } from '@/components/Shade';
import { Tap } from '@/components/Tap';
import { Bar, Btn, Card, Chk, Disp, Grow, IconBox, Lbl, Li, LiText, Pill, Row, Small, Txt, useCardStyle } from '@/components/ui';
import { IMAGES } from '@/data/images';
import { SURVEY } from '@/data/demo';
import { fmtPoints, lastScore, levelProgress, nextConfirmed, openUnits, prevScore, scoreDelta } from '@/lib/domain';
import { longDate, rel, TODAY } from '@/lib/format';
import { bookDay, go } from '@/lib/nav';
import { useContent, useMember } from '@/store/app';
import { useUi } from '@/store/ui';
import { useTheme } from '@/theme';

export default function Home() {
  return (
    <Screen title={`Hey ${useMember().user.first}`} root noLargeTitle bleedTop>
      <Hero />
      <Inactive />
      <StatsStrip />
      <Surveys />
      <Challenge />
      <Supplements />
      <OpenUnits />
      <News />
    </Screen>
  );
}

function Hero() {
  const m = useMember();
  const ins = useSafeAreaInsets();
  const nb = nextConfirmed(m);
  const openBooking = () => nb && useUi.getState().openSheet({ t: 'booking', id: nb.id });
  return (
    <View style={[styles.poster, { paddingTop: ins.top + NAV_H + 16 }]}>
      <Image source={IMAGES[nb?.type === 'checkup' ? 'trainer-bench' : 'studio-gym']} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <Shade stops={[[0, 0.45], [0.35, 0.35], [1, 0.96]]} />
      <Lbl c="#d4d4d8">{`${longDate(TODAY)} · Hey ${m.user.first}`}</Lbl>
      {nb ? (
        <>
          <Lbl c="#F2611D" style={{ marginTop: 14 }}>
            {`Nächstes ${nb.type === 'checkup' ? 'Checkup' : 'Training'}`}
          </Lbl>
          <Disp s={38} lh={40} c="#fff" style={{ marginTop: 6 }}>
            {`${rel(nb.date)} · ${nb.time}\n${nb.title}`}
          </Disp>
          <Txt s={12.5} c="#d4d4d8" style={{ marginTop: 6 }}>
            mit Coach {nb.coach}
          </Txt>
          <Row gap={8} style={{ marginTop: 16 }}>
            <Btn title="Details" full={false} onPress={openBooking} />
            <Btn title="Absagen" kind="onDark" full={false} onPress={openBooking} />
          </Row>
        </>
      ) : (
        <>
          <Disp s={38} lh={40} c="#fff" style={{ marginTop: 10 }}>
            {'Zeit für die\nnächste Einheit'}
          </Disp>
          <Row style={{ marginTop: 16 }}>
            <Btn icon="plus" title="Training buchen" full={false} onPress={() => go('book-group')} />
          </Row>
        </>
      )}
    </View>
  );
}

function Inactive() {
  const m = useMember();
  const { c } = useTheme();
  if (!m.inactive) return null;
  return (
    <Card style={{ borderColor: c.acc, borderWidth: 1 }}>
      <Row>
        <IconBox name="alert" hot />
        <Grow>
          <Txt f="bold" s={14}>
            Seit 12 Tagen kein Training
          </Txt>
          <Small>Dein Streak ist in Gefahr. Wir vermissen dich!</Small>
        </Grow>
      </Row>
    </Card>
  );
}

/** Score · Streak · Punkte nebeneinander mit senkrechten Trennlinien (.ssh) */
function StatsStrip() {
  const m = useMember();
  const { c } = useTheme();
  const ls = lastScore(m);
  const up = ls.s >= prevScore(m).s;
  const col = (i: number) => [styles.sshCol, i ? { borderLeftWidth: StyleSheet.hairlineWidth * 2, borderLeftColor: c.line } : null];
  return (
    <Card style={{ flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 4 }}>
      <Tap style={col(0)} onPress={() => go('stats-score')} accessibilityLabel={`MPT Score ${ls.s}, ${scoreDelta(m)} zur Vorwoche`}>
        <Ring value={ls.s} size={58} sw={5} label="" />
        <Txt f="heavy" s={15} c={up ? c.ok : c.acc} style={{ marginTop: 6 }}>
          {scoreDelta(m)}
        </Txt>
        <Lbl>Score</Lbl>
      </Tap>
      <Tap style={col(1)} onPress={() => go('rewards')} accessibilityLabel={`Streak ${m.user.streak} Wochen`}>
        <MiniWeek done={m.user.weekDone} />
        <Row gap={3} style={{ marginTop: 6 }}>
          <Icon name="flame" size={15} color={c.acc} />
          <Txt f="heavy" s={15}>
            {m.user.streak} Wo.
          </Txt>
        </Row>
        <Lbl>Streak</Lbl>
      </Tap>
      <Tap style={col(2)} onPress={() => go('rewards')} accessibilityLabel={`${fmtPoints(m.points)} Punkte`}>
        <PtsRing p={levelProgress(m.points)} />
        <Txt f="heavy" s={15} style={{ marginTop: 6 }}>
          {fmtPoints(m.points)}
        </Txt>
        <Lbl>Punkte</Lbl>
      </Tap>
    </Card>
  );
}

/** Umfragen als Liste; ausgefüllte sind gesperrt. Nicht Pflicht. */
function Surveys() {
  const m = useMember();
  const { c } = useTheme();
  const rows = [
    { id: 'survey', t: SURVEY.title, s: `3 Fragen · bis ${SURVEY.due}`, done: !!m.survey },
    { id: 'q3', t: 'Studio-Zufriedenheit Q3', s: 'ausgefüllt am 12.10.', done: true },
  ];
  const open = rows.filter((x) => !x.done).length;
  return (
    <Card style={{ paddingTop: 4, paddingBottom: 6 }}>
      <Row style={{ paddingTop: 12, paddingBottom: 2 }}>
        <Lbl style={{ flex: 1 }}>Umfragen</Lbl>
        {open ? <Pill tone="solid" text={`${open} offen`} /> : null}
      </Row>
      {rows.map((x, i) =>
        x.done ? (
          <Li key={x.id} last={i === rows.length - 1} style={{ opacity: 0.55 }}>
            <Chk ok />
            <LiText title={x.t} sub={x.id === 'survey' ? 'ausgefüllt · nicht mehr änderbar' : x.s} />
            <Icon name="lock" size={16} color={c.muted} />
          </Li>
        ) : (
          <Li key={x.id} last={i === rows.length - 1} onPress={() => go('survey')}>
            <IconBox name="poll" hot size={32} />
            <LiText title={x.t} sub={x.s} />
            <Icon name="chev" size={16} color={c.muted} />
          </Li>
        ),
      )}
    </Card>
  );
}

function Challenge() {
  const m = useMember();
  const ink = '#0a0a0b';
  return (
    <Tap onPress={() => go('challenge')} style={styles.chal} accessibilityLabel={`Monats-Challenge: ${m.user.monthUnits} von 12 Einheiten, Platz 4`}>
      <Lbl c="rgba(10,10,11,0.62)">Monats-Challenge · noch 5 Tage</Lbl>
      <Row style={{ alignItems: 'flex-start', marginTop: 6 }}>
        <Txt f="heavy" s={22} lh={25} c={ink} style={{ flex: 1 }}>
          12 Einheiten im November
        </Txt>
        <View style={styles.chalIc}>
          <Icon name="trophy" size={24} color={ink} />
        </View>
      </Row>
      <Bar value={m.user.monthUnits / 12} color={ink} track="rgba(10,10,11,0.18)" style={{ marginTop: 14 }} />
      <Row style={{ marginTop: 8 }}>
        <Txt f="bold" s={12} c={ink} style={{ flex: 1 }}>
          {m.user.monthUnits}/12 Einheiten · Platz 4
        </Txt>
        <Txt f="bold" s={12} c={ink}>
          +200 Punkte
        </Txt>
      </Row>
    </Tap>
  );
}

function Supplements() {
  const m = useMember();
  const { c } = useTheme();
  return (
    <Card onPress={() => go('supps')} style={{ paddingTop: 4, paddingBottom: 6 }} accessibilityLabel="Meine Supplements">
      <Row style={{ paddingTop: 12, paddingBottom: 2 }}>
        <Lbl style={{ flex: 1 }}>Meine Supplements</Lbl>
        <Icon name="chev" size={16} color={c.muted} />
      </Row>
      {m.supps.map((s, i) => {
        const low = s.days <= 7;
        return (
          <Li key={s.name} last={i === m.supps.length - 1}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: low ? c.acc : c.ok }} />
            <LiText title={s.name} sub={s.when} />
            <Txt f={low ? 'bold' : 'medium'} s={12} c={low ? c.acc : c.muted}>
              {low ? 'bald leer' : `noch ${s.days} Tage`}
            </Txt>
          </Li>
        );
      })}
    </Card>
  );
}

/** „Noch offen": 1 Kachel breit, 2 nebeneinander, bei 3 zwei plus eine breite. */
function OpenUnits() {
  const m = useMember();
  const cs = useCardStyle();
  const o = openUnits(m);
  if (!o.length) return null;
  const act = (x: (typeof o)[number]) => () =>
    x.kind === 'bookDay' ? bookDay(x.v) : x.kind === 'booking' ? useUi.getState().openSheet({ t: 'booking', id: x.v }) : go(x.v);
  return (
    <>
      <Txt f="heavy" s={18} ls={-0.3} style={{ marginTop: 10, marginHorizontal: 2, marginBottom: -2 }}>
        Noch offen
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {o.map((x, i) => {
          const wide = o.length === 1 || (o.length % 2 === 1 && i === o.length - 1);
          return (
            <Tap key={x.t + i} onPress={act(x)} style={[cs, { minHeight: 150, gap: 4, width: wide ? '100%' : '48.4%' }]} accessibilityLabel={`${x.n} ${x.t}, ${x.s}`}>
              <Row>
                <IconBox name={x.i} />
                <Txt f="heavy" s={30} lh={32} style={{ marginLeft: 'auto' }}>
                  {x.n}
                </Txt>
              </Row>
              <Txt f="heavy" s={15} style={{ marginTop: 8 }}>
                {x.t}
              </Txt>
              <Small style={{ marginBottom: 10 }}>{x.s}</Small>
              <Pill tone="solid" text={x.cta} style={{ marginTop: 'auto' }} />
            </Tap>
          );
        })}
      </View>
    </>
  );
}

function News() {
  const n = useContent().news[0];
  const { c } = useTheme();
  return (
    <Card onPress={() => go(`news|${n.id}`)} accessibilityLabel={`Studio News: ${n.t}`}>
      <Row>
        <Lbl style={{ flex: 1 }}>Studio News</Lbl>
        <Tap onPress={() => go('news')} hitSlop={10}>
          <Txt f="bold" s={12} c={c.acc}>
            Alle
          </Txt>
        </Tap>
      </Row>
      <Txt f="heavy" s={16} ls={-0.2} style={{ marginTop: 6 }}>
        {n.t}
      </Txt>
      <Small style={{ marginTop: 2 }}>{n.date} · auch im WhatsApp-Kanal</Small>
    </Card>
  );
}

const styles = StyleSheet.create({
  poster: { marginHorizontal: -20, minHeight: 420, paddingHorizontal: 20, paddingBottom: 26, justifyContent: 'flex-end', backgroundColor: '#111', overflow: 'hidden' },
  sshCol: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  chal: { backgroundColor: '#F2611D', borderRadius: 22, padding: 18 },
  chalIc: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(10,10,11,0.12)', alignItems: 'center', justifyContent: 'center' },
});
