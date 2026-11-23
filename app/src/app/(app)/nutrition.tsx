import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Card, Chip, Lbl, Row, Txt } from '@/components/ui';
import { IMAGES } from '@/data/images';
import { go } from '@/lib/nav';
import { useContent } from '@/store/app';

const TAGS = ['Alle', 'Wissen', 'Tipps'] as const;

export default function Nutrition() {
  const articles = useContent().articles;
  const [tag, setTag] = useState<(typeof TAGS)[number]>('Alle');
  return (
    <Screen title="Ernährung">
      <Row gap={6}>
        {TAGS.map((t) => (
          <Chip key={t} label={t} on={tag === t} onPress={() => setTag(t)} />
        ))}
      </Row>
      {articles
        .filter((a) => tag === 'Alle' || a.tag === tag)
        .map((a) => (
          <Card key={a.id} onPress={() => go(`article|${a.id}`)} style={{ padding: 0, overflow: 'hidden' }} accessibilityLabel={a.t}>
            {a.img ? <Image source={IMAGES[a.img]} style={{ height: 120 }} contentFit="cover" /> : null}
            <View style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
              <Lbl>{`${a.tag} · ${a.min} Min. Lesezeit`}</Lbl>
              <Txt f="bold" s={15} style={{ marginTop: 3 }}>
                {a.t}
              </Txt>
            </View>
          </Card>
        ))}
    </Screen>
  );
}
