import LogoMark from './LogoMark';
import { Award, BarChart3, BookOpen, CalendarDays, CheckSquare, Clock3, DatabaseBackup, FileText, Flame, GraduationCap, LayoutDashboard, NotebookPen, Search, Sparkles, Target, Trophy } from 'lucide-react';

const items = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'academic', label: 'Academic', icon: GraduationCap },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'habits', label: 'Habits', icon: Flame },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'analyzer', label: 'Analyzer', icon: BarChart3 },
  { id: 'routine', label: 'Routine', icon: CalendarDays },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'exams', label: 'Exams', icon: Trophy },
  { id: 'timer', label: 'Timer', icon: Clock3 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'achievements', label: 'Badges', icon: Award },
  { id: 'focus', label: 'Focus Mode', icon: Sparkles },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'backup', label: 'Backup', icon: DatabaseBackup },
];

export default function Sidebar({ page, setPage }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <LogoMark />
        <div>
          <h1>LifeOS</h1>
          <p>Student Dashboard</p>
        </div>
      </div>
      <nav className="navList">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setPage(item.id)} className={`navItem ${page === item.id ? 'active' : ''}`}>
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebarFooter">
        <BookOpen size={18} />
        <span>Made by Sama</span>
      </div>
    </aside>
  );
}
