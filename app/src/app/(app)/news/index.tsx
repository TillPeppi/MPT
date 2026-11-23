import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Tap } from '@/components/Tap';
import { Card, Grow, IconBox, Lbl, Row, Txt } from '@/components/ui';
import { go } from '@/lib/nav';
import { useContent } from '@/store/app';
import { toast } from '@/store/ui';
import { useTheme } from '@/theme';

export default function NewsList() {
  const { c } = useTheme();
  const news = useContent().news;
  return (
    <Screen title="Studio News">
      <Tap onPress={() => toast('Öffnet den MPT WhatsApp-Kanal')} style={{ backgroundColor: '#128c4a', borderRadius: 20, padding: 16 }} accessibilityLabel="WhatsApp-Kanal öffnen">
        <Row>
          <IconBox name="chat" tone={{ bg: 'rgba(255,255,255,0.18)', fg: '#fff' }} />
          <Grow>
            <Txt f="bold" c="#fff">
              WhatsApp-Kanal
            </Txt>
            <Txt s={12} c="rgba(255,255,255,0.85)">
              Alle News auch direkt aufs Handy
            </Txt>
          </Grow>
          <Icon name="chev" size={16} color="#fff" />
        </Row>
      </Tap>
      {news.map((n) => (
        <Card key={n.id} onPress={() => go(`news|${n.id}`)} accessibilityLabel={n.t}>
          <Row>
            <IconBox name="mega" />
            <Grow>
              <Lbl>{`${n.tag} · ${n.date}`}</Lbl>
              <Txt f="bold" s={14} style={{ marginTop: 2 }}>
                {n.t}
              </Txt>
            </Grow>
            <Icon name="chev" size={16} color={c.muted} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
