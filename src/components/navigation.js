import {
  Award,
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  CheckSquare,
  Clock3,
  DatabaseBackup,
  FileText,
  Flame,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Search,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

export const navigationSections = [
  {
    id: 'overview',
    label: 'Overview', bn: 'সারসংক্ষেপ',
    items: [
      { id: 'dashboard', label: 'Dashboard', bn: 'ড্যাশবোর্ড', icon: LayoutDashboard },
      { id: 'search', label: 'Global Search', bn: 'সার্চ', icon: Search },
      { id: 'analytics', label: 'Analytics', bn: 'অ্যানালিটিক্স', icon: BarChart3 },
    ],
  },
  {
    id: 'academics',
    label: 'Academic', bn: 'একাডেমিক',
    items: [
      { id: 'academic', label: 'Academic', bn: 'একাডেমিক', icon: GraduationCap },
      { id: 'attendance', label: 'Attendance', bn: 'উপস্থিতি', icon: CalendarCheck2 },
      { id: 'routine', label: 'Routine', bn: 'রুটিন', icon: CalendarDays },
      { id: 'calendar', label: 'Calendar', bn: 'ক্যালেন্ডার', icon: CalendarDays },
      { id: 'exams', label: 'Exams', bn: 'পরীক্ষা', icon: Trophy },
    ],
  },
  {
    id: 'planning',
    label: 'Planning', bn: 'পরিকল্পনা',
    items: [
      { id: 'tasks', label: 'Tasks', bn: 'টাস্ক', icon: CheckSquare },
      { id: 'goals', label: 'Goals', bn: 'লক্ষ্য', icon: Target },
      { id: 'habits', label: 'Habits', bn: 'অভ্যাস', icon: Flame },
      { id: 'focus', label: 'Focus Mode', bn: 'ফোকাস', icon: Sparkles },
      { id: 'timer', label: 'Pomodoro', bn: 'পোমোডোরো', icon: Clock3 },
      { id: 'analyzer', label: 'Study Log', bn: 'স্টাডি লগ', icon: BarChart3 },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge', bn: 'জ্ঞানভান্ডার',
    items: [
      { id: 'notes', label: 'Notes', bn: 'নোটস', icon: NotebookPen },
      { id: 'resources', label: 'Resources', bn: 'রিসোর্স', icon: FolderOpen },
      { id: 'achievements', label: 'Achievements', bn: 'অর্জন', icon: Award },
      { id: 'reports', label: 'Reports', bn: 'রিপোর্ট', icon: FileText },
    ],
  },
  {
    id: 'system',
    label: 'System', bn: 'সিস্টেম',
    items: [
      { id: 'backup', label: 'Settings & Data', bn: 'সেটিংস ও ডাটা', icon: DatabaseBackup },
    ],
  },
];

export const navigationItems = navigationSections.flatMap((section) => section.items);
export const primaryMobileItems = ['dashboard', 'tasks', 'calendar', 'focus']
  .map((id) => navigationItems.find((item) => item.id === id))
  .filter(Boolean);

export function getNavigationItem(id) {
  return navigationItems.find((item) => item.id === id);
}

export function navigationLabel(item, language = 'en') {
  return language === 'bn' && item?.bn ? item.bn : item?.label || '';
}
