import {
  AirplaneIcon, ArrowsClockwiseIcon, BabyIcon, BankIcon, BarbellIcon, BeerSteinIcon, BicycleIcon, BookOpenIcon,
  BriefcaseIcon, BusIcon, CarIcon, CoffeeIcon, CreditCardIcon, DeviceMobileIcon, DropIcon,
  FilmSlateIcon, FlameIcon, ForkKnifeIcon, GameControllerIcon, GasPumpIcon, GiftIcon,
  GraduationCapIcon, HandCoinsIcon, HeartbeatIcon, HeartIcon, HouseIcon, LaptopIcon, LeafIcon,
  LightningIcon, MusicNotesIcon, PawPrintIcon, PiggyBankIcon, PillIcon, PizzaIcon, ReceiptIcon,
  ScissorsIcon, ShoppingBagIcon, ShoppingCartIcon, SparkleIcon, StethoscopeIcon, TagIcon,
  TelevisionIcon, TicketIcon, TrainIcon, TShirtIcon, UmbrellaIcon, WalletIcon, WifiHighIcon,
  WrenchIcon,
  type Icon,
} from "@phosphor-icons/react";

/**
 * Icons a category can use. Stored by key, so keys must never be renamed once
 * released; the component behind a key can change (it did: Lucide to Phosphor).
 */
export const PRESET_ICONS = {
  fuel: GasPumpIcon,
  "shopping-bag": ShoppingBagIcon,
  utensils: ForkKnifeIcon,
  sparkles: SparkleIcon,
  landmark: BankIcon,
  "hand-coins": HandCoinsIcon,
  house: HouseIcon,
  car: CarIcon,
  bus: BusIcon,
  train: TrainIcon,
  plane: AirplaneIcon,
  bike: BicycleIcon,
  "heart-pulse": HeartbeatIcon,
  stethoscope: StethoscopeIcon,
  pill: PillIcon,
  dumbbell: BarbellIcon,
  "graduation-cap": GraduationCapIcon,
  book: BookOpenIcon,
  gift: GiftIcon,
  baby: BabyIcon,
  paw: PawPrintIcon,
  shirt: TShirtIcon,
  scissors: ScissorsIcon,
  smartphone: DeviceMobileIcon,
  laptop: LaptopIcon,
  tv: TelevisionIcon,
  wifi: WifiHighIcon,
  zap: LightningIcon,
  droplet: DropIcon,
  flame: FlameIcon,
  film: FilmSlateIcon,
  ticket: TicketIcon,
  gamepad: GameControllerIcon,
  music: MusicNotesIcon,
  coffee: CoffeeIcon,
  beer: BeerSteinIcon,
  pizza: PizzaIcon,
  cart: ShoppingCartIcon,
  wrench: WrenchIcon,
  briefcase: BriefcaseIcon,
  "piggy-bank": PiggyBankIcon,
  "credit-card": CreditCardIcon,
  receipt: ReceiptIcon,
  umbrella: UmbrellaIcon,
  heart: HeartIcon,
  leaf: LeafIcon,
  wallet: WalletIcon,
  repeat: ArrowsClockwiseIcon,
  tag: TagIcon,
} satisfies Record<string, Icon>;

export type PresetIconName = keyof typeof PRESET_ICONS;

/** Looks up a stored icon key, falling back to a tag for unknown keys (e.g. from a newer app version). */
export function presetIcon(name: string): Icon {
  // Own keys only: a stored name like "constructor" must not reach Object's prototype.
  return Object.hasOwn(PRESET_ICONS, name) ? (PRESET_ICONS as Record<string, Icon>)[name]! : TagIcon;
}
