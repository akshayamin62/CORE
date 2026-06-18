'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, b2bAPI, teamMeetAPI } from '@/lib/api';
import { User, USER_ROLE, B2B_LEAD_STAGE, LEAD_STAGE, FollowUp, TeamMeet, TEAMMEET_STATUS } from '@/types';
import B2BOpsLayout from '@/components/B2BOpsLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';
import B2BFollowUpFormPanel from '@/components/B2BFollowUpFormPanel';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import ScheduleOverview from '@/components/ScheduleOverview';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';

// Adapter: map B2B follow-up data to FollowUp shape for calendar/sidebar
function adaptB2BFollowUps(b2bFollowUps: any[]): FollowUp[] {
  return b2bFollowUps.map((fu: any) => {
    const lead = fu.b2bLeadId || {};
    const leadName = [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(' ');
    const stageMap: Record<string, string> = {
      [B2B_LEAD_STAGE.NEW]: LEAD_STAGE.NEW,
      [B2B_LEAD_STAGE.HOT]: LEAD_STAGE.HOT,
      [B2B_LEAD_STAGE.WARM]: LEAD_STAGE.WARM,
      [B2B_LEAD_STAGE.COLD]: LEAD_STAGE.COLD,
      [B2B_LEAD_STAGE.CONVERTED]: LEAD_STAGE.CONVERTED,
      [B2B_LEAD_STAGE.CLOSED]: LEAD_STAGE.CLOSED,
    };
    return {
      ...fu,
      leadId: {
        _id: lead._id || '',
        name: leadName,
        email: lead.email || '',
        mobileNumber: lead.mobileNumber || '',
        stage: stageMap[lead.stage] || lead.stage || LEAD_STAGE.NEW,
        serviceTypes: [],
        createdAt: lead.createdAt || '',
      },
    };
  });
}

export default function B2BOpsDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [allFollowUps, setAllFollowUps] = useState<any[]>([]);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any | null>(null);
  const [showFollowUpPanel, setShowFollowUpPanel] = useState(false);

  // TeamMeet state
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('create');
  const [selectedTeamMeetDate, setSelectedTeamMeetDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchTeamMeets();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.B2B_OPS) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setUser(userData);
    } catch {
      toast.error('Authentication failed');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [leadsRes, followUpsRes] = await Promise.all([
        b2bAPI.getOpsLeads(),
        b2bAPI.getFollowUps(),
      ]);
      const allLeads = leadsRes.data.data.leads || [];
      setLeads(allLeads);

      const fus = followUpsRes.data.data.followUps || [];
      setAllFollowUps(fus);

      // Try to get conversions for context
      try {
        const convRes = await b2bAPI.getAllConversions();
        setConversions(convRes.data.data.conversions || []);
      } catch {
        // OPS may not have access to all conversions, ignore
      }
    } catch {
      console.error('Failed to fetch dashboard data');
    }
  };

  const fetchTeamMeets = useCallback(async () => {
    try {
      const response = await teamMeetAPI.getTeamMeetsForCalendar();
      setTeamMeets(response.data.data.teamMeets);
    } catch (error) {
      console.error('Error fetching team meets:', error);
    }
  }, []);

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

  const stats = {
    total: leads.length,
    inProcess: leads.filter((l: any) => l.stage === 'Proceed for Documentation').length,
    converted: leads.filter((l: any) => l.stage === 'Converted').length,
    pendingVerification: leads.filter((l: any) => l.stage === 'Proceed for Documentation' && (!l.conversionStatus || l.conversionStatus === 'DOCUMENT_VERIFICATION')).length,
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
      <B2BOpsLayout user={user}>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between gap-3 md:mb-8">
            <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-gray-900 sm:text-2xl md:text-3xl">{getFullName(user)}</h1>
            {(() => { const t = new Date(); const d = Math.floor((t.getTime() - new Date(t.getFullYear(), 0, 0).getTime()) / 86400000); return (<div className="shrink-0 text-right"><p className="text-lg font-extrabold leading-none text-gray-900 sm:text-2xl md:text-3xl">Day {d}</p><p className="mt-0.5 text-[10px] text-gray-500 sm:text-sm">of {t.getFullYear()}</p></div>); })()}
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:mb-8 md:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-600 sm:text-sm">Total Assigned</p>
                  <h3 className="mt-1 text-xl font-extrabold text-gray-900 sm:text-2xl">{stats.total}</h3>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-600 sm:text-sm">Proceed for Documentation</p>
                  <h3 className="text-2xl font-extrabold text-purple-600 mt-1">{stats.inProcess}</h3>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-600 sm:text-sm">Pending Verification</p>
                  <h3 className="text-2xl font-extrabold text-orange-600 mt-1">{stats.pendingVerification}</h3>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-600 sm:text-sm">Converted</p>
                  <h3 className="text-2xl font-extrabold text-green-600 mt-1">{stats.converted}</h3>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>



          {/* Schedule Section */}
          <div className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <ScheduleCalendar
                  followUps={adaptB2BFollowUps(allFollowUps)}
                  teamMeets={teamMeets}
                  onFollowUpSelect={(fu: any) => { const orig = allFollowUps.find((f: any) => f._id === fu._id); setSelectedFollowUp(orig || fu); setShowFollowUpPanel(true); }}
                  onTeamMeetSelect={handleTeamMeetSelect}
                  onDateSelect={handleTeamMeetDateSelect}
                  currentUserId={user?.id || user?._id}
                />
              </div>
              <div className="lg:col-span-1">
                <ScheduleOverview
                  followUps={adaptB2BFollowUps(allFollowUps)}
                  teamMeets={teamMeets}
                  onFollowUpClick={(fu: any) => { const orig = allFollowUps.find((f: any) => f._id === fu._id); setSelectedFollowUp(orig || fu); setShowFollowUpPanel(true); }}
                  onTeamMeetClick={handleTeamMeetSelect}
                  onScheduleClick={handleScheduleTeamMeet}
                  currentUserId={user?.id || user?._id}
                  showLeadLink={true}
                  basePath="/b2b-ops/leads"
                />
              </div>
            </div>
          </div>
        </div>
      </B2BOpsLayout>

      <B2BFollowUpFormPanel followUp={selectedFollowUp} isOpen={showFollowUpPanel} onClose={() => { setShowFollowUpPanel(false); setSelectedFollowUp(null); }} onSave={() => { setShowFollowUpPanel(false); setSelectedFollowUp(null); fetchData(); }} />

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
