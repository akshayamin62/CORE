'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, leadAPI, followUpAPI } from '@/lib/api';
import { User, USER_ROLE, Lead, LEAD_STAGE, SERVICE_TYPE, FollowUp, FOLLOWUP_STATUS } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';

export default function CounselorLeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  
  // Stage update
  const [updatingStage, setUpdatingStage] = useState(false);
  
  // Follow-ups
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    date: '',
    time: '',
    duration: 30,
  });
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLead();
      fetchFollowUps();
    }
  }, [user, leadId]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.COUNSELOR) {
        toast.error('Access denied. Counselor only.');
        router.push('/');
        return;
      }

      setUser(userData);
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchLead = async () => {
    try {
      const response = await leadAPI.getLeadDetail(leadId);
      setLead(response.data.data.lead);
    } catch (error: any) {
      console.error('Error fetching lead:', error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        toast.error('Lead not found or access denied');
        router.push('/counselor/leads');
      } else {
        toast.error('Failed to fetch lead details');
      }
    }
  };

  const fetchFollowUps = async () => {
    try {
      setLoadingFollowUps(true);
      const response = await followUpAPI.getLeadFollowUpHistory(leadId);
      setFollowUps(response.data.data.followUps || []);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoadingFollowUps(false);
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!lead || lead.stage === newStage) return;

    try {
      setUpdatingStage(true);
      await leadAPI.updateLeadStage(lead._id, newStage);
      toast.success('Stage updated successfully');
      fetchLead();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!newFollowUp.date || !newFollowUp.time) {
      toast.error('Please select date and time');
      return;
    }

    try {
      setScheduling(true);
      await followUpAPI.createFollowUp({
        leadId,
        scheduledDate: newFollowUp.date,
        scheduledTime: newFollowUp.time,
        duration: newFollowUp.duration,
      });
      toast.success('Follow-up scheduled successfully');
      setShowScheduleForm(false);
      setNewFollowUp({ date: '', time: '', duration: 30 });
      fetchFollowUps();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setScheduling(false);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case LEAD_STAGE.NEW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case LEAD_STAGE.HOT:
        return 'bg-red-100 text-red-800 border-red-200';
      case LEAD_STAGE.WARM:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case LEAD_STAGE.COLD:
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case LEAD_STAGE.CONVERTED:
        return 'bg-green-100 text-green-800 border-green-200';
      case LEAD_STAGE.CLOSED:
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getServiceColor = (service: string) => {
    switch (service) {
      case SERVICE_TYPE.CARRER_FOCUS_STUDY_ABROAD:
        return 'bg-indigo-100 text-indigo-800';
      case SERVICE_TYPE.IVY_LEAGUE_ADMISSION:
        return 'bg-amber-100 text-amber-800';
      case SERVICE_TYPE.EDUCATION_PLANNING:
        return 'bg-teal-100 text-teal-800';
      case SERVICE_TYPE.IELTS_GRE_LANGUAGE_COACHING:
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFollowUpStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'PHONE_NOT_PICKED':
      case 'CALL_DISCONNECTED':
      case 'NO_RESPONSE':
        return 'bg-yellow-100 text-yellow-800';
      case 'RESCHEDULED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  if (!user || !lead) return null;

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50">
        <div className="p-8">
        {/* Back Button & Header with Quick Actions */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/counselor/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{lead.name}</h2>
              <p className="text-gray-600 mt-1">Lead Details</p>
            </div>
            
            {/* Quick Actions - Top Right, 2 lines layout */}
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Email
              </a>
              <a
                href={`https://wa.me/${lead.mobileNumber?.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Info Card - Updated layout */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mobile Number</label>
                  <a href={`tel:${lead.mobileNumber}`} className="text-teal-600 hover:underline">
                    {lead.mobileNumber}
                  </a>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email Address</label>
                  <a href={`mailto:${lead.email}`} className="text-teal-600 hover:underline">
                    {lead.email}
                  </a>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Service</label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(lead.serviceType)}`}>
                    {lead.serviceType}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Submitted On</label>
                  <p className="text-gray-900">
                    {new Date(lead.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Follow-Ups Section - Always visible */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Follow-Ups</h3>
                <button
                  onClick={() => setShowScheduleForm(!showScheduleForm)}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Schedule
                </button>
              </div>

              {/* Schedule Form */}
              {showScheduleForm && (
                <div className="mb-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={newFollowUp.date}
                        onChange={(e) => setNewFollowUp({ ...newFollowUp, date: e.target.value })}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                      <input
                        type="time"
                        value={newFollowUp.time}
                        onChange={(e) => setNewFollowUp({ ...newFollowUp, time: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                      <select
                        value={newFollowUp.duration}
                        onChange={(e) => setNewFollowUp({ ...newFollowUp, duration: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowScheduleForm(false)}
                      className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleScheduleFollowUp}
                      disabled={scheduling}
                      className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {scheduling ? 'Scheduling...' : 'Schedule'}
                    </button>
                  </div>
                </div>
              )}

              {/* Follow-Up History */}
              <div className="space-y-3">
                {loadingFollowUps ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                  </div>
                ) : followUps.length > 0 ? (
                  followUps.map((followUp) => (
                    <div key={followUp._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 mt-2 rounded-full ${
                        followUp.status === FOLLOWUP_STATUS.COMPLETED ? 'bg-green-500' :
                        followUp.status === FOLLOWUP_STATUS.SCHEDULED ? 'bg-blue-500' :
                        'bg-yellow-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">
                            {format(new Date(followUp.scheduledDate), 'MMM d, yyyy')} at {followUp.scheduledTime}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getFollowUpStatusColor(followUp.status)}`}>
                            {followUp.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {followUp.notes && (
                          <p className="text-sm text-gray-600 mt-1 truncate">{followUp.notes}</p>
                        )}
                        {followUp.stageChangedTo && (
                          <p className="text-xs text-gray-500 mt-1">
                            Stage changed to: <span className="font-medium">{followUp.stageChangedTo}</span>
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{followUp.duration} min</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-6">No follow-ups scheduled yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stage Card - Dropdown instead of buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage</h3>
              <div className="space-y-3">
                <div className={`px-4 py-3 rounded-lg border-2 ${getStageColor(lead.stage)}`}>
                  <span className="font-medium">{lead.stage}</span>
                </div>
                <select
                  value={lead.stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  disabled={updatingStage}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white disabled:opacity-50"
                >
                  {Object.values(LEAD_STAGE).map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
                {updatingStage && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Updating...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
