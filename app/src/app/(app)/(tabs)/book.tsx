/** Buchen (S.book): Auswahlkarten, „Deine Termine", Tagesleiste, Kurs-Slots, PT/Checkup-Anfrage. */
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Tap } from '@/components/Tap';
import { Bar, Btn, Card, Chip, Empty, Grow, IconBox, Lbl, Row, SecTitle, Small, Stepper, Txt, useCardStyle } from '@/components/ui';
import { PT_TIMES } from '@/data/demo';
import type { IconName, Slot } from '@/data/types';
import { dayHasMine, slotsFor, statusText, upcoming } from '@/lib/domain';
import { addD, iso, kw, MON, parse, rel, TODAY, WD, WDL } from '@/lib/format';
import { go } from '@/lib/nav';
import { useApp, useContent, useMember } from '@/store/app';
import { useUi, type BookType } from '@/store/ui';
import { font, useTheme } from '@/theme';

export default function Book() {
  const bookType = useUi((s) => s.bookType);
  const day = useUi((s) => s.day);
  return (
    <Screen root title="Buchen" sub={`Kalenderwoche ${kw(bookType === 'group' ? parse(day) : TODAY)}`}>
      <Types />
      <SecTitle title="Deine Termine" action="Alle" onAction={() => go('mybookings')} />
      <MyCarousel />
      {bookType === 'group' ? <GroupBooking /> : <AppointmentForm type={bookType} />}
    </Screen>
  );
}

const TYPES: [BookType, IconName, string, string][] = [
  ['group', 'users', 'Kleingruppe', 'max. 6 Personen'],
  ['pt', 'user', 'Personal', '1:1 · 60 Min.'],
  ['checkup', 'pulse', 'Checkup', '45 Min.'],
];
function Types() {
  const { c } = useTheme();
  const bt = useUi((s) => s.bookType);
  return (
    <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="tablist">
      {TYPES.map(([k, i, l, s]) => {
        const on = bt === k;
        return (
          <Tap key={k} onPress={() => useUi.setState({ bookType: k })} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, backgroundColor: on ? c.soft : c.card, borderWidth: 1.5, borderColor: on ? c.acc : c.line, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 12, gap: 4 }}>
            <View style={{ marginBottom: 8 }}>
              <IconBox name={i} hot={on} />
            </View>
            <Txt f="heavy" s={14}>
              {l}
            </Txt>
            <Txt f="medium" s={11.5} c={c.muted}>
              {s}
            </Txt>
          </Tap>
        );
      })}
    </View>
  );
}

function MyCarousel() {
  const { c } = useTheme();
  const m = useMember();
  const cs = useCardStyle();
  const up = upcoming(m);
  const dot = (st: string) => (st === 'confirmed' ? c.ok : st === 'proposed' ? c.acc : c.muted);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingVertical: 2 }}
      snapToInterval={146} decelerationRate="fast">
      {up.slice(0, 6).map((x) => (
        <Tap key={x.id} onPress={() => useUi.getState().openSheet({ t: 'booking', id: x.id })}
          style={[cs, { width: 136, padding: 14, gap: 2 }, x.status === 'proposed' ? { borderColor: c.acc, borderWidth: 1 } : null]}
          accessibilityLabel={`${rel(x.date)} ${x.status === 'proposed' ? x.prop : x.time}, ${x.title}, ${statusText(x)}`}>
          <Lbl>{rel(x.date)}</Lbl>
          <Txt f="heavy" s={22} ls={-0.4} style={{ marginTop: 2 }}>
            {x.status === 'proposed' ? x.prop : x.time}
          </Txt>
          <Txt f="semibold" s={12} c={c.muted} numberOfLines={1}>
            {x.title}
          </Txt>
          <Row gap={5} style={{ marginTop: 10 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot(x.status) }} />
            <Txt f="bold" s={11} c={dot(x.status)}>
              {statusText(x)}
            </Txt>
          </Row>
        </Tap>
      ))}
      <Tap onPress={() => go('mybookings')} style={[cs, { width: 90, alignItems: 'center', justifyContent: 'center', gap: 4 }]}>
        <Icon name="chev" color={c.muted} />
        <Txt f="semibold" s={12} c={c.muted}>
          Alle {up.length}
        </Txt>
      </Tap>
    </ScrollView>
  );
}

/** Tagesleiste über 14 Tage */
function Days({ value, onPick, offset = 0, mark, closedDay }: { value: string | null; onPick: (ds: string) => void; offset?: number; mark?: (ds: string) => boolean; closedDay: number }) {
  const { c } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 2 }}>
      {Array.from({ length: 14 }, (_, i) => {
        const d = addD(TODAY, i + offset);
        const ds = iso(d);
        const on = value === ds;
        const closed = d.getDay() === closedDay;
        return (
          <Tap key={ds} onPress={() => onPick(ds)} accessibilityState={{ selected: on }} accessibilityLabel={`${WDL[d.getDay()]} ${d.getDate()}. ${MON[d.getMonth()]}`}
            style={{ width: 50, borderRadius: 18, paddingTop: 9, paddingBottom: 17, alignItems: 'center', backgroundColor: on ? c.acc : c.card, borderWidth: 1, borderColor: on ? c.acc : c.line, opacity: closed ? 0.4 : 1 }}>
            <Txt f="semibold" s={11} c={on ? c.on : c.muted}>
              {WD[d.getDay()]}
            </Txt>
            <Txt f="semibold" s={18} c={on ? c.on : c.text} style={{ marginTop: 3 }}>
              {d.getDate()}
            </Txt>
            {mark?.(ds) ? <View style={{ position: 'absolute', bottom: 7, width: 5, height: 5, borderRadius: 3, backgroundColor: on ? c.on : c.acc }} /> : null}
          </Tap>
        );
      })}
    </ScrollView>
  );
}

function GroupBooking() {
  const m = useMember();
  const content = useContent();
  const occ = useApp((s) => s.occupancy);
  const day = useUi((s) => s.day);
  const d = parse(day);
  const sl = slotsFor(day, m, content, occ);
  return (
    <>
      <SecTitle title="Kurs wählen" />
      <Days value={day} onPick={(ds) => useUi.setState({ day: ds })} mark={(ds) => dayHasMine(m, ds)} closedDay={6} />
      <Lbl style={{ marginTop: 4 }}>{`${WDL[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]}`}</Lbl>
      {!sl.length ? <Empty>Samstags keine Kurse. Personal Training kannst du trotzdem anfragen.</Empty> : null}
      {sl.map((s) => (
        <SlotCard key={s.id} s={s} />
      ))}
      <Small center style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
        Voll? Trag dich auf die Warteliste. Sagt jemand ab, rückst du automatisch nach.
      </Small>
    </>
  );
}

function openSlot(s: Slot) {
  const ui = useUi.getState();
  if (s.mine) return ui.openSheet({ t: 'booking', id: s.mine.id });
  ui.set({ so: { persons: 1, series: false, weeks: 4 } });
  ui.openSheet({ t: 'slot', courseId: s.id, date: s.date });
}

function SlotCard({ s }: { s: Slot }) {
  const { c } = useTheme();
  const cs = useCardStyle();
  const m = s.mine;
  const conf = m?.status === 'confirmed';
  const wl = m?.status === 'waitlist';
  const meta = s.restricted
    ? s.restricted
    : conf
      ? `Du bist dabei${m!.persons > 1 ? ` (${m!.persons} Pers.)` : ''}${m!.sid ? ' · Serie' : ''}`
      : wl
        ? `Warteliste · Platz ${m!.wait}`
        : s.full
          ? `Voll · ${s.wait} auf der Warteliste`
          : `${6 - s.n} von 6 frei · ${s.coach}`;
  const sa = s.restricted
    ? { i: 'lock' as const, bg: c.card2, fg: c.muted }
    : conf
      ? { i: 'check' as const, bg: c.soft, fg: c.acc }
      : wl || s.full
        ? { i: 'clock' as const, bg: 'transparent', fg: c.muted, dashed: true }
        : { i: 'plus' as const, bg: c.acc, fg: c.on };
  return (
    <Tap onPress={() => openSlot(s)} style={[cs, styles.slot, conf || wl ? { borderColor: c.acc, borderWidth: 1 } : null, s.restricted ? { opacity: 0.6 } : null]}
      accessibilityLabel={`${s.start} bis ${s.end}, ${s.title}, ${meta}`}>
      <View style={{ width: 54 }}>
        <Txt f="heavy" s={16}>
          {s.start}
        </Txt>
        <Txt f="medium" s={11} c={c.muted}>
          {s.end}
        </Txt>
      </View>
      <Grow>
        <Txt f="bold" s={14}>
          {s.title}
        </Txt>
        <Txt f={conf || wl ? 'bold' : 'medium'} s={11.5} c={conf || wl ? c.acc : c.muted} style={{ marginTop: 2, marginBottom: 7 }}>
          {meta}
        </Txt>
        <Bar value={s.n / 6} color={s.full ? c.muted : c.acc} />
      </Grow>
      <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: sa.bg, borderWidth: 'dashed' in sa ? 1.5 : 0, borderStyle: 'dashed', borderColor: c.muted }}>
        <Icon name={sa.i} size={16} color={sa.fg} strokeWidth={2.2} />
      </View>
    </Tap>
  );
}

/** PT/Checkup: Zeitvorschlag → Coach bestätigt oder schlägt eine andere Zeit vor. */
function AppointmentForm({ type }: { type: 'pt' | 'checkup' }) {
  const { c } = useTheme();
  const coaches = useContent().coaches;
  const pt = useUi((s) => s.pt);
  const set = (p: Partial<typeof pt>) => useUi.setState((s) => ({ pt: { ...s.pt, ...p } }));
  const isPT = type === 'pt';
  const busy = (t: string) => !!pt.date && (parse(pt.date).getDate() * 3 + parseInt(t, 10) + (pt.coach === 'Lukas' ? 1 : 0)) % 4 === 0;
  return (
    <>
      <SecTitle title="Termin anfragen" />
      <Card>
        <Row>
          <IconBox name={isPT ? 'user' : 'pulse'} />
          <Grow>
            <Txt f="bold">{isPT ? 'Personal Training · 60 Min.' : 'Checkup · 45 Min.'}</Txt>
            <Small>
              {isPT
                ? '1:1 mit deinem Coach. Du schlägst eine Uhrzeit vor, dein Coach bestätigt oder schlägt eine andere vor.'
                : 'Messung, Planübersicht und Gelenk-Screen (Überkopfkniebeuge). Bitte nüchtern kommen.'}
            </Small>
          </Grow>
        </Row>
      </Card>
      <Lbl>Coach</Lbl>
      <Row gap={6}>
        {coaches.map((x) => (
          <Chip key={x} label={x} on={pt.coach === x} onPress={() => set({ coach: x, time: null })} />
        ))}
      </Row>
      <Lbl>Tag</Lbl>
      <Days value={pt.date} offset={1} onPick={(ds) => set({ date: ds, time: null })} closedDay={0} />
      {pt.date ? (
        <>
          <Lbl>Wunsch-Uhrzeit</Lbl>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {PT_TIMES.map((t) => (
              <Chip key={t} label={t} on={pt.time === t} disabled={busy(t)} onPress={() => set({ time: t })} />
            ))}
          </View>
          <Small>Durchgestrichen = Coach schon belegt</Small>
        </>
      ) : null}
      {isPT ? (
        <Card style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
          <Row>
            <IconBox name="users" />
            <Grow>
              <Txt f="bold" s={13.5}>
                Personen
              </Txt>
              <Small>{pt.persons > 1 ? 'Partnertraining zu zweit' : 'Nur du'}</Small>
            </Grow>
            <Stepper value={pt.persons} max={2} onChange={(d) => set({ persons: Math.max(1, Math.min(2, pt.persons + d)) })} />
          </Row>
        </Card>
      ) : null}
      <TextInput
        value={pt.note}
        onChangeText={(note) => set({ note })}
        placeholder="Notiz an den Coach (optional)"
        placeholderTextColor={c.muted}
        multiline
        style={{ backgroundColor: c.card2, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64, fontSize: 14, color: c.text, fontFamily: font.regular, textAlignVertical: 'top' }}
      />
      <Btn icon="clock" title="Uhrzeit vorschlagen" disabled={!pt.date || !pt.time} onPress={() => useApp.getState().requestAppointment(type)} />
    </>
  );
}

const styles = StyleSheet.create({
  slot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
});
