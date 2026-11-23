import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Bar, Btn, Card, Grow, IconBox, Lbl, Pill, Row, Small, Txt } from '@/components/ui';
import { reorder } from '@/lib/nav';
import { useMember } from '@/store/app';
import { useTheme } from '@/theme';

export default function Supps() {
  const { c } = useTheme();
  const m = useMember();
  return (
    <Screen title="Meine Supps">
      <View style={{ backgroundColor: c.soft, borderRadius: 20, padding: 16 }}>
        <Row>
          <IconBox name="pill" hot />
          <Txt s={12.5} lh={18} style={{ flex: 1 }}>
            Von <Txt f="bold" s={12.5}>Marc-Luca</Txt> nach dem Checkup am 26.10. empfohlen. Ohne Mengenangaben: Die Einnahme besprecht ihr im Studio.
          </Txt>
        </Row>
      </View>
      {m.supps.map((s) => {
        const low = s.days <= 7;
        return (
          <Card key={s.name}>
            <Row>
              <Grow>
                <Txt f="bold" s={15}>
                  {s.name}
                </Txt>
                <Small>{s.when}</Small>
              </Grow>
              {low ? <Pill tone="solid" text="bald leer" /> : <Pill tone="grey" text={`${s.days} Tage`} />}
            </Row>
            <Bar value={s.days / s.of} color={low ? c.acc : c.ok} style={{ marginTop: 12 }} />
            <Row style={{ marginTop: 10 }}>
              <Small style={{ flex: 1 }}>Reicht noch ca. {s.days} Tage</Small>
              {s.pid ? <Btn small kind={low ? 'primary' : 'ghost'} title="Nachbestellen" onPress={() => reorder(s.pid!)} /> : <Small>beim Coach</Small>}
            </Row>
          </Card>
        );
      })}
      <Card style={{ borderStyle: 'dashed', borderWidth: 1, borderColor: c.line }}>
        <Lbl>Kommt bald</Lbl>
        <Txt f="bold" style={{ marginTop: 4 }}>
          Supplement-Protokoll
        </Txt>
        <Small style={{ marginTop: 4 }}>
          Bewegungsanalyse und Messung beim Checkup, dazu ein paar Fragen zu Schlaf, Energie und Frühstück. Daraus bekommst du eine Empfehlung ohne Mengenangabe.
        </Small>
      </Card>
    </Screen>
  );
}
