'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, programAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';
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
  websiteUrl: string;
  campus: string;
  country: string;
  studyLevel: string;
  duration: number;
  ieltsScore: number;
  applicationFee: number;
  yearlyTuitionFees: number;
}

export default function CounselorProgramsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.COUNSELOR) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchPrograms();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await programAPI.getCounselorPrograms();
      setPrograms(response.data.data.programs || []);
    } catch (error: any) {
      toast.error('Failed to fetch programs');
      console.error('Fetch programs error:', error);
    } finally {
      setLoading(false);
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
      const programData: any = {
        university: formData.university,
        universityRanking: {
          webometricsWorld: formData.universityRanking.webometricsWorld ? parseInt(formData.universityRanking.webometricsWorld) : undefined,
          webometricsNational: formData.universityRanking.webometricsNational ? parseInt(formData.universityRanking.webometricsNational) : undefined,
          usNews: formData.universityRanking.usNews ? parseInt(formData.universityRanking.usNews) : undefined,
          qs: formData.universityRanking.qs ? parseInt(formData.universityRanking.qs) : undefined,
        },
        programName: formData.programName,
        websiteUrl: formData.websiteUrl,
        country: formData.country,
        studyLevel: formData.studyLevel,
      };

      // Add optional fields only if they have values
      if (formData.campus) programData.campus = formData.campus;
      if (formData.duration) programData.duration = parseInt(formData.duration);
      if (formData.ieltsScore) programData.ieltsScore = parseFloat(formData.ieltsScore);
      if (formData.applicationFee) programData.applicationFee = parseFloat(formData.applicationFee);
      if (formData.yearlyTuitionFees) programData.yearlyTuitionFees = parseFloat(formData.yearlyTuitionFees);

      await programAPI.createProgram(programData);
      toast.success('Program created successfully');
      setShowAddModal(false);
      resetForm();
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create program');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setSubmitting(true);
    try {
      const response = await programAPI.uploadProgramsExcel(file);
      toast.success(response.data.message || 'Programs uploaded successfully');
      setShowExcelModal(false);
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload Excel file');
      console.error('Excel upload error:', error);
    } finally {
      setSubmitting(false);
      // Reset file input
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Toaster position="top-right" />
      <AdminLayout user={user}>
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Programs</h1>
              <p className="text-gray-600 mt-2">Manage programs for your students</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExcelModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Upload Excel
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Program
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">University</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Program</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Campus</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Country</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Tuition Fees</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">IELTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {programs.map((program) => (
                    <tr key={program._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{program.university}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{program.programName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{program.campus || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{program.country}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{program.yearlyTuitionFees ? `£${program.yearlyTuitionFees.toLocaleString()}` : 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{program.ieltsScore || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {programs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No programs added yet</p>
              </div>
            )}
          </div>
        </div>

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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Campus</label>
                    <input
                      type="text"
                      name="campus"
                      value={formData.campus}
                      onChange={handleInputChange}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (months)</label>
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IELTS Score</label>
                    <input
                      type="number"
                      step="0.5"
                      name="ieltsScore"
                      value={formData.ieltsScore}
                      onChange={handleInputChange}
                      min="0"
                      max="9"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Application Fee (GBP)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="applicationFee"
                      value={formData.applicationFee}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Yearly Tuition Fees (GBP)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="yearlyTuitionFees"
                      value={formData.yearlyTuitionFees}
                      onChange={handleInputChange}
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

        {/* Excel Upload Modal */}
        {showExcelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Excel File</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload an Excel file with program data. Expected columns:
                <br />
                <span className="font-medium">University, Program Name, Website URL, Campus, Country, Study Level, Duration, IELTS Score, Application Fee, Yearly Tuition Fees, Webometrics World, Webometrics National, US News, QS</span>
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {submitting && (
                <div className="mb-4 flex items-center gap-2 text-blue-600">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Uploading...</span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExcelModal(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

