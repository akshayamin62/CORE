'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, advisorAPI, teamMeetAPI } from '@/lib/api';
import { User, USER_ROLE, TeamMeet, TEAMMEET_STATUS } from '@/types';
import AdvisorLayout from '@/components/AdvisorLayout';
import toast, { Toaster } from 'react-hot-toast';
import TeamMeetCalendarGrid from '@/components/TeamMeetCalendarGrid';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import EnquiryUrlCopy from '@/components/EnquiryUrlCopy';
import { getFullName } from '@/utils/nameHelpers';

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  convertedLeads: number;
  totalStudents: number;
  todayFollowUps: number;
  missedFollowUps: number;
  allowedServices: string[];
}

export default function AdvisorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [enquiryFormUrl, setEnquiryFormUrl] = useState<string>('');

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

      if (userData.role !== USER_ROLE.ADVISOR) {
        toast.error('Access denied. Advisor only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStats();
      fetchEnquiryUrl();
      fetchTeamMeets();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await advisorAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchEnquiryUrl = async () => {
    try {
      const response = await advisorAPI.getEnquiryFormUrl();
      const slug = response.data.data?.slug;
      if (slug) {
        setEnquiryFormUrl(`${window.location.origin}/enquiry/${slug}`);
      }
    } catch (error) {
      console.error('Error fetching enquiry URL:', error);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <AdvisorLayout user={user}>
        <div className="p-4 pb-24 sm:p-6 md:p-8 md:pb-8">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-3 md:mb-8">
            <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-gray-900 sm:text-2xl md:text-3xl">{getFullName(user)}</h1>
            {(() => { const t = new Date(); const d = Math.floor((t.getTime() - new Date(t.getFullYear(), 0, 0).getTime()) / 86400000); return (<div className="shrink-0 text-right"><p className="text-lg font-extrabold leading-none text-gray-900 sm:text-2xl md:text-3xl">Day {d}</p><p className="mt-0.5 text-[10px] text-gray-500 sm:text-sm">of {t.getFullYear()}</p></div>); })()}
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:mb-8 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total Leads"
              value={stats?.totalLeads?.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              color="blue"
            />
            <StatCard
              title="New Leads"
              value={stats?.newLeads?.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              color="yellow"
            />

            <div className="col-span-2 md:col-span-1 md:max-w-lg">
              <EnquiryUrlCopy
                label="Enquiry Form"
                url={enquiryFormUrl || 'Loading...'}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 sm:mb-4 sm:text-xl">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ActionButton
                onClick={() => router.push('/advisor/leads')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                title="Manage Leads"
                description="View, filter, and follow up on your leads"
              />
              <ActionButton
                onClick={() => router.push('/advisor/students')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                }
                title="View Students"
                description="Manage students and initiate transfers"
              />
              <ActionButton
                onClick={() => router.push('/advisor/service-pricing')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Service Pricing"
                description="Set pricing for your allowed services"
              />
            </div>
          </div>

          {/* Team Meet Section */}
          <div className="mt-8">
            <TeamMeetCalendarGrid
              teamMeets={teamMeets}
              onTeamMeetSelect={handleTeamMeetSelect}
              onDateSelect={handleTeamMeetDateSelect}
              onScheduleClick={handleScheduleTeamMeet}
              currentUserId={user?.id || user?._id}
            />
          </div>
        </div>
      </AdvisorLayout>

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

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md sm:p-4 md:p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 truncate text-[11px] leading-tight text-gray-600 sm:mb-1 sm:text-sm">{title}</p>
          <p className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">{value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 md:h-12 md:w-12 ${colorClasses[color]} [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5 md:[&>svg]:h-6 md:[&>svg]:w-6`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ActionButton({ onClick, icon, title, description }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-left transition-all hover:border-blue-300 hover:bg-gray-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </button>
  );
}
