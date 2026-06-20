'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, parentAPI, teamMeetAPI } from '@/lib/api';
import { User, USER_ROLE, TeamMeet, TEAMMEET_STATUS } from '@/types';
import ParentLayout from '@/components/ParentLayout';
import TeamMeetCalendarGrid from '@/components/TeamMeetCalendarGrid';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';
import PageStatCard from '@/components/PageStatCard';
import {
  roleListPagePadding,
  roleListTitleClass,
  roleListSubtitleClass,
  roleListTabStatGridClass,
} from '@/components/studentDetailResponsive';

interface StudentData {
  _id: string;
  user: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
  mobileNumber?: string;
  intake?: string;
  year?: string;
  registrationCount: number;
  createdAt: string;
}

export default function ParentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);

  // TeamMeet state
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('create');
  const [selectedTeamMeetDate, setSelectedTeamMeetDate] = useState<Date | undefined>(undefined);

  const hasFetchedRef = useRef(false);

  const fetchTeamMeets = useCallback(async () => {
    try {
      const response = await teamMeetAPI.getTeamMeetsForCalendar();
      setTeamMeets(response.data.data.teamMeets);
    } catch (error: any) {
      console.error('Error fetching team meets:', error);
    }
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.PARENT) {
        toast.error('Access denied. Parent only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStudents();
      fetchTeamMeets();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await parentAPI.getMyStudents();
      setStudents(response.data.data.students);
    } catch {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
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

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );

  return (
    <>
      <Toaster position="top-right" />
      <ParentLayout user={user}>
        <div className={roleListPagePadding}>
          {/* Header */}
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className={roleListTitleClass}>Welcome, {user.firstName}</h1>
              <p className={roleListSubtitleClass}>View your children&apos;s academic progress</p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-lg font-extrabold leading-none text-gray-900 sm:text-2xl md:text-3xl">Day {dayOfYear}</p>
              <p className="mt-0.5 text-[10px] text-gray-500 sm:text-sm">of {today.getFullYear()}</p>
            </div>
          </div>

          {/* Stats */}
          <div className={roleListTabStatGridClass}>
            <PageStatCard compact title="Total Children" mobileTitle="Children" value={students.length} color="purple" />
            <PageStatCard compact title="Total Registrations" mobileTitle="Registrations" value={students.reduce((sum, s) => sum + s.registrationCount, 0)} color="blue" />
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
      </ParentLayout>

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
