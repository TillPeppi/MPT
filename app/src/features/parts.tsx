/** Gemeinsame Teile: Status-Pill, Terminzeile, Trainingszeile, Score-Teilwerte. */
import { View } from 'react-native';

import { Bar, Chk, Li, LiText, Pill, Row, Txt, IconBox } from '@/components/ui';
import type { Booking, HistoryEntry, WeekScore } from '@/data/types';
import { rel } from '@/lib/format';
import { useUi } from '@/store/ui';
import { useTheme } from '@/theme';

export function StatusPill({ b }: { b: Booking }) {
  if (b.status === 'confirmed') return <Pill tone="ok" icon="check" text="Bestätigt" />;
  if (b.status === 'waitlist') return <Pill tone="grey" text={`Warteliste · Platz ${b.wait}`} />;
  if (b.status === 'requested') return <Pill tone="grey" text="Angefragt" />;
  return <Pill tone="solid" text="Neuer Vorschlag" />;
}

export function BookingRow({ b, last }: { b: Booking; last?: boolean }) {
  const t = b.status === 'proposed' ? `${b.time} → ${b.prop}` : b.time;
  return (
    <Li last={last} onPress={() => useUi.getState().openSheet({ t: 'booking', id: b.id })}>
      <IconBox name={b.type === 'group' ? 'users' : b.type === 'pt' ? 'user' : 'pulse'} />
      <LiText title={`${b.title}${b.persons > 1 ? ` · ${b.persons} Pers.` : ''}`} sub={`${rel(b.date)}, ${t} · ${b.coach}${b.sid ? ' · Serie' : ''}`} />
      <StatusPill b={b} />
    </Li>
  );
}

export function HistoryRow({ h, last }: { h: HistoryEntry; last?: boolean }) {
  const { c } = useTheme();
  return (
    <Li last={last}>
      <Chk ok={h.ok} />
      <LiText title={h.title} sub={`${rel(h.date)}, ${h.time} · ${h.coach}`} />
      <Txt f="medium" s={12} c={c.muted}>
        {h.ok ? 'besucht' : 'abgesagt'}
      </Txt>
    </Li>
  );
}

/** Teilwerte Training/Schlaf/Ernährung/Energie (.subsc) */
export function SubScores({ s }: { s: WeekScore }) {
  const { c } = useTheme();
  const rows: [string, number][] = [['Training', s.t], ['Schlaf', s.sl], ['Ernährung', s.n], ['Energie', s.e]];
  return (
    <View style={{ gap: 9, flex: 1 }}>
      {rows.map(([l, v]) => (
        <Row key={l} gap={8}>
          <Txt f="semibold" s={11.5} c={c.muted} style={{ width: 72 }}>
            {l}
          </Txt>
          <Bar value={v / 10} style={{ flex: 1 }} />
          <Txt f="heavy" s={12} style={{ width: 22, textAlign: 'right' }}>
            {v}
          </Txt>
        </Row>
      ))}
    </View>
  );
}
