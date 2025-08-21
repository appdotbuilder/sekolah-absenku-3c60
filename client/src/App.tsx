import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import type { AuthContext, LoginInput } from '../../server/src/schema';

// Import components
import LoginForm from '@/components/LoginForm';
import AdminDashboard from '@/components/AdminDashboard';
import TeacherDashboard from '@/components/TeacherDashboard';
import StudentDashboard from '@/components/StudentDashboard';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, GraduationCap, LogOut } from 'lucide-react';

function App() {
  const [user, setUser] = useState<AuthContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check for existing session on app load
  const checkCurrentUser = useCallback(async () => {
    try {
      const savedUserId = localStorage.getItem('attendance_user_id');
      if (savedUserId) {
        const currentUser = await trpc.auth.getCurrentUser.query({ userId: parseInt(savedUserId) });
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to check current user:', error);
      localStorage.removeItem('attendance_user_id');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkCurrentUser();
  }, [checkCurrentUser]);

  const handleLogin = async (loginData: LoginInput) => {
    try {
      const authResult = await trpc.auth.login.mutate(loginData);
      setUser(authResult);
      localStorage.setItem('attendance_user_id', authResult.user_id.toString());
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    if (!user) return;
    
    setIsLoggingOut(true);
    try {
      await trpc.auth.logout.mutate({ userId: user.user_id });
      setUser(null);
      localStorage.removeItem('attendance_user_id');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg font-medium text-gray-700">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <GraduationCap className="h-12 w-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 School Attendance</h1>
            <p className="text-gray-600">Manage attendance records efficiently</p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'administrator':
        return <AdminDashboard user={user} />;
      case 'teacher':
        return <TeacherDashboard user={user} />;
      case 'student':
        return <StudentDashboard user={user} />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-red-600">Invalid user role</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">School Attendance System</h1>
                <p className="text-sm text-gray-600">
                  {user.role === 'administrator' && '👨‍💼 Administrator Dashboard'}
                  {user.role === 'teacher' && '👩‍🏫 Teacher Dashboard'}
                  {user.role === 'student' && '🎓 Student Dashboard'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                <p className="text-xs text-gray-600 capitalize">@{user.username}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center space-x-2"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderDashboard()}
      </main>
    </div>
  );
}

export default App;