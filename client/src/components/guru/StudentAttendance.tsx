import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import type { Siswa, Kelas, CreateAbsensiInput, UpdateAbsensiInput } from '../../../../server/src/schema';

interface StudentAttendanceProps {
  guruId: number;
}

export default function StudentAttendance({ guruId }: StudentAttendanceProps) {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<number | null>(null);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [attendanceForm, setAttendanceForm] = useState<CreateAbsensiInput>({
    siswa_id: 0,
    guru_id: guruId,
    kelas_id: 0,
    status: 'hadir',
    tanggal: new Date(),
    waktu_masuk: null,
    waktu_pulang: null,
    keterangan: null
  });

  const loadKelasByGuru = useCallback(async () => {
    try {
      const kelas = await trpc.kelas.getByWaliKelas.query({ guruId });
      setKelasList(kelas);
      if (kelas.length > 0) {
        setSelectedKelas(kelas[0].id);
      }
    } catch (error) {
      console.error('Failed to load kelas:', error);
    }
  }, [guruId]);

  useEffect(() => {
    loadKelasByGuru();
  }, [loadKelasByGuru]);

  const loadSiswaAndAttendance = useCallback(async () => {
    if (!selectedKelas) return;
    
    try {
      setIsLoading(true);
      const [siswa, attendance] = await Promise.all([
        trpc.siswa.getByKelas.query({ kelasId: selectedKelas }),
        trpc.absensi.getHariIni.query({ kelasId: selectedKelas })
      ]);
      
      setSiswaList(siswa);
      setTodayAttendance(attendance);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedKelas]);

  useEffect(() => {
    loadSiswaAndAttendance();
  }, [loadSiswaAndAttendance]);

  const handleInputAttendance = (siswa: Siswa) => {
    setSelectedSiswa(siswa);
    setAttendanceForm({
      siswa_id: siswa.id,
      guru_id: guruId,
      kelas_id: selectedKelas!,
      status: 'hadir',
      tanggal: new Date(),
      waktu_masuk: null,
      waktu_pulang: null,
      keterangan: null
    });
    setIsModalOpen(true);
  };

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const existingAttendance = todayAttendance.find(a => a.siswa_id === attendanceForm.siswa_id);
      
      if (existingAttendance) {
        // Update existing attendance
        await trpc.absensi.update.mutate({
          id: existingAttendance.id,
          status: attendanceForm.status,
          waktu_masuk: attendanceForm.waktu_masuk,
          waktu_pulang: attendanceForm.waktu_pulang,
          keterangan: attendanceForm.keterangan
        });
        alert('Absensi berhasil diperbarui! ✅');
      } else {
        // Create new attendance
        await trpc.absensi.create.mutate(attendanceForm);
        alert('Absensi berhasil ditambahkan! ✅');
      }
      
      setIsModalOpen(false);
      await loadSiswaAndAttendance();
    } catch (error: any) {
      console.error('Failed to save attendance:', error);
      alert(error.message || 'Gagal menyimpan absensi');
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM format
  };

  const getAttendanceForSiswa = (siswaId: number) => {
    return todayAttendance.find(a => a.siswa_id === siswaId);
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
        return <Badge className="bg-gray-100 text-gray-800">-</Badge>;
    }
  };

  const formatDate = () => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());
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
      {/* Header with Date and Class Selector */}
      <Card className="glass border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold text-gray-900">{formatDate()}</h2>
              <p className="text-gray-600">Input absensi siswa untuk hari ini</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-mono font-bold text-blue-600">
                {getCurrentTime()}
              </div>
              <Select 
                value={selectedKelas?.toString() || ''} 
                onValueChange={(value: string) => setSelectedKelas(parseInt(value))}
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
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📝</span>
            <span>Daftar Absensi Siswa</span>
          </CardTitle>
          <CardDescription>
            Klik tombol "Input" untuk mencatat kehadiran siswa
          </CardDescription>
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
                    <TableHead>No</TableHead>
                    <TableHead>NISN</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siswaList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">🎒</div>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">
                          Tidak ada siswa di kelas ini
                        </h3>
                        <p className="text-gray-500">
                          Hubungi admin untuk menambahkan siswa
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    siswaList.map((siswa: Siswa, index: number) => {
                      const attendance = getAttendanceForSiswa(siswa.id);
                      return (
                        <TableRow key={siswa.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-mono">{siswa.nisn}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs">👤</span>
                              </div>
                              <span>{siswa.nama}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {attendance ? getStatusBadge(attendance.status) : 
                             <Badge className="bg-gray-100 text-gray-600">Belum diisi</Badge>}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {attendance ? 
                             `${attendance.waktu_masuk || '-'} / ${attendance.waktu_pulang || '-'}` : 
                             '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {attendance?.keterangan ? (
                              <div className="max-w-xs truncate" title={attendance.keterangan}>
                                {attendance.keterangan}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => handleInputAttendance(siswa)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {attendance ? '✏️ Edit' : '➕ Input'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input Attendance Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Input Absensi Siswa</DialogTitle>
            <DialogDescription>
              {selectedSiswa ? `Catat kehadiran untuk ${selectedSiswa.nama}` : 'Catat kehadiran siswa'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAttendance} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Kehadiran</label>
              <Select 
                value={attendanceForm.status} 
                onValueChange={(value: 'hadir' | 'izin' | 'sakit' | 'alpha') =>
                  setAttendanceForm(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hadir">✅ Hadir</SelectItem>
                  <SelectItem value="izin">📝 Izin</SelectItem>
                  <SelectItem value="sakit">🤒 Sakit</SelectItem>
                  <SelectItem value="alpha">❌ Alpha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {attendanceForm.status === 'hadir' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Waktu Masuk</label>
                  <Select 
                    value={attendanceForm.waktu_masuk || getCurrentTime()} 
                    onValueChange={(value: string) =>
                      setAttendanceForm(prev => ({ ...prev, waktu_masuk: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih waktu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={getCurrentTime()}>Sekarang ({getCurrentTime()})</SelectItem>
                      <SelectItem value="07:00">07:00</SelectItem>
                      <SelectItem value="07:30">07:30</SelectItem>
                      <SelectItem value="08:00">08:00</SelectItem>
                      <SelectItem value="08:30">08:30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Waktu Pulang</label>
                  <Select 
                    value={attendanceForm.waktu_pulang || ''} 
                    onValueChange={(value: string) =>
                      setAttendanceForm(prev => ({ ...prev, waktu_pulang: value || null }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Opsional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Belum pulang</SelectItem>
                      <SelectItem value={getCurrentTime()}>Sekarang ({getCurrentTime()})</SelectItem>
                      <SelectItem value="14:00">14:00</SelectItem>
                      <SelectItem value="15:00">15:00</SelectItem>
                      <SelectItem value="16:00">16:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Keterangan (Opsional)</label>
              <Textarea
                value={attendanceForm.keterangan || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setAttendanceForm(prev => ({ ...prev, keterangan: e.target.value || null }))
                }
                placeholder="Tambahkan catatan jika diperlukan..."
                className="resize-none h-20"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
              >
                💾 Simpan Absensi
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}