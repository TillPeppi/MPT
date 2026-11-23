import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Card, IconBox, Small, Txt } from '@/components/ui';
import { IMAGES } from '@/data/images';
import type { ImageKey } from '@/data/types';
import { useTheme } from '@/theme';

const VIDS: [string, ImageKey][] = [['Kniebeuge', 'studio-gym'], ['Kreuzheben', 'trainer-bench'], ['Plank', 'group'], ['Rudern', 'studio-bikes']];

export default function Videos() {
  const { c } = useTheme();
  return (
    <Screen title="Video-Bibliothek">
      <Card style={{ borderStyle: 'dashed', borderWidth: 1, borderColor: c.line, alignItems: 'center', padding: 22 }}>
        <IconBox name="play" />
        <Txt f="bold" style={{ marginTop: 10 }}>
          Kommt bald
        </Txt>
        <Small center>Jede Übung in höchstens 1 Minute technisch erklärt.</Small>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {VIDS.map(([n, img]) => (
          <Card key={n} style={{ width: '48.4%', padding: 0, overflow: 'hidden', opacity: 0.6 }}>
            <View style={{ height: 90, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={IMAGES[img]} style={StyleSheet.absoluteFill} contentFit="cover" />
              <Icon name="play" size={24} color="#fff" />
            </View>
            <View style={{ paddingVertical: 8, paddingHorizontal: 10 }}>
              <Txt f="bold" s={12}>
                {n}
              </Txt>
              <Small>0:45</Small>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
