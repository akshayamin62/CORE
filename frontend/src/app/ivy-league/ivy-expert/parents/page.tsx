'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parentAPI } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';
import ListPageFilters from '@/components/ListPageFilters';
import ParentMobileList from '@/components/ParentMobileList';
import PageStatCard from '@/components/PageStatCard';
import {
  roleListTitleClass,
  roleListSubtitleClass,
  roleListSingleStatGridClass,
} from '@/components/studentDetailResponsive';

interface ParentData {
  _id: string;
  userId: { _id: string; firstName?: string; middleName?: string; lastName?: string; email: string; profilePicture?: string; isActive: boolean; createdAt: string };
  studentIds: { _id: string; userId: { _id: string; firstName?: string; middleName?: string; lastName?: string; email: string } }[];
  email: string;
  relationship: string;
  mobileNumber: string;
}

export default function IvyExpertParentsPage() {
  const router = useRouter();
  const [parents, setParents] = useState<ParentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchParents();
  }, []);

  const fetchParents = async () => {
    try {
      const response = await parentAPI.getMyParents();
      setParents(response.data.data.parents);
    } catch { toast.error('Failed to fetch parents'); } finally { setLoading(false); }
  };

  const filteredParents = parents.filter((p) => {
    if (p.userId?.isActive === false) return false;
    const q = searchQuery.toLowerCase();
    const name = getFullName(p.userId).toLowerCase();
    return name.includes(q) || p.userId.email.toLowerCase().includes(q) || p.mobileNumber?.includes(q);
  });

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" />
      <div className="p-4 pb-24 sm:p-6 md:p-8 md:pb-8">
        <div className="mb-4 sm:mb-6">
          <h1 className={roleListTitleClass}>Parents</h1>
          <p className={roleListSubtitleClass}>View parents of your students</p>
        </div>

        <div className={roleListSingleStatGridClass}>
          <PageStatCard compact title="Total Parents" mobileTitle="Total" value={parents.length} color="purple" />
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
            <ListPageFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by name, email, or mobile..."
              onClear={() => setSearchQuery('')}
            />
          </div>
          <ParentMobileList
            parents={filteredParents}
            getMenuItems={(p) => [
              { label: 'View Detail', onClick: () => router.push(`/ivy-league/ivy-expert/parents/${p._id}`) },
            ]}
          />
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Parent</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Mobile</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Students</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredParents.length > 0 ? filteredParents.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <AuthImage
                          path={p.userId.profilePicture}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover mr-3"
                          fallback={
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-purple-600 font-semibold text-sm">{getInitials(p.userId)}</span>
                            </div>
                          }
                        />
                        <div>
                          <div className="font-medium text-gray-900">{getFullName(p.userId)}</div>
                          <div className="text-sm text-gray-500">{p.relationship}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.userId.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.mobileNumber || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {p.studentIds.map((s: any) => (
                          <span key={s._id} className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">{getFullName(s.userId)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${p.userId.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {p.userId.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => router.push(`/ivy-league/ivy-expert/parents/${p._id}`)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs">View Detail</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-6 py-12 text-center">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <p className="text-lg font-medium text-gray-900 mb-1">No parents found</p>
                    <p className="text-sm text-gray-500">{searchQuery ? 'Try adjusting your search' : 'Parents will appear here once students are linked.'}</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
