import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { Kelas, AttendanceFilter } from '../../../../server/src/schema';

// Define report data types
interface ReportData {
  attendance?: any[];
  stats?: {
    hadir?: number;
    izin?: number;
    sakit?: number;
    alpha?: number;
    pending?: number;
    total?: number;
  };
}

interface AttendanceStats {
  hadir?: number;
  izin?: number;
  sakit?: number;
  alpha?: number;
  pending?: number;
  total?: number;
}

interface ClassReportsProps {
  guruId: number;
}

export default function ClassReports({ guruId }: ClassReportsProps) {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<number | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('daily');
  
  const [filter, setFilter] = useState<AttendanceFilter>({
    kelas_id: undefined,
    tanggal_mulai: undefined,
    tanggal_selesai: undefined,
    status: undefined
  });
  
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>();
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>();

  const loadKelasByGuru = useCallback(async () => {
    try {
      const kelas = await trpc.kelas.getByWaliKelas.query({ guruId });
      setKelasList(kelas);
      if (kelas.length > 0) {
        setSelectedKelas(kelas[0].id);
        setFilter(prev => ({ ...prev, kelas_id: kelas[0].id }));
      }
    } catch (error) {
      console.error('Failed to load kelas:', error);
    }
  }, [guruId]);

  useEffect(() => {
    loadKelasByGuru();
  }, [loadKelasByGuru]);

  const generateDailyReport = async () => {
    if (!selectedKelas) return;
    
    setIsLoading(true);
    try {
      const today = new Date();
      const data = await trpc.reports.generateDaily.query({
        date: today,
        kelasId: selectedKelas
      }) as ReportData;
      
      setReportData(data.attendance || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Failed to generate daily report:', error);
      alert('Gagal menghasilkan laporan harian');
    } finally {
      setIsLoading(false);
    }
  };

  const generateWeeklyReport = async () => {
    if (!selectedKelas) return;
    
    setIsLoading(true);
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      
      const data = await trpc.reports.generateWeekly.query({
        startDate: startOfWeek,
        kelasId: selectedKelas
      }) as ReportData;
      
      setReportData(data.attendance || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Failed to generate weekly report:', error);
      alert('Gagal menghasilkan laporan mingguan');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMonthlyReport = async () => {
    if (!selectedKelas) return;
    
    setIsLoading(true);
    try {
      const today = new Date();
      const data = await trpc.reports.generateMonthly.query({
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        kelasId: selectedKelas
      }) as ReportData;
      
      setReportData(data.attendance || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Failed to generate monthly report:', error);
      alert('Gagal menghasilkan laporan bulanan');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCustomReport = async () => {
    if (!selectedKelas || !selectedStartDate || !selectedEndDate) {
      alert('Silakan pilih kelas dan rentang tanggal');
      return;
    }

    setIsLoading(true);
    try {
      const filterWithDates = {
        kelas_id: selectedKelas,
        tanggal_mulai: selectedStartDate,
        tanggal_selesai: selectedEndDate,
        status: filter.status
      };
      
      const data = await trpc.absensi.getByFilter.query(filterWithDates);
      const statsData = await trpc.absensi.getStats.query({
        kelasId: selectedKelas,
        dateRange: { start: selectedStartDate, end: selectedEndDate }
      });
      
      setReportData(data);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to generate custom report:', error);
      alert('Gagal menghasilkan laporan custom');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (reportData.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }
    
    try {
      await trpc.reports.exportToPDF.mutate({
        reportData,
        reportType: activeTab === 'custom' ? 'custom' : activeTab as any
      });
      
      alert('Laporan PDF berhasil dibuat! (Fitur download akan diimplementasikan)');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Gagal mengekspor PDF');
    }
  };

  const handleExportExcel = async () => {
    if (reportData.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }
    
    try {
      await trpc.reports.exportToExcel.mutate({
        reportData,
        reportType: activeTab === 'custom' ? 'custom' : activeTab as any
      });
      
      alert('Laporan Excel berhasil dibuat! (Fitur download akan diimplementasikan)');
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Gagal mengekspor Excel');
    }
  };

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

  if (kelasList.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-4xl mb-4">🏫</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Tidak ada kelas yang diampu
          </h3>
          <p className="text-gray-500">
            Hubungi admin untuk mendapatkan akses ke kelas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass border-2 border-green-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                <span>📈</span>
                <span>Laporan Absensi Kelas</span>
              </h2>
              <p className="text-gray-600">Generate dan export laporan kehadiran siswa</p>
            </div>
            
            <Select 
              value={selectedKelas?.toString() || ''} 
              onValueChange={(value: string) => {
                const kelasId = parseInt(value);
                setSelectedKelas(kelasId);
                setFilter(prev => ({ ...prev, kelas_id: kelasId }));
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pilih Kelas" />
              </SelectTrigger>
              <SelectContent>
                {kelasList.map((kelas: Kelas) => (
                  <SelectItem key={kelas.id} value={kelas.id.toString()}>
                    🏫 {kelas.nama_kelas}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Report Types */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily" className="flex items-center space-x-2">
            <span>📅</span>
            <span>Harian</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center space-x-2">
            <span>📆</span>
            <span>Mingguan</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center space-x-2">
            <span>🗓️</span>
            <span>Bulanan</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center space-x-2">
            <span>🔧</span>
            <span>Custom</span>
          </TabsTrigger>
        </TabsList>

        {/* Daily Report */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📅</span>
                <span>Laporan Harian</span>
              </CardTitle>
              <CardDescription>
                Laporan absensi untuk hari ini
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={generateDailyReport}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? '⏳ Loading...' : '📊 Generate Laporan Hari Ini'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Report */}
        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📆</span>
                <span>Laporan Mingguan</span>
              </CardTitle>
              <CardDescription>
                Laporan absensi untuk minggu ini
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={generateWeeklyReport}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? '⏳ Loading...' : '📊 Generate Laporan Minggu Ini'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Report */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🗓️</span>
                <span>Laporan Bulanan</span>
              </CardTitle>
              <CardDescription>
                Laporan absensi untuk bulan ini
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={generateMonthlyReport}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? '⏳ Loading...' : '📊 Generate Laporan Bulan Ini'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Report */}
        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🔧</span>
                <span>Laporan Custom</span>
              </CardTitle>
              <CardDescription>
                Buat laporan dengan filter custom
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Mulai</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {selectedStartDate ? formatDate(selectedStartDate) : 'Pilih tanggal'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedStartDate}
                        onSelect={setSelectedStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Selesai</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {selectedEndDate ? formatDate(selectedEndDate) : 'Pilih tanggal'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedEndDate}
                        onSelect={setSelectedEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Filter Status</label>
                  <Select 
                    value={filter.status || ''} 
                    onValueChange={(value: string) =>
                      setFilter(prev => ({ 
                        ...prev, 
                        status: value ? value as 'hadir' | 'izin' | 'sakit' | 'alpha' | 'pending' : undefined 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Semua status</SelectItem>
                      <SelectItem value="hadir">Hadir</SelectItem>
                      <SelectItem value="izin">Izin</SelectItem>
                      <SelectItem value="sakit">Sakit</SelectItem>
                      <SelectItem value="alpha">Alpha</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={generateCustomReport}
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? '⏳ Loading...' : '📊 Generate Laporan Custom'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Statistics Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="card-hover">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-green-600">{stats.hadir || 0}</div>
              <div className="text-xs text-gray-600">✅ Hadir</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-yellow-600">{stats.izin || 0}</div>
              <div className="text-xs text-gray-600">📝 Izin</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-orange-600">{stats.sakit || 0}</div>
              <div className="text-xs text-gray-600">🤒 Sakit</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-red-600">{stats.alpha || 0}</div>
              <div className="text-xs text-gray-600">❌ Alpha</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-gray-600">{stats.pending || 0}</div>
              <div className="text-xs text-gray-600">⏳ Pending</div>
            </CardContent>
          </Card>
          
          <Card className="card-hover">
            <CardContent className="p-4 text-center">
              <div className="text-xl font-bold text-blue-600">{stats.total || 0}</div>
              <div className="text-xs text-gray-600">📊 Total</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Data Table */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>📋</span>
                <span>Data Laporan</span>
              </CardTitle>
              <CardDescription>
                {reportData.length} record ditemukan
              </CardDescription>
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={handleExportPDF}
                variant="outline"
                size="sm"
                className="hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              >
                📄 Export PDF
              </Button>
              
              <Button 
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                className="hover:bg-green-50 hover:border-green-300 hover:text-green-700"
              >
                📊 Export Excel
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Siswa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu Masuk</TableHead>
                    <TableHead>Waktu Pulang</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((record: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {formatDate(record.tanggal)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs">👤</span>
                          </div>
                          <div>
                            <div className="font-medium">{record.siswa?.nama}</div>
                            <div className="text-xs text-gray-500">{record.siswa?.nisn}</div>
                          </div>
                        </div>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}