/** Bausteine aus der Demo (.card, .pill, .btn, .bar, .chip, .seg, .sw, .li, .gr …). */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';

import type { IconName } from '@/data/types';
import { font, radius, useTheme, type Colors } from '@/theme';

import { Icon } from './Icon';
import { Tap } from './Tap';

/* ---------- Text ---------- */
type FontKey = keyof typeof font;
type TxtProps = TextProps & {
  f?: FontKey;
  s?: number;
  c?: string;
  lh?: number;
  ls?: number;
  up?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
};
export function Txt({ f = 'regular', s = 15, c, lh, ls, up, center, style, ...rest }: TxtProps) {
  const t = useTheme().c;
  // Anton hat hohe Oberlängen: zu knappe Zeilenhöhe schneidet unter iOS oben ab.
  const lineHeight = f === 'display' ? Math.max(lh ?? 0, s * 1.32) : lh;
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: font[f], fontSize: s, color: c ?? t.text, lineHeight, letterSpacing: ls, textTransform: up ? 'uppercase' : undefined, textAlign: center ? 'center' : undefined },
        style,
      ]}
    />
  );
}
/** Anton, Großbuchstaben (.disp) */
export const Disp = ({ s = 32, lh, ...p }: TxtProps) => <Txt f="display" s={s} lh={lh ?? s * 1.08} up ls={s * 0.01} {...p} />;
/** Kleines Label (.lbl) */
export const Lbl = ({ c, ...p }: TxtProps) => {
  const t = useTheme().c;
  return <Txt f="bold" s={10.5} ls={1.3} up c={c ?? t.muted} {...p} />;
};
export const Small = ({ c, ...p }: TxtProps) => {
  const t = useTheme().c;
  return <Txt s={12} lh={17} c={c ?? t.muted} {...p} />;
};

/* ---------- Karten ---------- */
export function useCardStyle(): ViewStyle {
  const { c, name } = useTheme();
  return name === 'light'
    ? { backgroundColor: c.card, borderRadius: radius.card, padding: 16, shadowColor: '#141414', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 }
    : { backgroundColor: c.card, borderRadius: radius.card, padding: 16, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line };
}
export function Card({ children, style, onPress, accessibilityLabel }: { children?: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  const cs = useCardStyle();
  if (onPress)
    return (
      <Tap onPress={onPress} style={[cs, style]} accessibilityLabel={accessibilityLabel}>
        {children}
      </Tap>
    );
  return <View style={[cs, style]}>{children}</View>;
}

export const Row = ({ children, style, gap = 12 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
);
export const Grow = ({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[{ flex: 1, minWidth: 0 }, style]}>{children}</View>;

/* ---------- Pill ---------- */
export type PillTone = 'acc' | 'grey' | 'ok' | 'solid';
export function Pill({ text, tone = 'acc', icon, style }: { text: string; tone?: PillTone; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const map: Record<PillTone, [string, string]> = { acc: [c.soft, c.acc], grey: [c.card2, c.muted], ok: [c.okSoft, c.ok], solid: [c.acc, c.on] };
  const [bg, fg] = map[tone];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9, backgroundColor: bg, alignSelf: 'flex-start' }, style]}>
      {icon ? <Icon name={icon} size={13} color={fg} strokeWidth={2.4} /> : null}
      <Txt f="bold" s={11} c={fg}>
        {text}
      </Txt>
    </View>
  );
}

/* ---------- Button ---------- */
export type BtnKind = 'primary' | 'ghost' | 'danger' | 'dark' | 'onDark';
export function Btn({
  title, onPress, kind = 'primary', icon, small, disabled, style, full = true,
}: { title: string; onPress?: () => void; kind?: BtnKind; icon?: IconName; small?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; full?: boolean }) {
  const { c } = useTheme();
  const k: Record<BtnKind, { bg: string; fg: string; bd?: string }> = {
    primary: { bg: c.acc, fg: c.on },
    ghost: { bg: 'transparent', fg: c.text, bd: c.line },
    danger: { bg: 'transparent', fg: c.danger, bd: 'rgba(239,68,68,0.35)' },
    dark: { bg: c.text, fg: c.bg },
    onDark: { bg: 'transparent', fg: '#fff', bd: 'rgba(255,255,255,0.22)' },
  };
  const v = k[kind];
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.98}
      style={[
        {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999,
          paddingVertical: small ? 9 : 14, paddingHorizontal: small ? 14 : 18, backgroundColor: v.bg,
          borderWidth: v.bd ? 1 : 0, borderColor: v.bd, alignSelf: full && !small ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={v.fg} strokeWidth={2.2} /> : null}
      <Txt f="bold" s={small ? 12.5 : 14} c={v.fg}>
        {title}
      </Txt>
    </Tap>
  );
}

/* ---------- Fortschrittsbalken ---------- */
export function Bar({ value, color, track, height = 6, style }: { value: number; color?: string; track?: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: track ?? c.line, overflow: 'hidden' }, style]}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', borderRadius: height, backgroundColor: color ?? c.acc }} />
    </View>
  );
}

/* ---------- Chip / Segment ---------- */
export function Chip({ label, on, onPress, disabled, small, children }: { label?: string; on?: boolean; onPress?: () => void; disabled?: boolean; small?: boolean; children?: ReactNode }) {
  const { c } = useTheme();
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ selected: !!on, disabled }}
      style={{ borderWidth: 1, borderColor: on ? c.text : c.line, backgroundColor: on ? c.text : 'transparent', borderRadius: 999, paddingVertical: small ? 4 : 7, paddingHorizontal: small ? 9 : 13 }}
    >
      {children ?? (
        <Txt f="semibold" s={small ? 11 : 12} c={on ? c.bg : c.muted} style={disabled ? { textDecorationLine: 'line-through' } : undefined}>
          {label}
        </Txt>
      )}
    </Tap>
  );
}
export function Seg<T extends string>({ items, value, onChange }: { items: [T, string][]; value: T; onChange: (v: T) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 4, gap: 4 }}>
      {items.map(([k, l]) => (
        <Tap key={k} onPress={() => onChange(k)} accessibilityState={{ selected: value === k }} style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', backgroundColor: value === k ? c.acc : 'transparent' }}>
          <Txt f="bold" s={12} c={value === k ? c.on : c.muted}>
            {l}
          </Txt>
        </Tap>
      ))}
    </View>
  );
}

/* ---------- Schalter / Stepper ---------- */
export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  const { c } = useTheme();
  return (
    <Tap onPress={onToggle} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} scaleTo={0.95}
      style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: on ? c.acc : c.line, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }} />
    </Tap>
  );
}
export function Stepper({ value, onChange, min = 1, max = 9 }: { value: number; onChange: (d: number) => void; min?: number; max?: number }) {
  const { c } = useTheme();
  const b = { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <Row>
      <Tap style={b} onPress={() => onChange(-1)} disabled={value <= min} accessibilityLabel="Weniger">
        <Icon name="minus" size={16} />
      </Tap>
      <Txt f="heavy" s={18} style={{ minWidth: 18, textAlign: 'center' }}>
        {value}
      </Txt>
      <Tap style={b} onPress={() => onChange(1)} disabled={value >= max} accessibilityLabel="Mehr">
        <Icon name="plus" size={16} />
      </Tap>
    </Row>
  );
}

/* ---------- Icon-Box (.ib) ---------- */
export function IconBox({ name, hot, size = 36, tone }: { name: IconName; hot?: boolean; size?: number; tone?: { bg: string; fg: string } }) {
  const { c } = useTheme();
  const bg = tone?.bg ?? (hot ? c.acc : c.soft);
  const fg = tone?.fg ?? (hot ? c.on : c.acc);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
      <Icon name={name} size={16} color={fg} strokeWidth={2.1} />
    </View>
  );
}

/* ---------- Listen ---------- */
export function ListCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Card style={[{ paddingVertical: 2, paddingHorizontal: 14 }, style]}>{children}</Card>;
}
/** Listenzeile (.li) mit Trennlinie */
export function Li({ children, onPress, last, style }: { children: ReactNode; onPress?: () => void; last?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const st: StyleProp<ViewStyle> = [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth * 2, borderBottomColor: c.line }, style];
  return onPress ? (
    <Tap onPress={onPress} style={st} scaleTo={0.985}>
      {children}
    </Tap>
  ) : (
    <View style={st}>{children}</View>
  );
}
/** Inhalt einer Listenzeile: Titel + Untertitel */
export function LiText({ title, sub }: { title: string; sub?: string }) {
  return (
    <Grow>
      <Txt f="semibold" s={14}>
        {title}
      </Txt>
      {sub ? <Small style={{ marginTop: 1 }}>{sub}</Small> : null}
    </Grow>
  );
}

/** Gruppierte Liste (.grp/.gr) */
export function Group({ children }: { children: ReactNode }) {
  const cs = useCardStyle();
  return <View style={[cs, { padding: 0, overflow: 'hidden' }]}>{children}</View>;
}
export function GroupRow({
  icon, title, sub, value, valueAcc, hot, onPress, first, chevron = true,
}: { icon: IconName; title: string; sub?: string; value?: string; valueAcc?: boolean; hot?: boolean; onPress?: () => void; first?: boolean; chevron?: boolean }) {
  const { c } = useTheme();
  return (
    <Tap onPress={onPress} scaleTo={0.985} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 }}>
      {!first ? <View style={{ position: 'absolute', top: 0, left: 58, right: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: c.line }} /> : null}
      <View style={{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: hot ? c.acc : c.card2 }}>
        <Icon name={icon} size={16} color={hot ? c.on : c.text} />
      </View>
      <Grow>
        <Txt f="semibold" s={14.5}>
          {title}
        </Txt>
        {sub ? <Small>{sub}</Small> : null}
      </Grow>
      {value ? (
        <Txt f={valueAcc ? 'bold' : 'medium'} s={13} c={valueAcc ? c.acc : c.muted}>
          {value}
        </Txt>
      ) : null}
      {chevron ? <Icon name="chev" size={16} color={c.muted} /> : null}
    </Tap>
  );
}
export const GroupLabel = ({ children }: { children: string }) => <Lbl s={11} style={{ marginTop: 14, marginBottom: -6, marginHorizontal: 4 }}>{children}</Lbl>;

/** Abschnittstitel (.sec-t) */
export function SecTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
      <Disp s={18}>{title}</Disp>
      {action ? (
        <Tap onPress={onAction} hitSlop={10}>
          <Txt f="semibold" s={12} c={c.acc}>
            {action}
          </Txt>
        </Tap>
      ) : null}
    </View>
  );
}

export function Empty({ children }: { children: string }) {
  const { c } = useTheme();
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, borderRadius: 18, padding: 22 }}>
      <Txt s={13} c={c.muted} center>
        {children}
      </Txt>
    </View>
  );
}

export function Avatar({ ini, size = 38 }: { ini: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#f68a4f', alignItems: 'center', justifyContent: 'center' }}>
      <Txt f="heavy" s={size * 0.34} c="#111">
        {ini}
      </Txt>
    </View>
  );
}

/** Haken-Kästchen (.chk) */
export function Chk({ ok, icon }: { ok: boolean; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <View style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: ok ? c.okSoft : c.soft }}>
      <Icon name={icon ?? (ok ? 'check' : 'x')} size={14} color={ok ? c.ok : c.acc} strokeWidth={2.4} />
    </View>
  );
}

export const hair = (c: Colors) => ({ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.line });
