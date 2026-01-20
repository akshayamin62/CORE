'use client';

import { useEffect, useState } from 'react';
import { programAPI } from '@/lib/api';
import toast from 'react-hot-toast';
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
  selectedAt?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
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
        studentId: registrationId,
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
        `${API_URL}/programs/student/programs/create`,
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
        <div className="spinner mx-auto"></div>
      </div>
    );
  }

  if (sectionTitle === 'Apply to Program') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Available Programs</h3>
            {!isReadOnly && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                + Add Program
              </button>
            )}
          </div>
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
                      {program.createdBy?.name && (
                        <p className="text-xs text-blue-600 mb-2">
                          Created by: <span className="font-medium">{program.createdBy.name}</span>
                        </p>
                      )}
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

        {/* Add Program Modal */}
        {showAddModal && !isReadOnly && (
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
                      {program.createdBy?.name && (
                        <p className="text-xs text-blue-600 mb-2">
                          Created by: <span className="font-medium">{program.createdBy.name}</span>
                        </p>
                      )}
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

