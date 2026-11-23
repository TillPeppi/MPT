import { useLocalSearchParams } from 'expo-router';

import { LineChart } from '@/components/charts';
import { Screen } from '@/components/Screen';
import { Card, Disp, Empty, Lbl, Li, ListCard, LiText, Row, Small, Txt } from '@/components/ui';
import { fmtEx } from '@/lib/domain';
import { mmss, num } from '@/lib/format';
import { useContent } from '@/store/app';

const PERIODS = ['Jun–Jul', 'Aug–Sep', 'Sep–Okt', 'seit 26.10.'];

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const e = useContent().exercises.find((x) => x.id === id);
  if (!e)
    return (
      <Screen title="Übung">
        <Empty>Übung nicht gefunden</Empty>
      </Screen>
    );
  const cur = e.v[3];
  const fmt = (v: number) => (e.u === 'time' ? mmss(v) : num(v));
  return (
    <Screen title={e.n}>
      <Card>
        <Lbl>{`${e.p} · Plan 4`}</Lbl>
        <Row gap={8} style={{ alignItems: 'baseline', marginTop: 4 }}>
          <Txt f="display" s={58} lh={60}>
            {fmt(cur)}
          </Txt>
          <Disp s={20}>{e.u === 'time' ? 'min' : e.u}</Disp>
        </Row>
      </Card>
      <Card>
        <Lbl style={{ marginBottom: 10 }}>Pläne im Vergleich</Lbl>
        <LineChart vals={e.v} labels={e.v.map((_, i) => 'Plan ' + (i + 1))} showVals fmt={fmt} />
      </Card>
      <ListCard>
        {e.v.map((v, i) => (
          <Li key={i} last={i === e.v.length - 1}>
            <LiText title={`Plan ${i + 1}`} sub={PERIODS[i]} />
            <Txt f="bold" s={12}>
              {fmtEx(e, v)}
            </Txt>
          </Li>
        ))}
      </ListCard>
      <Small center>{`${e.lower ? 'Weniger Zeit ist besser. ' : ''}Eingetragen von deinem Coach`}</Small>
    </Screen>
  );
}
