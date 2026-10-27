'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useNotificationStore } from '@/store/notifications';
import { useSiteStore } from '@/store/site';
import { useSites } from '@/hooks/useSites';
import { isTokenExpired } from '@/lib/jwt';
import { formatTime12hInTz } from '@/lib/date';
import {
  BellIcon,
  CloseIcon,
  MapPinIcon,
  HomeIcon,
  CrowdEntriesIcon,
  PowerIcon,
  MenuIcon,
  ChevronDownIcon,
} from '@/components/icons';

export default function ProtectedClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, hasHydrated, logout } = useAuthStore();
  const { isDrawerOpen, closeDrawer, toggleDrawer, alerts } = useNotificationStore();
  const { selectedSiteId, setSelectedSiteId } = useSiteStore();
  const { data: sites, isLoading: isLoadingSites } = useSites();

  const activeSiteId = selectedSiteId || sites?.[0]?.siteId || '';

  const isAuthed = Boolean(token && !isTokenExpired(token));

  useEffect(() => {
    if (!hasHydrated) return;

    if (!token) {
      router.replace('/login');
      return;
    }

    if (isTokenExpired(token)) {
      logout();
      router.replace('/login');
    }
  }, [hasHydrated, token, logout, router]);

  if (!hasHydrated || !isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500 bg-[#F7F8FA]">
        Loading...
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#F7F8FA]">
      {/* Left Sidebar (240px wide, exactly matching Figma frame 1:838) */}
      <aside className="w-[240px] bg-[#0d2a2d] text-white flex flex-col justify-between shrink-0 relative overflow-hidden z-20">
        {/* Figma Sidebar Vector Mesh Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 bg-cover bg-left-top"
          style={{ backgroundImage: `url('/sidebar-bg.svg')` }}
        />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo & Menu Header (64px) matching Figma 1:846 */}
          <div className="h-16 flex items-center justify-between px-4 shrink-0">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/logo.svg"
                alt="Kloudspot"
                width={126}
                height={40}
                priority
                className="h-8 w-auto"
              />
            </Link>
            <button
              type="button"
              className="text-white/80 hover:text-white p-1 rounded transition-colors"
              aria-label="Toggle menu"
            >
              <MenuIcon size={20} />
            </button>
          </div>

          {/* Navigation Links matching Figma 7:11101 */}
          <nav className="p-3 space-y-1.5 flex-1">
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                pathname === '/dashboard'
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {pathname === '/dashboard' && (
                <span className="w-1 h-7 bg-white rounded-r absolute left-0 top-1/2 -translate-y-1/2" />
              )}
              <HomeIcon size={18} className="shrink-0" />
              <span>Overview</span>
            </Link>

            <Link
              href="/entries"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                pathname === '/entries'
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {pathname === '/entries' && (
                <span className="w-1 h-7 bg-white rounded-r absolute left-0 top-1/2 -translate-y-1/2" />
              )}
              <CrowdEntriesIcon size={18} className="shrink-0" />
              <span>Crowd Entries</span>
            </Link>
          </nav>

          {/* Bottom Logout section matching Figma crop_sidebar_bottom */}
          <div className="p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white w-full rounded-lg hover:bg-white/10 transition-colors"
            >
              <PowerIcon size={18} className="shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header (64px height matching Figma top bar 1:982) */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="font-medium text-[#1D1D1B] text-base">
              Crowd Solutions
            </span>
            <span className="text-[#D1D5DB]">|</span>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E7EB] rounded-lg bg-white text-sm font-normal text-[#1D1D1B]">
              <MapPinIcon size={14} className="text-[#1D1D1B] shrink-0" />
              <select
                value={activeSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                disabled={isLoadingSites || !sites?.length}
                className="appearance-none bg-transparent focus:outline-none cursor-pointer pr-1 font-normal text-[#1D1D1B]"
              >
                {isLoadingSites && <option>Loading...</option>}
                {sites?.map((site) => (
                  <option key={site.siteId} value={site.siteId}>
                    {site.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={12} className="text-[#1D1D1B] shrink-0 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher pill with teal active circle En matching Figma */}
            <div className="flex items-center p-0.5 border border-[#E5E7EB] rounded-full bg-white text-xs">
              <span className="w-7 h-7 rounded-full bg-[#009490] text-white flex items-center justify-center font-medium text-xs">
                En
              </span>
              <span className="px-2 text-gray-700 font-medium text-sm">ع</span>
            </div>

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={toggleDrawer}
              className="relative p-1.5 text-gray-700 hover:text-gray-900 rounded-full transition-colors"
              aria-label="Toggle notifications"
            >
              <BellIcon size={22} className="shrink-0" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#EF4444] rounded-full" />
            </button>

            {/* User Profile Avatar matching Figma 1:1005 */}
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-100">
              <Image
                src="/avatar.png"
                alt="Profile"
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#F7F8FA]">
          {children}
        </main>
      </div>

      {/* Notifications Slide-over Drawer (Matching Figma frame 1:8520) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay rgba(0, 0, 0, 0.4) */}
          <div
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={closeDrawer}
          />

          {/* Drawer container: 320px width, rounded-tl-2xl */}
          <aside className="relative w-[320px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 rounded-tl-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[#1D1D1B]">Alerts</h3>
                <p className="text-xs text-gray-400">Live venue updates</p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Close alerts"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            {/* Alerts List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {alerts.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-400">
                  No notifications recorded yet.
                </div>
              ) : (
                alerts.map((alert, idx) => {
                  const isTop = idx === 0;
                  const isEntry = alert.direction === 'entry' || alert.direction === 'zone-entry';

                  return (
                    <div
                      key={alert.eventId || `alert-${idx}`}
                      className={`p-3.5 rounded-2xl border text-xs transition-all ${
                        isTop
                          ? 'bg-[#CEF2F1] border-[#009490]'
                          : 'bg-white border-[#D2D4D9]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full ${
                            alert.severity === 'high'
                              ? 'bg-rose-100 text-rose-700'
                              : alert.severity === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-teal-100 text-[#009490]'
                          }`}
                        >
                          {alert.severity} Priority
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono">
                          {formatTime12hInTz(alert.ts)}
                        </span>
                      </div>

                      <div className="font-medium text-[#1D1D1B] mb-0.5">
                        {alert.personName || 'Visitor'} {isEntry ? 'entered' : 'exited'}
                      </div>
                      <div className="text-gray-500 flex items-center gap-1.5 text-[11px]">
                        <MapPinIcon size={12} className="text-gray-400 shrink-0" />
                        <span>{alert.zoneName || 'Main Zone'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
