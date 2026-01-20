'use client';

import { useEffect, useState } from 'react';
import { programAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import ProgramCard from './ProgramCard';
import axios from 'axios';

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
  isSelectedByStudent?: boolean;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface AdminAppliedProgramSectionProps {
  studentId: string;
  sectionTitle: string;
}

export default function AdminAppliedProgramSection({
  studentId,
  sectionTitle,
}: AdminAppliedProgramSectionProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{ [key: string]: { priority: number; intake: string; year: string } }>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    university: '',
    universityRanking: {
      webometricsWorld: '',
      webometricsNational: '',
      usNews: '',
      qs: '',
    },
    programName: '',
    websiteUrl: '',
    campus: '',
    country: '',
    studyLevel: '',
    duration: '',
    ieltsScore: '',
    applicationFee: '',
    yearlyTuitionFees: '',
  });

  const intakeOptions = [
    'Spring', 'Summer', 'Fall', 'Winter',
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i);

  useEffect(() => {
    fetchPrograms();
  }, [studentId, sectionTitle]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      // For "Applied Program" section, fetch only selected programs
      const section = sectionTitle === 'Applied Program' ? 'applied' : 'all';
      const response = await programAPI.getAdminStudentPrograms(studentId, section);
      setPrograms(response.data.data.programs || []);
    } catch (error: any) {
      console.error('Failed to fetch programs:', error);
      toast.error('Failed to load programs');
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async (programId: string) => {
    const formData = editFormData[programId];
    if (!formData || !formData.intake || !formData.year || !formData.priority) {
      toast.error('Please fill all fields: Year, Priority, and Intake');
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('ranking.')) {
      const rankingKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        universityRanking: {
          ...prev.universityRanking,
          [rankingKey]: value ? parseInt(value) : undefined,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      await axios.post(
        `${API_URL}/programs/admin/programs/create`,
        programData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Program created successfully');
      setShowAddModal(false);
      resetForm();
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

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      formDataObj.append('studentId', studentId);

      const response = await axios.post(
        `${API_URL}/programs/admin/programs/upload-excel`,
        formDataObj,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
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

  const resetForm = () => {
    setFormData({
      university: '',
      universityRanking: {
        webometricsWorld: '',
        webometricsNational: '',
        usNews: '',
        qs: '',
      },
      programName: '',
      websiteUrl: '',
      campus: '',
      country: '',
      studyLevel: '',
      duration: '',
      ieltsScore: '',
      applicationFee: '',
      yearlyTuitionFees: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // For "Applied Program" section, show selected programs with edit functionality
  if (sectionTitle === 'Applied Program') {
    return (
      <div className="space-y-4">
        {programs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            <p>No programs applied yet by the student.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {programs.map((program) => (
              <div key={program._id}>
                {editingProgram === program._id ? (
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex gap-2 items-center flex-wrap mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Priority *</label>
                        <input
                          type="number"
                          min="1"
                          value={editFormData[program._id]?.priority || 1}
                          onChange={(e) => setEditFormData(prev => ({
                            ...prev,
                            [program._id]: { ...prev[program._id], priority: parseInt(e.target.value) || 1 }
                          }))}
                          className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Intake *</label>
                        <select
                          value={editFormData[program._id]?.intake || ''}
                          onChange={(e) => setEditFormData(prev => ({
                            ...prev,
                            [program._id]: { ...prev[program._id], intake: e.target.value }
                          }))}
                          className="w-32 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        >
                          <option value="">Select Intake</option>
                          {intakeOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Year *</label>
                        <select
                          value={editFormData[program._id]?.year || String(currentYear)}
                          onChange={(e) => setEditFormData(prev => ({
                            ...prev,
                            [program._id]: { ...prev[program._id], year: e.target.value }
                          }))}
                          className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        >
                          {yearOptions.map(year => (
                            <option key={year} value={String(year)}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 items-end">
                        <button
                          onClick={() => handleSave(program._id)}
                          disabled={saving === program._id || !editFormData[program._id]?.intake || !editFormData[program._id]?.year}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving === program._id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => handleCancelEdit(program._id)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    <ProgramCard
                      program={program}
                      showPriority={true}
                      showActions={false}
                    />
                  </div>
                ) : (
                  <ProgramCard
                    program={program}
                    showPriority={true}
                    showActions={true}
                    onEdit={(programId) => handleEdit(programId, program)}
                    editingProgramId={editingProgram}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // For "Apply to Program" section, show available programs (read-only view for admin)
  return (
    <div className="space-y-4">
      {/* Action Buttons for Admin */}
      <div className="flex justify-end gap-3">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleExcelUpload}
          disabled={submitting}
          className="hidden"
          id="admin-excel-upload-input"
        />
        <label
          htmlFor="admin-excel-upload-input"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Uploading...' : 'Upload Excel'}
        </label>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Add Program
        </button>
      </div>
      
      {programs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <p>No programs available for this student. Click "Add Program" to create programs.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => (
            <ProgramCard
              key={program._id}
              program={program}
              showPriority={false}
              showActions={false}
            />
          ))}
        </div>
      )}

      {/* Add Program Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add New Program</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">University *</label>
                  <input
                    type="text"
                    name="university"
                    value={formData.university}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Program Name *</label>
                  <input
                    type="text"
                    name="programName"
                    value={formData.programName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website URL *</label>
                  <input
                    type="url"
                    name="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campus *</label>
                  <input
                    type="text"
                    name="campus"
                    value={formData.campus}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Study Level *</label>
                  <select
                    name="studyLevel"
                    value={formData.studyLevel}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select Level</option>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (months) *</label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IELTS Score *</label>
                  <input
                    type="number"
                    step="0.5"
                    name="ieltsScore"
                    value={formData.ieltsScore}
                    onChange={handleInputChange}
                    required
                    min="0"
                    max="9"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Application Fee (GBP) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="applicationFee"
                    value={formData.applicationFee}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Yearly Tuition Fees (GBP) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="yearlyTuitionFees"
                    value={formData.yearlyTuitionFees}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">University Rankings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Webometrics World</label>
                    <input
                      type="number"
                      name="ranking.webometricsWorld"
                      value={formData.universityRanking.webometricsWorld}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Webometrics National</label>
                    <input
                      type="number"
                      name="ranking.webometricsNational"
                      value={formData.universityRanking.webometricsNational}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">US News</label>
                    <input
                      type="number"
                      name="ranking.usNews"
                      value={formData.universityRanking.usNews}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">QS Ranking</label>
                    <input
                      type="number"
                      name="ranking.qs"
                      value={formData.universityRanking.qs}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Program'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
