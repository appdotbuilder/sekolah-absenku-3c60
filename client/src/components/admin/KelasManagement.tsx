import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Kelas, CreateKelasInput, Guru } from '../../../../server/src/schema';

interface KelasWithGuru extends Kelas {
  wali_kelas?: Guru;
}

export default function KelasManagement() {
  const [kelasList, setKelasList] = useState<KelasWithGuru[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateKelasInput>({
    nama_kelas: '',
    wali_kelas_id: null
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [kelas, guru] = await Promise.all([
        trpc.kelas.getAll.query(),
        trpc.guru.getAll.query()
      ]);
      
      setKelasList(kelas);
      setGuruList(guru);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newKelas = await trpc.kelas.create.mutate(formData);
      setKelasList((prev: KelasWithGuru[]) => [...prev, newKelas]);
      setIsCreateModalOpen(false);
      setFormData({
        nama_kelas: '',
        wali_kelas_id: null
      });
    } catch (error: any) {
      console.error('Failed to create kelas:', error);
      alert(error.message || 'Failed to create kelas');
    }
  };

  const handleDeleteKelas = async (id: number) => {
    try {
      await trpc.kelas.delete.mutate({ id });
      setKelasList((prev: KelasWithGuru[]) => prev.filter((kelas: KelasWithGuru) => kelas.id !== id));
    } catch (error: any) {
      console.error('Failed to delete kelas:', error);
      alert(error.message || 'Failed to delete kelas');
    }
  };

  const getGuruName = (guruId: number | null) => {
    if (!guruId) return null;
    const guru = guruList.find((g: Guru) => g.id === guruId);
    return guru ? guru.nama : 'Unknown';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>🏫</span>
              <span>Manajemen Kelas</span>
            </CardTitle>
            <CardDescription>
              Kelola data kelas dan wali kelas
            </CardDescription>
          </div>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                ➕ Tambah Kelas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Kelas Baru</DialogTitle>
                <DialogDescription>
                  Buat kelas baru dalam sistem
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateKelas} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Kelas</label>
                  <Input
                    value={formData.nama_kelas}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateKelasInput) => ({ ...prev, nama_kelas: e.target.value }))
                    }
                    placeholder="Contoh: XII IPA 1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Wali Kelas (Opsional)</label>
                  <Select 
                    value={formData.wali_kelas_id?.toString() || ''} 
                    onValueChange={(value: string) =>
                      setFormData((prev: CreateKelasInput) => ({ 
                        ...prev, 
                        wali_kelas_id: value ? parseInt(value) : null 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih wali kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tanpa wali kelas</SelectItem>
                      {guruList.map((guru: Guru) => (
                        <SelectItem key={guru.id} value={guru.id.toString()}>
                          {guru.nama} - {guru.nip}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    Simpan
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nama Kelas</TableHead>
                    <TableHead>Wali Kelas</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kelasList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Belum ada data kelas
                      </TableCell>
                    </TableRow>
                  ) : (
                    kelasList.map((kelas: KelasWithGuru) => (
                      <TableRow key={kelas.id}>
                        <TableCell className="font-mono">{kelas.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-xs">🏫</span>
                            </div>
                            <span className="font-semibold">{kelas.nama_kelas}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {kelas.wali_kelas_id ? (
                            <Badge className="bg-blue-100 text-blue-800">
                              👨‍🏫 {getGuruName(kelas.wali_kelas_id)}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600">
                              Belum ada wali kelas
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(kelas.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                              >
                                🗑️ Hapus
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus kelas <strong>{kelas.nama_kelas}</strong>? 
                                  Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi data siswa yang terdaftar.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteKelas(kelas.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Ya, Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}