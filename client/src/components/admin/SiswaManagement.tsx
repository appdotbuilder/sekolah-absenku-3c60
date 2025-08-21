import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Siswa, CreateSiswaInput, User, Kelas } from '../../../../server/src/schema';

interface SiswaWithUser extends Siswa {
  user?: User;
  kelas?: Kelas;
}

export default function SiswaManagement() {
  const [siswaList, setSiswaList] = useState<SiswaWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSiswaInput>({
    user_id: 0,
    nisn: '',
    nama: '',
    kelas_id: 0,
    foto: null
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [siswa, usersData, kelas] = await Promise.all([
        trpc.siswa.getAll.query(),
        trpc.users.getAll.query(),
        trpc.kelas.getAll.query()
      ]);
      
      setSiswaList(siswa);
      setUsers(usersData.filter((user: User) => user.role === 'siswa'));
      setKelasList(kelas);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newSiswa = await trpc.siswa.create.mutate(formData);
      setSiswaList((prev: SiswaWithUser[]) => [...prev, newSiswa]);
      setIsCreateModalOpen(false);
      setFormData({
        user_id: 0,
        nisn: '',
        nama: '',
        kelas_id: 0,
        foto: null
      });
    } catch (error: any) {
      console.error('Failed to create siswa:', error);
      alert(error.message || 'Failed to create siswa');
    }
  };

  const handleDeleteSiswa = async (id: number) => {
    try {
      await trpc.siswa.delete.mutate({ id });
      setSiswaList((prev: SiswaWithUser[]) => prev.filter((siswa: SiswaWithUser) => siswa.id !== id));
    } catch (error: any) {
      console.error('Failed to delete siswa:', error);
      alert(error.message || 'Failed to delete siswa');
    }
  };

  const getKelasName = (kelasId: number) => {
    const kelas = kelasList.find((k: Kelas) => k.id === kelasId);
    return kelas ? kelas.nama_kelas : 'Unknown';
  };

  const getUserName = (userId: number) => {
    const user = users.find((u: User) => u.id === userId);
    return user ? user.username : 'Unknown';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  // Filter available users (those not already assigned to siswa)
  const availableUsers = users.filter((user: User) => 
    !siswaList.some((siswa: SiswaWithUser) => siswa.user_id === user.id)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>🎒</span>
              <span>Manajemen Siswa</span>
            </CardTitle>
            <CardDescription>
              Kelola data siswa dalam sistem
            </CardDescription>
          </div>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                ➕ Tambah Siswa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Siswa Baru</DialogTitle>
                <DialogDescription>
                  Daftarkan siswa baru ke dalam sistem
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateSiswa} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Akun User</label>
                  <Select 
                    value={formData.user_id.toString()} 
                    onValueChange={(value: string) =>
                      setFormData((prev: CreateSiswaInput) => ({ ...prev, user_id: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih akun user" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user: User) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.username} (ID: {user.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">NISN</label>
                  <Input
                    value={formData.nisn}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSiswaInput) => ({ ...prev, nisn: e.target.value }))
                    }
                    placeholder="Masukkan NISN"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Lengkap</label>
                  <Input
                    value={formData.nama}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSiswaInput) => ({ ...prev, nama: e.target.value }))
                    }
                    placeholder="Masukkan nama lengkap"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Kelas</label>
                  <Select 
                    value={formData.kelas_id.toString()} 
                    onValueChange={(value: string) =>
                      setFormData((prev: CreateSiswaInput) => ({ ...prev, kelas_id: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {kelasList.map((kelas: Kelas) => (
                        <SelectItem key={kelas.id} value={kelas.id.toString()}>
                          {kelas.nama_kelas}
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
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>NISN</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Terdaftar</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siswaList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Belum ada data siswa
                      </TableCell>
                    </TableRow>
                  ) : (
                    siswaList.map((siswa: SiswaWithUser) => (
                      <TableRow key={siswa.id}>
                        <TableCell className="font-mono">{siswa.id}</TableCell>
                        <TableCell className="font-medium">{siswa.nisn}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs">👤</span>
                            </div>
                            <span>{siswa.nama}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {getUserName(siswa.user_id)}
                        </TableCell>
                        <TableCell>
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
                            {getKelasName(siswa.kelas_id)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(siswa.created_at)}
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
                                  Apakah Anda yakin ingin menghapus siswa <strong>{siswa.nama}</strong>? 
                                  Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSiswa(siswa.id)}
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