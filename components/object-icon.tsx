import {
  Briefcase,
  Building2,
  CheckSquare,
  Crown,
  Megaphone,
  Package,
  Star,
  User,
  StickyNote,
  Phone,
  Mail,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  building: Building2,
  user: User,
  star: Star,
  crown: Crown,
  briefcase: Briefcase,
  megaphone: Megaphone,
  package: Package,
  "check-square": CheckSquare,
  note: StickyNote,
  call: Phone,
  email: Mail,
  meeting: CalendarDays,
  task: CheckSquare,
};

export function ObjectIcon({ icon, color, size = 32 }: { icon: string; color: string; size?: number }) {
  const Icon = ICONS[icon] ?? Star;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded"
      style={{ background: color, width: size, height: size }}
    >
      <Icon color="#fff" size={Math.round(size * 0.58)} strokeWidth={2} />
    </span>
  );
}
