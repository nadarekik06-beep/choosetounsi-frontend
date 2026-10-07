import {
  BarChart3, Check, Clock, Crown, Gift, Headset, Heart, Image, Megaphone, Package, Percent,
  Rocket, Shield, Sparkles, Star, Tag, Ticket, Truck, Users, Zap, type LucideIcon,
} from 'lucide-react'

/**
 * Icon keys the API may send (PlanDisplayFeature::ICONS and the capability
 * registry in the backend). Unknown keys fall back to no icon.
 */
export const PLAN_ICONS: Record<string, LucideIcon> = {
  check: Check, star: Star, zap: Zap, sparkles: Sparkles, crown: Crown, chart: BarChart3,
  megaphone: Megaphone, ticket: Ticket, tag: Tag, percent: Percent, package: Package, image: Image,
  truck: Truck, headset: Headset, shield: Shield, gift: Gift, clock: Clock, users: Users,
  rocket: Rocket, heart: Heart,
}
