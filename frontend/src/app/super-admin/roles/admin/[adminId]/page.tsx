'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE, TeamMeet, TEAMMEET_STATUS } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import TeamMeetCalendar from '@/components/TeamMeetCalendar';
import TeamMeetSidebar from '@/components/TeamMeetSidebar';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import SuperAdminRoleDetailFrame, {
  DetailActionGrid,
  DetailInfoCard,
  DetailPageHeader,
  DetailStatGrid,
} from '@/components/SuperAdminRoleDetailFrame';

interface DashboardStats {
  totalCounselors: number;
  totalLeads: number;
  newLeads: number;
  totalStudents: number;
  enquiryFormUrl: string;
  enquiryFormSlug: string;
  admin: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    isActive: boolean;
    isVerified: boolean;
    companyName?: string;
    companyLogo?: string;
    address?: string;
    mobileNumber?: string;
    b2bLeadId?: string;
  };
}

export default function SuperAdminAdminDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = params.adminId as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // TeamMeet state
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('view');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === USER_ROLE.SUPER_ADMIN) {
      fetchDashboardData();
      fetchTeamMeets();
    }
  }, [currentUser, adminId]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied. Super Admin privileges required.');
        router.push('/');
        return;
      }

      setCurrentUser(userData);
    } catch (error) {
      toast.error('Authentication failed');
      router.push('/login');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getAdminDashboardStats(adminId);
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Fetch dashboard error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch admin dashboard');
      router.push('/super-admin/roles/admin');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMeets = useCallback(async () => {
    try {
      const response = await superAdminAPI.getAdminTeamMeets(adminId);
      setTeamMeets(response.data.data.teamMeets);
    } catch (error) {
      console.error('Failed to fetch team meets:', error);
    }
  }, [adminId]);

  const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
    setSelectedTeamMeet(teamMeet);
    setTeamMeetPanelMode('view');
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetPanelClose = () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copied to clipboard!');
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={currentUser}>
        <SuperAdminRoleDetailFrame
          backLabel="Back to Admins"
          onBack={() => router.push('/super-admin/roles/admin')}
        >
          <DetailPageHeader
            avatar={
              <AuthImage
                path={stats?.admin?.companyLogo}
                alt={stats?.admin?.companyName || 'Company Logo'}
                className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 object-cover sm:h-14 sm:w-14"
                fallback={
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 sm:h-14 sm:w-14">
                    <span className="text-lg font-bold text-blue-600">
                      {stats?.admin?.companyName?.charAt(0) || getInitials(stats?.admin) || 'A'}
                    </span>
                  </div>
                }
              />
            }
            title={stats?.admin?.companyName || getFullName(stats?.admin) || 'Admin Dashboard'}
            subtitle={
              <>
                {getFullName(stats?.admin)} &middot; {stats?.admin?.email}
              </>
            }
          />

          <DetailInfoCard>
              <div>
                <span className="text-gray-500">Status: </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  stats?.admin?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {stats?.admin?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Verified: </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  stats?.admin?.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {stats?.admin?.isVerified ? 'Yes' : 'No'}
                </span>
              </div>
              {stats?.admin?.mobileNumber && (
                <div>
                  <span className="text-gray-500">Phone: </span>
                  <span className="text-gray-900">{stats.admin.mobileNumber}</span>
                </div>
              )}
              {stats?.admin?.address && (
                <div>
                  <span className="text-gray-500">Address: </span>
                  <span className="text-gray-900">{stats.admin.address}</span>
                </div>
              )}
          </DetailInfoCard>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <DetailStatGrid>
                <StatCard
                  title="Total Counselors"
                  value={stats?.totalCounselors?.toString() || '0'}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                  color="blue"
                />
                <StatCard
                  title="Total Leads"
                  value={stats?.totalLeads?.toString() || '0'}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                  color="purple"
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
                <StatCard
                  title="Total Students"
                  value={stats?.totalStudents?.toString() || '0'}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  }
                  color="green"
                />
              </DetailStatGrid>

              {/* Enquiry Form URL & Referrer Registration Link */}
              <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-8 sm:p-5 lg:flex-row lg:gap-6">
                {/* Enquiry Form URL */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <h3 className="font-semibold text-gray-900 text-sm">Enquiry Form URL</h3>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1 rounded-lg bg-blue-50 px-3 py-2">
                      <code className="break-all font-mono text-xs text-blue-700">
                        {stats?.enquiryFormUrl || 'Loading...'}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => stats?.enquiryFormUrl && copyToClipboard(stats.enquiryFormUrl)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy URL
                    </button>
                  </div>
                </div>

                {/* Referrer Registration Link */}
                {stats?.enquiryFormSlug && (
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <h3 className="font-semibold text-gray-900 text-sm">Become Referrer Link</h3>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1 rounded-lg bg-purple-50 px-3 py-2">
                        <code className="break-all font-mono text-xs text-purple-700">
                          {origin ? `${origin}/become-referrer/${stats.enquiryFormSlug}` : 'Loading...'}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => origin && copyToClipboard(`${origin}/become-referrer/${stats.enquiryFormSlug}`)}
                        className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy URL
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="mb-3 text-lg font-semibold text-gray-900 sm:mb-4 sm:text-xl">Quick Actions</h2>
                <DetailActionGrid>
                  <ActionCard
                    title="View Counselors"
                    description="View all counselors under this admin"
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    }
                    buttonText="View Counselors"
                    onClick={() => router.push(`/super-admin/roles/admin/${adminId}/counselors`)}
                    color="blue"
                  />
                  <ActionCard
                    title="View Leads"
                    description="Check all leads from this admin's enquiry form"
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    }
                    buttonText="View Leads"
                    onClick={() => router.push(`/super-admin/roles/admin/${adminId}/leads`)}
                    color="blue"
                  />
                  <ActionCard
                    title="View Students"
                    description="Check all students under this admin"
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                      </svg>
                    }
                    buttonText="View Students"
                    onClick={() => router.push(`/super-admin/roles/admin/${adminId}/students`)}
                    color="blue"
                  />
                  <ActionCard
                    title="Service Pricing"
                    description="View this admin's service plan pricing"
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                    buttonText="View Pricing"
                    onClick={() => router.push(`/super-admin/roles/admin/${adminId}/service-pricing`)}
                    color="purple"
                  />
                  {stats?.admin?.b2bLeadId && (
                    <ActionCard
                      title="View B2B Profile"
                      description="Open linked B2B onboarding profile"
                      icon={
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-8 8h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      }
                      buttonText="View Profile"
                      onClick={() => router.push(`/super-admin/b2b/leads/${stats.admin.b2bLeadId}/profile`)}
                      color="green"
                    />
                  )}
                </DetailActionGrid>
              </div>

              {/* Team Meet Section */}
              <div className="mt-6 sm:mt-8">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
                    {/* Calendar Section */}
                    <div className="lg:col-span-3">
                      <TeamMeetCalendar
                        teamMeets={teamMeets}
                        onTeamMeetSelect={handleTeamMeetSelect}
                        currentUserId={adminId}
                      />
                    </div>

                    {/* Sidebar Section - No schedule button for read only */}
                    <div className="lg:col-span-1">
                      <TeamMeetSidebar
                        teamMeets={teamMeets}
                        onTeamMeetClick={handleTeamMeetSelect}
                        currentUserId={adminId}
                      />
                    </div>
                  </div>
              </div>
            </>
          )}
        </SuperAdminRoleDetailFrame>
      </SuperAdminLayout>

      {/* TeamMeet Slide-in Panel (read-only) */}
      <TeamMeetFormPanel
        teamMeet={selectedTeamMeet}
        isOpen={showTeamMeetPanel}
        onClose={handleTeamMeetPanelClose}
        onSave={() => {}} 
        mode={teamMeetPanelMode}
        currentUserId={adminId}
        readOnly={true}
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
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-0.5 text-xs font-medium text-gray-600 sm:text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-900 sm:text-3xl">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Action Card Component
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  onClick: () => void;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function ActionCard({ title, description, icon, buttonText, onClick, color }: ActionCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    green: 'bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    yellow: 'bg-yellow-100 text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white',
  };

  const buttonColorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
  };

  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg transition-colors sm:mb-4 sm:h-14 sm:w-14 ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="mb-1 text-base font-semibold text-gray-900 sm:text-lg">{title}</h3>
      <p className="mb-3 text-xs text-gray-600 sm:mb-4 sm:text-sm">{description}</p>
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors sm:px-4 ${buttonColorClasses[color]}`}
      >
        {buttonText}
      </button>
    </div>
  );
}
