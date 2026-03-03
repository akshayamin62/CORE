'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { getFullName, getInitials } from '@/utils/nameHelpers';

interface StudentLayoutProps {
  children: React.ReactNode;
  formStructure: any[];
  currentPartIndex: number;
  currentSectionIndex: number;
  onPartChange: (index: number) => void;
  onSectionChange: (index: number) => void;
  serviceName?: string;
  showDashboard?: boolean;
  isDashboardActive?: boolean;
  onDashboardClick?: () => void;
  user?: { firstName?: string; middleName?: string; lastName?: string; email: string } | null;
  isEducationPlanning?: boolean;
  activeEduPlanView?: string;
  onEduPlanViewChange?: (view: string) => void;
  onMyActivityClick?: () => void;
}

export default function StudentLayout({
  children,
  formStructure,
  currentPartIndex,
  currentSectionIndex,
  onPartChange,
  onSectionChange,
  serviceName = 'Form',
  showDashboard = false,
  isDashboardActive = false,
  onDashboardClick,
  user,
  isEducationPlanning = false,
  activeEduPlanView,
  onEduPlanViewChange,
  onMyActivityClick,
}: StudentLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (formStructure.length === 0 && !showDashboard && !isEducationPlanning) {
    return <div>{children}</div>;
  }

  /* ─── Education Planning sidebar items ─── */
  const eduPlanNavItems = [
    { key: 'dashboard', label: 'Dashboard', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { key: 'my-activity', label: 'My Activity', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    )},
    { key: 'analytics', label: 'Activity Analysis', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { key: 'brainography', label: 'Brainography Analysis', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )},
    { key: 'portfolio', label: 'Portfolio Generator', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    )},
  ];

  const currentPart = formStructure[currentPartIndex];
  const sections = currentPart?.sections || [];

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col sticky top-20 h-[calc(100vh-5rem)]`}
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">{serviceName}</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation - Parts */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {/* Education Planning Nav Items */}
          {isEducationPlanning && (
            <>
              {eduPlanNavItems.map((item) => {
                const isActive = activeEduPlanView === item.key;
                return (
                  <div key={item.key} className="mb-1">
                    <button
                      onClick={() => {
                        if (item.key === 'my-activity') {
                          onMyActivityClick?.();
                        } else {
                          onEduPlanViewChange?.(item.key);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      } ${!sidebarOpen && 'justify-center'}`}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      {item.icon}
                      {sidebarOpen && <span className="font-medium">{item.label}</span>}
                    </button>
                  </div>
                );
              })}
            </>
          )}

          {/* Dashboard Nav Item (Study Abroad) */}
          {!isEducationPlanning && showDashboard && (
            <div className="mb-1">
              <button
                onClick={onDashboardClick}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  isDashboardActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${!sidebarOpen && 'justify-center'}`}
                title={!sidebarOpen ? 'Dashboard' : undefined}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {sidebarOpen && <span className="font-medium">Dashboard</span>}
              </button>
            </div>
          )}

          {formStructure.map((part, partIndex) => {
            const isPartActive = currentPartIndex === partIndex && !isDashboardActive && (!isEducationPlanning || activeEduPlanView === 'form');
            const hasSections = part.sections && part.sections.length > 0;

            return (
              <div key={part.part._id} className="mb-1">
                <button
                  onClick={() => {
                    onPartChange(partIndex);
                    onSectionChange(0);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    isPartActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${!sidebarOpen && 'justify-center'}`}
                  title={!sidebarOpen ? part.part.title : undefined}
                >
                  {/* Dynamic icon based on part title */}
                  {part.part.title.toLowerCase().includes('profile') ? (
                    // Profile icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : part.part.title.toLowerCase().includes('application') ? (
                    // Application/Clipboard icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  ) : part.part.title.toLowerCase().includes('document') ? (
                    // Documents icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : part.part.title.toLowerCase().includes('payment') ? (
                    // Payment/Credit card icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  ) : (
                    // Default document icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {sidebarOpen && (
                    <span className="font-medium">{part.part.title}</span>
                  )}
                </button>

              </div>
            );
          })}

          {/* Parents, Alumni, Service Providers */}
          <div className=" border-gray-200 mt-0 pt-0">
            {[
              { name: 'Parents', path: '/student/parents', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              )},
              { name: 'Alumni', path: '/student/alumni', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )},
              { name: 'Service Providers', path: '/student/service-providers', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              )},
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-gray-700 hover:bg-gray-100 ${
                  !sidebarOpen && 'justify-center'
                }`}
                title={!sidebarOpen ? item.name : undefined}
              >
                {item.icon}
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </button>
            ))}
          </div>
        </nav>

        {/* User Info & Logout */}
        {user && (
          <div className="border-t border-gray-200 p-4">
            {sidebarOpen ? (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {getFullName(user)}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            ) : (
              <div className="mb-3 flex justify-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {getInitials(user)}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
                !sidebarOpen && 'justify-center'
              }`}
              title={!sidebarOpen ? 'Logout' : undefined}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {sidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}


