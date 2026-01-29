'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, leadAPI } from '@/lib/api';
import { User, USER_ROLE, Lead, LEAD_STAGE, SERVICE_TYPE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function CounselorLeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  
  // Stage update
  const [updatingStage, setUpdatingStage] = useState(false);
  
  // Note
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLead();
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

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;

    try {
      setAddingNote(true);
      await leadAPI.addLeadNote(lead._id, newNote.trim());
      toast.success('Note added successfully');
      setNewNote('');
      fetchLead();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
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
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
        {/* Back Button & Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/counselor/leads')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Leads
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{lead.name}</h2>
              <p className="text-gray-600 mt-1">Lead Details</p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getServiceColor(lead.serviceType)}`}>
                {lead.serviceType}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                  <p className="text-gray-900 font-medium">{lead.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email Address</label>
                  <a href={`mailto:${lead.email}`} className="text-teal-600 hover:underline">
                    {lead.email}
                  </a>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mobile Number</label>
                  <a href={`tel:${lead.mobileNumber}`} className="text-teal-600 hover:underline">
                    {lead.mobileNumber}
                  </a>
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

            {/* Notes Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              
              {/* Add Note Form */}
              <div className="mb-6">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this lead..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleAddNote}
                    disabled={addingNote || !newNote.trim()}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {addingNote ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Note
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-4">
                {lead.notes && lead.notes.length > 0 ? (
                  [...lead.notes].reverse().map((note) => (
                    <div key={note._id} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-900 whitespace-pre-wrap">{note.note}</p>
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                        <span className="font-medium">{note.addedBy?.name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No notes yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stage Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage</h3>
              <div className="space-y-2">
                {Object.values(LEAD_STAGE).map((stage) => (
                  <button
                    key={stage}
                    onClick={() => handleStageChange(stage)}
                    disabled={updatingStage}
                    className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all ${
                      lead.stage === stage
                        ? getStageColor(stage) + ' border-2'
                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                    } ${updatingStage ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{stage}</span>
                      {lead.stage === stage && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <a
                  href={`mailto:${lead.email}`}
                  className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Email
                </a>
                <a
                  href={`tel:${lead.mobileNumber}`}
                  className="w-full px-4 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call
                </a>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
