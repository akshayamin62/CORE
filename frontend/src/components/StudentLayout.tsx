'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

interface StudentLayoutProps {
  children: React.ReactNode;
  formStructure: any[];
  currentPartIndex: number;
  currentSectionIndex: number;
  onPartChange: (index: number) => void;
  onSectionChange: (index: number) => void;
  serviceName?: string;
}

export default function StudentLayout({
  children,
  formStructure,
  currentPartIndex,
  currentSectionIndex,
  onPartChange,
  onSectionChange,
  serviceName = 'Form',
}: StudentLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (formStructure.length === 0) {
    return <div>{children}</div>;
  }

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
              {/* <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs truncate">
                  {serviceName.charAt(0).toUpperCase()}
                </span>
              </div> */}
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
          {formStructure.map((part, partIndex) => {
            const isPartActive = currentPartIndex === partIndex;
            const hasSections = part.sections && part.sections.length > 0;

            return (
              <div key={part.part._id} className="mb-4">
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {sidebarOpen && (
                    <span className="font-medium">{part.part.title}</span>
                  )}
                </button>

              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}


