import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import type { Kelas } from '../../../../server/src/schema';

interface AttendanceVerificationProps {
  guruId: number;
}

export default function AttendanceVerification({ guruId }: AttendanceVerificationProps) {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<number | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<'izin' | 'sakit' | 'alpha'>('izin');

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

  const loadPendingRequests = useCallback(async () => {
    if (!selectedKelas) return;
    
    try {
      setIsLoading(true);
      const requests = await trpc.absensi.getPendingIzin.query({ 
        kelasId: selectedKelas 
      });
      setPendingRequests(requests);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedKelas]);

  useEffect(() => {
    loadPendingRequests();
  }, [loadPendingRequests]);

  const handleVerification = (request: any) => {
    setSelectedRequest(request);
    setVerificationStatus(request.status === 'pending' ? 'izin' : request.status);
    setIsModalOpen(true);
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRequest) return;

    try {
      await trpc.absensi.verifikasiIzin.mutate({
        absensi_id: selectedRequest.id,
        guru_id: guruId,
        status: verificationStatus
      });

      const statusText = 
        verificationStatus === 'izin' ? 'disetujui sebagai IZIN' :
        verificationStatus === 'sakit' ? 'disetujui sebagai SAKIT' :
        'ditolak (ALPHA)';

      alert(`Pengajuan ${selectedRequest.siswa?.nama} berhasil ${statusText}! ✅`);
      
      setIsModalOpen(false);
      await loadPendingRequests();
    } catch (error: any) {
      console.error('Failed to verify attendance:', error);
      alert(error.message || 'Gagal memverifikasi pengajuan');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">⏳ Pending</Badge>;
      case 'izin':
        return <Badge className="bg-yellow-100 text-yellow-800">📝 Izin</Badge>;
      case 'sakit':
        return <Badge className="bg-orange-100 text-orange-800">🤒 Sakit</Badge>;
      case 'alpha':
        return <Badge className="bg-red-100 text-red-800">❌ Alpha</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const formatDateTime = (date: Date | string) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getRequestTypeIcon = (originalStatus: string) => {
    return originalStatus === 'sakit' ? '🤒' : '📝';
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
      <Card className="glass border-2 border-orange-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                <span>✅</span>
                <span>Verifikasi Pengajuan Izin/Sakit</span>
              </h2>
              <p className="text-gray-600">Verifikasi pengajuan izin dan sakit dari siswa</p>
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
        </CardContent>
      </Card>

      {/* Pending Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>📋</span>
                <span>Daftar Pengajuan Pending</span>
              </CardTitle>
              <CardDescription>
                Pengajuan izin dan sakit yang menunggu verifikasi
              </CardDescription>
            </div>
            
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {pendingRequests.length} pengajuan
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal Pengajuan</TableHead>
                    <TableHead>Siswa</TableHead>
                    <TableHead>Tanggal Absen</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">✅</div>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">
                          Tidak ada pengajuan pending
                        </h3>
                        <p className="text-gray-500">
                          Semua pengajuan telah diverifikasi atau belum ada pengajuan baru
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="text-sm">
                          {formatDateTime(request.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs">👤</span>
                            </div>
                            <div>
                              <div className="font-medium">{request.siswa?.nama}</div>
                              <div className="text-xs text-gray-500">{request.siswa?.nisn}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDate(request.tanggal)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${
                            request.original_status === 'sakit' ? 
                            'bg-orange-100 text-orange-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {getRequestTypeIcon(request.original_status)} {request.original_status?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {request.keterangan ? (
                              <div className="text-sm truncate" title={request.keterangan}>
                                {request.keterangan}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'pending' ? (
                            <Button
                              onClick={() => handleVerification(request)}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              ✅ Verifikasi
                            </Button>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">
                              ✅ Selesai
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {pendingRequests.length > 0 && (
            <div className="mt-4 text-center">
              <Button 
                onClick={loadPendingRequests}
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? '⏳ Loading...' : '🔄 Refresh Data'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verifikasi Pengajuan</DialogTitle>
            <DialogDescription>
              {selectedRequest && 
               `Verifikasi pengajuan ${selectedRequest.original_status} dari ${selectedRequest.siswa?.nama}`}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Request Details */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Siswa:</span>
                    <p className="font-semibold">{selectedRequest.siswa?.nama}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">NISN:</span>
                    <p className="font-mono">{selectedRequest.siswa?.nisn}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Tanggal:</span>
                    <p>{formatDate(selectedRequest.tanggal)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Jenis:</span>
                    <p className="capitalize font-semibold">
                      {getRequestTypeIcon(selectedRequest.original_status)} {selectedRequest.original_status}
                    </p>
                  </div>
                </div>
                
                {selectedRequest.keterangan && (
                  <div>
                    <span className="font-medium text-gray-600">Alasan:</span>
                    <p className="text-sm bg-white p-2 rounded border mt-1">
                      {selectedRequest.keterangan}
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmitVerification} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Keputusan Verifikasi</label>
                  <Select 
                    value={verificationStatus} 
                    onValueChange={(value: 'izin' | 'sakit' | 'alpha') => setVerificationStatus(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="izin">✅ Setujui sebagai IZIN</SelectItem>
                      <SelectItem value="sakit">✅ Setujui sebagai SAKIT</SelectItem>
                      <SelectItem value="alpha">❌ Tolak (ALPHA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Catatan:</strong>
                  </p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• Izin: Pengajuan disetujui dengan alasan yang dapat diterima</li>
                    <li>• Sakit: Pengajuan disetujui karena kondisi kesehatan</li>
                    <li>• Alpha: Pengajuan ditolak karena alasan tidak dapat diterima</li>
                  </ul>
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
                    className={`${
                      verificationStatus === 'alpha' ? 
                      'bg-red-600 hover:bg-red-700' : 
                      'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {verificationStatus === 'alpha' ? '❌ Tolak' : '✅ Setujui'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}