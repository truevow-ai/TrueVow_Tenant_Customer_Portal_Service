'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics/track';
import { Events } from '@/lib/analytics/events';
import { 
  LayoutDashboard, 
  Users, 
  FileCheck, 
  CreditCard, 
  Settings,
  Scale,
  Network,
  ShieldCheck,
  UserPlus,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Sun,
  Monitor,
  Moon,
  Calendar,
  Zap
} from 'lucide-react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { FeatureProvider, useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useTheme } from '@/hooks/useTheme';

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { features, isLoading: featuresLoading, hasFeature, tier } = useFeatureAccess();
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const pathname = usePathname();

  // Fire session_started once on mount
  useEffect(() => {
    track('session_started', 'SESSION');
    // user_login: fire only on first session of the day
    try {
      const lastLogin = localStorage.getItem('tv_last_session_day');
      const today = new Date().toISOString().slice(0, 10);
      if (lastLogin !== today) {
        track('user_login', 'SESSION');
        Events.portalLogin({ tenant_id: undefined });
        localStorage.setItem('tv_last_session_day', today);
      }
    } catch { /* storage unavailable */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire page_viewed on every route change
  useEffect(() => {
    if (!pathname) return;
    track('page_viewed', 'SESSION', { page_path: pathname });
  }, [pathname]);
  
  // Display the Clerk user's full name (best practice â€” no suffix)
  const displayName = user?.fullName || user?.firstName || 'Admin';

  // Determine which services to show based on subscription and phase
  // Phase I: INTAKE only (CONNECT retracted)
  // Growth tier: INTAKE only (no DRAFT, SETTLE)
  // Preview bypass: show all features for dev preview
  const isPreviewBypass = typeof window !== 'undefined' && window.location.search.includes('preview=bypass');
  const showDraft = isPreviewBypass || hasFeature('draft');
  const showSettle = isPreviewBypass || hasFeature('settle');
  const showConnect = false; // CONNECT retracted for Phase I launch

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Slack-inspired Dark Purple */}
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-sidebar shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Logo & Collapse Toggle */}
        <div className="flex items-center justify-between h-16 border-b border-sidebar/20 px-4">
          {!collapsed && (
            <h1 className="text-xl font-bold text-sidebar-text">TrueVow</h1>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-sidebar-active text-sidebar-text-muted hover:text-sidebar-text transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />} collapsed={collapsed}>
            Dashboard
          </NavLink>
          
          {/* INTAKE - Always available for subscribed tenants */}
          <NavLink href="/dashboard/intake" icon={<Users size={20} />} collapsed={collapsed}>
            Intake & Leads
          </NavLink>
          
          {/* Calendar - Under INTAKE */}
          <NavLink href="/dashboard/intake/calendar" icon={<Calendar size={20} />} collapsed={collapsed}>
            Calendar
          </NavLink>
          
          {/* LEVERAGE - Show only if feature is enabled */}
          {showDraft && (
            <NavLink href="/dashboard/leverage" icon={<Zap size={20} />} collapsed={collapsed}>
              LEVERAGE
            </NavLink>
          )}
          
          {/* SETTLE - Show only if feature is enabled */}
          {showSettle && (
            <NavLink href="/dashboard/settle" icon={<Scale size={20} />} collapsed={collapsed}>
              Settlement Intelligence
            </NavLink>
          )}
          
          {/* CONNECT - Retracted for Phase I */}
          {/* {showConnect && (
            <NavLink href="/dashboard/connect" icon={<Network size={20} />} collapsed={collapsed}>
              CONNECT Referrals
            </NavLink>
          )} */}
          
          {/* Billing & Usage - Financial (promoted for Phase I) */}
          <NavLink href="/dashboard/billing" icon={<CreditCard size={20} />} collapsed={collapsed}>
            Billing & Usage
          </NavLink>
          
          {/* Divider */}
          <div className="border-t border-sidebar/20 my-3"></div>
          
          {/* Messages & Notifications */}
          <NavLink href="/dashboard/notifications" icon={<Inbox size={20} />} collapsed={collapsed}>
            Messages & Notifications
          </NavLink>
          
          {/* Team - Staff management */}
          <NavLink href="/dashboard/team" icon={<UserPlus size={20} />} collapsed={collapsed}>
            Team
          </NavLink>
          
          {/* VERIFY - Always available (moved down) */}
          <NavLink href="/dashboard/verify" icon={<ShieldCheck size={20} />} collapsed={collapsed}>
            VERIFY Service
          </NavLink>
          
          {/* Settings - Configuration */}
          <NavLink href="/dashboard/settings" icon={<Settings size={20} />} collapsed={collapsed}>
            Settings
          </NavLink>
        </nav>

        {/* User */}
        <div className="border-t border-sidebar/20 p-4">
          {/* Theme Toggle - shows current theme */}
          <button
            onClick={toggleTheme}
            className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-text-muted hover:bg-sidebar-active hover:text-sidebar-text transition-colors"
            title="Click to change theme"
          >
            {theme === 'dark' ? <Moon size={18} /> : theme === 'neutral' ? <Monitor size={18} /> : <Sun size={18} />}
            {!collapsed && (
              <span className="text-sm">
                {theme === 'dark' ? 'Dark Mode' : theme === 'neutral' ? 'Neutral Mode' : 'Light Mode'}
              </span>
            )}
          </button>
          
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex-shrink-0">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonTrigger: "focus:shadow-none"
                  }
                }}
              />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-text truncate">{displayName}</p>
                <p className="text-xs text-sidebar-text-muted">Click avatar for options</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 py-8">
          <Breadcrumb />
          <div className="flex gap-6">
            <div className="flex-1">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  collapsed: boolean;
  children: React.ReactNode;
}

function NavLink({ href, icon, collapsed, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-text-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-text ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? children as string : undefined}
    >
      {icon}
      {!collapsed && <span className="text-sm font-medium">{children}</span>}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  // Idle timeout: fire staff_idle_timeout after 20 min of inactivity
  useEffect(() => {
    const IDLE_MS = 20 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        Events.idleTimeout({ idle_seconds: IDLE_MS / 1000 });
      }, IDLE_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    const onUnload = () => Events.portalLogout({});
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  return (
    <FeatureProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </FeatureProvider>
  );
}
