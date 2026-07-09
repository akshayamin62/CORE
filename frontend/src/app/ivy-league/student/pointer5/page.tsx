'use client';

import { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { useStudentService } from '../useStudentService';
import { IVY_API_URL } from '@/lib/ivyApi';
import { fetchBlobUrl, useBlobUrl, fileApi } from '@/lib/useBlobUrl';
import IvyLeagueApplicantInfoPanel from '@/components/IvyLeagueApplicantInfoPanel';
import {
  IvyPointerPageShell,
  IvyPointerReadOnlyBanner,
  IvyPointerPageHeader,
} from '@/components/IvyPointerPageChrome';
import {
  ivyPointer5ResponseGridClass,
  ivyPointer5ResponseMainClass,
  ivyPointer5WordsLearnedClass,
  ivyPointerTaskCardClass,
  ivyPointerTaskHeaderClass,
  ivyPointerTaskHeaderPaddingClass,
  ivyPointerTaskExpandedClass,
  ivyPointerTaskPanelClass,
  ivyPointerEvaluationRowClass,
  ivyPointerFileViewerIframeClass,
} from '@/components/studentDetailResponsive';

interface Attachment {
    fileName: string;
    fileUrl: string;
}

interface Task {
    _id: string;
    taskDescription: string;
    wordLimit: number;
    attachments: Attachment[];
    createdAt: string;
}

interface Submission {
    _id: string;
    studentResponse: string;
    wordsLearned: string;
    wordCount: number;
    submittedAt: string;
}

interface Evaluation {
    _id: string;
    score: number;
    feedback: string;
    evaluatedAt: string;
}

interface TaskStatus {
    task: Task;
    submission: Submission | null;
    evaluation: Evaluation | null;
}

function StudentPointer5Content() {
    const { studentId, studentIvyServiceId, loading: serviceLoading, error: serviceError, readOnly } = useStudentService();

    const [tasks, setTasks] = useState<TaskStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [responses, setResponses] = useState<{ [taskId: string]: { response: string; wordsLearned: string } }>({});
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [viewingFile, setViewingFile] = useState<{ [taskId: string]: { url: string; name: string; type: string } | null }>({});
    const [pointer5Score, setPointer5Score] = useState<number | null>(null);

    useEffect(() => {
        if (studentIvyServiceId) {
            fetchStatus();
            fetchPointer5Score();
        }
    }, [studentIvyServiceId]);

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`${IVY_API_URL}/pointer5/status/${studentIvyServiceId}`);
            if (res.data.success) {
                setTasks(res.data.data.tasks || []);
                // Initialize response states
                const resStates: { [taskId: string]: { response: string; wordsLearned: string } } = {};
                res.data.data.tasks?.forEach((t: TaskStatus) => {
                    resStates[t.task._id] = {
                        response: t.submission?.studentResponse || '',
                        wordsLearned: t.submission?.wordsLearned || '',
                    };
                });
                setResponses(resStates);
            }
        } catch (error) {
            console.error('Error fetching status:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPointer5Score = async () => {
        try {
            const res = await axios.get(`${IVY_API_URL}/pointer5/score/${studentIvyServiceId}`);
            if (res.data.success && res.data.data?.score !== undefined) {
                setPointer5Score(res.data.data.score);
            }
        } catch (error) {
            console.error('Error fetching pointer5 score:', error);
        }
    };

    const countWords = (text: string): number => {
        return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    };

    const handleSubmit = async (taskId: string) => {
        const resData = responses[taskId];
        if (!resData?.response.trim()) {
            setMessage({ type: 'error', text: 'Response is required' });
            return;
        }

        setSubmitting(taskId);
        setMessage(null);

        try {
            await axios.post(`${IVY_API_URL}/pointer5/submit`, {
                taskId,
                studentIvyServiceId,
                studentResponse: resData.response,
                wordsLearned: resData.wordsLearned,
            });
            setMessage({ type: 'success', text: 'Response submitted successfully!' });
            fetchStatus();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit response' });
        } finally {
            setSubmitting(null);
        }
    };

    const toggleTask = (taskId: string) => {
        setExpandedTasks((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const downloadFile = async (fileUrl: string, fileName: string) => {
        try {
            const response = await fileApi.get(fileUrl, { responseType: 'blob' });
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const viewFile = async (taskId: string, fileUrl: string, fileName: string) => {
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        let fileType = 'other';
        
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension || '')) {
            fileType = 'image';
        } else if (fileExtension === 'pdf') {
            fileType = 'pdf';
        }
        
        try {
            const blobUrl = await fetchBlobUrl(fileUrl);
            setViewingFile(prev => ({ ...prev, [taskId]: { url: blobUrl, name: fileName, type: fileType } }));
        } catch {
            console.error('Failed to load file for viewing');
        }
    };

    const preventCopyPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        return false;
    };

    if (!studentIvyServiceId && !serviceLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 md:p-12 max-md:p-4">
                <div className="max-w-6xl mx-auto bg-red-50 text-red-800 border border-red-200 p-6 rounded-2xl">
                    {serviceError || 'Student Ivy Service ID is required.'}
                </div>
            </div>
        );
    }

    if (serviceLoading) {
        return <div className="p-20 text-center text-gray-500">Loading...</div>;
    }

    return (
        <IvyPointerPageShell>
                {readOnly && <IvyPointerReadOnlyBanner />}
                <IvyPointerPageHeader
                    title="POINTER 5: AUTHENTIC & REFLECTIVE STORYTELLING"
                    showScore={pointer5Score !== null && pointer5Score !== undefined}
                    score={pointer5Score}
                />

                {/* Ivy League Applicant Info Panel */}
                <IvyLeagueApplicantInfoPanel pointerNo={5} />

                {/* Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* Loading */}
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading...</div>
                ) : tasks.length === 0 ? (
                    <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm max-md:p-6">
                        <div className="text-6xl mb-6">📝</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Tasks Assigned Yet</h2>
                        <p className="text-gray-600">Your IVY League Expert will assign writing tasks here.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {tasks.map((taskStatus, index) => {
                            const currentResponse = responses[taskStatus.task._id]?.response || '';
                            const wordCount = countWords(currentResponse);
                            const isOverLimit = wordCount > taskStatus.task.wordLimit;

                            return (
                                <div key={taskStatus.task._id} className={ivyPointerTaskCardClass}>
                                    {/* Task Header */}
                                    <div
                                        className={`${ivyPointerTaskHeaderPaddingClass} cursor-pointer transition-all hover:bg-gray-50`}
                                        onClick={() => toggleTask(taskStatus.task._id)}
                                    >
                                        <div className={ivyPointerTaskHeaderClass}>
                                            <div className="flex min-w-0 items-center gap-3 max-md:gap-2 md:gap-4">
                                                <span className="shrink-0 text-2xl font-black text-brand-600 max-md:text-xl">#{tasks.length - index}</span>
                                                <div className="min-w-0">
                                                    <p className="line-clamp-2 font-bold text-gray-900 max-md:text-sm md:line-clamp-1">{taskStatus.task.taskDescription}</p>
                                                    <p className="text-sm text-gray-500 max-md:text-xs">Word Limit: {taskStatus.task.wordLimit}</p>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center justify-between gap-3 max-md:w-full md:justify-end md:gap-4">
                                                {taskStatus.evaluation ? (
                                                    <span className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-xl">
                                                        Score: {taskStatus.evaluation.score}/10
                                                    </span>
                                                ) : taskStatus.submission ? (
                                                    <span className="px-4 py-2 bg-brand-100 text-brand-700 font-bold rounded-xl">
                                                        Submitted
                                                    </span>
                                                ) : (
                                                    <span className="px-4 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-xl">
                                                        Pending
                                                    </span>
                                                )}
                                                <svg
                                                    className={`w-6 h-6 text-gray-400 transition-transform ${expandedTasks.has(taskStatus.task._id) ? 'rotate-180' : ''}`}
                                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {expandedTasks.has(taskStatus.task._id) && (
                                        <div className={ivyPointerTaskExpandedClass}>
                                            {/* Task Details */}
                                            <div className="rounded-2xl bg-brand-50 p-6 max-md:p-3">
                                                <h3 className="text-sm font-black text-brand-600 uppercase tracking-wider mb-3">Task Description</h3>
                                                <p className="text-gray-900 whitespace-pre-wrap">{taskStatus.task.taskDescription}</p>
                                                {taskStatus.task.attachments.length > 0 && (
                                                    <div className="mt-4">
                                                        <p className="text-sm font-bold text-gray-500 mb-2">Attachments:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {taskStatus.task.attachments.map((att, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => viewFile(taskStatus.task._id, att.fileUrl, att.fileName)}
                                                                    className={`px-3 py-1 text-sm rounded-lg transition-all border ${
                                                                        viewingFile[taskStatus.task._id]?.name === att.fileName
                                                                            ? 'bg-brand-600 text-white border-brand-600'
                                                                            : 'bg-white text-brand-700 border-brand-200 hover:bg-brand-100'
                                                                    }`}
                                                                >
                                                                    📎 {att.fileName}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* File Viewer - Inline */}
                                            {viewingFile[taskStatus.task._id] && (
                                                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 max-md:p-3">
                                                    <div className="mb-4 flex flex-col gap-2 max-md:gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">
                                                            Viewing: {viewingFile[taskStatus.task._id]?.name}
                                                        </h3>
                                                        <button
                                                            onClick={() => setViewingFile(prev => ({ ...prev, [taskStatus.task._id]: null }))}
                                                            className="text-gray-500 hover:text-gray-700 font-bold text-xl px-3 py-1 rounded-lg hover:bg-gray-200"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                    <div className="bg-white rounded-xl overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
                                                        {viewingFile[taskStatus.task._id]?.type === 'image' ? (
                                                            <img
                                                                src={viewingFile[taskStatus.task._id]?.url}
                                                                alt={viewingFile[taskStatus.task._id]?.name}
                                                                className="max-w-full h-auto mx-auto pointer-events-none select-none"
                                                                onContextMenu={(e) => e.preventDefault()}
                                                                draggable={false}
                                                            />
                                                        ) : viewingFile[taskStatus.task._id]?.type === 'pdf' ? (
                                                            <iframe
                                                                src={viewingFile[taskStatus.task._id]?.url}
                                                                className={ivyPointerFileViewerIframeClass}
                                                                title={viewingFile[taskStatus.task._id]?.name}
                                                            />
                                                        ) : (
                                                            <div className="text-center py-20">
                                                                <p className="text-gray-600 mb-2">Preview not available for this file type</p>
                                                                <p className="text-sm text-gray-500">{viewingFile[taskStatus.task._id]?.name}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Response Input - 70/30 split */}
                                            <div className={ivyPointer5ResponseGridClass}>
                                                <div className={ivyPointer5ResponseMainClass}>
                                                    <div className={ivyPointerTaskPanelClass}>
                                                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-3">Your Response</h3>
                                                        <textarea
                                                            value={responses[taskStatus.task._id]?.response || ''}
                                                            onChange={(e) => setResponses(prev => ({
                                                                ...prev,
                                                                [taskStatus.task._id]: { ...prev[taskStatus.task._id], response: e.target.value }
                                                            }))}
                                                            onCopy={preventCopyPaste}
                                                            onCut={preventCopyPaste}
                                                            onPaste={preventCopyPaste}
                                                            placeholder="Write your response here..."
                                                            rows={10}
                                                            disabled={readOnly || !!taskStatus.evaluation}
                                                            spellCheck="false"
                                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 bg-white resize-none disabled:bg-gray-50"
                                                        />
                                                        <div className="flex justify-end mt-2">
                                                            <span className={`text-sm font-bold ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
                                                                {wordCount} / {taskStatus.task.wordLimit} words
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={ivyPointer5WordsLearnedClass}>
                                                    <div className="h-full rounded-2xl border-2 border-brand-200 bg-brand-50 p-6 max-md:p-3">
                                                        <h3 className="text-sm font-black text-brand-700 uppercase tracking-wider mb-3">Words Learned</h3>
                                                        <textarea
                                                            value={responses[taskStatus.task._id]?.wordsLearned || ''}
                                                            onChange={(e) => setResponses(prev => ({
                                                                ...prev,
                                                                [taskStatus.task._id]: { ...prev[taskStatus.task._id], wordsLearned: e.target.value }
                                                            }))}
                                                            placeholder="List new words you learned..."
                                                            rows={10}
                                                            disabled={readOnly || !!taskStatus.evaluation}
                                                            spellCheck="false"
                                                            className="w-full px-4 py-3 border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 bg-white resize-none disabled:bg-gray-50"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Submit Button */}
                                            {!readOnly && !taskStatus.evaluation && (
                                                <div className="flex justify-end max-md:justify-stretch">
                                                    <button
                                                        onClick={() => handleSubmit(taskStatus.task._id)}
                                                        disabled={submitting === taskStatus.task._id || isOverLimit}
                                                        className="rounded-xl bg-brand-600 px-8 py-3 font-bold text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 max-md:w-full"
                                                    >
                                                        {submitting === taskStatus.task._id ? 'Submitting...' : taskStatus.submission ? 'Update Response' : 'Submit Response'}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Evaluation Display */}
                                            {taskStatus.evaluation && (
                                                <div className="rounded-2xl bg-green-50 p-6 max-md:p-3">
                                                    <h3 className="text-sm font-black text-green-600 uppercase tracking-wider mb-3">Ivy Expert Feedback</h3>
                                                    <div className={ivyPointerEvaluationRowClass}>
                                                        <div className="text-center">
                                                            <div className="text-4xl font-black text-green-600">{taskStatus.evaluation.score}</div>
                                                            <div className="text-sm text-green-600 font-bold">out of 10</div>
                                                        </div>
                                                        {taskStatus.evaluation.feedback && (
                                                            <div className="flex-1">
                                                                <p className="text-gray-900">{taskStatus.evaluation.feedback}</p>
                                                                <p className="text-sm text-gray-500 mt-2">
                                                                    Evaluated: {new Date(taskStatus.evaluation.evaluatedAt).toLocaleString('en-GB')}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
        </IvyPointerPageShell>
    );
}

export default function StudentPointer5Page() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
            <StudentPointer5Content />
        </Suspense>
    );
}
