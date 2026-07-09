'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import {
  ivyLeagueFlowPageClass,
  ivyLeagueFlowContainerClass,
  ivyLeagueFlowStepCardClass,
  ivyLeagueFlowStepAsideClass,
} from '@/components/studentDetailResponsive';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface StudentMeeting {
  _id: string;
  subject: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingType: string;
  status: string;
  zohoMeetingUrl?: string;
  zohoMeetingId?: string;
  zohoMeetingPassword?: string;
}

interface ParentMeeting {
  _id: string;
  subject: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingMode: string;
  status: string;
  meetLink?: string;
  zohoMeetingUrl?: string;
  zohoMeetingId?: string;
  zohoMeetingPassword?: string;
}

export default function IvyLeagueInstructionsPage() {
  const router = useRouter();
  const [showBanner, setShowBanner] = useState(true);
  const [studentMeetings, setStudentMeetings] = useState<StudentMeeting[]>([]);
  const [parentMeetings, setParentMeetings] = useState<ParentMeeting[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setShowBanner(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const profileRes = await authAPI.getProfile();
        if (!profileRes.data.success) return;
        const u = profileRes.data.data.user;
        const userId = u?.id || u?._id;
        if (!userId) return;
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [stuRes, parRes] = await Promise.all([
          fetch(`${API_URL}/team-meets/ivy-candidate/${userId}`, { headers }).then((r) => r.json()),
          fetch(`${API_URL}/ivy/parent-interview-schedule?candidateUserId=${userId}`, { headers }).then((r) => r.json()),
        ]);
        if (stuRes.success) setStudentMeetings(stuRes.data?.teamMeets || []);
        if (parRes.success) setParentMeetings(parRes.data?.schedules || []);
      } catch {
        // non-critical
      }
    };
    fetchMeetings();
  }, []);

  const steps = [
    {
      number: 1,
      title: 'Take an Ivy-League Test',
      description:
        'You will be required to take a comprehensive aptitude and academic assessment designed specifically for Ivy League aspirants. This test evaluates your critical thinking, analytical skills, and academic readiness.',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      number: 2,
      title: 'Student Interview',
      description:
        'After the test, you will go through a one-on-one interview session where our expert panel will assess your personality, aspirations, extracurricular involvement, and overall fit for the Ivy League preparation program.',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      number: 3,
      title: "Parent's Interview",
      description:
        'A brief interview will be conducted with one of your parents/guardians to understand the family\'s commitment, expectations, and support for the student\'s Ivy League journey. This helps us ensure a collaborative approach.',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className={ivyLeagueFlowPageClass}>
      {/* Decorative Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-10 top-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl max-md:right-0 max-md:h-48 max-md:w-48"></div>
        <div className="absolute bottom-20 left-10 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl max-md:left-0 max-md:h-56 max-md:w-56"></div>
      </div>

      <div className={ivyLeagueFlowContainerClass}>
        {/* Success Banner */}
        {showBanner && (
        <div className="mb-8 flex items-start gap-4 rounded-2xl border border-green-200 bg-green-50 p-6 transition-opacity duration-500 max-md:mb-6 max-md:flex-col max-md:gap-3 max-md:p-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-green-800">Registration Successful!</h2>
            <p className="text-green-700 mt-1">
              Your IVY League registration has been submitted. Please review the procedure below to understand the next steps.
            </p>
          </div>
        </div>
        )}

        {/* Header */}
        <div className="mb-12 text-center max-md:mb-8">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2959ba] to-[#1e3f8a] shadow-lg max-md:mb-3 max-md:h-14 max-md:w-14">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
            Ivy League Admission Procedure
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600 sm:text-lg">
            To proceed with the Ivy League preparation program, students need to pass through the following procedure
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl"
            >
              <div className={ivyLeagueFlowStepCardClass}>
                {/* Step Number + Icon */}
                <div className={ivyLeagueFlowStepAsideClass}>
                  <span className="text-sm font-medium uppercase tracking-wider text-white/70">Step</span>
                  <span className="text-3xl font-bold text-white">{step.number}</span>
                  <div className="mt-1 max-md:mt-0">{step.icon}</div>
                </div>

                {/* Content */}
                <div className="flex-1 p-5 sm:p-8">
                  <h3 className="mb-3 text-lg font-bold text-gray-900 sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>

                  {step.number === 1 && (
                    <div className="mt-5">
                      <button
                        onClick={() => router.push('/ivy-league/test')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2959ba] to-[#1e3f8a] px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-[#2959ba]/30 sm:w-auto"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Start Test
                      </button>
                    </div>
                  )}

                  {step.number === 2 && studentMeetings.length > 0 && (
                    <div className="mt-5 space-y-3">
                      <p className="text-sm font-semibold text-gray-700">Your Scheduled Meetings:</p>
                      {studentMeetings.map((m) => (
                        <div key={m._id} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-blue-900">{m.subject}</p>
                              <p className="text-xs text-blue-600 mt-0.5">
                                {new Date(m.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {m.scheduledTime} &bull; {m.duration} min &bull; {m.meetingType === 'ONLINE' ? 'Online' : 'In Person'}
                              </p>
                              {m.meetingType === 'ONLINE' && m.status === 'CONFIRMED' && (m.zohoMeetingId || m.zohoMeetingPassword) && (
                                <div className="flex flex-wrap gap-4 mt-1.5">
                                  {m.zohoMeetingId && (
                                    <span className="text-xs text-blue-700"><span className="font-semibold">Meeting ID:</span> {m.zohoMeetingId}</span>
                                  )}
                                  {m.zohoMeetingPassword && (
                                    <span className="text-xs text-blue-700"><span className="font-semibold">Password:</span> {m.zohoMeetingPassword}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                m.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                m.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {m.status}
                              </span>
                              {m.meetingType === 'ONLINE' && m.status === 'CONFIRMED' && m.zohoMeetingUrl && (
                                <a href={m.zohoMeetingUrl} target="_blank" rel="noopener noreferrer"
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                                  Join
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.number === 3 && parentMeetings.length > 0 && (
                    <div className="mt-5 space-y-3">
                      <p className="text-sm font-semibold text-gray-700">Scheduled Parent Meetings:</p>
                      {parentMeetings.map((m) => (
                        <div key={m._id} className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-purple-900">{m.subject}</p>
                              <p className="text-xs text-purple-600 mt-0.5">
                                {new Date(m.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {m.scheduledTime} &bull; {m.duration} min &bull; {m.meetingMode === 'online' ? 'Online' : 'In Person'}
                              </p>
                              {m.meetingMode === 'online' && (m.zohoMeetingId || m.zohoMeetingPassword) && (
                                <div className="flex flex-wrap gap-4 mt-1.5">
                                  {m.zohoMeetingId && (
                                    <span className="text-xs text-purple-700"><span className="font-semibold">Meeting ID:</span> {m.zohoMeetingId}</span>
                                  )}
                                  {m.zohoMeetingPassword && (
                                    <span className="text-xs text-purple-700"><span className="font-semibold">Password:</span> {m.zohoMeetingPassword}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                m.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                m.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {m.status}
                              </span>
                              {m.meetingMode === 'online' && (m.zohoMeetingUrl || m.meetLink) && (
                                <a href={(m.zohoMeetingUrl || m.meetLink)!} target="_blank" rel="noopener noreferrer"
                                  className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700">
                                  Join
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <div className="flex justify-center -mb-6 relative z-10">
                  <div className="w-0.5 h-6 bg-[#2959ba]/30"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-10 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center sm:p-6">
          <p className="text-blue-800 font-medium">
            Our team will reach out to you with the schedule for each step. Please ensure your contact details are up to date.
          </p>
        </div>

        {/* Back to Dashboard Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2959ba] to-[#1e3f8a] px-8 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl sm:w-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
