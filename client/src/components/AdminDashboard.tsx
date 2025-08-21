import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, DashboardStats } from '../../../server/src/schema';

// Components
import UserManagement from '@/components/admin/UserManagement';
import SiswaManagement from '@/components/admin/SiswaManagement';
import GuruManagement from '@/components/admin/GuruManagement';
import KelasManagement from '@/components/admin/KelasManagement';
import AttendanceReports from '@/components/admin/AttendanceReports';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const dashboardStats = await trpc.dashboard.getStatsAdmin.query();
      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case 'hadir': return 'bg-green-100 text-green-800';
      case 'izin': return 'bg-yellow-100 text-yellow-800';
      case 'sakit': return 'bg-orange-100 text-orange-800';
      case 'alpha': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
      {/* Header */}
      <header className="glass border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sekolah Absenku</h1>
                <p className="text-sm text-gray-600">Admin Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">Selamat datang, Admin!</p>
                <p className="text-xs text-gray-600">{user.username}</p>
              </div>
              <Button
                onClick={onLogout}
                variant="outline"
                className="hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              >
                Keluar 🚪
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <span>📊</span>
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <span>👥</span>
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="siswa" className="flex items-center space-x-2">
              <span>🎒</span>
              <span>Siswa</span>
            </TabsTrigger>
            <TabsTrigger value="guru" className="flex items-center space-x-2">
              <span>👨‍🏫</span>
              <span>Guru</span>
            </TabsTrigger>
            <TabsTrigger value="kelas" className="flex items-center space-x-2">
              <span>🏫</span>
              <span>Kelas</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <span>📈</span>
              <span>Laporan</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Overview */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {isLoading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : stats ? (
                <>
                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Siswa</p>
                          <p className="text-2xl font-bold text-blue-600">{stats.total_siswa}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">🎒</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Guru</p>
                          <p className="text-2xl font-bold text-green-600">{stats.total_guru}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">👨‍🏫</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Kelas</p>
                          <p className="text-2xl font-bold text-purple-600">{stats.total_kelas}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">🏫</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Kehadiran</p>
                          <p className="text-2xl font-bold text-indigo-600">
                            {formatPercentage(stats.persentase_kehadiran)}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">📊</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>

            {/* Today's Attendance Summary */}
            {stats && (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>📅</span>
                    <span>Absensi Hari Ini</span>
                  </CardTitle>
                  <CardDescription>
                    Ringkasan kehadiran siswa untuk hari ini
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <Badge className={`${getAttendanceColor('hadir')} px-3 py-2 text-sm font-semibold`}>
                        Hadir: {stats.absensi_hari_ini.hadir}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <Badge className={`${getAttendanceColor('izin')} px-3 py-2 text-sm font-semibold`}>
                        Izin: {stats.absensi_hari_ini.izin}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <Badge className={`${getAttendanceColor('sakit')} px-3 py-2 text-sm font-semibold`}>
                        Sakit: {stats.absensi_hari_ini.sakit}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <Badge className={`${getAttendanceColor('alpha')} px-3 py-2 text-sm font-semibold`}>
                        Alpha: {stats.absensi_hari_ini.alpha}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <Badge className={`${getAttendanceColor('pending')} px-3 py-2 text-sm font-semibold`}>
                        Pending: {stats.absensi_hari_ini.pending}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          {/* Siswa Management */}
          <TabsContent value="siswa">
            <SiswaManagement />
          </TabsContent>

          {/* Guru Management */}
          <TabsContent value="guru">
            <GuruManagement />
          </TabsContent>

          {/* Kelas Management */}
          <TabsContent value="kelas">
            <KelasManagement />
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports">
            <AttendanceReports />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}