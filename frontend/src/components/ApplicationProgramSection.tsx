'use client';

import { useEffect, useState } from 'react';
import { programAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Program {
  _id: string;
  university: string;
  universityRanking: {
    webometricsWorld?: number;
    webometricsNational?: number;
    usNews?: number;
    qs?: number;
  };
  programName: string;
  websiteUrl?: string;
  campus: string;
  country: string;
  studyLevel: string;
  duration: number;
  ieltsScore: number;
  applicationFee: number;
  yearlyTuitionFees: number;
  priority?: number;
  intake?: string;
  year?: string;
  selectedAt?: string;
}

interface ApplicationProgramSectionProps {
  sectionTitle: string;
  registrationId: string;
  isReadOnly?: boolean; // For admin/counselor view
}

export default function ApplicationProgramSection({
  sectionTitle,
  registrationId,
  isReadOnly = false,
}: ApplicationProgramSectionProps) {
  const [availablePrograms, setAvailablePrograms] = useState<Program[]>([]);
  const [appliedPrograms, setAppliedPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingProgram, setSelectingProgram] = useState<string | null>(null);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [programFormData, setProgramFormData] = useState<{ [key: string]: { year: string; priority: number; intake: string } }>({});

  const intakeOptions = [
    'Spring', 'Summer', 'Fall', 'Winter',
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      // For read-only mode (admin/counselor), we don't fetch programs
      // They should see a message or different view
      if (isReadOnly) {
        setAvailablePrograms([]);
        setAppliedPrograms([]);
        return;
      }
      
      const response = await programAPI.getStudentPrograms();
      setAvailablePrograms(response.data.data.availablePrograms || []);
      setAppliedPrograms(response.data.data.appliedPrograms || []);
    } catch (error: any) {
      console.error('Failed to fetch programs:', error);
      // Only show error if not in read-only mode
      if (!isReadOnly) {
        toast.error('Failed to load programs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProgram = (programId: string) => {
    setExpandedPrograms(prev => new Set([...prev, programId]));
    if (!programFormData[programId]) {
      setProgramFormData(prev => ({
        ...prev,
        [programId]: {
          year: String(currentYear),
          priority: 1,
          intake: '',
        },
      }));
    }
  };

  const handleApplyProgram = async (programId: string) => {
    const formData = programFormData[programId];
    if (!formData || !formData.year || !formData.intake || !formData.priority) {
      toast.error('Please fill all fields: Year, Priority, and Intake');
      return;
    }

    setSelectingProgram(programId);
    try {
      await programAPI.selectProgram({
        programId: programId,
        priority: formData.priority,
        intake: formData.intake,
        year: formData.year,
      });
      toast.success('Program added to applied list');
      setExpandedPrograms(prev => {
        const newSet = new Set(prev);
        newSet.delete(programId);
        return newSet;
      });
      setProgramFormData(prev => {
        const newData = { ...prev };
        delete newData[programId];
        return newData;
      });
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to select program');
    } finally {
      setSelectingProgram(null);
    }
  };

  const handleCancelSelection = (programId: string) => {
    setExpandedPrograms(prev => {
      const newSet = new Set(prev);
      newSet.delete(programId);
      return newSet;
    });
    setProgramFormData(prev => {
      const newData = { ...prev };
      delete newData[programId];
      return newData;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner mx-auto"></div>
      </div>
    );
  }

  if (sectionTitle === 'Apply to Program') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Programs</h3>
          {availablePrograms.length > 0 ? (
            <div className="space-y-4">
              {availablePrograms.map((program) => (
                <div
                  key={program._id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{program.programName}</h4>
                      <p className="text-sm text-gray-600 mb-2">{program.university}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Campus:</span> {program.campus}
                        </div>
                        <div>
                          <span className="font-medium">Country:</span> {program.country}
                        </div>
                        <div>
                          <span className="font-medium">Study Level:</span> {program.studyLevel}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {program.duration} months
                        </div>
                        <div>
                          <span className="font-medium">IELTS:</span> {program.ieltsScore}
                        </div>
                        <div>
                          <span className="font-medium">Tuition:</span> £{program.yearlyTuitionFees.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Application Fee:</span> £{program.applicationFee.toLocaleString()}
                        </div>
                        {program.websiteUrl && (
                          <div>
                            <span className="font-medium">Website:</span>{' '}
                            <a href={program.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              View Program
                            </a>
                          </div>
                        )}
                      </div>
                      {program.universityRanking && (
                        <div className="mt-2 flex gap-4 text-xs text-gray-500">
                          {program.universityRanking.webometricsWorld && (
                            <span>Webometrics World: {program.universityRanking.webometricsWorld}</span>
                          )}
                          {program.universityRanking.webometricsNational && (
                            <span>Webometrics National: {program.universityRanking.webometricsNational}</span>
                          )}
                          {program.universityRanking.usNews && (
                            <span>US News: {program.universityRanking.usNews}</span>
                          )}
                          {program.universityRanking.qs && (
                            <span>QS: {program.universityRanking.qs}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {!expandedPrograms.has(program._id) ? (
                      <button
                        onClick={() => handleSelectProgram(program._id)}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Select
                      </button>
                    ) : (
                      <div className="ml-4 flex flex-col gap-2 min-w-[200px]">
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Year *</label>
                            <select
                              value={programFormData[program._id]?.year || String(currentYear)}
                              onChange={(e) => setProgramFormData(prev => ({
                                ...prev,
                                [program._id]: { ...prev[program._id], year: e.target.value }
                              }))}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            >
                              {yearOptions.map(year => (
                                <option key={year} value={String(year)}>{year}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Priority *</label>
                            <input
                              type="number"
                              min="1"
                              value={programFormData[program._id]?.priority || 1}
                              onChange={(e) => setProgramFormData(prev => ({
                                ...prev,
                                [program._id]: { ...prev[program._id], priority: parseInt(e.target.value) || 1 }
                              }))}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Intake *</label>
                            <select
                              value={programFormData[program._id]?.intake || ''}
                              onChange={(e) => setProgramFormData(prev => ({
                                ...prev,
                                [program._id]: { ...prev[program._id], intake: e.target.value }
                              }))}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            >
                              <option value="">Select Intake</option>
                              {intakeOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApplyProgram(program._id)}
                            disabled={selectingProgram === program._id || !programFormData[program._id]?.year || !programFormData[program._id]?.intake}
                            className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {selectingProgram === program._id ? 'Applying...' : 'Apply'}
                          </button>
                          <button
                            onClick={() => handleCancelSelection(program._id)}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No programs available. Your counselor will add programs for you.</p>
            </div>
          )}
        </div>

      </div>
    );
  }

  if (sectionTitle === 'Applied Program') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Applied Programs</h3>
          {appliedPrograms.length > 0 ? (
            <div className="space-y-4">
              {appliedPrograms.map((program) => (
                <div
                  key={program._id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          Priority: {program.priority}
                        </span>
                        {program.year && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                            Year: {program.year}
                          </span>
                        )}
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          Intake: {program.intake}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{program.programName}</h4>
                      <p className="text-sm text-gray-600 mb-2">{program.university}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Campus:</span> {program.campus}
                        </div>
                        <div>
                          <span className="font-medium">Country:</span> {program.country}
                        </div>
                        <div>
                          <span className="font-medium">Study Level:</span> {program.studyLevel}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {program.duration} months
                        </div>
                        <div>
                          <span className="font-medium">IELTS:</span> {program.ieltsScore}
                        </div>
                        <div>
                          <span className="font-medium">Tuition:</span> £{program.yearlyTuitionFees.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Application Fee:</span> £{program.applicationFee.toLocaleString()}
                        </div>
                        {program.websiteUrl && (
                          <div>
                            <span className="font-medium">Website:</span>{' '}
                            <a href={program.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              View Program
                            </a>
                          </div>
                        )}
                      </div>
                      {program.universityRanking && (
                        <div className="mt-2 flex gap-4 text-xs text-gray-500">
                          {program.universityRanking.webometricsWorld && (
                            <span>Webometrics World: {program.universityRanking.webometricsWorld}</span>
                          )}
                          {program.universityRanking.webometricsNational && (
                            <span>Webometrics National: {program.universityRanking.webometricsNational}</span>
                          )}
                          {program.universityRanking.usNews && (
                            <span>US News: {program.universityRanking.usNews}</span>
                          )}
                          {program.universityRanking.qs && (
                            <span>QS: {program.universityRanking.qs}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No programs applied yet. Select programs from "Apply to Program" section.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

