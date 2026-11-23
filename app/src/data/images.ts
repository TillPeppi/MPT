import type { ImageKey } from './types';

/** Bilder aus assets/img der Website. */
export const IMAGES: Record<ImageKey, number> = {
  'studio-gym': require('../../assets/img/studio-gym.jpg'),
  'trainer-bench': require('../../assets/img/trainer-bench.jpg'),
  'golf-simulator': require('../../assets/img/golf-simulator.jpg'),
  'studio-bikes': require('../../assets/img/studio-bikes.jpg'),
  group: require('../../assets/img/group.jpg'),
  'coach-marc-luca': require('../../assets/img/coach-marc-luca.jpg'),
  giftcard: require('../../assets/img/giftcard.jpg'),
};
