import { router } from 'expo-router';
import { useState } from 'react';

import { Screen } from '@/components/Screen';
import { RecapFlow, RecapResult, submitDraft } from '@/features/recap';

export default function Recap() {
  const [done, setDone] = useState(false);
  if (done)
    return (
      <Screen title="Danke!">
        <RecapResult cta="Zurück zu Home" onCta={() => router.navigate('/')} />
      </Screen>
    );
  return (
    <Screen title="Wochenrecap">
      <RecapFlow
        onSubmit={async () => {
          await submitDraft();
          setDone(true);
        }}
      />
    </Screen>
  );
}
