import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { User, UpdateProfileInput, ChangePasswordInput, Kelas } from '../../../../server/src/schema';

interface TeacherProfileProps {
  user: User & { profile?: any };
}

export default function TeacherProfile({ user }: TeacherProfileProps) {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  const [profileData, setProfileData] = useState({
    nama: user.profile?.nama || '',
    foto: user.profile?.foto || null
  });
  
  const [passwordData, setPasswordData] = useState<ChangePasswordInput>({
    user_id: user.id,
    current_password: '',
    new_password: ''
  });

  useEffect(() => {
    if (user.profile?.id) {
      loadKelasInfo();
    }
  }, [user.profile?.id]);

  const loadKelasInfo = async () => {
    try {
      const kelas = await trpc.kelas.getByWaliKelas.query({ guruId: user.profile.id });
      setKelasList(kelas);
    } catch (error) {
      console.error('Failed to load kelas info:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await trpc.guru.updateProfile.mutate({
        user_id: user.id,
        nama: profileData.nama,
        foto: profileData.foto
      });
      
      alert('Profil berhasil diperbarui! 🎉');
      
      // Refresh page to update displayed data
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      alert(error.message || 'Gagal memperbarui profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password.length < 6) {
      alert('Password baru minimal 6 karakter');
      return;
    }

    if (passwordData.current_password === passwordData.new_password) {
      alert('Password baru harus berbeda dengan password lama');
      return;
    }

    setIsLoading(true);
    try {
      await trpc.auth.changePassword.mutate(passwordData);
      
      alert('Password berhasil diubah! 🔒');
      setIsPasswordModalOpen(false);
      setPasswordData({
        user_id: user.id,
        current_password: '',
        new_password: ''
      });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      alert(error.message || 'Gagal mengubah password');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Profile Overview */}
      <Card className="glass card-hover border-2 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.profile?.nama ? user.profile.nama.charAt(0).toUpperCase() : '👨‍🏫'}
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {user.profile?.nama || 'Nama Belum Diatur'}
              </h2>
              <div className="space-y-1 text-gray-600">
                <p className="flex items-center space-x-2">
                  <span>🆔</span>
                  <span>NIP: <strong>{user.profile?.nip || user.username}</strong></span>
                </p>
                <p className="flex items-center space-x-2">
                  <span>🏫</span>
                  <span>Kelas Diampu: <strong>{kelasList.length} kelas</strong></span>
                </p>
                <p className="flex items-center space-x-2">
                  <span>👤</span>
                  <span>Role: <Badge className="bg-blue-100 text-blue-800">👨‍🏫 Guru</Badge></span>
                </p>
              </div>
            </div>
            
            <div className="text-right text-sm text-gray-500">
              <p>Bergabung sejak</p>
              <p className="font-semibold">{formatDate(user.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes Information */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🏫</span>
            <span>Kelas yang Diampu</span>
          </CardTitle>
          <CardDescription>
            Daftar kelas yang menjadi tanggung jawab Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kelasList.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🏫</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Belum ada kelas yang diampu
              </h3>
              <p className="text-gray-500">
                Hubungi admin untuk mendapatkan akses ke kelas
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kelasList.map((kelas: Kelas) => (
                <div key={kelas.id} className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600">🏫</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800">{kelas.nama_kelas}</h4>
                      <p className="text-sm text-blue-600">Wali Kelas</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <span>✏️</span>
            <span>Edit Profil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <span>🔒</span>
            <span>Keamanan</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Edit Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>✏️</span>
                <span>Edit Profil</span>
              </CardTitle>
              <CardDescription>
                Perbarui informasi profil Anda
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      NIP (Tidak dapat diubah) 🆔
                    </label>
                    <Input
                      value={user.profile?.nip || user.username}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Role 👤
                    </label>
                    <Input
                      value="Guru"
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nama Lengkap ✏️
                  </label>
                  <Input
                    value={profileData.nama}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setProfileData(prev => ({ ...prev, nama: e.target.value }))
                    }
                    placeholder="Masukkan nama lengkap"
                    required
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📋 Informasi:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• NIP dan Role tidak dapat diubah oleh guru</li>
                    <li>• Hubungi admin jika ada kesalahan data</li>
                    <li>• Pastikan nama lengkap sesuai dengan identitas resmi</li>
                    <li>• Perubahan profil akan diterapkan setelah reload halaman</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>💾</span>
                      <span>Simpan Perubahan</span>
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🔒</span>
                <span>Keamanan Akun</span>
              </CardTitle>
              <CardDescription>
                Kelola password dan keamanan akun Anda
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600">✅</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800">Akun Aktif</h4>
                    <p className="text-sm text-green-600">
                      Akun Anda dalam kondisi aman dan aktif
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-800">Password</h4>
                    <p className="text-sm text-gray-600">
                      Terakhir diubah: {formatDate(user.updated_at)}
                    </p>
                  </div>
                  
                  <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="hover:bg-blue-50">
                        🔑 Ubah Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ubah Password</DialogTitle>
                        <DialogDescription>
                          Masukkan password lama dan password baru Anda
                        </DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Password Lama</label>
                          <Input
                            type="password"
                            value={passwordData.current_password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setPasswordData(prev => ({ ...prev, current_password: e.target.value }))
                            }
                            placeholder="Masukkan password lama"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Password Baru</label>
                          <Input
                            type="password"
                            value={passwordData.new_password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setPasswordData(prev => ({ ...prev, new_password: e.target.value }))
                            }
                            placeholder="Masukkan password baru (min. 6 karakter)"
                            required
                            minLength={6}
                          />
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="text-sm text-yellow-800">
                            ⚠️ Pastikan password baru mudah diingat namun aman
                          </p>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsPasswordModalOpen(false)}
                          >
                            Batal
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isLoading ? 'Mengubah...' : 'Ubah Password'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">💡 Tips Keamanan:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Gunakan password yang unik dan sulit ditebak</li>
                    <li>• Jangan bagikan password kepada orang lain</li>
                    <li>• Logout setelah selesai menggunakan sistem</li>
                    <li>• Laporkan aktivitas mencurigakan kepada admin</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}