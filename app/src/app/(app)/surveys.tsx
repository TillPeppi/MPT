import { Screen } from '@/components/Screen';
import { Card, Lbl, Pill, Row, Small, Txt } from '@/components/ui';
import { SURVEY } from '@/data/demo';
import { go } from '@/lib/nav';
import { useMember } from '@/store/app';
import { useTheme } from '@/theme';

export default function Surveys() {
  const { c } = useTheme();
  const m = useMember();
  return (
    <Screen title="Umfragen">
      {!m.survey ? (
        <Card onPress={() => go('survey')} style={{ borderColor: c.acc, borderWidth: 1 }}>
          <Row>
            <Pill tone="solid" text="Offen" />
            <Small>bis {SURVEY.due}</Small>
          </Row>
          <Txt f="bold" s={16} style={{ marginTop: 8 }}>
            {SURVEY.title}
          </Txt>
          <Small>3 Fragen · ca. 1 Minute</Small>
        </Card>
      ) : null}
      <Lbl style={{ marginTop: 6 }}>Erledigt</Lbl>
      {m.survey ? (
        <Card>
          <Row>
            <Txt f="bold" style={{ flex: 1 }}>
              {SURVEY.title}
            </Txt>
            <Pill tone="grey" icon="lock" text="nicht änderbar" />
          </Row>
          <Small style={{ marginTop: 6 }}>
            {`Zeiten: ${m.survey.times.join(', ')}\nNeu: ${m.survey.neu}${m.survey.text ? `\nNotiz: ${m.survey.text}` : ''}`}
          </Small>
        </Card>
      ) : null}
      <Card>
        <Row>
          <Txt f="bold" style={{ flex: 1 }}>
            Studio-Zufriedenheit Q3
          </Txt>
          <Pill tone="grey" icon="lock" text="12.10." />
        </Row>
        <Small style={{ marginTop: 4 }}>Danke für dein Feedback!</Small>
      </Card>
    </Screen>
  );
}
