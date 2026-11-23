/** Benachrichtigungen (S.notifs): Alle / MPT News / Für mich. */
import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Btn, Grow, IconBox, Li, ListCard, Seg, Small, Txt } from '@/components/ui';
import { unread } from '@/lib/domain';
import { go } from '@/lib/nav';
import { useApp, useMember } from '@/store/app';
import { useUi } from '@/store/ui';
import { useTheme } from '@/theme';

export default function Notifs() {
  const { c } = useTheme();
  const m = useMember();
  const f = useUi((s) => s.notifTab);
  const list = m.notifs.filter((n) => f === 'all' || n.k === f);
  return (
    <Screen title="Neuigkeiten" extra={unread(m) ? <Btn small kind="ghost" title="Alle gelesen" onPress={() => useApp.getState().readAll()} /> : null}>
      <Seg items={[['all', 'Alle'], ['news', 'MPT News'], ['me', 'Für mich']]} value={f} onChange={(v) => useUi.setState({ notifTab: v })} />
      <ListCard>
        {list.length ? (
          list.map((n, i) => (
            <Li
              key={n.id}
              last={i === list.length - 1}
              style={{ alignItems: 'flex-start' }}
              onPress={() => {
                useApp.getState().readNotif(n.id);
                if (n.go) go(n.go);
              }}
            >
              <IconBox name={n.i} />
              <Grow>
                <Txt f="semibold" s={14}>
                  {n.t}
                </Txt>
                <Small lh={17}>{n.x}</Small>
                <Small style={{ marginTop: 4 }}>
                  {n.k === 'news' ? 'MPT News' : 'Für dich'} · {n.at}
                </Small>
              </Grow>
              {!n.read ? <View accessibilityLabel="ungelesen" style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.acc, marginTop: 6 }} /> : null}
            </Li>
          ))
        ) : (
          <Li last>
            <Small>Nichts Neues</Small>
          </Li>
        )}
      </ListCard>
    </Screen>
  );
}
