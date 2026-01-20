'use client';

import { useEffect, useState } from 'react';
import { programAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import axios from 'axios';
import ProgramCard from './ProgramCard';
import ProgramFormModal from './ProgramFormModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  isSelectedByStudent?: boolean;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface ProgramSectionProps {
  sectionTitle: string;
  studentId?: string; // For counselor/admin viewing student programs, or student's own ID
  role: 'STUDENT' | 'COUNSELOR' | 'ADMIN';
  isReadOnly?: boolean; // For special cases where no actions should be available
}

export default function ProgramSection({
  sectionTitle,
  studentId,
  role,
  isReadOnly = false,
}: ProgramSectionProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // For student selection of programs
  const [selectingProgram, setSelectingProgram] = useState<string | null>(null);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [programFormData, setProgramFormData] = useState<{ [key: string]: { year: string; priority: number; intake: string } }>({});
  
  // For admin editing applied programs
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{ [key: string]: { priority: number; intake: string; year: string } }>({});
  const [saving, setSaving] = useState<string | null>(null);

  const intakeOptions = [
    'Spring', 'Summer', 'Fall', 'Winter',
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i);

  useEffect(() => {
    fetchPrograms();
  }, [studentId, sectionTitle, role]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      
      if (isReadOnly) {
        setPrograms([]);
        return;
      }

      const token = localStorage.getItem('token');
      const section = sectionTitle === 'Applied Program' ? 'applied' : 'all';
      
      let response;
      if (role === 'STUDENT') {
        response = await programAPI.getStudentPrograms();
        // Student has separate available and applied programs
        if (sectionTitle === 'Apply to Program') {
          setPrograms(response.data.data.availablePrograms || []);
        } else {
          setPrograms(response.data.data.appliedPrograms || []);
        }
      } else if (role === 'COUNSELOR') {
        response = await axios.get(
          `${API_URL}/programs/counselor/student/${studentId}/programs?section=${section}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPrograms(response.data.data.programs || []);
      } else if (role === 'ADMIN') {
        response = await programAPI.getAdminStudentPrograms(studentId!, section);
        setPrograms(response.data.data.programs || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch programs:', error);
      if (!isReadOnly) {
        toast.error('Failed to load programs');
      }
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const programData = {
        studentId: studentId,
        university: formData.university,
        universityRanking: {
          webometricsWorld: formData.universityRanking.webometricsWorld ? parseInt(formData.universityRanking.webometricsWorld) : undefined,
          webometricsNational: formData.universityRanking.webometricsNational ? parseInt(formData.universityRanking.webometricsNational) : undefined,
          usNews: formData.universityRanking.usNews ? parseInt(formData.universityRanking.usNews) : undefined,
          qs: formData.universityRanking.qs ? parseInt(formData.universityRanking.qs) : undefined,
        },
        programName: formData.programName,
        websiteUrl: formData.websiteUrl,
        campus: formData.campus,
        country: formData.country,
        studyLevel: formData.studyLevel,
        duration: parseInt(formData.duration),
        ieltsScore: parseFloat(formData.ieltsScore),
        applicationFee: parseFloat(formData.applicationFee),
        yearlyTuitionFees: parseFloat(formData.yearlyTuitionFees),
      };

      let endpoint = '';
      if (role === 'STUDENT') {
        endpoint = `${API_URL}/programs/student/programs/create`;
      } else if (role === 'COUNSELOR') {
        endpoint = `${API_URL}/programs/counselor/programs`;
      } else if (role === 'ADMIN') {
        endpoint = `${API_URL}/programs/admin/programs/create`;
      }

      await axios.post(endpoint, programData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Program created successfully');
      setShowAddModal(false);
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create program');
      console.error('Create program error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('studentId', studentId!);

      const endpoint = role === 'COUNSELOR' 
        ? `${API_URL}/programs/counselor/programs/upload-excel`
        : `${API_URL}/programs/admin/programs/upload-excel`;

      const response = await axios.post(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(response.data.message || 'Programs uploaded successfully');
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload Excel file');
      console.error('Excel upload error:', error);
    } finally {
      setSubmitting(false);
      e.target.value = '';
    }
  };

  // Student-specific: Select program to apply
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

  // Admin-specific: Edit applied program details
  const handleEdit = (programId: string, program: Program) => {
    setEditingProgram(programId);
    setEditFormData({
      [programId]: {
        priority: program.priority || 1,
        intake: program.intake || '',
        year: program.year || String(currentYear),
      },
    });
  };

  const handleCancelEdit = (programId: string) => {
    setEditingProgram(null);
    setEditFormData(prev => {
      const newData = { ...prev };
      delete newData[programId];
      return newData;
    });
  };

  const handleSaveEdit = async (programId: string) => {
    const formData = editFormData[programId];
    if (!formData || !formData.year || !formData.intake || !formData.priority) {
      toast.error('Please fill all fields');
      return;
    }

    setSaving(programId);
    try {
      await programAPI.updateProgramSelection(programId, {
        priority: formData.priority,
        intake: formData.intake,
        year: formData.year,
      });
      toast.success('Program updated successfully');
      setEditingProgram(null);
      setEditFormData(prev => {
        const newData = { ...prev };
        delete newData[programId];
        return newData;
      });
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update program');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render for "Apply to Program" section
  if (sectionTitle === 'Apply to Program') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {role === 'STUDENT' ? 'Available Programs' : 'All Programs'}
            </h3>
            {!isReadOnly && (
              <div className="flex gap-3">
                {(role === 'COUNSELOR' || role === 'ADMIN') && (
                  <>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelUpload}
                      disabled={submitting}
                      className="hidden"
                      id="excel-upload-input"
                    />
                    <label
                      htmlFor="excel-upload-input"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Uploading...' : 'Upload Excel'}
                    </label>
                  </>
                )}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  + Add Program
                </button>
              </div>
            )}
          </div>
          
          {programs.length > 0 ? (
            <div className="space-y-4">
              {role === 'STUDENT' ? (
                // Student view with selection UI
                programs.map((program) => (
                  <div
                    key={program._id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{program.programName}</h4>
                        <p className="text-sm text-gray-600 mb-2">{program.university}</p>
                        {program.createdBy?.name && (
                          <p className="text-xs text-blue-600 mb-2">
                            Created by: <span className="font-medium">{program.createdBy.name}</span>
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div><span className="font-medium">Campus:</span> {program.campus}</div>
                          <div><span className="font-medium">Country:</span> {program.country}</div>
                          <div><span className="font-medium">Study Level:</span> {program.studyLevel}</div>
                          <div><span className="font-medium">Duration:</span> {program.duration} months</div>
                          <div><span className="font-medium">IELTS:</span> {program.ieltsScore}</div>
                          <div><span className="font-medium">Tuition:</span> £{program.yearlyTuitionFees.toLocaleString()}</div>
                          <div><span className="font-medium">App Fee:</span> £{program.applicationFee.toLocaleString()}</div>
                          {program.websiteUrl && (
                            <div className="col-span-2">
                              <a href={program.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                View Program →
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      {!expandedPrograms.has(program._id) ? (
                        <button
                          onClick={() => handleSelectProgram(program._id)}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          Select Program
                        </button>
                      ) : (
                        <div className="ml-4 flex flex-col gap-3 min-w-50">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Year *</label>
                            <select
                              value={programFormData[program._id]?.year || ''}
                              onChange={(e) => setProgramFormData(prev => ({
                                ...prev,
                                [program._id]: { ...prev[program._id], year: e.target.value }
                              }))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Year</option>
                              {yearOptions.map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Priority *</label>
                            <input
                              type="number"
                              min="1"
                              value={programFormData[program._id]?.priority || ''}
                              onChange={(e) => setProgramFormData(prev => ({
                                ...prev,
                                [program._id]: { ...prev[program._id], priority: parseInt(e.target.value) || 1 }
                              }))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
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
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Intake</option>
                              {intakeOptions.map(intake => (
                                <option key={intake} value={intake}>{intake}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApplyProgram(program._id)}
                              disabled={selectingProgram === program._id}
                              className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              {selectingProgram === program._id ? 'Applying...' : 'Apply'}
                            </button>
                            <button
                              onClick={() => handleCancelSelection(program._id)}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                // Counselor/Admin view with ProgramCard
                programs.map((program) => (
                  <ProgramCard
                    key={program._id}
                    program={program}
                    showPriority={false}
                    showActions={false}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>
                {role === 'STUDENT' 
                  ? 'No programs available. Your counselor will add programs for you.'
                  : 'No programs added yet. Click "Add Program" to get started.'}
              </p>
            </div>
          )}
        </div>

        <ProgramFormModal
          isOpen={showAddModal && !isReadOnly}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    );
  }

  // Render for "Applied Program" section
  if (sectionTitle === 'Applied Program') {
    return (
      <div className="space-y-4">
        {programs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            <p>
              {role === 'STUDENT' 
                ? 'No programs applied yet. Select programs from "Apply to Program" section.'
                : 'No programs applied yet by the student.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {role === 'ADMIN' ? (
              // Admin view with edit functionality
              programs.map((program) => (
                <div key={program._id}>
                  {editingProgram === program._id ? (
                    <div className="border border-gray-300 rounded-lg p-4 bg-blue-50">
                      <ProgramCard program={program} showPriority={false} showActions={false} />
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                          <select
                            value={editFormData[program._id]?.year || ''}
                            onChange={(e) => setEditFormData(prev => ({
                              ...prev,
                              [program._id]: { ...prev[program._id], year: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {yearOptions.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                          <input
                            type="number"
                            min="1"
                            value={editFormData[program._id]?.priority || ''}
                            onChange={(e) => setEditFormData(prev => ({
                              ...prev,
                              [program._id]: { ...prev[program._id], priority: parseInt(e.target.value) || 1 }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Intake</label>
                          <select
                            value={editFormData[program._id]?.intake || ''}
                            onChange={(e) => setEditFormData(prev => ({
                              ...prev,
                              [program._id]: { ...prev[program._id], intake: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {intakeOptions.map(intake => (
                              <option key={intake} value={intake}>{intake}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => handleSaveEdit(program._id)}
                          disabled={saving === program._id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {saving === program._id ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => handleCancelEdit(program._id)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <ProgramCard program={program} showPriority={true} showActions={false} />
                      {!isReadOnly && (
                        <button
                          onClick={() => handleEdit(program._id, program)}
                          className="absolute top-4 right-4 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Edit Details
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Student/Counselor view
              programs.map((program) => (
                <ProgramCard
                  key={program._id}
                  program={program}
                  showPriority={true}
                  showActions={false}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}
