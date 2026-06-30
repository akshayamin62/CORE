'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  roleListPagePadding,
  roleListTitleClass,
  roleListSubtitleClass,
} from '@/components/studentDetailResponsive';
import { authAPI, teamMeetAPI } from '@/lib/api';
import { User, USER_ROLE, TeamMeet, TEAMMEET_STATUS } from '@/types';
import EduplanCoachLayout from '@/components/EduplanCoachLayout';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getFullName } from '@/utils/nameHelpers';
import TeamMeetCalendarGrid from '@/components/TeamMeetCalendarGrid';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function EduplanCoachDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);

  // TeamMeet state
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('create');
  const [selectedTeamMeetDate, setSelectedTeamMeetDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    checkAuth();
  }, []);

  const fetchTeamMeets = useCallback(async () => {
    try {
      const response = await teamMeetAPI.getTeamMeetsForCalendar();
      setTeamMeets(response.data.data.teamMeets);
    } catch (error: any) {
      console.error('Error fetching team meets:', error);
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.EDUPLAN_COACH) {
        toast.error('Access denied. Eduplan Coach only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStudentCount();
      fetchTeamMeets();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/super-admin/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudentCount(response.data.data.students?.length || 0);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // TeamMeet handlers
  const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
    setSelectedTeamMeet(teamMeet);
    const currentUserId = user?.id || user?._id;
    if (teamMeet.requestedTo._id === currentUserId && teamMeet.status === TEAMMEET_STATUS.PENDING_CONFIRMATION) {
      setTeamMeetPanelMode('respond');
    } else {
      setTeamMeetPanelMode('view');
    }
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetDateSelect = (date: Date) => {
    setSelectedTeamMeetDate(date);
    setSelectedTeamMeet(null);
    setTeamMeetPanelMode('create');
    setShowTeamMeetPanel(true);
  };

  const handleScheduleTeamMeet = () => {
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(undefined);
    setTeamMeetPanelMode('create');
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetSave = async () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(undefined);
    await fetchTeamMeets();
  };

  const handleTeamMeetPanelClose = () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <EduplanCoachLayout user={user}>
        <div className={roleListPagePadding}>
          {/* Header */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h1 className={roleListTitleClass}>{getFullName(user)}</h1>
            <p className={roleListSubtitleClass}>Welcome to Eduplan Coach Panel</p>
          </div>

          {/* Stats Cards — half width on mobile */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 md:max-w-sm">
            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-gray-600 sm:text-sm">Assigned Students</p>
                  <p className="text-xl font-bold text-gray-900 sm:text-3xl">{studentCount}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 sm:h-12 sm:w-12">
                  <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 sm:mb-4 sm:text-xl">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              <button
                onClick={() => router.push('/eduplan-coach/students')}
                className="group flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-left transition-all hover:border-teal-300 hover:bg-gray-50 sm:p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white sm:h-10 sm:w-10">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 sm:text-base">View All Students</h3>
                  <p className="mt-0.5 text-xs text-gray-600 sm:text-sm">Manage student data and registrations</p>
                </div>
              </button>
              <button
                onClick={() => router.push('/')}
                className="group flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-left transition-all hover:border-teal-300 hover:bg-gray-50 sm:p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white sm:h-10 sm:w-10">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 sm:text-base">View Services</h3>
                  <p className="mt-0.5 text-xs text-gray-600 sm:text-sm">Browse all available services</p>
                </div>
              </button>
            </div>
          </div>

          {/* Team Meet Section */}
          <div className="mt-6 sm:mt-8">
            <TeamMeetCalendarGrid
              teamMeets={teamMeets}
              onTeamMeetSelect={handleTeamMeetSelect}
              onDateSelect={handleTeamMeetDateSelect}
              onScheduleClick={handleScheduleTeamMeet}
              currentUserId={user?.id || user?._id}
            />
          </div>
        </div>
      </EduplanCoachLayout>

      {/* TeamMeet Slide-in Panel */}
      <TeamMeetFormPanel
        teamMeet={selectedTeamMeet}
        isOpen={showTeamMeetPanel}
        onClose={handleTeamMeetPanelClose}
        onSave={handleTeamMeetSave}
        selectedDate={selectedTeamMeetDate}
        mode={teamMeetPanelMode}
        currentUserId={user?.id || user?._id}
      />
    </>
  );
}
