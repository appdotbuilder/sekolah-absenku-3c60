import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, DashboardStats } from '../../../server/src/schema';

// Components
import StudentAttendanceActions from '@/components/siswa/StudentAttendanceActions';
import AttendanceHistory from '@/components/siswa/AttendanceHistory';
import AttendanceCalendar from '@/components/siswa/AttendanceCalendar';
import IzinSakitForm from '@/components/siswa/IzinSakitForm';
import StudentProfile from '@/components/siswa/StudentProfile';

interface SiswaDashboardProps {
  user: User & { profile?: any };
  onLogout: () => void;
}

export default function SiswaDashboard({ user, onLogout }: SiswaDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      if (user.profile?.id) {
        const dashboardStats = await trpc.dashboard.getStatsSiswa.query({ siswaId: user.profile.id });
        setStats(dashboardStats);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentTime = () => {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date());
  };

  const getCurrentDate = () => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="glass border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sekolah Absenku</h1>
                <p className="text-sm text-gray-600">Portal Siswa</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  Hai, {user.profile?.nama || 'Siswa'}! 🎒
                </p>
                <p className="text-xs text-gray-600">NISN: {user.username}</p>
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
              <span>🏠</span>
              <span>Home</span>
            </TabsTrigger>
            <TabsTrigger value="absensi" className="flex items-center space-x-2">
              <span>✋</span>
              <span>Absensi</span>
            </TabsTrigger>
            <TabsTrigger value="riwayat" className="flex items-center space-x-2">
              <span>📜</span>
              <span>Riwayat</span>
            </TabsTrigger>
            <TabsTrigger value="kalender" className="flex items-center space-x-2">
              <span>📅</span>
              <span>Kalender</span>
            </TabsTrigger>
            <TabsTrigger value="profil" className="flex items-center space-x-2">
              <span>👤</span>
              <span>Profil</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Overview */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Welcome Card with Time */}
            <Card className="glass card-hover">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-4xl mb-4 animate-float">🎓</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Selamat datang, {user.profile?.nama || 'Siswa'}!
                  </h2>
                  <p className="text-gray-600 mb-4">{getCurrentDate()}</p>
                  <div className="text-3xl font-mono font-bold text-blue-600">
                    {getCurrentTime()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
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
                          <p className="text-sm font-medium text-gray-600">Total Hadir</p>
                          <p className="text-2xl font-bold text-green-600">{stats.total_hadir || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">✅</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Izin</p>
                          <p className="text-2xl font-bold text-yellow-600">{stats.total_izin || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">📝</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Sakit</p>
                          <p className="text-2xl font-bold text-orange-600">{stats.total_sakit || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">🤒</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Alpha</p>
                          <p className="text-2xl font-bold text-red-600">{stats.total_alpha || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">❌</span>
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
                  <span>Menu Utama</span>
                </CardTitle>
                <CardDescription>
                  Akses fitur absensi dengan cepat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    onClick={() => setActiveTab('absensi')}
                    className="h-24 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 flex flex-col items-center space-y-2"
                  >
                    <span className="text-2xl">✋</span>
                    <span className="font-semibold">Absen Masuk</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setActiveTab('riwayat')}
                    variant="outline"
                    className="h-24 border-2 border-blue-200 hover:bg-blue-50 flex flex-col items-center space-y-2"
                  >
                    <span className="text-2xl">📜</span>
                    <span className="font-semibold">Lihat Riwayat</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setActiveTab('kalender')}
                    variant="outline"
                    className="h-24 border-2 border-purple-200 hover:bg-purple-50 flex flex-col items-center space-y-2"
                  >
                    <span className="text-2xl">📅</span>
                    <span className="font-semibold">Kalender</span>
                  </Button>

                  <Button 
                    onClick={() => setActiveTab('profil')}
                    variant="outline"
                    className="h-24 border-2 border-indigo-200 hover:bg-indigo-50 flex flex-col items-center space-y-2"
                  >
                    <span className="text-2xl">👤</span>
                    <span className="font-semibold">Profil Saya</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Today's Status */}
            {stats?.status_hari_ini && (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>📊</span>
                    <span>Status Hari Ini</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    {stats.status_hari_ini === 'hadir' && (
                      <Badge className="bg-green-100 text-green-800 px-4 py-2 text-lg">
                        ✅ Sudah Absen Hari Ini
                      </Badge>
                    )}
                    {stats.status_hari_ini === 'belum_absen' && (
                      <Badge className="bg-yellow-100 text-yellow-800 px-4 py-2 text-lg">
                        ⏰ Belum Absen Hari Ini
                      </Badge>
                    )}
                    {stats.status_hari_ini === 'izin' && (
                      <Badge className="bg-blue-100 text-blue-800 px-4 py-2 text-lg">
                        📝 Izin Hari Ini
                      </Badge>
                    )}
                    {stats.status_hari_ini === 'sakit' && (
                      <Badge className="bg-orange-100 text-orange-800 px-4 py-2 text-lg">
                        🤒 Sakit Hari Ini
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Attendance Actions */}
          <TabsContent value="absensi">
            <div className="space-y-6">
              <StudentAttendanceActions 
                siswaId={user.profile?.id} 
                kelasId={user.profile?.kelas_id} 
                onAttendanceSuccess={() => loadDashboardStats()}
              />
              <IzinSakitForm 
                siswaId={user.profile?.id} 
                kelasId={user.profile?.kelas_id} 
                onSubmitSuccess={() => loadDashboardStats()}
              />
            </div>
          </TabsContent>

          {/* Attendance History */}
          <TabsContent value="riwayat">
            <AttendanceHistory siswaId={user.profile?.id} />
          </TabsContent>

          {/* Attendance Calendar */}
          <TabsContent value="kalender">
            <AttendanceCalendar siswaId={user.profile?.id} />
          </TabsContent>

          {/* Student Profile */}
          <TabsContent value="profil">
            <StudentProfile user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}