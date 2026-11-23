/** Bottom-Sheets (SH.* der Demo). Nach unten wegziehbar. */
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Btn, Card, Chip, Disp, Empty, Grow, IconBox, Lbl, Li, ListCard, LiText, Pill, Row, Small, Stepper, Switch, Txt, Bar } from '@/components/ui';
import { slotsFor, typeName } from '@/lib/domain';
import { eur, MON, parse, rel, WDL } from '@/lib/format';
import { useApp, useContent, useMember } from '@/store/app';
import { toast, useUi, type SheetState } from '@/store/ui';
import { useTheme } from '@/theme';

import { StatusPill } from './parts';

export function SheetHost() {
  const sheet = useUi((s) => s.sheet);
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const ref = useRef<BottomSheetModal>(null);
  // Inhalt bleibt während der Schließen-Animation stehen.
  const [shown, setShown] = useState<SheetState | null>(null);
  if (sheet && sheet !== shown) setShown(sheet);

  useEffect(() => {
    if (sheet) ref.current?.present();
    else ref.current?.dismiss();
  }, [sheet]);

  const backdrop = useCallback(
    (p: BottomSheetBackdropProps) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} pressBehavior="close" />,
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      maxDynamicContentSize={height * 0.86}
      enablePanDownToClose
      backdropComponent={backdrop}
      animateOnMount={!reduce}
      onDismiss={() => {
        setShown(null);
        if (useUi.getState().sheet) useUi.setState({ sheet: null });
      }}
      backgroundStyle={{ backgroundColor: c.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
      handleIndicatorStyle={{ backgroundColor: c.line, width: 40, height: 5 }}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: ins.bottom + 20, gap: 12 }}>
        {shown ? <SheetBody s={shown} /> : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function SheetBody({ s }: { s: SheetState }) {
  switch (s.t) {
    case 'slot':
      return <SlotSheet courseId={s.courseId} date={s.date} />;
    case 'booking':
      return <BookingSheet id={s.id} />;
    case 'cart':
      return <CartSheet />;
    case 'svConfirm':
      return <SurveyConfirmSheet />;
    case 'badge':
      return <BadgeSheet i={s.i} />;
  }
}

const H2 = ({ children }: { children: React.ReactNode }) => (
  <Disp s={26} lh={28}>
    {children}
  </Disp>
);
const close = () => useUi.getState().closeSheet();

/* ---------- Kurs buchen ---------- */
function SlotSheet({ courseId, date }: { courseId: string; date: string }) {
  const { c } = useTheme();
  const m = useMember();
  const content = useContent();
  const occ = useApp((x) => x.occupancy);
  const o = useUi((x) => x.so);
  const set = useUi((x) => x.set);
  const [busy, setBusy] = useState(false);
  const s = slotsFor(date, m, content, occ).find((x) => x.id === courseId);
  if (!s) return <Empty>Kurs nicht gefunden</Empty>;
  const dt = parse(date);
  const free = 6 - s.n;
  const maxP = Math.min(3, free);

  const head = (
    <>
      <Lbl>{`${WDL[dt.getDay()]}, ${dt.getDate()}. ${MON[dt.getMonth()]}`}</Lbl>
      <H2>
        {s.title}
        {'\n'}
        <Txt f="display" s={26} c={c.acc}>
          {s.start}–{s.end}
        </Txt>
      </H2>
      <Row gap={6}>
        <Icon name="user" size={16} color={c.muted} />
        <Small>{s.coach} · Kleingruppe, max. 6 Personen</Small>
      </Row>
      <Card>
        <Row>
          <Txt f="bold" s={12} style={{ flex: 1 }}>
            {s.full ? 'Ausgebucht' : `${free} Plätze frei`}
          </Txt>
          <Small>{s.n}/6</Small>
        </Row>
        <Bar value={s.n / 6} style={{ marginTop: 8 }} />
      </Card>
    </>
  );

  if (s.restricted)
    return (
      <>
        {head}
        <Card>
          <Row>
            <IconBox name="lock" />
            <Grow>
              <Txt s={12.5}>{s.restricted}. Frag deinen Coach, wenn du mitmachen möchtest.</Txt>
            </Grow>
          </Row>
        </Card>
        <Btn kind="ghost" title="Schließen" onPress={close} />
      </>
    );

  if (s.full)
    return (
      <>
        {head}
        <Card>
          <Txt f="bold">Warteliste</Txt>
          <Small style={{ marginTop: 4 }}>
            {s.wait} Personen vor dir. Sagt jemand ab oder gibt das Team einen Platz frei, rückst du automatisch nach und bekommst eine Push-Nachricht.
          </Small>
        </Card>
        <Btn
          icon="clock"
          title={`Auf die Warteliste (Platz ${s.wait + 1})`}
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            await useApp.getState().joinWaitlist(courseId, date, s.wait + 1);
            close();
            toast(`Warteliste: Platz ${s.wait + 1}`);
          }}
        />
      </>
    );

  return (
    <>
      {head}
      <Card>
        <Row>
          <IconBox name="users" />
          <Grow>
            <Txt f="bold" s={14}>
              Personen
            </Txt>
            <Small>{o.persons > 1 ? `Du + ${o.persons - 1} Begleitung` : 'Nur du'}</Small>
          </Grow>
          <Stepper value={o.persons} max={maxP} onChange={(d) => set({ so: { ...o, persons: Math.max(1, Math.min(maxP, o.persons + d)) } })} />
        </Row>
      </Card>
      <Card>
        <Row>
          <IconBox name="repeat" />
          <Grow>
            <Txt f="bold" s={14}>
              Serienbuchung
            </Txt>
            <Small>
              Jeden {WDL[dt.getDay()]} um {s.start}
            </Small>
          </Grow>
          <Switch label="Serienbuchung" on={o.series} onToggle={() => set({ so: { ...o, series: !o.series } })} />
        </Row>
        {o.series ? (
          <Row gap={6} style={{ marginTop: 12 }}>
            {[4, 8, 12].map((w) => (
              <Chip key={w} label={`${w} Wochen`} on={o.weeks === w} onPress={() => set({ so: { ...o, weeks: w } })} />
            ))}
          </Row>
        ) : null}
      </Card>
      <Btn
        title={`Verbindlich buchen${o.series ? ` · ${o.weeks} Termine` : ''}`}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          const n = await useApp.getState().bookCourse(courseId, date, o.persons, o.series ? o.weeks : 1);
          close();
          toast(o.series ? `${n} Termine gebucht` : 'Gebucht! Erinnerung kommt 2 Std. vorher');
        }}
      />
      <Small center>Kostenlos absagen bis 12 Stunden vorher</Small>
    </>
  );
}

/* ---------- Termin ansehen / absagen / Vorschlag ---------- */
function BookingSheet({ id }: { id: string }) {
  const { c } = useTheme();
  const m = useMember();
  const b = m.bookings.find((x) => x.id === id);
  const [busy, setBusy] = useState(false);
  if (!b) return <Empty>Termin nicht mehr vorhanden</Empty>;
  const dt = parse(b.date);
  const app = useApp.getState();
  const run = (fn: () => Promise<unknown>, msg: string) => async () => {
    setBusy(true);
    await fn();
    close();
    toast(msg);
  };

  const head = (
    <>
      <Row>
        <StatusPill b={b} />
        <Small>{typeName[b.type]}</Small>
      </Row>
      <H2>
        {b.title}
        {'\n'}
        <Txt f="display" s={26} c={c.acc}>
          {rel(b.date)}, {b.status === 'proposed' ? b.prop : b.time}
        </Txt>
      </H2>
      <Small>
        {`${WDL[dt.getDay()]}, ${dt.getDate()}. ${MON[dt.getMonth()]} · mit ${b.coach}${b.persons > 1 ? ` · ${b.persons} Personen` : ''}${b.sid ? ' · Serie' : ''}`}
      </Small>
    </>
  );

  if (b.status === 'proposed')
    return (
      <>
        {head}
        <Card>
          <Row>
            <Small style={{ flex: 1 }}>Deine Anfrage</Small>
            <Txt s={13} style={{ textDecorationLine: 'line-through' }}>
              {b.time}
            </Txt>
          </Row>
          <Row style={{ marginTop: 6 }}>
            <Txt f="bold" style={{ flex: 1 }}>
              Vorschlag von {b.coach}
            </Txt>
            <Txt f="bold" s={18} c={c.acc}>
              {b.prop}
            </Txt>
          </Row>
        </Card>
        <Btn icon="check" title="Vorschlag annehmen" disabled={busy} onPress={run(() => app.acceptProposal(b.id), 'Termin bestätigt')} />
        <Btn
          kind="ghost"
          title="Andere Uhrzeit vorschlagen"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            await app.declineProposal(b.id);
            useUi.setState({ pt: { coach: b.coach, date: b.date, time: null, persons: b.persons, note: '' }, bookType: 'pt', sheet: null });
            router.navigate('/book');
            toast('Wähle eine andere Uhrzeit');
          }}
        />
      </>
    );

  if (b.status === 'requested')
    return (
      <>
        {head}
        <Card>
          <Small>Wartet auf Bestätigung von {b.coach}. Du bekommst eine Push-Nachricht.</Small>
        </Card>
        <Btn kind="danger" title="Anfrage zurückziehen" disabled={busy} onPress={run(() => app.cancel(b.id), 'Anfrage zurückgezogen')} />
      </>
    );

  if (b.status === 'waitlist')
    return (
      <>
        {head}
        <Card>
          <Txt f="bold" s={13}>
            Platz {b.wait} auf der Warteliste
          </Txt>
          <Small style={{ marginTop: 4 }}>Wird ein Platz frei, rückst du automatisch nach.</Small>
        </Card>
        <Btn kind="danger" title="Von der Warteliste nehmen" disabled={busy} onPress={run(() => app.cancel(b.id), 'Von der Warteliste genommen')} />
      </>
    );

  return (
    <>
      {head}
      {b.type === 'checkup' ? (
        <Card>
          <Txt f="bold" s={13}>
            Was passiert beim Checkup?
          </Txt>
          <Small style={{ marginTop: 4 }}>Messung (Gewicht, Lean Mass, Körperfett, Hautfalten), Planübersicht und Gelenk-Screen mit Überkopfkniebeuge.</Small>
        </Card>
      ) : null}
      {b.sid ? (
        <>
          <Btn kind="danger" title="Nur diesen Termin absagen" disabled={busy} onPress={run(() => app.cancel(b.id), 'Abgesagt. Der Platz geht an die Warteliste.')} />
          <Btn kind="ghost" title="Ganze Serie beenden" disabled={busy} onPress={run(() => app.cancelSeries(b.id), 'Serie beendet')} />
        </>
      ) : (
        <Btn kind="danger" title="Termin absagen" disabled={busy} onPress={run(() => app.cancel(b.id), 'Abgesagt. Der Platz geht an die Warteliste.')} />
      )}
      <Small center>Kostenlos bis 12 Stunden vorher</Small>
    </>
  );
}

/* ---------- Warenkorb ---------- */
function CartSheet() {
  const m = useMember();
  const content = useContent();
  const [busy, setBusy] = useState(false);
  const P = (id: string) => content.products.find((p) => p.id === id)!;
  if (!m.cart.length)
    return (
      <>
        <H2>Warenkorb</H2>
        <Empty>Noch leer</Empty>
        <Btn kind="ghost" title="Weiter stöbern" onPress={close} />
      </>
    );
  const sum = m.cart.reduce((a, x) => a + x.qty * P(x.pid).price, 0);
  return (
    <>
      <H2>Warenkorb</H2>
      <ListCard>
        {m.cart.map((x, i) => (
          <Li key={x.pid + x.v} last={i === m.cart.length - 1}>
            <LiText title={P(x.pid).name} sub={`${x.v ? x.v + ' · ' : ''}${eur(P(x.pid).price)}`} />
            <Stepper value={x.qty} min={0} onChange={(d) => useApp.getState().changeQty(i, d)} />
          </Li>
        ))}
      </ListCard>
      <Row>
        <Txt f="heavy" s={16} style={{ flex: 1 }}>
          Summe
        </Txt>
        <Txt f="heavy" s={16}>
          {eur(sum)}
        </Txt>
      </Row>
      <Card>
        <Small>Kein Bezahlen in der App. Das Team meldet sich, abholen und bezahlen kannst du im Studio (bar, EC, PayPal).</Small>
      </Card>
      <Btn
        title="Anfrage senden"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          await useApp.getState().sendShopRequest();
          close();
          toast('Anfrage gesendet. Das Team meldet sich.');
        }}
      />
    </>
  );
}

/* ---------- Umfrage absenden ---------- */
function SurveyConfirmSheet() {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <H2>Wirklich absenden?</H2>
      <Small>Deine Antworten kannst du danach nicht mehr ändern.</Small>
      <Btn
        title="Ja, absenden"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          const sv = useUi.getState().sv;
          await useApp.getState().submitSurvey({ times: [...sv.times], neu: sv.neu ?? '', text: sv.text });
          close();
          if (router.canGoBack()) router.back();
          toast('Danke! Umfrage abgeschickt');
        }}
      />
      <Btn kind="ghost" title="Nochmal prüfen" onPress={close} />
    </>
  );
}

/* ---------- Badge ---------- */
function BadgeSheet({ i }: { i: number }) {
  const { c } = useTheme();
  const x = useContent().badges[i];
  useEffect(() => {
    if (x.got) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [x.got]);
  return (
    <>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
        <Hex size={90} got={x.got}>
          <Icon name={x.i} size={34} color={x.got ? '#0a0a0b' : c.muted} />
        </Hex>
        <H2>{x.n}</H2>
        <Small center>{x.d}</Small>
        <Pill text={x.got ? 'Freigeschaltet' : 'Noch gesperrt'} tone={x.got ? 'acc' : 'grey'} style={{ alignSelf: 'center' }} />
      </View>
      <Btn kind="ghost" title="Schließen" onPress={close} />
    </>
  );
}

/** Sechseck-Badge (.bdg .hx) */
export function Hex({ size = 58, got, children }: { size?: number; got: boolean; children: React.ReactNode }) {
  const { c } = useTheme();
  const pts = `${size * 0.25},${size * 0.04} ${size * 0.75},${size * 0.04} ${size},${size * 0.5} ${size * 0.75},${size * 0.96} ${size * 0.25},${size * 0.96} 0,${size * 0.5}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="hx" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#f2611d" />
            <Stop offset="1" stopColor="#ffa36b" />
          </LinearGradient>
        </Defs>
        <Polygon points={pts} fill={got ? 'url(#hx)' : c.card2} />
      </Svg>
      {children}
    </View>
  );
}
