/** Ringe und Liniendiagramm mit react-native-svg (ring(), line(), miniWeek(), ptsRing() der Demo). */
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { num } from '@/lib/format';
import { font, ORANGE, useTheme } from '@/theme';

import { Icon } from './Icon';
import { Txt } from './ui';

/** Fortschrittsring 0–100 mit Zahl in der Mitte. */
export function Ring({ value, size = 120, sw = 10, label = 'VON 100' }: { value: number; size?: number; sw?: number; label?: string }) {
  const { c } = useTheme();
  const r = (size - sw) / 2;
  const cir = 2 * Math.PI * r;
  const h = size / 2;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${value} von 100`}>
      <Svg width={size} height={size}>
        <Circle cx={h} cy={h} r={r} fill="none" stroke={c.line} strokeWidth={sw} />
        <Circle cx={h} cy={h} r={r} fill="none" stroke={c.acc} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${(cir * value) / 100} ${cir}`} transform={`rotate(-90 ${h} ${h})`} />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Txt f="display" s={size * 0.33} lh={size * 0.36}>
          {value}
        </Txt>
        {label ? (
          <Txt f="semibold" s={Math.max(8, size * 0.067)} c={c.muted} ls={1}>
            {label}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

/** Ring mit drei Segmenten für die Einheiten der Woche. */
export function MiniWeek({ done, size = 58, sw = 5 }: { done: number; size?: number; sw?: number }) {
  const { c } = useTheme();
  const r = (size - sw) / 2;
  const cir = 2 * Math.PI * r;
  const h = size / 2;
  const gap = 14;
  const seg = (cir * (120 - gap)) / 360;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${done} von 3 Einheiten`}>
      <Svg width={size} height={size}>
        {[0, 1, 2].map((i) => (
          <Circle key={i} cx={h} cy={h} r={r} fill="none" stroke={i < done ? c.acc : c.line} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${seg} ${cir}`} transform={`rotate(${-90 + i * 120 + gap / 2} ${h} ${h})`} />
        ))}
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Txt f="heavy" s={15}>
          {done}/3
        </Txt>
      </View>
    </View>
  );
}

/** Ring mit Pokal für den Level-Fortschritt. */
export function PtsRing({ p, size = 58, sw = 5, children }: { p: number; size?: number; sw?: number; children?: ReactNode }) {
  const { c } = useTheme();
  const r = (size - sw) / 2;
  const cir = 2 * Math.PI * r;
  const h = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={h} cy={h} r={r} fill="none" stroke={c.line} strokeWidth={sw} />
        <Circle cx={h} cy={h} r={r} fill="none" stroke={c.acc} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${cir * p} ${cir}`} transform={`rotate(-90 ${h} ${h})`} />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>{children ?? <Icon name="trophy" color={c.acc} />}</View>
    </View>
  );
}

/** Liniendiagramm mit Verlauf, Punkten und optional Werten über den Punkten. */
export function LineChart({ vals, labels, showVals, fmt = (v: number) => num(v) }: { vals: number[]; labels: string[]; showVals?: boolean; fmt?: (v: number) => string }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const W = 320;
  const H = showVals ? 140 : 120;
  const pl = showVals ? 16 : 8;
  const pr = pl;
  const pt = showVals ? 28 : 14;
  const pb = 22;
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const rg = mx - mn || 1;
  const xs = vals.map((_, i) => pl + (i * (W - pl - pr)) / (vals.length - 1));
  const ys = vals.map((v) => pt + (1 - (v - mn) / rg) * (H - pt - pb));
  const p = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ width: '100%', aspectRatio: W / H }} accessibilityLabel={`Verlauf: ${vals.map((v, i) => `${labels[i]} ${fmt(v)}`).join(', ')}`}>
      {w ? (
        <Svg width={w} height={(w * H) / W} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <LinearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={ORANGE} stopOpacity={0.32} />
              <Stop offset="1" stopColor={ORANGE} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`${p} L${xs[xs.length - 1]} ${H - pb} L${xs[0]} ${H - pb}Z`} fill="url(#lg)" />
          <Path d={p} fill="none" stroke={c.acc} strokeWidth={2.5} strokeLinejoin="round" />
          {xs.map((x, i) => (
            <Circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 4.5 : 3} fill={i === xs.length - 1 ? c.acc : c.bg} stroke={c.acc} strokeWidth={2} />
          ))}
          {showVals
            ? vals.map((v, i) => (
                <SvgText key={'v' + i} x={xs[i]} y={ys[i] - 11} textAnchor="middle" fontFamily={font.heavy} fontSize={10} fill={c.text}>
                  {fmt(v)}
                </SvgText>
              ))
            : null}
          {labels.map((l, i) => (
            <SvgText key={'l' + i} x={xs[i]} y={H - 5} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'} fontFamily={font.semibold} fontSize={9.5} fill={c.muted}>
              {l}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
