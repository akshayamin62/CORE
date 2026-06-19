'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminOpsAPI } from '@/lib/api';
import { User, USER_ROLE, OpsSchedule, OpsScheduleSummary, OpsScheduleStudent, TeamMeet } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import OpsCalendarGrid from '@/components/OpsCalendarGrid';
import OpsScheduleFormPanel from '@/components/OpsScheduleFormPanel';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import SuperAdminRoleDetailFrame, {
  DetailActionGrid,
  DetailInfoCard,
  DetailPageHeader,
  DetailStatGrid,
} from '@/components/SuperAdminRoleDetailFrame';

export default function SuperAdminOpsDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const opsUserId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [opsUser, setOpsUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [schedules, setSchedules] = useState<OpsSchedule[]>([]);
  const [summary, setSummary] = useState<OpsScheduleSummary>({ today: [], missed: [], tomorrow: [], counts: { today: 0, missed: 0, tomorrow: 0, total: 0 } });
  const [students, setStudents] = useState<OpsScheduleStudent[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<OpsSchedule | null>(null);
  const [showFormPanel, setShowFormPanel] = useState(false);

  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const fetchScheduleData = useCallback(async () => {
    try {
      const [schedulesRes, summaryRes, studentsRes, teamMeetsRes] = await Promise.all([
        superAdminOpsAPI.getOpsSchedules(opsUserId),
        superAdminOpsAPI.getOpsSummary(opsUserId),
        superAdminOpsAPI.getOpsStudents(opsUserId),
        superAdminOpsAPI.getOpsTeamMeets(opsUserId),
      ]);

      setSchedules(schedulesRes.data.data.schedules || []);
      setSummary(summaryRes.data.data || { today: [], missed: [], tomorrow: [], counts: { today: 0, missed: 0, tomorrow: 0, total: 0 } });
      setStudents(studentsRes.data.data.students || []);
      setTeamMeets(teamMeetsRes.data.data.teamMeets || []);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast.error('Failed to fetch ops schedule data');
    }
  }, [opsUserId]);

  useEffect(() => {
    if (user && opsUserId) {
      fetchOpsDetail();
      fetchScheduleData();
    }
  }, [user, opsUserId, fetchScheduleData]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied. Super Admin only.');
        router.push('/');
        return;
      }

      setUser(userData);
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchOpsDetail = async () => {
    try {
      const response = await superAdminOpsAPI.getOpsDetail(opsUserId);
      setOpsUser(response.data.data.user);
    } catch (error) {
      console.error('Error fetching ops detail:', error);
      toast.error('Failed to fetch ops user details');
    }
  };

  const handleScheduleSelect = (schedule: OpsSchedule) => {
    setSelectedSchedule(schedule);
    setShowFormPanel(true);
    setShowTeamMeetPanel(false);
  };

  const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
    setSelectedTeamMeet(teamMeet);
    setShowTeamMeetPanel(true);
    setShowFormPanel(false);
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

  const opsDisplayName = opsUser ? getFullName(opsUser) : 'OPS User';

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <SuperAdminRoleDetailFrame
          backLabel="Back to Ops List"
          onBack={() => router.push('/super-admin/roles/ops')}
        >
          <DetailPageHeader
            avatar={
              <AuthImage
                path={opsUser?.profilePicture}
                alt={opsDisplayName}
                className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 object-cover sm:h-14 sm:w-14"
                fallback={
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 sm:h-14 sm:w-14">
                    <span className="text-lg font-bold text-blue-600">{getInitials(opsUser) || 'O'}</span>
                  </div>
                }
              />
            }
            title={opsDisplayName}
            subtitle={
              <>
                {opsUser?.email}
                <span className="hidden sm:inline"> &middot; </span>
                <span className="block sm:inline">OPS Dashboard (Read-Only)</span>
              </>
            }
          />

          <DetailInfoCard>
            <div>
              <span className="text-gray-500">Status: </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${opsUser?.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {opsUser?.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Team Meets: </span>
              <span className="font-medium text-gray-900">{teamMeets.length}</span>
            </div>
          </DetailInfoCard>

          <DetailStatGrid>
            <StatCard
              title="Assigned Students"
              value={students.length.toString()}
              icon={
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
              color="blue"
              onClick={() => router.push(`/super-admin/roles/ops/${opsUserId}/students`)}
            />
            <StatCard
              title="Today's Schedules"
              value={summary.today.length.toString()}
              icon={
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              color="green"
            />
            <StatCard
              title="Missed Schedules"
              value={summary.missed.length.toString()}
              icon={
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              color="yellow"
            />
          </DetailStatGrid>

          <OpsCalendarGrid
            title="Schedule"
            subtitle="OPS tasks and team meetings"
            schedules={schedules}
            teamMeets={teamMeets}
            currentUserId={opsUserId}
            sidebar="overview"
            onScheduleSelect={handleScheduleSelect}
            onDateSelect={() => {}}
            onTeamMeetSelect={handleTeamMeetSelect}
            onTeamMeetClick={handleTeamMeetSelect}
            onTaskClick={handleScheduleSelect}
          />

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 sm:mb-4 sm:text-xl">Quick Actions</h2>
            <DetailActionGrid>
              <ActionCard
                title="View Assigned Students"
                description="View students assigned to this ops user"
                buttonText="View Students"
                onClick={() => router.push(`/super-admin/roles/ops/${opsUserId}/students`)}
                color="blue"
                icon={
                  <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
              <ActionCard
                title="Back to Ops List"
                description="Return to all ops users"
                buttonText="Ops List"
                onClick={() => router.push('/super-admin/roles/ops')}
                color="purple"
                icon={
                  <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
            </DetailActionGrid>
          </div>
        </SuperAdminRoleDetailFrame>

        <OpsScheduleFormPanel
          schedule={selectedSchedule}
          students={students}
          isOpen={showFormPanel}
          onClose={() => {
            setShowFormPanel(false);
            setSelectedSchedule(null);
          }}
          onSubmit={async () => {}}
          readOnly={true}
        />

        <TeamMeetFormPanel
          teamMeet={selectedTeamMeet}
          isOpen={showTeamMeetPanel}
          onClose={() => {
            setShowTeamMeetPanel(false);
            setSelectedTeamMeet(null);
          }}
          onSave={() => {}}
          mode="view"
          currentUserId={opsUserId}
          readOnly={true}
          onSwitchToTask={() => {
            setShowTeamMeetPanel(false);
            setSelectedTeamMeet(null);
          }}
        />
      </SuperAdminLayout>
    </>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'yellow';
  onClick?: () => void;
}

function StatCard({ title, value, icon, color, onClick }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5 ${onClick ? 'cursor-pointer transition-all hover:shadow-md' : ''}`}
    >
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
