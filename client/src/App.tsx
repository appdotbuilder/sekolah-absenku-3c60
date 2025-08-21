import React, { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import type { User } from '../../server/src/schema';

// Components
import LoginPage from '@/components/LoginPage';
import AdminDashboard from '@/components/AdminDashboard';
import GuruDashboard from '@/components/GuruDashboard';
import SiswaDashboard from '@/components/SiswaDashboard';

// Types
interface AuthUser extends User {
  profile?: any;
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('sekolah_absenku_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('sekolah_absenku_user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData: AuthUser) => {
    setUser(userData);
    localStorage.setItem('sekolah_absenku_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sekolah_absenku_user');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Render dashboard based on user role
  switch (user.role) {
    case 'admin':
      return <AdminDashboard user={user} onLogout={handleLogout} />;
    case 'guru':
      return <GuruDashboard user={user} onLogout={handleLogout} />;
    case 'siswa':
      return <SiswaDashboard user={user} onLogout={handleLogout} />;
    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">Unknown user role: {user.role}</p>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      );
  }
}

export default App;