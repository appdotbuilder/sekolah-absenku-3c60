import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';

interface AttendanceHistoryProps {
  siswaId: number;
}

export default function AttendanceHistory({ siswaId }: AttendanceHistoryProps) {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [limit, setLimit] = useState(10);

  const loadAttendanceHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.absensi.getBySiswa.query({ 
        siswaId, 
        limit 
      });
      setAttendanceData(data);
    } catch (error) {
      console.error('Failed to load attendance history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [siswaId, limit]);

  useEffect(() => {
    loadAttendanceHistory();
  }, [loadAttendanceHistory]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hadir':
        return <Badge className="bg-green-100 text-green-800">✅ Hadir</Badge>;
      case 'izin':
        return <Badge className="bg-yellow-100 text-yellow-800">📝 Izin</Badge>;
      case 'sakit':
        return <Badge className="bg-orange-100 text-orange-800">🤒 Sakit</Badge>;
      case 'alpha':
        return <Badge className="bg-red-100 text-red-800">❌ Alpha</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">⏳ Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time;
  };

  const calculateStats = () => {
    const stats = {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0,
      pending: 0,
      total: attendanceData.length
    };

    attendanceData.forEach((record: any) => {
      stats[record.status as keyof typeof stats]++;
    });

    return stats;
  };

  const stats = calculateStats();
  const attendancePercentage = stats.total > 0 ? ((stats.hadir / stats.total) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.hadir}</div>
            <div className="text-xs text-gray-600">Hadir</div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.izin}</div>
            <div className="text-xs text-gray-600">Izin</div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.sakit}</div>
            <div className="text-xs text-gray-600">Sakit</div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.alpha}</div>
            <div className="text-xs text-gray-600">Alpha</div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{attendancePercentage}%</div>
            <div className="text-xs text-gray-600">Kehadiran</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>📜</span>
              <span>Riwayat Absensi</span>
            </CardTitle>
            <CardDescription>
              Daftar kehadiran Anda dalam {limit} hari terakhir
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Tampilkan:</span>
            <Select 
              value={limit.toString()} 
              onValueChange={(value: string) => setLimit(parseInt(value))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu Masuk</TableHead>
                    <TableHead>Waktu Pulang</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">📝</div>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">
                          Belum ada riwayat absensi
                        </h3>
                        <p className="text-gray-500">
                          Mulai lakukan absensi untuk melihat riwayat
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceData.map((record: any, index: number) => (
                      <TableRow key={record.id || index}>
                        <TableCell className="font-medium">
                          {formatDate(record.tanggal)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(record.status)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatTime(record.waktu_masuk)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatTime(record.waktu_pulang)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.keterangan ? (
                            <div className="max-w-xs truncate" title={record.keterangan}>
                              {record.keterangan}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {attendanceData.length > 0 && (
            <div className="mt-4 text-center">
              <Button 
                onClick={loadAttendanceHistory}
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  '🔄 Refresh Data'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}