'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI, serviceAPI } from '@/lib/api';
import { Service, StudentServiceRegistration, User, USER_ROLE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import ServiceCard from '@/components/ServiceCard';

export default function Home() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [registrations, setRegistrations] = useState<StudentServiceRegistration[]>([]);
  const [registeringServiceId, setRegisteringServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuth();
    fetchServices();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await authAPI.getProfile();
        setUser(response.data.data.user);
        setIsLoggedIn(true);
        // Only fetch registrations for students
        if (response.data.data.user.role === USER_ROLE.STUDENT) {
          fetchMyServices();
        }
      }
    } catch (error) {
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await serviceAPI.getAllServices();
      setServices(response.data.data.services);
    } catch (error: any) {
      console.warn('Failed to fetch services:', error);
      if ((error as any).isNetworkError) {
        toast.error('Cannot connect to server. Please ensure the backend is running.');
      } else if ((error as any).isTimeout) {
        toast.error('Server request timeout. Please try again.');
      } else {
        toast.error('Failed to load services. Please try again later.');
      }
    }
  };

  const fetchMyServices = async () => {
    try {
      const response = await serviceAPI.getMyServices();
      setRegistrations(response.data.data.registrations);
    } catch (error: any) {
      console.warn('Failed to fetch my services:', error);
      if ((error as any).isNetworkError) {
        toast.error('Cannot connect to server. Please ensure the backend is running.');
      } else if ((error as any).isTimeout) {
        toast.error('Server request timeout. Please try again.');
      }
    }
  };

  const isRegistered = (serviceId: string) => {
    return registrations.some((r: any) => {
      if (!r.serviceId) return false;
      const id = typeof r.serviceId === 'object' ? r.serviceId._id : r.serviceId;
      return id === serviceId;
    });
  };

  const handleRegister = async (serviceId: string) => {
    if (!isLoggedIn) {
      toast.error('Please login to register for services');
      router.push('/login');
      return;
    }

    // Only students can register
    if (user?.role !== USER_ROLE.STUDENT) {
      toast.error('Only students can register for services');
      return;
    }

    setRegisteringServiceId(serviceId);
    try {
      await serviceAPI.registerForService(serviceId);
      toast.success('Successfully registered for service!');
      fetchMyServices();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to register';
      toast.error(message);
    } finally {
      setRegisteringServiceId(null);
    }
  };

  const handleViewDetails = (serviceId: string) => {
    const registration = registrations.find((r: any) => {
      if (!r.serviceId) return false;
      const id = typeof r.serviceId === 'object' ? r.serviceId._id : r.serviceId;
      return id === serviceId;
    });

    if (registration) {
      router.push(`/my-details?registrationId=${registration._id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our comprehensive range of services designed to help you achieve your goals.
              {!isLoggedIn && ' Sign in to register and get started.'}
            </p>
            {!isLoggedIn && (
              <div className="mt-6 flex gap-4 justify-center">
                <Link
                  href="/signup"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Loading services...</p>
          </div>
        ) : services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              // Show register button only for students
              const canRegister = user?.role === USER_ROLE.STUDENT;
              const showRegisterButton = isLoggedIn && canRegister;
              
              return (
                <ServiceCard
                  key={service._id}
                  service={service}
                  isRegistered={isRegistered(service._id)}
                  onRegister={showRegisterButton ? handleRegister : undefined}
                  onViewDetails={isRegistered(service._id) ? handleViewDetails : undefined}
                  loading={registeringServiceId === service._id}
                  showLearnMore={!showRegisterButton || !isRegistered(service._id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Services Available</h3>
            <p className="text-gray-600">Check back later for new services.</p>
          </div>
        )}
      </div>
    </div>
  );
}
