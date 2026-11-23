import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Senkrechter Verlauf über Fotos (::before der Demo). stops: [Position 0–1, Deckkraft]. */
export function Shade({ stops, color = '#0a0a0b' }: { stops: [number, number][]; color?: string }) {
  const id = 'sh' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([o, a], i) => (
            <Stop key={i} offset={o} stopColor={color} stopOpacity={a} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
