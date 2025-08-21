import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, DashboardStats } from '../../../server/src/schema';

// Components
import StudentAttendance from '@/components/guru/StudentAttendance';
import AttendanceVerification from '@/components/guru/AttendanceVerification';
import ClassReports from '@/components/guru/ClassReports';
import TeacherProfile from '@/components/guru/TeacherProfile';

interface GuruDashboardProps {
  user: User & { profile?: any };
  onLogout: () => void;
}

export default function GuruDashboard({ user, onLogout }: GuruDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      if (user.profile?.id) {
        const dashboardStats = await trpc.dashboard.getStatsGuru.query({ guruId: user.profile.id });
        setStats(dashboardStats);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="glass border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sekolah Absenku</h1>
                <p className="text-sm text-gray-600">Portal Guru</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  Selamat datang, {user.profile?.nama || 'Guru'}! 👨‍🏫
                </p>
                <p className="text-xs text-gray-600">NIP: {user.username}</p>
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
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <span>📊</span>
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center space-x-2">
              <span>✍️</span>
              <span>Absensi</span>
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center space-x-2">
              <span>✅</span>
              <span>Verifikasi</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <span>📈</span>
              <span>Laporan</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <span>👤</span>
              <span>Profil</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Overview */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                <>
                  {[...Array(3)].map((_, i) => (
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
                          <p className="text-sm font-medium text-gray-600">Kelas Diampu</p>
                          <p className="text-2xl font-bold text-blue-600">{stats.total_kelas || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">🏫</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Siswa</p>
                          <p className="text-2xl font-bold text-green-600">{stats.total_siswa || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">🎒</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Pending Izin</p>
                          <p className="text-2xl font-bold text-orange-600">{stats.pending_izin || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">⏳</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>

            {/* Quick Actions */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>⚡</span>
                  <span>Aksi Cepat</span>
                </CardTitle>
                <CardDescription>
                  Fitur yang sering digunakan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => setActiveTab('attendance')}
                    className="h-20 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 flex flex-col items-center space-y-2"
                  >
                    <span className="text-xl">✍️</span>
                    <span>Input Absensi</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setActiveTab('verification')}
                    variant="outline"
                    className="h-20 border-2 border-orange-200 hover:bg-orange-50 flex flex-col items-center space-y-2"
                  >
                    <span className="text-xl">✅</span>
                    <span>Verifikasi Izin</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setActiveTab('reports')}
                    variant="outline"
                    className="h-20 border-2 border-green-200 hover:bg-green-50 flex flex-col items-center space-y-2"
                  >
                    <span className="text-xl">📈</span>
                    <span>Lihat Laporan</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Today's Summary */}
            {stats?.absensi_hari_ini && (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>📅</span>
                    <span>Rangkuman Hari Ini</span>
                  </CardTitle>
                  <CardDescription>
                    Status absensi siswa untuk hari ini
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <Badge className="bg-green-100 text-green-800 px-3 py-2 text-sm font-semibold">
                        ✅ Hadir: {stats.absensi_hari_ini.hadir}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <Badge className="bg-yellow-100 text-yellow-800 px-3 py-2 text-sm font-semibold">
                        📝 Izin: {stats.absensi_hari_ini.izin}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <Badge className="bg-orange-100 text-orange-800 px-3 py-2 text-sm font-semibold">
                        🤒 Sakit: {stats.absensi_hari_ini.sakit}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <Badge className="bg-red-100 text-red-800 px-3 py-2 text-sm font-semibold">
                        ❌ Alpha: {stats.absensi_hari_ini.alpha}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <Badge className="bg-gray-100 text-gray-800 px-3 py-2 text-sm font-semibold">
                        ⏳ Pending: {stats.absensi_hari_ini.pending}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Student Attendance */}
          <TabsContent value="attendance">
            <StudentAttendance guruId={user.profile?.id} />
          </TabsContent>

          {/* Attendance Verification */}
          <TabsContent value="verification">
            <AttendanceVerification guruId={user.profile?.id} />
          </TabsContent>

          {/* Class Reports */}
          <TabsContent value="reports">
            <ClassReports guruId={user.profile?.id} />
          </TabsContent>

          {/* Teacher Profile */}
          <TabsContent value="profile">
            <TeacherProfile user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}