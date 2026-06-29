'use client';

import { useState, useEffect } from 'react';
import {
  ReferrerFollowUp,
  FOLLOWUP_STATUS,
  REFERRER_STAGE,
  LEAD_STAGE,
  MEETING_TYPE,
  ReferrerPopulated,
} from '@/types';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getReferrerDisplayName } from '@/utils/referrerFollowUpHelpers';
import MeetingDurationOptions from '@/components/MeetingDurationOptions';

interface ReferrerFollowUpFormPanelProps {
  mode: 'create' | 'update';
  followUp: ReferrerFollowUp | null;
  referrerId: string;
  referrerName?: string;
  referrerStage?: REFERRER_STAGE | string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedDate?: Date;
  readOnly?: boolean;
  getFollowUpById?: (followUpId: string) => ReturnType<typeof adminAPI.getReferrerFollowUpById>;
}

export default function ReferrerFollowUpFormPanel({
  mode,
  followUp,
  referrerId,
  referrerName,
  referrerStage,
  isOpen,
  onClose,
  onSave,
  selectedDate,
  readOnly = false,
  getFollowUpById,
}: ReferrerFollowUpFormPanelProps) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [meetingType, setMeetingType] = useState<MEETING_TYPE>(MEETING_TYPE.PHONE_CALL);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<FOLLOWUP_STATUS>(FOLLOWUP_STATUS.SCHEDULED);
  const [stageChangedTo, setStageChangedTo] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [nextDuration, setNextDuration] = useState(30);
  const [nextMeetingType, setNextMeetingType] = useState<MEETING_TYPE>(MEETING_TYPE.PHONE_CALL);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followUpData, setFollowUpData] = useState<ReferrerFollowUp | null>(null);
  const [totalFollowUps, setTotalFollowUps] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setFollowUpData(null);
      setTotalFollowUps(0);
      return;
    }

    if (mode === 'create') {
      const date = selectedDate || new Date();
      setScheduledDate(format(date, 'yyyy-MM-dd'));
      setScheduledTime('');
      setDuration(30);
      setMeetingType(MEETING_TYPE.PHONE_CALL);
      setNotes('');
      return;
    }

    if (followUp) {
      fetchFollowUpDetails();
    }
  }, [followUp, isOpen, mode, selectedDate]);

  const fetchFollowUpDetails = async () => {
    if (!followUp) return;
    setLoading(true);
    try {
      const fetchFn = getFollowUpById || adminAPI.getReferrerFollowUpById.bind(adminAPI);
      const response = await fetchFn(followUp._id);
      const data = response.data.data.followUp as ReferrerFollowUp;
      setFollowUpData(data);
      setTotalFollowUps(response.data.data.totalFollowUpsForReferrer || 1);
      setStatus(data.status);
      setStageChangedTo(data.stageChangedTo || '');
      setNotes(data.notes || '');
      setScheduleNext(false);
      setNextDate('');
      setNextTime('');
      setNextDuration(30);
      setNextMeetingType(MEETING_TYPE.PHONE_CALL);
    } catch {
      toast.error('Failed to load follow-up details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === FOLLOWUP_STATUS.SCHEDULED) {
      setScheduleNext(false);
    }
  }, [status]);

  const handleCreate = async () => {
    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select date and time');
      return;
    }
    setSaving(true);
    try {
      await adminAPI.createReferrerFollowUp({
        referrerId,
        scheduledDate,
        scheduledTime,
        duration,
        meetingType,
        notes,
      });
      toast.success('Follow-up scheduled successfully');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!followUpData) return;
    if (scheduleNext && (!nextDate || !nextTime)) {
      toast.error('Please select date and time for next follow-up');
      return;
    }

    const referrerForUpdate = followUpData.referrerId as ReferrerPopulated | undefined;
    const converted =
      (referrerForUpdate?.stage || followUpData.stageAtFollowUp || referrerStage) === REFERRER_STAGE.CONVERTED;

    setSaving(true);
    try {
      const updateData: {
        status: FOLLOWUP_STATUS;
        notes: string;
        stageChangedTo?: string;
        nextFollowUp?: {
          scheduledDate: string;
          scheduledTime: string;
          duration: number;
          meetingType: MEETING_TYPE;
        };
      } = {
        status: converted ? FOLLOWUP_STATUS.CONVERTED : status,
        notes,
      };

      if (stageChangedTo && !converted) {
        updateData.stageChangedTo = stageChangedTo;
      }
      if (scheduleNext && nextDate && nextTime) {
        updateData.nextFollowUp = {
          scheduledDate: nextDate,
          scheduledTime: nextTime,
          duration: nextDuration,
          meetingType: nextMeetingType,
        };
      }

      await adminAPI.updateReferrerFollowUp(followUpData._id, updateData);
      toast.success('Follow-up updated successfully');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update follow-up');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const referrer = followUpData?.referrerId as ReferrerPopulated | undefined;
  const currentStage = referrer?.stage || followUpData?.stageAtFollowUp || referrerStage;
  const isReferrerConverted = currentStage === REFERRER_STAGE.CONVERTED;
  const currentFollowUpNumber = followUpData?.followUpNumber || 1;
  const isNotLatestFollowUp = currentFollowUpNumber < totalFollowUps;
  const isFullyLocked = isNotLatestFollowUp || readOnly;
  const isStageLocked = isFullyLocked || isReferrerConverted;
  const isStatusLocked = isFullyLocked || isReferrerConverted;
  const displayName = referrerName || getReferrerDisplayName(referrer);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[65] bg-black/30 md:hidden"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        className={`fixed z-[70] flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 ease-in-out
          left-4 right-4 top-28 bottom-[calc(7.25rem+env(safe-area-inset-bottom,0px))]
          md:left-4 md:right-auto md:top-[140px] md:bottom-auto md:z-[55] md:w-[380px] md:max-h-[calc(100vh-220px)]
          ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 pointer-events-none md:-translate-x-full'}`}
      >
        <div className="flex shrink-0 items-center justify-between rounded-t-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-3 py-3 sm:px-4">
          <span className="truncate text-sm font-medium text-white">
            {mode === 'create' ? '📅 Schedule Follow-Up' : '📅 Referrer Follow-Up'}
          </span>
          <button onClick={onClose} className="text-white hover:text-indigo-200 transition-colors p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {mode === 'create' ? (
            <div className="px-4 py-3 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Referrer</p>
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <MeetingDurationOptions />
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Meeting Type</label>
                  <select
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value as MEETING_TYPE)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={MEETING_TYPE.PHONE_CALL}>Phone Call</option>
                    <option value={MEETING_TYPE.ONLINE}>Online</option>
                    <option value={MEETING_TYPE.FACE_TO_FACE}>Face to Face</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : followUpData ? (
            <div className="px-4 py-3 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">Date & Time</p>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(followUpData.scheduledDate), 'dd/MM/yyyy')} at {followUpData.scheduledTime}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                    #{currentFollowUpNumber}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
              </div>

              {followUpData.zohoMeetingUrl && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-medium text-green-700">Online Meeting</span>
                  </div>
                  {followUpData.zohoMeetingId && (
                    <p className="text-[11px] text-gray-600 mb-0.5">
                      <span className="font-medium">Meeting ID:</span> {followUpData.zohoMeetingId}
                    </p>
                  )}
                  {followUpData.zohoMeetingPassword && (
                    <p className="text-[11px] text-gray-600 mb-1.5">
                      <span className="font-medium">Password:</span> {followUpData.zohoMeetingPassword}
                    </p>
                  )}
                  <a
                    href={followUpData.zohoMeetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Join Zoho Meeting
                  </a>
                </div>
              )}

              {followUpData.meetingType === MEETING_TYPE.ONLINE && !followUpData.zohoMeetingUrl && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    Online meeting scheduled — Zoho link is being generated or unavailable. Refresh after a moment.
                  </p>
                </div>
              )}

              {(isFullyLocked || readOnly) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-800">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs font-medium">
                      {readOnly
                        ? 'View only mode. Follow-ups cannot be edited from this page.'
                        : 'This follow-up is locked. A newer follow-up has been scheduled.'}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={isReferrerConverted ? FOLLOWUP_STATUS.CONVERTED : status}
                  onChange={(e) => setStatus(e.target.value as FOLLOWUP_STATUS)}
                  disabled={isStatusLocked}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                >
                  {!isFullyLocked && <option value={FOLLOWUP_STATUS.SCHEDULED}>Scheduled</option>}
                  <optgroup label="Call Issues">
                    <option value={FOLLOWUP_STATUS.CALL_NOT_ANSWERED}>Call Not Answered</option>
                    <option value={FOLLOWUP_STATUS.PHONE_SWITCHED_OFF}>Phone Switched Off</option>
                    <option value={FOLLOWUP_STATUS.OUT_OF_COVERAGE}>Out of Coverage Area</option>
                    <option value={FOLLOWUP_STATUS.NUMBER_BUSY}>Number Busy</option>
                    <option value={FOLLOWUP_STATUS.CALL_DISCONNECTED}>Call Disconnected</option>
                    <option value={FOLLOWUP_STATUS.INVALID_NUMBER}>Invalid / Wrong Number</option>
                    <option value={FOLLOWUP_STATUS.INCOMING_BARRED}>Incoming Calls Barred</option>
                    <option value={FOLLOWUP_STATUS.CALL_REJECTED}>Call Rejected / Declined</option>
                  </optgroup>
                  <optgroup label="Reschedule">
                    <option value={FOLLOWUP_STATUS.CALL_BACK_LATER}>Asked to Call Back Later</option>
                    <option value={FOLLOWUP_STATUS.BUSY_RESCHEDULE}>Busy - Requested Reschedule</option>
                  </optgroup>
                  <optgroup label="Interested">
                    <option value={FOLLOWUP_STATUS.DISCUSS_WITH_PARENTS}>Need time to discuss with parents</option>
                    <option value={FOLLOWUP_STATUS.RESPONDING_VAGUELY}>Responding Vaguely / Non-committal</option>
                    <option value={FOLLOWUP_STATUS.INTERESTED_NEED_TIME}>Interested - Need Time</option>
                    <option value={FOLLOWUP_STATUS.INTERESTED_DISCUSSING}>Interested - Discussing with Family</option>
                  </optgroup>
                  <optgroup label="Closed">
                    <option value={FOLLOWUP_STATUS.NOT_INTERESTED}>Not Interested (Explicit)</option>
                    <option value={FOLLOWUP_STATUS.NOT_REQUIRED}>Not Required Anymore</option>
                    <option value={FOLLOWUP_STATUS.REPEATEDLY_NOT_RESPONDING}>Repeatedly Not Responding</option>
                    <option value={FOLLOWUP_STATUS.FAKE_ENQUIRY}>Fake / Test Enquiry</option>
                    <option value={FOLLOWUP_STATUS.DUPLICATE_ENQUIRY}>Duplicate Enquiry</option>
                  </optgroup>
                  <optgroup label="Conversion">
                    <option value={FOLLOWUP_STATUS.CONVERTED}>Converted</option>
                  </optgroup>
                </select>
                {isReferrerConverted && (
                  <p className="text-xs text-red-600 mt-1">Status locked — referrer is converted</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Change Stage (Optional)</label>
                <select
                  value={stageChangedTo}
                  onChange={(e) => setStageChangedTo(e.target.value)}
                  disabled={isStageLocked}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                >
                  <option value="">Keep current ({currentStage})</option>
                  <option value={REFERRER_STAGE.NEW}>{LEAD_STAGE.NEW}</option>
                  <option value={REFERRER_STAGE.HOT}>{LEAD_STAGE.HOT}</option>
                  <option value={REFERRER_STAGE.WARM}>{LEAD_STAGE.WARM}</option>
                  <option value={REFERRER_STAGE.COLD}>{LEAD_STAGE.COLD}</option>
                  <option value={REFERRER_STAGE.CLOSED}>{LEAD_STAGE.CLOSED}</option>
                </select>
                {isReferrerConverted ? (
                  <p className="text-xs text-red-600 mt-1">Stage locked — referrer is converted</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">To mark as converted, update the referrer stage on the referrer detail page</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isFullyLocked}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
              </div>

              {!isFullyLocked && status !== FOLLOWUP_STATUS.SCHEDULED && (
                <div className="border-t border-gray-200 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleNext}
                      onChange={(e) => setScheduleNext(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Schedule next follow-up</span>
                  </label>
                  {scheduleNext && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                        <input
                          type="date"
                          value={nextDate}
                          onChange={(e) => setNextDate(e.target.value)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                        <input
                          type="time"
                          value={nextTime}
                          onChange={(e) => setNextTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                        <select
                          value={nextDuration}
                          onChange={(e) => setNextDuration(parseInt(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        >
                          <MeetingDurationOptions />
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Meeting Type</label>
                        <select
                          value={nextMeetingType}
                          onChange={(e) => setNextMeetingType(e.target.value as MEETING_TYPE)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        >
                          <option value={MEETING_TYPE.PHONE_CALL}>Phone Call</option>
                          <option value={MEETING_TYPE.ONLINE}>Online</option>
                          <option value={MEETING_TYPE.FACE_TO_FACE}>Face to Face</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {!readOnly && (
          <div className="shrink-0 border-t border-gray-200 px-4 py-3">
            <button
              onClick={mode === 'create' ? handleCreate : handleUpdate}
              disabled={saving || (mode === 'update' && (loading || isFullyLocked))}
              className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : mode === 'create' ? 'Schedule Follow-Up' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
