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
  isSelectedByStudent?: boolean;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface CounselorProgramSectionProps {
  studentId: string;
  sectionTitle: string;
}

export default function CounselorProgramSection({
  studentId,
  sectionTitle,
}: CounselorProgramSectionProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, [studentId, sectionTitle]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // For "Applied Program" section, fetch only selected programs
      const section = sectionTitle === 'Applied Program' ? 'applied' : 'all';
      const response = await axios.get(
        `${API_URL}/programs/counselor/student/${studentId}/programs?section=${section}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPrograms(response.data.data.programs || []);
    } catch (error: any) {
      console.error('Failed to fetch programs:', error);
      // If endpoint doesn't exist yet, show empty list
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
        studentId,
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
        `${API_URL}/programs/counselor/programs`,
        programData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Program created successfully');
      setShowAddModal(false);
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
      formData.append('studentId', studentId);

      const response = await axios.post(
        `${API_URL}/programs/counselor/programs/upload-excel`,
        formData,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // For "Applied Program" section, show selected programs with details
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
              <ProgramCard
                key={program._id}
                program={program}
                showPriority={true}
                showActions={false}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // For "Apply to Program" section, show add/edit interface
  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
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
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          Add Program
        </button>
      </div>

      {/* Programs List */}
      {programs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <p>No programs added yet. Click "Add Program" to get started.</p>
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
      <ProgramFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

    </div>
  );
}

