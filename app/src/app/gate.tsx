/** Pflicht-Wochenrecap: Vollbild vor Home, ohne Tabbar und ohne Zurück. */
import { Screen } from '@/components/Screen';
import { RecapFlow, RecapResult, submitDraft } from '@/features/recap';
import { useMember } from '@/store/app';
import { useUi } from '@/store/ui';

export default function Gate() {
  const m = useMember();
  const result = useUi((s) => s.gateResult);
  if (m.recapDone && result)
    return (
      <Screen title="Danke!" gate>
        <RecapResult cta="Weiter" onCta={() => useUi.setState({ gateResult: false })} />
      </Screen>
    );
  return (
    <Screen title="Wochenrecap" sub="Pflicht · fällig für KW 48" gate>
      <RecapFlow
        onSubmit={async () => {
          useUi.setState({ gateResult: true });
          await submitDraft();
        }}
      />
    </Screen>
  );
}
