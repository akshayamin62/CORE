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
  counselorId?: {
    _id: string;
    email: string;
    userId?: {
      name: string;
      email: string;
    };
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
      {programs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <p>No programs available for this student. Programs can be added by assigned counselors.</p>
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
    </div>
  );
}
