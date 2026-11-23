/** Wochenrecap in 5 Schritten (S.recap) und Ergebnis (S.recapDone). Skala 1–10 ohne 7. */
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Ring } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { Tap } from '@/components/Tap';
import { Bar, Btn, Card, Lbl, Pill, Row, Small, Txt } from '@/components/ui';
import { SCALE } from '@/data/demo';
import type { IconName } from '@/data/types';
import { lastScore, prevScore } from '@/lib/domain';
import { useApp, useMember } from '@/store/app';
import { emptyRecap, useUi, type RecapDraft } from '@/store/ui';
import { font, useTheme } from '@/theme';

import { SubScores } from './parts';

const STEPS = ['Schlaf', 'Energie', 'Ernährung', 'Training', 'Notiz'];

function Scale({ k, lo, hi }: { k: 'sq' | 'en' | 'fo' | 'tr'; lo: string; hi: string }) {
  const { c } = useTheme();
  const v = useUi((s) => s.rc[k]);
  const set = (n: number) => useUi.setState((s) => ({ rc: { ...s.rc, [k]: n } }));
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 10 }} accessibilityRole="radiogroup">
        {SCALE.map((n) => {
          const on = v === n;
          return (
            <Tap key={n} onPress={() => set(n)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${n}`}
              style={{ flex: 1, borderWidth: 1, borderColor: on ? c.acc : c.line, backgroundColor: on ? c.acc : c.card2, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}>
              <Txt f="heavy" s={13} c={on ? c.on : c.text}>
                {n}
              </Txt>
            </Tap>
          );
        })}
      </View>
      <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
        <Txt f="medium" s={10.5} c={c.muted}>
          {lo}
        </Txt>
        <Txt f="medium" s={10.5} c={c.muted}>
          {hi}
        </Txt>
      </Row>
    </View>
  );
}

function StepHead({ icon, title }: { icon: IconName; title: string }) {
  const { c } = useTheme();
  return (
    <Row gap={6}>
      <Icon name={icon} size={16} color={c.acc} />
      <Lbl>{title}</Lbl>
    </Row>
  );
}

const ready = (r: RecapDraft) =>
  [r.yn.every((x) => x !== null) && !!r.sq, !!r.en, !!r.fo, !!r.tr, true][r.step];

export function RecapFlow({ onSubmit }: { onSubmit: () => Promise<void> }) {
  const { c } = useTheme();
  const r = useUi((s) => s.rc);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<RecapDraft>) => useUi.setState((s) => ({ rc: { ...s.rc, ...p } }));
  const Q = (t: string) => (
    <Txt f="bold" s={15} style={{ marginTop: 8 }}>
      {t}
    </Txt>
  );

  return (
    <>
      <Bar value={(r.step + 1) / 5} />
      <Lbl>{`Schritt ${r.step + 1} von 5 · ${STEPS[r.step]}`}</Lbl>
      {r.step === 0 ? (
        <Card>
          <StepHead icon="moon" title="Schlaf" />
          {['Hast du meistens durchgeschlafen?', 'Hattest du meistens 7 Stunden oder mehr?', 'Bist du erholt aufgewacht?'].map((q, i) => (
            <Row key={q} style={{ paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: c.line }}>
              <Txt f="semibold" s={13} style={{ flex: 1 }}>
                {q}
              </Txt>
              <Row gap={5}>
                {[true, false].map((yes) => {
                  const on = r.yn[i] === yes;
                  return (
                    <Tap key={String(yes)} onPress={() => set({ yn: r.yn.map((x, k) => (k === i ? yes : x)) })} accessibilityState={{ selected: on }}
                      style={{ borderWidth: 1, borderColor: on ? c.text : c.line, backgroundColor: on ? c.text : 'transparent', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 }}>
                      <Txt f="bold" s={12} c={on ? c.bg : c.text}>
                        {yes ? 'Ja' : 'Nein'}
                      </Txt>
                    </Tap>
                  );
                })}
              </Row>
            </Row>
          ))}
          <Txt f="bold" s={13} style={{ marginTop: 12 }}>
            Wie gut hast du geschlafen?
          </Txt>
          <Scale k="sq" lo="schlecht" hi="sehr gut" />
        </Card>
      ) : null}
      {r.step === 1 ? (
        <Card>
          <StepHead icon="bolt" title="Energielevel" />
          {Q('Wie war deine Energie über den Tag?')}
          <Scale k="en" lo="platt" hi="voller Energie" />
        </Card>
      ) : null}
      {r.step === 2 ? (
        <Card>
          <StepHead icon="leaf" title="Ernährung" />
          {Q('Wie zufrieden bist du mit deinem Essverhalten?')}
          <Scale k="fo" lo="gar nicht" hi="sehr" />
        </Card>
      ) : null}
      {r.step === 3 ? (
        <Card>
          <StepHead icon="flame" title="Training" />
          {Q('Wie gut fandest du dein Training diese Woche?')}
          <Scale k="tr" lo="schwach" hi="stark" />
        </Card>
      ) : null}
      {r.step === 4 ? (
        <Card>
          <Lbl>Notiz an deinen Coach</Lbl>
          <TextInput
            multiline
            value={r.note}
            onChangeText={(note) => set({ note })}
            placeholder="Was war los? Stress, Verletzung, Erfolge …"
            placeholderTextColor={c.muted}
            style={{ marginTop: 10, minHeight: 110, textAlignVertical: 'top', backgroundColor: c.card2, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 14, fontSize: 14, color: c.text, fontFamily: font.regular }}
          />
        </Card>
      ) : null}
      {r.step < 4 ? <Small>Die Skala hat keine 7. Entscheide dich bewusst für besser oder schlechter.</Small> : null}
      <Row gap={10} style={{ marginTop: 6 }}>
        <View style={{ flex: 1 }}>{r.step ? <Btn kind="ghost" title="Zurück" onPress={() => set({ step: r.step - 1 })} /> : null}</View>
        <View style={{ flex: 1 }}>
          <Btn
            title={r.step === 4 ? 'Abschicken' : `Weiter: ${STEPS[r.step + 1]}`}
            disabled={!ready(r) || busy}
            onPress={async () => {
              if (r.step < 4) return set({ step: r.step + 1 });
              setBusy(true);
              await onSubmit();
              useUi.setState({ rc: emptyRecap() });
              setBusy(false);
            }}
          />
        </View>
      </Row>
    </>
  );
}

/** Übernimmt den Entwurf und schickt ihn ab. */
export async function submitDraft() {
  const r = useUi.getState().rc;
  await useApp.getState().submitRecap({ yn: r.yn.map(Boolean), sq: r.sq!, en: r.en!, fo: r.fo!, tr: r.tr!, note: r.note });
}

export function RecapResult({ cta, onCta }: { cta: string; onCta: () => void }) {
  const m = useMember();
  const ls = lastScore(m);
  const pv = prevScore(m);
  return (
    <>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Lbl>{`MPT Score KW ${ls.kw}`}</Lbl>
        <View style={{ marginVertical: 14 }}>
          <Ring value={ls.s} size={150} sw={12} />
        </View>
        <Txt f="heavy" s={16}>
          {ls.s >= pv.s ? '+' : ''}
          {ls.s - pv.s} zur Vorwoche
        </Txt>
        <Pill tone="solid" text="+30 Punkte" style={{ marginTop: 12, alignSelf: 'center' }} />
      </Card>
      <Card>
        <SubScores s={ls} />
      </Card>
      <Btn title={cta} onPress={onCta} />
    </>
  );
}
