'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, adminAPI, leadAPI, teamMeetAPI } from '@/lib/api';
import { User, USER_ROLE, LEAD_STAGE, TeamMeet, TEAMMEET_STATUS } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import TeamMeetCalendarGrid from '@/components/TeamMeetCalendarGrid';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import EnquiryUrlCopy from '@/components/EnquiryUrlCopy';
import { getFullName } from '@/utils/nameHelpers';

interface DashboardStats {
  totalCounselors: number;
  totalLeads: number;
  newLeads: number;
  enquiryFormUrl: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

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

      if (userData.role !== USER_ROLE.ADMIN) {
        toast.error('Access denied. Admin only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStats();
      fetchTeamMeets();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [counselorsRes, leadsRes, urlRes] = await Promise.all([
        adminAPI.getCounselors(),
        leadAPI.getAdminLeads({}),
        leadAPI.getEnquiryFormUrl(),
      ]);

      const counselors = counselorsRes.data.data.counselors;
      const leads = leadsRes.data.data.leads;
      const slug = urlRes.data.data.slug;
      
      // Construct full URL from slug
      const enquiryFormUrl = slug ? `${window.location.origin}/enquiry/${slug}` : '';

      setStats({
        totalCounselors: counselors.length,
        totalLeads: leads.length,
        newLeads: leads.filter((l: any) => l.stage === LEAD_STAGE.NEW).length,
        enquiryFormUrl,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch dashboard stats');
    }
  };

  // TeamMeet handlers
  const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
    setSelectedTeamMeet(teamMeet);
    // Determine mode based on whether current user is recipient with pending status
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
      <Toaster position="top-right" />
      <AdminLayout user={user}>
        <div className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-3 md:mb-8">
            <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-gray-900 sm:text-2xl md:text-3xl">{getFullName(user)}</h1>
            {(() => { const t = new Date(); const d = Math.floor((t.getTime() - new Date(t.getFullYear(), 0, 0).getTime()) / 86400000); return (<div className="shrink-0 text-right"><p className="text-lg font-extrabold leading-none text-gray-900 sm:text-2xl md:text-3xl">Day {d}</p><p className="mt-0.5 text-[10px] text-gray-500 sm:text-sm">of {t.getFullYear()}</p></div>); })()}
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:mb-8 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total Counselors"
              value={stats?.totalCounselors.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
              color="blue"
            />
            <StatCard
              title="New Leads"
              value={stats?.newLeads.toString() || '0'}
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
                url={stats?.enquiryFormUrl || 'Loading...'}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 sm:mb-4 sm:text-xl">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ActionButton
                onClick={() => router.push('/admin/counselors')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                title="Manage Counselors"
                description="View and manage all your counselors"
              />
              <ActionButton
                onClick={() => router.push('/admin/leads')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                title="View Leads"
                description="Check all leads from your enquiry form"
              />
              <ActionButton
                onClick={() => router.push('/admin/students')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                }
                title="View Students"
                description="Check all students from your enquiry form"
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
      </AdminLayout>

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
