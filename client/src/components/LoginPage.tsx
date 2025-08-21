import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import type { LoginInput, User } from '../../../server/src/schema';

interface AuthUser extends User {
  profile?: any;
}

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState<LoginInput>({
    username: '',
    password: '',
    role: 'siswa'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await trpc.auth.login.mutate(formData);
      
      if (!response) {
        throw new Error('Login failed - no response received');
      }
      
      // Fetch user profile data based on role
      let userWithProfile: AuthUser = response;
      
      if (response.role === 'siswa') {
        try {
          const siswaProfile = await trpc.siswa.getByUserId.query({ userId: response.id });
          userWithProfile.profile = siswaProfile;
        } catch (err) {
          console.warn('Could not fetch siswa profile:', err);
        }
      } else if (response.role === 'guru') {
        try {
          const guruProfile = await trpc.guru.getByUserId.query({ userId: response.id });
          userWithProfile.profile = guruProfile;
        } catch (err) {
          console.warn('Could not fetch guru profile:', err);
        }
      }

      onLogin(userWithProfile);
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'siswa': return 'NISN';
      case 'guru': return 'NIP';
      case 'admin': return 'Username';
      default: return 'Username';
    }
  };

  const getRolePlaceholder = (role: string) => {
    switch (role) {
      case 'siswa': return 'Masukkan NISN Anda';
      case 'guru': return 'Masukkan NIP Anda';
      case 'admin': return 'Masukkan Username Anda';
      default: return 'Masukkan Username';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-40 left-40 w-60 h-60 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Educational illustrations */}
      <div className="absolute top-10 left-10 text-blue-200">
        <svg className="w-16 h-16 animate-pulse-slow" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
        </svg>
      </div>

      <div className="absolute top-20 right-20 text-indigo-200">
        <svg className="w-12 h-12 animate-pulse-slow" fill="currentColor" viewBox="0 0 20 20" style={{animationDelay: '1s'}}>
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
        </svg>
      </div>

      <div className="absolute bottom-20 left-20 text-cyan-200">
        <svg className="w-14 h-14 animate-pulse-slow" fill="currentColor" viewBox="0 0 20 20" style={{animationDelay: '2s'}}>
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
        </svg>
      </div>

      {/* Main login card */}
      <Card className="w-full max-w-md glass backdrop-blur-lg border-white/20 shadow-xl animate-fade-in-up">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
            </svg>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">Sekolah Absenku</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Sistem Absensi Digital Sekolah 🎓
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Role 👤
              </label>
              <Select 
                value={formData.role} 
                onValueChange={(value: 'admin' | 'guru' | 'siswa') =>
                  setFormData((prev: LoginInput) => ({ ...prev, role: value, username: '' }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="siswa">🎒 Siswa</SelectItem>
                  <SelectItem value="guru">👨‍🏫 Guru</SelectItem>
                  <SelectItem value="admin">⚙️ Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Username/NIP/NISN Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {getRoleLabel(formData.role)} 📋
              </label>
              <Input
                type="text"
                placeholder={getRolePlaceholder(formData.role)}
                value={formData.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: LoginInput) => ({ ...prev, username: e.target.value }))
                }
                className="focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Password 🔒
              </label>
              <Input
                type="password"
                placeholder="Masukkan password"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                }
                className="focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Masuk...</span>
                </div>
              ) : (
                'Masuk 🚀'
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Demo Akun:</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <div>👨‍💼 <strong>Admin:</strong> admin / admin123</div>
              <div>👨‍🏫 <strong>Guru:</strong> 1987654321 / guru123</div>
              <div>🎒 <strong>Siswa:</strong> 1234567890 / siswa123</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-sm text-gray-500">
          © 2024 Sekolah Absenku - Digitalisasi Pendidikan 📚
        </p>
      </div>
    </div>
  );
}