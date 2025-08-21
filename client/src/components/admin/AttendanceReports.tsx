import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { trpc } from '@/utils/trpc';
import type { Kelas, AttendanceFilter } from '../../../../server/src/schema';

export default function AttendanceReports() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<AttendanceFilter>({
    kelas_id: undefined,
    siswa_id: undefined,
    tanggal_mulai: undefined,
    tanggal_selesai: undefined,
    status: undefined
  });
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>();
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>();

  const loadKelasList = useCallback(async () => {
    try {
      const kelas = await trpc.kelas.getAll.query();
      setKelasList(kelas);
    } catch (error) {
      console.error('Failed to load kelas:', error);
    }
  }, []);

  useEffect(() => {
    loadKelasList();
  }, [loadKelasList]);

  const handleGenerateReport = async () => {
    try {
      setIsLoading(true);
      const filterWithDates = {
        ...filter,
        tanggal_mulai: selectedStartDate,
        tanggal_selesai: selectedEndDate
      };
      
      const data = await trpc.absensi.getByFilter.query(filterWithDates);
      setReportData(data);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Gagal menghasilkan laporan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      if (reportData.length === 0) {
        alert('Tidak ada data untuk diekspor');
        return;
      }
      
      await trpc.reports.exportToPDF.mutate({
        reportData,
        reportType: 'custom'
      });
      
      // Note: In a real implementation, this would trigger a download
      alert('Laporan PDF berhasil dibuat! (Fitur download akan diimplementasikan)');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Gagal mengekspor PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      if (reportData.length === 0) {
        alert('Tidak ada data untuk diekspor');
        return;
      }
      
      await trpc.reports.exportToExcel.mutate({
        reportData,
        reportType: 'custom'
      });
      
      // Note: In a real implementation, this would trigger a download
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
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time;
  };

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📊</span>
            <span>Laporan Absensi</span>
          </CardTitle>
          <CardDescription>
            Generate dan export laporan absensi siswa
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Kelas Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter Kelas</label>
              <Select 
                value={filter.kelas_id?.toString() || ''} 
                onValueChange={(value: string) =>
                  setFilter((prev: AttendanceFilter) => ({ 
                    ...prev, 
                    kelas_id: value ? parseInt(value) : undefined 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua kelas</SelectItem>
                  {kelasList.map((kelas: Kelas) => (
                    <SelectItem key={kelas.id} value={kelas.id.toString()}>
                      {kelas.nama_kelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter Status</label>
              <Select 
                value={filter.status || ''} 
                onValueChange={(value: string) =>
                  setFilter((prev: AttendanceFilter) => ({ 
                    ...prev, 
                    status: value ? value as any : undefined 
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

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rentang Tanggal</label>
              <div className="flex space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {selectedStartDate ? formatDate(selectedStartDate) : 'Dari'}
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
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {selectedEndDate ? formatDate(selectedEndDate) : 'Sampai'}
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
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                '🔍 Generate Laporan'
              )}
            </Button>
            
            <Button 
              onClick={handleExportPDF}
              variant="outline"
              disabled={reportData.length === 0}
              className="hover:bg-red-50 hover:border-red-300 hover:text-red-700"
            >
              📄 Export PDF
            </Button>
            
            <Button 
              onClick={handleExportExcel}
              variant="outline"
              disabled={reportData.length === 0}
              className="hover:bg-green-50 hover:border-green-300 hover:text-green-700"
            >
              📊 Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span>📋</span>
                <span>Hasil Laporan</span>
              </span>
              <Badge variant="secondary">
                {reportData.length} record ditemukan
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Siswa</TableHead>
                    <TableHead>Kelas</TableHead>
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
                        {record.siswa?.nama || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-100 text-purple-800">
                          {record.kelas?.nama_kelas || 'Unknown'}
                        </Badge>
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
                        {record.keterangan || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {reportData.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Belum ada laporan
            </h3>
            <p className="text-gray-500 mb-4">
              Klik "Generate Laporan" untuk melihat data absensi
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}