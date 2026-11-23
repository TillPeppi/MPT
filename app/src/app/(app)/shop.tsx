/** Shop: anfragen statt bezahlen, Warenkorb, Meine Anfragen. */
import { ScrollView, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { RoundButton, Screen } from '@/components/Screen';
import { Btn, Card, Chip, Grow, IconBox, Lbl, Li, ListCard, LiText, Pill, Row, Small, Txt } from '@/components/ui';
import type { Product } from '@/data/types';
import { cartCount } from '@/lib/domain';
import { eur } from '@/lib/format';
import { toast, useUi } from '@/store/ui';
import { useApp, useContent, useMember } from '@/store/app';
import { useTheme } from '@/theme';

const CATS = ['Alle', 'Protein', 'Supplements', 'Equipment'];

export default function Shop() {
  const m = useMember();
  const products = useContent().products;
  const cat = useUi((s) => s.shopCat);
  const n = cartCount(m);
  return (
    <Screen title="Shop" extra={<RoundButton icon="cart" label={n ? `Warenkorb, ${n} Artikel` : 'Warenkorb'} badge={n} onPress={() => useUi.getState().openSheet({ t: 'cart' })} />}>
      <Card style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
        <Row>
          <IconBox name="info" />
          <Txt s={12.5} lh={18} style={{ flex: 1 }}>
            Hier wird nichts bezahlt: Du schickst eine Anfrage, abholen und bezahlen kannst du im Studio (bar, EC, PayPal).
          </Txt>
        </Row>
      </Card>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0 }}>
        {CATS.map((x) => (
          <Chip key={x} label={x} on={cat === x} onPress={() => useUi.setState({ shopCat: x })} />
        ))}
      </ScrollView>
      {products
        .filter((p) => cat === 'Alle' || p.cat === cat)
        .map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      <Lbl style={{ marginTop: 6 }}>Meine Anfragen</Lbl>
      <ListCard>
        {m.requests.map((r, i) => (
          <Li key={r.id} last={i === m.requests.length - 1}>
            <LiText title={r.items.map((x) => `${x[1]}× ${x[0]}`).join(', ')} sub={`${r.date} · ${eur(r.items.reduce((a, x) => a + x[1] * x[2], 0))}`} />
            <Pill tone={r.status === 'Abgeholt' ? 'grey' : 'acc'} text={r.status} />
          </Li>
        ))}
      </ListCard>
    </Screen>
  );
}

function ProductCard({ p }: { p: Product }) {
  const { c } = useTheme();
  const sel = useUi((s) => s.variant[p.id]);
  const v = sel ?? p.variants?.[0] ?? '';
  return (
    <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: c.card2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={p.cat === 'Equipment' ? 'target' : p.cat === 'Protein' ? 'bolt' : 'pill'} size={24} color={c.acc} />
      </View>
      <Grow>
        <Row gap={6} style={{ alignItems: 'flex-start' }}>
          <Txt f="bold" s={14} style={{ flex: 1 }}>
            {p.name}
          </Txt>
          {p.badge ? <Pill text={p.badge} /> : null}
        </Row>
        <Small>{p.unit}</Small>
        {p.variants ? (
          <Row gap={6} style={{ marginTop: 8, flexWrap: 'wrap' }}>
            {p.variants.map((x) => (
              <Chip key={x} small label={x} on={x === v} onPress={() => useUi.setState((s) => ({ variant: { ...s.variant, [p.id]: x } }))} />
            ))}
          </Row>
        ) : null}
        <Row style={{ marginTop: 10 }}>
          <Txt f="heavy" s={15} style={{ flex: 1 }}>
            {eur(p.price)}
          </Txt>
          <Btn
            small
            icon="plus"
            title="In den Warenkorb"
            onPress={() => {
              useApp.getState().addToCart(p.id, v);
              toast(`${p.name} im Warenkorb`);
            }}
          />
        </Row>
      </Grow>
    </Card>
  );
}
