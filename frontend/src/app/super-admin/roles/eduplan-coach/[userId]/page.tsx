'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminEduplanCoachAPI } from '@/lib/api';
import { User, USER_ROLE, TeamMeet } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import TeamMeetCalendarGrid from '@/components/TeamMeetCalendarGrid';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import SuperAdminRoleDetailFrame, {
  DetailActionGrid,
  DetailInfoCard,
  DetailPageHeader,
  DetailStatGrid,
} from '@/components/SuperAdminRoleDetailFrame';

export default function SuperAdminEduplanCoachDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const coachUserId = params.userId as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [coachUser, setCoachUser] = useState<any>(null);
  const [coachRecord, setCoachRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);

  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('view');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === USER_ROLE.SUPER_ADMIN) {
      fetchCoachDetail();
      fetchCoachStudents();
      fetchTeamMeets();
    }
  }, [currentUser, coachUserId]);

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
    } catch {
      toast.error('Authentication failed');
      router.push('/login');
    }
  };

  const fetchCoachDetail = async () => {
    try {
      setLoading(true);
      const response = await superAdminEduplanCoachAPI.getCoachDetail(coachUserId);
      setCoachUser(response.data.data.user);
      setCoachRecord(response.data.data.coach);
    } catch (error: any) {
      console.error('Fetch coach detail error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch coach details');
      router.push('/super-admin/roles/eduplan-coach');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoachStudents = async () => {
    try {
      const response = await superAdminEduplanCoachAPI.getCoachStudents(coachUserId);
      setStudents(response.data.data.students || []);
    } catch (error) {
      console.error('Failed to fetch coach students:', error);
    }
  };

  const fetchTeamMeets = useCallback(async () => {
    try {
      const response = await superAdminEduplanCoachAPI.getCoachTeamMeets(coachUserId);
      setTeamMeets(response.data.data.teamMeets || []);
    } catch (error) {
      console.error('Failed to fetch team meets:', error);
    }
  }, [coachUserId]);

  const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
    setSelectedTeamMeet(teamMeet);
    setTeamMeetPanelMode('view');
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetPanelClose = () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
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
          backLabel="Back to EduPlan Coaches"
          onBack={() => router.push('/super-admin/roles/eduplan-coach')}
        >
          <DetailPageHeader
            avatar={
              <AuthImage
                path={coachUser?.profilePicture}
                alt={getFullName(coachUser) || 'Eduplan Coach'}
                className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 object-cover sm:h-14 sm:w-14"
                fallback={
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 sm:h-14 sm:w-14">
                    <span className="text-lg font-bold text-blue-600">{getInitials(coachUser) || 'E'}</span>
                  </div>
                }
              />
            }
            title={getFullName(coachUser) || 'Eduplan Coach Dashboard'}
            subtitle={
              <>
                {coachUser?.email}
                {coachRecord?.mobileNumber && (
                  <>
                    <span className="hidden sm:inline"> &middot; </span>
                    <span className="block sm:inline">{coachRecord.mobileNumber}</span>
                  </>
                )}
              </>
            }
          />

          <DetailInfoCard>
            <div>
              <span className="text-gray-500">Status: </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${coachUser?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {coachUser?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Verified: </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${coachUser?.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {coachUser?.isVerified ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Students: </span>
              <span className="font-medium text-gray-900">{students.length}</span>
            </div>
          </DetailInfoCard>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <DetailStatGrid>
                <StatCard
                  title="Assigned Students"
                  value={students.length.toString()}
                  color="blue"
                  icon={
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                />
                <StatCard
                  title="Team Meets"
                  value={teamMeets.length.toString()}
                  color="purple"
                  icon={
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                />
              </DetailStatGrid>

              <div className="mb-6 sm:mb-8">
                <h2 className="mb-3 text-lg font-semibold text-gray-900 sm:mb-4 sm:text-xl">Quick Actions</h2>
                <DetailActionGrid>
                  <ActionCard
                    title="View Students"
                    description="View all students assigned to this coach"
                    buttonText="View Students"
                    onClick={() => router.push(`/super-admin/roles/eduplan-coach/${coachUserId}/students`)}
                    color="blue"
                    icon={
                      <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    }
                  />
                </DetailActionGrid>
              </div>

              <TeamMeetCalendarGrid
                teamMeets={teamMeets}
                onTeamMeetSelect={handleTeamMeetSelect}
                currentUserId={coachUserId}
              />
            </>
          )}
        </SuperAdminRoleDetailFrame>
      </SuperAdminLayout>

      <TeamMeetFormPanel
        teamMeet={selectedTeamMeet}
        isOpen={showTeamMeetPanel}
        onClose={handleTeamMeetPanelClose}
        onSave={() => {}}
        mode={teamMeetPanelMode}
        currentUserId={coachUserId}
        readOnly={true}
      />
    </>
  );
}

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
    <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="mb-0.5 truncate text-xs font-medium text-gray-600 sm:text-sm">{title}</p>
          <p className="text-xl font-bold text-gray-900 sm:text-3xl">{value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

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
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:mb-4 sm:h-14 sm:w-14 ${colorClasses[color]}`}>
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
