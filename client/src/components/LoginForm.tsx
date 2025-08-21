import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import type { LoginInput } from '../../../server/src/schema';

interface LoginFormProps {
  onLogin: (data: LoginInput) => Promise<void>;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginInput>({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onLogin(formData);
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Welcome Back! 👋</CardTitle>
        <p className="text-sm text-gray-600 text-center">
          Sign in to your account to continue
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username / NIS-NISN</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username or NIS/NISN"
              value={formData.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: LoginInput) => ({ ...prev, username: e.target.value }))
              }
              required
              disabled={isLoading}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Students: Use your NIS/NISN • Teachers/Admin: Use your username
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
              }
              required
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <div className="text-sm text-gray-500 space-y-1">
            <p>🎓 <strong>Students:</strong> Login with your NIS/NISN</p>
            <p>👨‍🏫 <strong>Teachers:</strong> Login with your assigned username</p>
            <p>👨‍💼 <strong>Admin:</strong> Login with your administrator account</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}