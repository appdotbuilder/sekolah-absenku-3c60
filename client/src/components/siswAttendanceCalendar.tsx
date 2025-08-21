import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { trpc } from '@/utils/trpc';

interface AttendanceCalendarProps {
  siswaId: number;
}

interface AttendanceRecord {
  id: number;
  tanggal: Date | string;
  status: string;
  waktu_masuk: string | null;
  waktu_pulang: string | null;
  keterangan: string | null;
}

export default function AttendanceCalendar({ siswaId }: AttendanceCalendarProps) {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAttendanceData();
  }, [siswaId, currentMonth]);

  const loadAttendanceData = async () => {
    try {
      setIsLoading(true);
      
      // Get start and end of current month
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const data = await trpc.absensi.getByFilter.query({
        siswa_id: siswaId,
        tanggal_mulai: startOfMonth,
        tanggal_selesai: endOfMonth
      });
      
      setAttendanceData(data);
    } catch (error) {
      console.error('Failed to load attendance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAttendanceForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return attendanceData.find((record: AttendanceRecord) => {
      const recordDate = new Date(record.tanggal).toISOString().split('T')[0];
      return recordDate === dateStr;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hadir': return 'bg-green-500';
      case 'izin': return 'bg-yellow-500';
      case 'sakit': return 'bg-orange-500';
      case 'alpha': return 'bg-red-500';
      case 'pending': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hadir': return '✅';
      case 'izin': return '📝';
      case 'sakit': return '🤒';
      case 'alpha': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const selectedDateRecord = selectedDate ? getAttendanceForDate(selectedDate) : null;

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Custom day content to show attendance status
  const renderDay = (date: Date) => {
    const attendance = getAttendanceForDate(date);
    const isToday = new Date().toDateString() === date.toDateString();
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span className={isToday ? 'font-bold text-blue-600' : ''}>
          {date.getDate()}
        </span>
        {attendance && (
          <div 
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(attendance.status)}`}
            title={attendance.status}
          />
        )}
      </div>
    );
  };

  const calculateMonthlyStats = () => {
    const stats = {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0,
      pending: 0,
      total: attendanceData.length
    };

    attendanceData.forEach((record: AttendanceRecord) => {
      stats[record.status as keyof typeof stats]++;
    });

    return stats;
  };

  const stats = calculateMonthlyStats();

  return (
    <div className="space-y-6">
      {/* Monthly Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-green-600">{stats.hadir}</div>
            <div className="text-xs text-gray-600">✅ Hadir</div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-yellow-600">{stats.izin}</div>
            <div className="text-xs text-gray-600">📝 Izin</div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-orange-600">{stats.sakit}</div>
            <div className="text-xs text-gray-600">🤒 Sakit</div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-red-600">{stats.alpha}</div>
            <div className="text-xs text-gray-600">❌ Alpha</div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-gray-600">{stats.pending}</div>
            <div className="text-xs text-gray-600">⏳ Pending</div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs text-gray-600">📊 Total</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📅</span>
              <span>Kalender Absensi</span>
            </CardTitle>
            <CardDescription>
              Klik tanggal untuk melihat detail absensi. 
              Titik berwarna menunjukkan status kehadiran.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="rounded-md border"
                  components={{
                    DayContent: ({ date }) => renderDay(date)
                  }}
                />
              </div>
            )}
            
            <div className="mt-4 text-center">
              <Button 
                onClick={loadAttendanceData}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📝</span>
              <span>Detail Tanggal</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {selectedDate ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-800">
                    {formatDate(selectedDate)}
                  </div>
                </div>
                
                {selectedDateRecord ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <Badge className={`px-4 py-2 text-sm font-semibold ${
                        selectedDateRecord.status === 'hadir' ? 'bg-green-100 text-green-800' :
                        selectedDateRecord.status === 'izin' ? 'bg-yellow-100 text-yellow-800' :
                        selectedDateRecord.status === 'sakit' ? 'bg-orange-100 text-orange-800' :
                        selectedDateRecord.status === 'alpha' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusIcon(selectedDateRecord.status)} {selectedDateRecord.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-blue-50 p-3 rounded">
                        <div className="font-medium text-blue-800">Waktu Masuk</div>
                        <div className="text-blue-600 font-mono">
                          {formatTime(selectedDateRecord.waktu_masuk)}
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded">
                        <div className="font-medium text-purple-800">Waktu Pulang</div>
                        <div className="text-purple-600 font-mono">
                          {formatTime(selectedDateRecord.waktu_pulang)}
                        </div>
                      </div>
                    </div>
                    
                    {selectedDateRecord.keterangan && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="font-medium text-gray-800 mb-1">Keterangan</div>
                        <div className="text-gray-600 text-sm">
                          {selectedDateRecord.keterangan}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-4">📅</div>
                    <p className="text-gray-500">Tidak ada data absensi untuk tanggal ini</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-4">👆</div>
                <p className="text-gray-500">Pilih tanggal di kalender untuk melihat detail</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🎨</span>
            <span>Keterangan Warna</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm">Hadir</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-sm">Izin</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="text-sm">Sakit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm">Alpha</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
              <span className="text-sm">Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}