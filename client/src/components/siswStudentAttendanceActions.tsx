import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';

interface StudentAttendanceActionsProps {
  siswaId: number;
  kelasId: number;
  onAttendanceSuccess: () => void;
}

export default function StudentAttendanceActions({ 
  siswaId, 
  kelasId, 
  onAttendanceSuccess 
}: StudentAttendanceActionsProps) {
  const [currentAttendance, setCurrentAttendance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    checkTodayAttendance();
  }, [siswaId]);

  const checkTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceData = await trpc.absensi.getBySiswa.query({ 
        siswaId, 
        limit: 1 
      });
      
      // Check if there's attendance for today
      const todayAttendance = attendanceData.find((record: any) => {
        const recordDate = new Date(record.tanggal).toISOString().split('T')[0];
        return recordDate === today;
      });
      
      setCurrentAttendance(todayAttendance || null);
    } catch (error) {
      console.error('Failed to check today attendance:', error);
    }
  };

  const handleAbsenMasuk = async () => {
    if (currentAttendance) {
      alert('Anda sudah absen hari ini!');
      return;
    }

    setIsLoading(true);
    try {
      await trpc.absensi.absenMasuk.mutate({
        siswa_id: siswaId,
        kelas_id: kelasId
      });
      
      alert('Absen masuk berhasil! 🎉');
      await checkTodayAttendance();
      onAttendanceSuccess();
    } catch (error: any) {
      console.error('Failed to absen masuk:', error);
      alert(error.message || 'Gagal absen masuk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbsenPulang = async () => {
    if (!currentAttendance) {
      alert('Anda belum absen masuk hari ini!');
      return;
    }

    if (currentAttendance.waktu_pulang) {
      alert('Anda sudah absen pulang hari ini!');
      return;
    }

    setIsLoading(true);
    try {
      await trpc.absensi.absenPulang.mutate({
        absensi_id: currentAttendance.id
      });
      
      alert('Absen pulang berhasil! 👋');
      await checkTodayAttendance();
      onAttendanceSuccess();
    } catch (error: any) {
      console.error('Failed to absen pulang:', error);
      alert(error.message || 'Gagal absen pulang');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentTime = () => {
    setLastUpdated(new Date());
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jakarta'
    }).format(lastUpdated);
  };

  const getCurrentDate = () => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Jakarta'
    }).format(new Date());
  };

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Current Time Display */}
      <Card className="glass card-hover border-2 border-blue-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl font-mono font-bold text-blue-600 mb-2">
            {getCurrentTime()}
          </div>
          <p className="text-gray-600">{getCurrentDate()}</p>
          <div className="mt-4 text-sm text-gray-500">
            Zona Waktu: Asia/Jakarta (WIB)
          </div>
        </CardContent>
      </Card>

      {/* Attendance Status */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📊</span>
            <span>Status Absensi Hari Ini</span>
          </CardTitle>
          <CardDescription>
            Pantau status kehadiran Anda untuk hari ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentAttendance ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600">✅</span>
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">Sudah Absen</p>
                    <p className="text-sm text-green-600">
                      Masuk: {currentAttendance.waktu_masuk || 'Belum tercatat'}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {currentAttendance.status.toUpperCase()}
                </Badge>
              </div>

              {currentAttendance.waktu_pulang ? (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600">👋</span>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-800">Sudah Absen Pulang</p>
                      <p className="text-sm text-blue-600">
                        Pulang: {currentAttendance.waktu_pulang}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">SELESAI</Badge>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Jangan lupa absen pulang!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="font-semibold text-yellow-800 mb-2">Belum Absen Hari Ini</h3>
              <p className="text-yellow-600">
                Silakan lakukan absen masuk terlebih dahulu
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Absen Masuk */}
        <Card className="card-hover">
          <CardHeader className="text-center">
            <div className="text-4xl mb-2">🚀</div>
            <CardTitle className="text-green-600">Absen Masuk</CardTitle>
            <CardDescription>
              Catat kehadiran Anda untuk hari ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleAbsenMasuk}
              disabled={isLoading || currentAttendance}
              className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Memproses...</span>
                </div>
              ) : currentAttendance ? (
                <div className="flex items-center space-x-2">
                  <span>✅</span>
                  <span>Sudah Absen</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>🚀</span>
                  <span>Absen Masuk Sekarang</span>
                </div>
              )}
            </Button>
            
            {currentAttendance && (
              <p className="text-center text-sm text-green-600 mt-2">
                Absen masuk: {currentAttendance.waktu_masuk}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Absen Pulang */}
        <Card className="card-hover">
          <CardHeader className="text-center">
            <div className="text-4xl mb-2">👋</div>
            <CardTitle className="text-blue-600">Absen Pulang</CardTitle>
            <CardDescription>
              Catat waktu pulang Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleAbsenPulang}
              disabled={isLoading || !currentAttendance || currentAttendance?.waktu_pulang}
              variant="outline"
              className="w-full h-12 border-2 border-blue-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Memproses...</span>
                </div>
              ) : !currentAttendance ? (
                <div className="flex items-center space-x-2">
                  <span>⚠️</span>
                  <span>Absen Masuk Dulu</span>
                </div>
              ) : currentAttendance.waktu_pulang ? (
                <div className="flex items-center space-x-2">
                  <span>✅</span>
                  <span>Sudah Absen Pulang</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>👋</span>
                  <span>Absen Pulang</span>
                </div>
              )}
            </Button>
            
            {currentAttendance?.waktu_pulang && (
              <p className="text-center text-sm text-blue-600 mt-2">
                Absen pulang: {currentAttendance.waktu_pulang}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}