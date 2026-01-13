'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { serviceAPI, formAnswerAPI } from '@/lib/api';
import { FormStructure, StudentServiceRegistration, Service } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import FormSectionRenderer from '@/components/FormSectionRenderer';

function MyDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registrationId = searchParams.get('registrationId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registration, setRegistration] = useState<StudentServiceRegistration | null>(null);
  const [formStructure, setFormStructure] = useState<FormStructure[]>([]);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [formValues, setFormValues] = useState<any>({});
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (!registrationId) {
      toast.error('No registration selected');
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [registrationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch registration details
      const regResponse = await serviceAPI.getRegistrationDetails(registrationId!);
      const reg = regResponse.data.data.registration;
      setRegistration(reg);

      // Fetch form structure
      const serviceId = typeof reg.serviceId === 'object' ? reg.serviceId._id : reg.serviceId;
      const formResponse = await serviceAPI.getServiceForm(serviceId);
      setFormStructure(formResponse.data.data.formStructure);

      // Fetch existing answers from database (for auto-fill)
      const answersResponse = await formAnswerAPI.getFormAnswers(registrationId!);
      const answers = answersResponse.data.data.answers;
      
      // Convert answers to form values structure
      const values: any = {};
      answers.forEach((answer: any) => {
        const partKey = answer.partKey;
        if (!values[partKey]) {
          values[partKey] = {};
        }
        // The answers object contains section-wise data
        values[partKey] = answer.answers;
      });
      setFormValues(values);

    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (
    partKey: string,
    sectionId: string,
    subSectionId: string,
    index: number,
    key: string,
    value: any
  ) => {
    setFormValues((prev: any) => {
      // Deep clone to avoid mutation issues
      const newValues = JSON.parse(JSON.stringify(prev));
      if (!newValues[partKey]) newValues[partKey] = {};
      if (!newValues[partKey][sectionId]) newValues[partKey][sectionId] = {};
      if (!newValues[partKey][sectionId][subSectionId]) {
        newValues[partKey][sectionId][subSectionId] = [{}];
      }
      
      // Ensure the instance exists at the index
      if (!newValues[partKey][sectionId][subSectionId][index]) {
        newValues[partKey][sectionId][subSectionId][index] = {};
      }
      
      // Update the specific field
      newValues[partKey][sectionId][subSectionId][index][key] = value;
      
      // Handle cascading dropdowns - clear dependent fields
      if (key.includes('Country')) {
        // Clear state and city when country changes
        const stateKey = key.replace('Country', 'State');
        const cityKey = key.replace('Country', 'City');
        newValues[partKey][sectionId][subSectionId][index][stateKey] = '';
        newValues[partKey][sectionId][subSectionId][index][cityKey] = '';
      } else if (key.includes('State')) {
        // Clear city when state changes
        const cityKey = key.replace('State', 'City');
        newValues[partKey][sectionId][subSectionId][index][cityKey] = '';
      }
      
      // Handle "Same as Mailing Address" checkbox
      if (key === 'sameAsMailingAddress' && value === true) {
        // Find mailing address subsection
        const mailingSubSection = Object.keys(newValues[partKey][sectionId] || {}).find(
          subSecId => {
            const data = newValues[partKey][sectionId][subSecId]?.[0];
            return data && 'mailingAddress1' in data;
          }
        );
        
        if (mailingSubSection) {
          const mailingData = newValues[partKey][sectionId][mailingSubSection][0];
          // Copy all mailing address fields to permanent address
          newValues[partKey][sectionId][subSectionId][index] = {
            ...newValues[partKey][sectionId][subSectionId][index],
            sameAsMailingAddress: true,
            permanentAddress1: mailingData.mailingAddress1 || '',
            permanentAddress2: mailingData.mailingAddress2 || '',
            permanentCountry: mailingData.mailingCountry || '',
            permanentState: mailingData.mailingState || '',
            permanentCity: mailingData.mailingCity || '',
            permanentPostalCode: mailingData.mailingPostalCode || '',
          };
        }
      }
      
      // Clear permanent address if checkbox is unchecked
      if (key === 'sameAsMailingAddress' && value === false) {
        newValues[partKey][sectionId][subSectionId][index] = {
          ...newValues[partKey][sectionId][subSectionId][index],
          sameAsMailingAddress: false,
        };
      }
      
      return newValues;
    });
  };

  const handleAddInstance = (partKey: string, sectionId: string, subSectionId: string) => {
    setFormValues((prev: any) => {
      // Deep clone to avoid mutation issues
      const newValues = JSON.parse(JSON.stringify(prev));
      if (!newValues[partKey]) newValues[partKey] = {};
      if (!newValues[partKey][sectionId]) newValues[partKey][sectionId] = {};
      if (!newValues[partKey][sectionId][subSectionId]) {
        newValues[partKey][sectionId][subSectionId] = [];
      }
      // Add exactly one new empty instance
      newValues[partKey][sectionId][subSectionId].push({});
      return newValues;
    });
  };

  const handleRemoveInstance = (
    partKey: string,
    sectionId: string,
    subSectionId: string,
    index: number
  ) => {
    setFormValues((prev: any) => {
      // Deep clone to avoid mutation issues
      const newValues = JSON.parse(JSON.stringify(prev));
      if (newValues[partKey]?.[sectionId]?.[subSectionId]) {
        // Remove only the specified index
        const instances = newValues[partKey][sectionId][subSectionId];
        newValues[partKey][sectionId][subSectionId] = instances.filter((_: any, i: number) => i !== index);
      }
      return newValues;
    });
  };

  const validateSection = (partKey: string, sectionId: string): boolean => {
    const currentPart = formStructure[selectedPartIndex];
    const section = currentPart.sections[selectedSectionIndex];
    const sectionValues = formValues[partKey]?.[sectionId] || {};
    
    const newErrors: any = {};
    let hasErrors = false;

    // Validate each subsection
    section.subSections.forEach((subSection) => {
      const subSectionValues = sectionValues[subSection._id] || [{}];
      
      subSectionValues.forEach((instanceValues: any, index: number) => {
        subSection.fields.forEach((field) => {
          if (field.required) {
            const value = instanceValues?.[field.key];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              if (!newErrors[subSection._id]) newErrors[subSection._id] = [];
              if (!newErrors[subSection._id][index]) newErrors[subSection._id][index] = {};
              newErrors[subSection._id][index][field.key] = `${field.label} is required`;
              hasErrors = true;
            }
          }
        });
      });
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleSaveSection = async () => {
    try {
      const currentPart = formStructure[selectedPartIndex];
      const section = currentPart.sections[selectedSectionIndex];
      const partKey = currentPart.part.key;
      const sectionId = section._id;

      // Validate before saving
      if (!validateSection(partKey, sectionId)) {
        toast.error('Please fill all required fields');
        return;
      }

      setSaving(true);
      
      // Get ONLY current section answers
      const sectionAnswers = formValues[partKey]?.[sectionId] || {};
      
      // Get existing part answers from database to merge with
      const existingAnswersResponse = await formAnswerAPI.getFormAnswers(registrationId!, partKey);
      const existingAnswers = existingAnswersResponse.data.data.answers;
      
      // Merge: keep all existing answers and update only current section
      let allPartAnswers = {};
      if (existingAnswers && existingAnswers.length > 0) {
        allPartAnswers = { ...existingAnswers[0].answers };
      }
      allPartAnswers = { ...allPartAnswers, [sectionId]: sectionAnswers };
      
      await formAnswerAPI.saveFormAnswers({
        registrationId: registrationId!,
        partKey,
        answers: allPartAnswers,
        completed: false,
      });

      toast.success('Saved successfully!');
      setErrors({});
      
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!registration || formStructure.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No form data available</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentPart = formStructure[selectedPartIndex];
  const currentSection = currentPart.sections.sort((a, b) => a.order - b.order)[selectedSectionIndex];
  const service = typeof registration.serviceId === 'object' 
    ? registration.serviceId 
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-2 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {service?.name || 'Service'} - My Details
              </h1>
              <p className="text-gray-600 mt-1 text-sm">
                Status: <span className="font-semibold text-blue-600">{registration.status}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Part Navigation (Horizontal Tabs) - Modern Pills */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {formStructure.map((part, index) => (
              <button
                key={part.part._id}
                onClick={() => {
                  setSelectedPartIndex(index);
                  setSelectedSectionIndex(0);
                }}
                className={`px-5 py-2.5 rounded-full font-semibold transition-all whitespace-nowrap text-sm ${
                  selectedPartIndex === index
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {part.part.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section Navigation (Horizontal Tabs) - Segmented Control Style */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="inline-flex bg-white rounded-lg p-1 border border-gray-200 overflow-x-auto">
            {currentPart.sections
              .sort((a, b) => a.order - b.order)
              .map((section, index) => (
                <button
                  key={section._id}
                  onClick={() => setSelectedSectionIndex(index)}
                  className={`px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap text-sm ${
                    selectedSectionIndex === index
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {section.title}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Form Content - Single Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-5">
          {currentSection && (
            <div>
              <FormSectionRenderer
                section={currentSection}
                values={formValues[currentPart.part.key]?.[currentSection._id] || {}}
                onChange={(subSectionId, index, key, value) =>
                  handleFieldChange(currentPart.part.key, currentSection._id, subSectionId, index, key, value)
                }
                onAddInstance={(subSectionId) =>
                  handleAddInstance(currentPart.part.key, currentSection._id, subSectionId)
                }
                onRemoveInstance={(subSectionId, index) =>
                  handleRemoveInstance(currentPart.part.key, currentSection._id, subSectionId, index)
                }
                errors={errors}
              />
              
              {/* Save Button */}
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={handleSaveSection}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <MyDetailsContent />
    </Suspense>
  );
}

