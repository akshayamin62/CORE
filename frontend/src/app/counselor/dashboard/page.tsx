'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, leadAPI } from '@/lib/api';
import { User, USER_ROLE, LEAD_STAGE } from '@/types';
import CounselorLayout from '@/components/CounselorLayout';
import toast, { Toaster } from 'react-hot-toast';

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  convertedLeads: number;
  adminEnquiryUrl: string;
}

export default function CounselorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.COUNSELOR) {
        toast.error('Access denied. Counselor only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStats();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [leadsResponse, urlResponse] = await Promise.all([
        leadAPI.getCounselorLeads({}),
        leadAPI.getCounselorEnquiryFormUrl(),
      ]);
      
      const leads = leadsResponse.data.data.leads;
      const slug = urlResponse.data.data.slug;
      
      // Construct full URL from slug
      const enquiryUrl = slug ? `${window.location.origin}/inquiry/${slug}` : '';

      setStats({
        totalLeads: leads.length,
        newLeads: leads.filter((l: any) => l.stage === LEAD_STAGE.NEW).length,
        hotLeads: leads.filter((l: any) => l.stage === LEAD_STAGE.HOT).length,
        warmLeads: leads.filter((l: any) => l.stage === LEAD_STAGE.WARM).length,
        coldLeads: leads.filter((l: any) => l.stage === LEAD_STAGE.COLD).length,
        convertedLeads: leads.filter((l: any) => l.stage === LEAD_STAGE.CONVERTED).length,
        adminEnquiryUrl: enquiryUrl,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch dashboard stats');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy URL');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <CounselorLayout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Counselor Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Welcome back, {user.name}! Here's your overview
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <StatCard
              title="Total Leads"
              value={stats?.totalLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              color="blue"
            />
            <StatCard
              title="New"
              value={stats?.newLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
              color="blue"
            />
            <StatCard
              title="Hot"
              value={stats?.hotLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              }
              color="yellow"
            />
            <StatCard
              title="Warm"
              value={stats?.warmLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              }
              color="purple"
            />
            <StatCard
              title="Cold"
              value={stats?.coldLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              }
              color="blue"
            />
            <StatCard
              title="Converted"
              value={stats?.convertedLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="green"
            />
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ActionCard
                title="View My Leads"
                description="See all leads assigned to you"
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                buttonText="View Leads"
                onClick={() => router.push('/counselor/leads')}
                color="blue"
              />
              
              {/* Enquiry Form URL Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 group hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Enquiry Form URL</h3>
                    <p className="text-sm text-gray-500">Share to collect leads</p>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 mb-3">
                  <code className="text-xs text-green-700 font-mono break-all">
                    {stats?.adminEnquiryUrl || 'Loading...'}
                  </code>
                </div>
                <button
                  onClick={() => stats?.adminEnquiryUrl && copyToClipboard(stats.adminEnquiryUrl)}
                  className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        </div>
      </CounselorLayout>
    </>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
  );
}

// Action Card Component
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  onClick: () => void;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function ActionCard({ title, description, icon, buttonText, onClick, color }: ActionCardProps) {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600 mb-4">{description}</p>
          <button
            onClick={onClick}
            className={`px-4 py-2 ${colorClasses[color]} text-white rounded-lg font-medium transition-colors`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
