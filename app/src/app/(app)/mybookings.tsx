import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Card, Lbl, Li, ListCard, Small, Txt } from '@/components/ui';
import { BookingRow, HistoryRow } from '@/features/parts';
import { upcoming } from '@/lib/domain';
import { useMember } from '@/store/app';

export default function MyBookings() {
  const m = useMember();
  const up = upcoming(m);
  const kpis: [string, string][] = [['Nov.', String(m.user.monthUnits)], ['Gesamt', String(m.user.units)], ['Ø/Woche', '2,6']];
  return (
    <Screen title="Meine Termine">
      <Lbl>Anstehend</Lbl>
      <ListCard>
        {up.length ? (
          up.map((b, i) => <BookingRow key={b.id} b={b} last={i === up.length - 1} />)
        ) : (
          <Li last>
            <Small>Keine Termine</Small>
          </Li>
        )}
      </ListCard>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {kpis.map(([l, v]) => (
          <Card key={l} style={{ flex: 1, padding: 12 }}>
            <Lbl>{l}</Lbl>
            <Txt f="display" s={26} style={{ marginTop: 4 }}>
              {v}
            </Txt>
          </Card>
        ))}
      </View>
      <Lbl>Letzte Trainings</Lbl>
      <ListCard>
        {m.history.map((h, i) => (
          <HistoryRow key={h.date + h.time} h={h} last={i === m.history.length - 1} />
        ))}
      </ListCard>
    </Screen>
  );
}
