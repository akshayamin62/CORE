'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { IVY_API_URL } from '@/lib/ivyApi';
import { teamMeetAPI, authAPI, opsScheduleAPI } from '@/lib/api';
import { TeamMeet, OpsSchedule, TEAMMEET_STATUS } from '@/types';
import OpsCalendarGrid from '@/components/OpsCalendarGrid';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import OpsScheduleFormPanel from '@/components/OpsScheduleFormPanel';

interface StudentService {
    _id: string; // The Service ID
    studentId: {
        _id: string;      // Student document _id
        userId?: string;  // User document _id
        firstName: string; // Populated
        lastName: string; // Populated
        email: string; // Populated
    };
    status: string;
    createdAt: string;
}

interface IvyCandidate {
    _id: string;
    userId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    schoolName: string;
    curriculum: string;
    currentGrade: string;
    parentFirstName: string;
    parentLastName: string;
    parentEmail: string;
    parentMobile: string;
    testStatus: string;
    totalScore: number | null;
    maxScore: number;
    completedSections: number;
    createdAt: string;
}

interface IvyStudentItem {
    userId: string;
    studentId: string;
    studentIvyServiceId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    schoolName: string;
    curriculum: string;
    currentGrade: string;
    createdAt: string;
}

interface PointerScore {
    pointerNo: number;
    score: number;
    maxScore: number;
}

interface IvyScoreData {
    studentIvyServiceId: string;
    pointerScores: PointerScore[];
    overallScore: number;
    generatedAt: string;
}

interface AcademicExcellenceScore {
    finalScore: number;
    documentAvg: number;
    weightedScoreSum: number;
    evaluatedDocsCount: number;
    informalSectionsWithScores: number;
}

interface Pointer5Score {
    score: number;
}

const pointerNames: { [key: number]: string } = {
    1: 'Academic Excellence',
    2: 'Spike in One Area',
    3: 'Leadership Initiative',
    4: 'Global Social Impact',
    5: 'Authentic Storytelling',
    6: 'Intellectual Curiosity',
};

const pointerDescriptions: { [key: number]: string } = {
    1: 'GPA, test scores,olympiad and projects',
    2: 'Deep expertise in a chosen field',
    3: 'Leadership roles and demonstrated impact',
    4: 'Community service and social contributions',
    5: 'Essay/Profile writing and personal narrative',
    6: 'Research and learning beyond curriculum',
};

const pointerWeightages: { [key: number]: number } = {
    1: 0.30, // 30%
    2: 0.20, // 20%
    3: 0.15, // 15%
    4: 0.10, // 10%
    5: 0.15, // 15%
    6: 0.10, // 10%
};

export default function IvyExpertDashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>}>
            <IvyExpertDashboard />
        </Suspense>
    );
}

function IvyExpertDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const selectedStudentId = searchParams.get('studentId');
    const userIdForProfile = searchParams.get('userId'); // User._id for candidate-profile
    const studentIvyServiceId = searchParams.get('studentIvyServiceId');

    const [students, setStudents] = useState<StudentService[]>([]);
    const [myCandidates, setMyCandidates] = useState<IvyCandidate[]>([]);
    const [myStudents, setMyStudents] = useState<IvyStudentItem[]>([]);
    const [scoreData, setScoreData] = useState<IvyScoreData | null>(null);
    const [academicScore, setAcademicScore] = useState<AcademicExcellenceScore | null>(null);
    const [pointer5Score, setPointer5Score] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [scoreLoading, setScoreLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scoreError, setScoreError] = useState<string | null>(null);
    const [candidateSearch, setCandidateSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');

    // Team Meet state
    const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
    const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
    const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('create');
    const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
    const [selectedTeamMeetDate, setSelectedTeamMeetDate] = useState<Date | undefined>(undefined);
    const [currentUserId, setCurrentUserId] = useState('');

    // Calendar / OPS tasks state
    const [showCalendar, setShowCalendar] = useState(false);
    const [opsTasks, setOpsTasks] = useState<OpsSchedule[]>([]);
    const [selectedOpsTask, setSelectedOpsTask] = useState<OpsSchedule | null>(null);
    const [showOpsTaskPanel, setShowOpsTaskPanel] = useState(false);

    const fetchTeamMeets = useCallback(async (studentDocId?: string) => {
        try {
            const res = studentDocId
                ? await teamMeetAPI.getStudentTeamMeets(studentDocId)
                : await teamMeetAPI.getTeamMeetsForCalendar();
            if (res.data.success) {
                setTeamMeets(res.data.data.teamMeets || []);
            }
        } catch (err) {
            console.error('Error fetching team meets:', err);
        }
    }, []);

    // Fetch current user id
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await authAPI.getProfile();
                if (res.data.success) {
                    const u = res.data.data.user;
                    setCurrentUserId(u?.id || u?._id || '');
                }
            } catch (err) {
                console.error('Error fetching user:', err);
            }
        };
        fetchUser();
    }, []);

    // Fetch team meets — for student detail view use student's meets, for dashboard use current user's
    useEffect(() => {
        fetchTeamMeets(selectedStudentId || undefined);
    }, [fetchTeamMeets, selectedStudentId]);

    // Fetch OPS tasks when viewing a specific student
    useEffect(() => {
        if (selectedStudentId) {
            const fetchOpsTasks = async () => {
                try {
                    const res = await opsScheduleAPI.getStudentTasks(selectedStudentId);
                    setOpsTasks(res.data.data.schedules || []);
                } catch (err) {
                    console.error('Error fetching OPS tasks:', err);
                }
            };
            fetchOpsTasks();
        }
    }, [selectedStudentId]);

    useEffect(() => {
        // If studentId is already provided (e.g. super admin navigating from view details),
        // skip fetching the student list since /my-students requires IVY_EXPERT role
        if (selectedStudentId) {
            setLoading(false);
            return;
        }

        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                // Fetch both candidates and students assigned to this ivy expert
                const [candidatesRes, studentsRes, serviceStudentsRes] = await Promise.all([
                    axios.get(`${IVY_API_URL}/ivy-expert-candidates/my-candidates`),
                    axios.get(`${IVY_API_URL}/ivy-expert-candidates/my-ivy-students`),
                    axios.get(`${IVY_API_URL}/ivy-service/my-students`),
                ]);

                if (candidatesRes.data.success) {
                    setMyCandidates(candidatesRes.data.candidates);
                }
                if (studentsRes.data.success) {
                    setMyStudents(studentsRes.data.students);
                }
                if (serviceStudentsRes.data.success) {
                    setStudents(serviceStudentsRes.data.data);
                }
            } catch (err: any) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [selectedStudentId]);

    useEffect(() => {
        if (selectedStudentId && studentIvyServiceId) {
            fetchIvyScore();
            fetchAcademicScore();
            fetchPointer5Score();
        }
    }, [selectedStudentId, studentIvyServiceId]);

    const fetchAcademicScore = async () => {
        if (!selectedStudentId || !studentIvyServiceId) return;
        try {
            const response = await axios.get(
                `${IVY_API_URL}/pointer1/academic/score/${selectedStudentId}`,
                { params: { studentIvyServiceId } }
            );
            if (response.data.success) {
                setAcademicScore(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching academic score:', error);
        }
    };

    const fetchPointer5Score = async () => {
        if (!studentIvyServiceId) return;
        try {
            const response = await axios.get(
                `${IVY_API_URL}/pointer5/score/${studentIvyServiceId}`
            );
            if (response.data.success) {
                setPointer5Score(response.data.data.score);
            }
        } catch (error) {
            console.error('Error fetching Pointer 5 score:', error);
        }
    };

    const fetchIvyScore = async () => {
        try {
            setScoreLoading(true);
            setScoreError(null);
            const response = await axios.get(
                `${IVY_API_URL}/ivy-score/${selectedStudentId}`,
                { params: { studentIvyServiceId } }
            );

            if (response.data.success) {
                setScoreData(response.data.data);
            } else {
                setScoreError('Failed to load score data');
            }
        } catch (err: any) {
            console.error('Error fetching Ivy score:', err);
            setScoreError(err.response?.data?.message || 'Failed to load Ivy score');
        } finally {
            setScoreLoading(false);
        }
    };

    const getScoreColor = (score: number, maxScore: number): string => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 60) return 'bg-brand-500';
        if (percentage >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getScoreGrade = (score: number, maxScore: number): string => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 90) return 'Excellent';
        if (percentage >= 80) return 'Very Good';
        if (percentage >= 70) return 'Good';
        if (percentage >= 60) return 'Fair';
        return 'Needs Improvement';
    };

    const handlePointerClick = (pointerNo: number) => {
        const queryParams = new URLSearchParams();
        if (selectedStudentId) queryParams.set('studentId', selectedStudentId);
        if (studentIvyServiceId) queryParams.set('studentIvyServiceId', studentIvyServiceId);

        if (pointerNo === 1) {
            router.push(`/ivy-league/ivy-expert/pointer1?${queryParams.toString()}`);
        } else if (pointerNo === 5) {
            router.push(`/ivy-league/ivy-expert/pointer5?${queryParams.toString()}`);
        } else if (pointerNo === 6) {
            router.push(`/ivy-league/ivy-expert/pointer6?${queryParams.toString()}`);
        } else if ([2, 3, 4].includes(pointerNo)) {
            router.push(`/ivy-league/ivy-expert/activities?pointerNo=${pointerNo}&${queryParams.toString()}`);
        }
    };

    // TeamMeet panel handlers (admin pattern)
    const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
        setSelectedTeamMeet(teamMeet);
        const recipientId = (teamMeet.requestedTo as any)?.id || (teamMeet.requestedTo as any)?._id || '';
        if (
            String(recipientId) === String(currentUserId) &&
            currentUserId &&
            teamMeet.status === TEAMMEET_STATUS.PENDING_CONFIRMATION
        ) {
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
        await fetchTeamMeets(selectedStudentId || undefined);
    };

    const handleTeamMeetPanelClose = () => {
        setShowTeamMeetPanel(false);
        setSelectedTeamMeet(null);
        setSelectedTeamMeetDate(undefined);
    };

    if (loading) return <div className="p-6 text-center text-gray-500 sm:p-8">Loading students...</div>;
    if (error) return <div className="p-6 text-center text-red-600 sm:p-8">{error}</div>;

    // If a student is selected, show the Ivy Score dashboard
    if (selectedStudentId && studentIvyServiceId) {
        const selectedStudent = students.find(s => s.studentId._id === selectedStudentId);

        if (scoreLoading) {
            return (
                <div className="p-12 text-center sm:p-20">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent"></div>
                    <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-500">Loading Student Performance Data...</p>
                </div>
            );
        }

        if (scoreError) {
            return (
                <div className="p-4 sm:p-12">
                    <div className="mx-auto max-w-lg rounded-3xl border-2 border-red-100 bg-red-50 p-6 text-center shadow-xl shadow-red-50 sm:p-10">
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6 border-4 border-white shadow-lg">
                            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="mb-2 text-xl font-black uppercase tracking-tight text-gray-900 sm:text-2xl">Load Failed</h3>
                        <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500 sm:mb-8">{scoreError}</p>
                        <button
                            type="button"
                            onClick={fetchIvyScore}
                            className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-red-100 transition-all hover:bg-red-700 active:scale-95 sm:px-8"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        if (!scoreData) return null;

        const totalMaxScore = 10;

        // Calculate weighted overall score
        let calculatedOverallScore = 0;
        scoreData.pointerScores.forEach((pointer) => {
            const score = pointer.pointerNo === 1 && academicScore
                ? academicScore.finalScore
                : pointer.pointerNo === 5 && pointer5Score !== null
                    ? pointer5Score
                    : pointer.score;
            const weight = pointerWeightages[pointer.pointerNo] || 0;
            calculatedOverallScore += score * weight;
        });

        const overallScore = calculatedOverallScore;
        const overallPercentage = (overallScore / totalMaxScore) * 100;

        return (
            <>
                <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 p-4 duration-1000 sm:p-6 md:p-8 lg:p-12">
                    {/* Header */}
                    <header className="mb-8 sm:mb-12 md:mb-16">
                        <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <h1 className="mb-3 text-2xl font-black leading-tight tracking-tighter text-gray-900 sm:mb-4 sm:text-4xl md:text-5xl lg:text-6xl">
                                    {selectedStudent?.studentId.firstName ? `${selectedStudent.studentId.firstName} ${selectedStudent.studentId.lastName}` : 'Student'}&apos;s Ivy League Readiness
                                </h1>
                                <p className="max-w-2xl text-sm font-medium leading-relaxed text-gray-400 sm:text-base md:text-xl">
                                    Track competitive trajectory across all core admission pillars. Scores are real-time and reflect current evaluations.
                                </p>
                            </div>
                            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCalendar(prev => !prev)}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-brand-700 sm:w-auto sm:px-5 sm:py-3"
                                >
                                    {showCalendar ? (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                            </svg>
                                            Dashboard
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Calendar
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const resolvedUserId = userIdForProfile || selectedStudent?.studentId.userId || selectedStudentId;
                                        router.push(`/ivy-league/ivy-expert/student-report/${resolvedUserId}`);
                                    }}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-brand-700 sm:w-auto sm:px-5 sm:py-3"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    View Candidate Report
                                </button>
                            </div>
                        </div>
                    </header>

                    {!showCalendar && (<>
                        {/* Overall Score Card */}
                        <div className="relative mb-8 group sm:mb-12 md:mb-16">
                            <div className="absolute inset-0 rounded-[2rem] bg-brand-600 opacity-10 blur-3xl transition-opacity group-hover:opacity-20 md:rounded-[3rem]"></div>
                            <div className="relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_32px_64px_-16px_rgba(41,89,186,0.1)] sm:p-8 md:rounded-[3.5rem] md:p-12">
                                <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12">
                                    <div className="flex-1 text-center md:text-left">
                                        <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 sm:mb-4">Calculated Potential</span>
                                        <div className="mb-4 flex items-baseline justify-center gap-2 sm:mb-6 sm:gap-4 md:justify-start">
                                            <span className="text-5xl font-black leading-none tracking-tighter text-brand-600 sm:text-7xl md:text-9xl">{overallScore.toFixed(1)}</span>
                                            <span className="text-xl font-black text-gray-300 sm:text-2xl md:text-3xl">/ {totalMaxScore}</span>
                                        </div>
                                        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-black uppercase tracking-widest text-brand-600 sm:gap-3 sm:px-6 sm:py-3 sm:text-base">
                                            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600"></span>
                                            {getScoreGrade(overallScore, totalMaxScore)}
                                        </div>
                                    </div>

                                    <div className="w-full space-y-4 md:w-[400px] md:space-y-6">
                                        <div className="mb-2 flex items-end justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 sm:text-xs">Aggregate Readiness</span>
                                            <span className="text-xl font-black text-brand-600 sm:text-2xl">{overallPercentage.toFixed(0)}%</span>
                                        </div>
                                        <div className="flex h-6 items-center overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 p-1 sm:h-8 sm:p-1.5">
                                            <div
                                                className="h-full rounded-xl bg-brand-600 shadow-[0_0_20px_rgba(41,89,186,0.3)] transition-all duration-1500 ease-out"
                                                style={{ width: `${overallPercentage}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-center text-xs font-bold italic text-gray-400">Last evaluated on {new Date(scoreData.generatedAt).toLocaleDateString('en-GB')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Individual Pointer Scores */}
                        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                            {scoreData.pointerScores.map((pointer) => {
                                // Use academic excellence score for Pointer 1 if available
                                // Use pointer5Score for Pointer 5 if available
                                const displayScore = pointer.pointerNo === 1 && academicScore
                                    ? academicScore.finalScore
                                    : pointer.pointerNo === 5 && pointer5Score !== null
                                        ? pointer5Score
                                        : pointer.score;
                                const percentage = (displayScore / pointer.maxScore) * 100;
                                const colorClass = getScoreColor(displayScore, pointer.maxScore);

                                return (
                                    <div
                                        key={pointer.pointerNo}
                                        onClick={() => handlePointerClick(pointer.pointerNo)}
                                        className="group flex cursor-pointer flex-col rounded-[1.5rem] border border-gray-100 bg-white p-5 shadow-sm transition-all duration-500 hover:border-brand-100 sm:rounded-[2.5rem] sm:p-8 sm:hover:-translate-y-2 sm:hover:shadow-2xl"
                                    >
                                        <div className="mb-4 flex items-center justify-between sm:mb-6">
                                            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-lg font-black text-brand-600 shadow-inner transition-colors group-hover:bg-brand-600 group-hover:text-white sm:h-12 sm:w-12 sm:text-xl">
                                                    {pointer.pointerNo}
                                                </div>
                                                <h3 className="text-sm font-black uppercase leading-tight tracking-tight text-gray-900 sm:text-lg">
                                                    {pointerNames[pointer.pointerNo]}
                                                </h3>
                                            </div>
                                        </div>

                                        <p className="mb-6 text-xs font-bold uppercase leading-relaxed tracking-wide text-gray-400 sm:mb-8 sm:text-sm">
                                            {pointerDescriptions[pointer.pointerNo]}
                                        </p>

                                        {pointer.pointerNo === 1 && academicScore && (
                                            <div className="mb-4 text-xs text-gray-500 space-y-1">
                                                {/* <div className="flex justify-between">
                                            <span>Evaluated Docs:</span>
                                            <span className="font-bold">{academicScore.evaluatedDocsCount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Informal Sections:</span>
                                            <span className="font-bold">{academicScore.informalSectionsWithScores}</span>
                                        </div> */}
                                            </div>
                                        )}

                                        <div className="mt-auto">
                                            <div className="mb-4 flex items-baseline justify-between">
                                                <span className="text-3xl font-black tracking-tighter text-gray-900 sm:text-5xl">
                                                    {displayScore.toFixed(1)}
                                                </span>
                                                <span className="text-xs font-black uppercase italic text-gray-300 sm:text-sm">
                                                    Target: {pointer.maxScore}
                                                </span>
                                            </div>

                                            <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5">
                                                <div
                                                    className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out shadow-sm`}
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>

                                            <div className="flex items-center justify-between mt-4">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                    {getScoreGrade(pointer.score, pointer.maxScore)}
                                                </span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${colorClass} text-white uppercase tracking-tighter`}>
                                                    {percentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Info Panel */}
                        <div className="relative mt-10 overflow-hidden rounded-[2rem] bg-gray-900 p-6 group sm:mt-16 sm:rounded-[3rem] sm:p-12 md:mt-20">
                            <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600 opacity-20 blur-[120px] sm:h-96 sm:w-96"></div>
                            <div className="relative z-10 flex flex-col items-center gap-6 text-center sm:gap-12 md:flex-row md:text-left">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] border border-white/20 bg-white/10 backdrop-blur-xl sm:h-20 sm:w-20 sm:rounded-[2rem]">
                                    <svg className="h-8 w-8 text-brand-400 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="mb-2 text-lg font-black uppercase tracking-tight text-white sm:text-2xl">Understanding Student Profile</h4>
                                    <p className="max-w-3xl text-sm font-medium leading-relaxed text-brand-200/60 sm:text-base">
                                        Each pointer follows the Ivy League evaluation matrix scaled from 0-10. Scores are manually verified based on shared evidences.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>)}

                    {/* Calendar Section — read-only when viewing student */}
                    {showCalendar && (
                        <div className="mt-4">
                            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Read-Only Calendar</span>
                            </div>
                            <OpsCalendarGrid
                    title="Schedule"
                    subtitle="Student meetings and tasks"
                    schedules={opsTasks}
                    teamMeets={teamMeets}
                    currentUserId={currentUserId}
                    sidebar="teamMeet"
                    onScheduleSelect={(schedule) => { setSelectedOpsTask(schedule); setShowOpsTaskPanel(true); }}
                    onDateSelect={() => {}}
                    onTeamMeetSelect={(tm) => { setSelectedTeamMeet(tm); setTeamMeetPanelMode('view'); setShowTeamMeetPanel(true); }}
                    onTeamMeetClick={(tm) => { setSelectedTeamMeet(tm); setTeamMeetPanelMode('view'); setShowTeamMeetPanel(true); }}
                  />
                        </div>
                    )}
                </div>
                <TeamMeetFormPanel
                    teamMeet={selectedTeamMeet}
                    isOpen={showTeamMeetPanel}
                    onClose={handleTeamMeetPanelClose}
                    onSave={handleTeamMeetSave}
                    selectedDate={selectedTeamMeetDate}
                    mode={teamMeetPanelMode}
                    currentUserId={currentUserId}
                    readOnly={true}
                />
                <OpsScheduleFormPanel
                    schedule={selectedOpsTask}
                    students={[]}
                    isOpen={showOpsTaskPanel}
                    onClose={() => { setShowOpsTaskPanel(false); setSelectedOpsTask(null); }}
                    onSubmit={async () => { }}
                    readOnly={true}
                />
            </>
        );
    }

    // Show dashboard with stats + calendar when no student is selected

    return (
        <>
            <div className="px-4 py-6 pb-24 sm:px-6 sm:py-8 md:px-8 md:pb-8">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
                    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="mb-1 text-xl font-bold text-gray-900 sm:text-2xl">Ivy Expert Dashboard</h1>
                            <p className="text-sm text-gray-600">Manage your assigned Ivy League candidates and students</p>
                        </div>
                        {(() => {
                            const t = new Date();
                            const d = Math.floor((t.getTime() - new Date(t.getFullYear(), 0, 0).getTime()) / 86400000);
                            return (
                                <div className="shrink-0 text-left sm:text-right">
                                    <p className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Day {d}</p>
                                    <p className="text-xs text-gray-500 sm:text-sm">of {t.getFullYear()}</p>
                                </div>
                            );
                        })()}
                    </div>
                    {/* Stats */}
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-6 md:grid-cols-3">

                        <div className="col-span-2 cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:col-span-1 sm:p-6" onClick={() => router.push('/ivy-league/ivy-expert/candidates')}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="mb-1 text-xs text-gray-600 sm:text-sm">Ivy Candidates</p>
                                    <p className="text-2xl font-bold text-gray-900 sm:text-3xl">{myCandidates.length}</p>
                                </div>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 sm:h-12 sm:w-12">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-2 cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:col-span-1 sm:p-6" onClick={() => router.push('/ivy-league/ivy-expert/students')}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="mb-1 text-xs text-gray-600 sm:text-sm">Ivy Students</p>
                                    <p className="text-2xl font-bold text-gray-900 sm:text-3xl">{myStudents.length}</p>
                                </div>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 sm:h-12 sm:w-12">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:col-span-1 sm:p-6">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="mb-1 text-xs text-gray-600 sm:text-sm">Upcoming Meetings</p>
                                    <p className="text-2xl font-bold text-gray-900 sm:text-3xl">{teamMeets.filter(t => t.status === TEAMMEET_STATUS.CONFIRMED || t.status === TEAMMEET_STATUS.PENDING_CONFIRMATION).length}</p>
                                </div>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 sm:h-12 sm:w-12">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <OpsCalendarGrid
                        title="Team Meet Calendar"
                        subtitle="Schedule and manage team meetings"
                        schedules={[]}
                        teamMeets={teamMeets}
                        currentUserId={currentUserId}
                        sidebar="teamMeet"
                        onScheduleSelect={() => {}}
                        onDateSelect={handleTeamMeetDateSelect}
                        onTeamMeetSelect={handleTeamMeetSelect}
                        onTeamMeetClick={handleTeamMeetSelect}
                        onScheduleTeamMeet={handleScheduleTeamMeet}
                    />
                </div>
            </div>
            <TeamMeetFormPanel
                teamMeet={selectedTeamMeet}
                isOpen={showTeamMeetPanel}
                onClose={handleTeamMeetPanelClose}
                onSave={handleTeamMeetSave}
                selectedDate={selectedTeamMeetDate}
                mode={teamMeetPanelMode}
                currentUserId={currentUserId}
            />
        </>
    );
}
