import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/Screen';
import { Disp, Empty, Lbl, Txt } from '@/components/ui';
import { IMAGES } from '@/data/images';
import { useContent } from '@/store/app';

export default function NewsDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const n = useContent().news.find((x) => x.id === id);
  if (!n)
    return (
      <Screen title="News">
        <Empty>Beitrag nicht gefunden</Empty>
      </Screen>
    );
  return (
    <Screen title="News" noLargeTitle>
      {n.img ? <Image source={IMAGES[n.img]} style={{ height: 170, borderRadius: 18 }} contentFit="cover" /> : null}
      <Lbl>{`${n.tag} · ${n.date}`}</Lbl>
      <Disp s={28} lh={30} accessibilityRole="header">
        {n.t}
      </Disp>
      <Txt s={15} lh={24}>
        {n.x}
      </Txt>
    </Screen>
  );
}
