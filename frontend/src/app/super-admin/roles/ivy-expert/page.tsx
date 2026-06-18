'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function IvyExpertUsersPage() {
  const router = useRouter();
  const [ivyStats, setIvyStats] = useState({ candidates: 0, students: 0 });

  useEffect(() => {
    const fetchIvyStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/super-admin/ivy-league/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setIvyStats({ candidates: res.data.candidates, students: res.data.students });
        }
      } catch {
        // ignore
      }
    };
    fetchIvyStats();
  }, []);

  return (
    <RoleUserListPage
      role="ivy-expert"
      roleDisplayName="Ivy Expert"
      roleEnum={USER_ROLE.IVY_EXPERT}
      canAddUser={true}
      hideActiveUsers={true}
      extraStats={
        <>
          <div
            onClick={() => router.push('/super-admin/roles/ivy-expert/candidates')}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-amber-300 hover:shadow-md sm:p-6"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs text-gray-600 sm:text-sm">Ivy Candidates</p>
                <p className="text-xl font-bold text-gray-900 sm:text-3xl">{ivyStats.candidates}</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 sm:h-12 sm:w-12">
                <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div
            onClick={() => router.push('/super-admin/roles/ivy-expert/students')}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-green-300 hover:shadow-md sm:p-6"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs text-gray-600 sm:text-sm">Ivy Students</p>
                <p className="text-xl font-bold text-gray-900 sm:text-3xl">{ivyStats.students}</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 sm:h-12 sm:w-12">
                <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </>
      }
      headerExtra={
        <div className="flex w-full flex-row gap-2 sm:w-auto sm:items-center">
          <Link
            href="/super-admin/roles/ivy-expert/activities"
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-2 text-[11px] font-medium text-white transition-all duration-150 hover:bg-blue-700 active:scale-[0.98] sm:flex-none sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Manage Activities
          </Link>
          <Link
            href="/super-admin/roles/ivy-expert/manage-test"
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-2 text-[11px] font-medium text-white transition-all duration-150 hover:bg-blue-700 active:scale-[0.98] sm:flex-none sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Manage Test
          </Link>
        </div>
      }
    />
  );
}
