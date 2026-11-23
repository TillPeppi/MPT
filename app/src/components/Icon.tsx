import {
  Activity, Bell, BookOpen, Calendar, Camera, ChartColumn, Check, ChevronLeft, ChevronRight, ClipboardList, Clock, Flame,
  House, Info, LayoutGrid, Leaf, Lock, LogOut, Megaphone, MessageCircle, Minus, Moon, Phone, Pill, Play, Plus, QrCode,
  Repeat, Settings, ShoppingBag, ShoppingCart, Star, Sun, Target, TriangleAlert, Trophy, User, Users, X, Zap,
  type LucideIcon,
} from 'lucide-react-native';

import type { IconName } from '@/data/types';
import { useTheme } from '@/theme';

const MAP: Record<IconName, LucideIcon> = {
  home: House, chart: ChartColumn, cal: Calendar, more: LayoutGrid, bell: Bell, flame: Flame, plus: Plus, minus: Minus,
  check: Check, x: X, chev: ChevronRight, back: ChevronLeft, clock: Clock, users: Users, repeat: Repeat, trophy: Trophy,
  bag: ShoppingBag, leaf: Leaf, chat: MessageCircle, poll: ClipboardList, pulse: Activity, user: User, moon: Moon,
  bolt: Zap, play: Play, pill: Pill, lock: Lock, mega: Megaphone, cart: ShoppingCart, gear: Settings, out: LogOut,
  phone: Phone, alert: TriangleAlert, info: Info, cam: Camera, book: BookOpen, star: Star, qr: QrCode, target: Target, sun: Sun,
};

/** Größen wie in der Demo: s = 16, m = 20, l = 24. */
export function Icon({ name, size = 20, color, strokeWidth = 1.9 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const { c } = useTheme();
  const Cmp = MAP[name];
  return <Cmp size={size} color={color ?? c.text} strokeWidth={strokeWidth} />;
}
