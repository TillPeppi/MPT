import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/Screen';
import { Disp, Empty, Lbl, Txt } from '@/components/ui';
import { IMAGES } from '@/data/images';
import { useContent } from '@/store/app';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const a = useContent().articles.find((x) => x.id === id);
  if (!a)
    return (
      <Screen title="Artikel">
        <Empty>Artikel nicht gefunden</Empty>
      </Screen>
    );
  return (
    <Screen title={a.tag} noLargeTitle>
      {a.img ? <Image source={IMAGES[a.img]} style={{ height: 170, borderRadius: 18 }} contentFit="cover" /> : null}
      <Lbl>{`${a.min} Min. Lesezeit · MPT Team`}</Lbl>
      <Disp s={28} lh={30} accessibilityRole="header">
        {a.t}
      </Disp>
      {a.x.map((p) => (
        <Txt key={p} s={15} lh={24}>
          {p}
        </Txt>
      ))}
    </Screen>
  );
}
