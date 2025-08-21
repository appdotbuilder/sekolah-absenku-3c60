import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Guru, CreateGuruInput, User } from '../../../../server/src/schema';

interface GuruWithUser extends Guru {
  user?: User;
}

export default function GuruManagement() {
  const [guruList, setGuruList] = useState<GuruWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateGuruInput>({
    user_id: 0,
    nip: '',
    nama: '',
    foto: null
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [guru, usersData] = await Promise.all([
        trpc.guru.getAll.query(),
        trpc.users.getAll.query()
      ]);
      
      setGuruList(guru);
      setUsers(usersData.filter((user: User) => user.role === 'guru'));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newGuru = await trpc.guru.create.mutate(formData);
      setGuruList((prev: GuruWithUser[]) => [...prev, newGuru]);
      setIsCreateModalOpen(false);
      setFormData({
        user_id: 0,
        nip: '',
        nama: '',
        foto: null
      });
    } catch (error: any) {
      console.error('Failed to create guru:', error);
      alert(error.message || 'Failed to create guru');
    }
  };

  const handleDeleteGuru = async (id: number) => {
    try {
      await trpc.guru.delete.mutate({ id });
      setGuruList((prev: GuruWithUser[]) => prev.filter((guru: GuruWithUser) => guru.id !== id));
    } catch (error: any) {
      console.error('Failed to delete guru:', error);
      alert(error.message || 'Failed to delete guru');
    }
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

  // Filter available users (those not already assigned to guru)
  const availableUsers = users.filter((user: User) => 
    !guruList.some((guru: GuruWithUser) => guru.user_id === user.id)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>👨‍🏫</span>
              <span>Manajemen Guru</span>
            </CardTitle>
            <CardDescription>
              Kelola data guru dalam sistem
            </CardDescription>
          </div>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                ➕ Tambah Guru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Guru Baru</DialogTitle>
                <DialogDescription>
                  Daftarkan guru baru ke dalam sistem
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateGuru} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Akun User</label>
                  <Select 
                    value={formData.user_id.toString()} 
                    onValueChange={(value: string) =>
                      setFormData((prev: CreateGuruInput) => ({ ...prev, user_id: parseInt(value) }))
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
                  <label className="text-sm font-medium">NIP</label>
                  <Input
                    value={formData.nip}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateGuruInput) => ({ ...prev, nip: e.target.value }))
                    }
                    placeholder="Masukkan NIP"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Lengkap</label>
                  <Input
                    value={formData.nama}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateGuruInput) => ({ ...prev, nama: e.target.value }))
                    }
                    placeholder="Masukkan nama lengkap"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Terdaftar</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guruList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Belum ada data guru
                      </TableCell>
                    </TableRow>
                  ) : (
                    guruList.map((guru: GuruWithUser) => (
                      <TableRow key={guru.id}>
                        <TableCell className="font-mono">{guru.id}</TableCell>
                        <TableCell className="font-medium">{guru.nip}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs">👨‍🏫</span>
                            </div>
                            <span>{guru.nama}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {getUserName(guru.user_id)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(guru.created_at)}
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
                                  Apakah Anda yakin ingin menghapus guru <strong>{guru.nama}</strong>? 
                                  Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteGuru(guru.id)}
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