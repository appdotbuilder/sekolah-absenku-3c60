import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, TrendingUp, Users, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

import type { Class } from '../../../../server/src/schema';

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  sickDays: number;
  attendanceRate: number;
}

export default function AttendanceOverview() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('week');
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    sickDays: 0,
    attendanceRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadClasses = useCallback(async () => {
    try {
      const allClasses = await trpc.classes.getAll.query();
      setClasses(allClasses);
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  }, []);

  const loadAttendanceStats = useCallback(async () => {
    try {
      const today = new Date();
      let startDate = '';
      
      switch (dateRange) {
        case 'week':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          break;
        case 'semester':
          startDate = new Date(today.getFullYear(), today.getMonth() > 6 ? 6 : 0, 1).toISOString().split('T')[0];
          break;
        default:
          startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      }

      const endDate = today.toISOString().split('T')[0];
      const classId = selectedClassId === 'all' ? undefined : parseInt(selectedClassId);
      
      const attendanceStats = await trpc.attendance.getStats.query({
        classId,
        startDate,
        endDate
      });
      
      setStats(attendanceStats);
    } catch (error) {
      console.error('Failed to load attendance stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, dateRange]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    loadAttendanceStats();
  }, [loadAttendanceStats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-50';
      case 'absent': return 'text-red-600 bg-red-50';
      case 'sick': return 'text-yellow-600 bg-yellow-50';
      case 'leave': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4" />;
      case 'absent': return <XCircle className="h-4 w-4" />;
      case 'sick': return <AlertTriangle className="h-4 w-4" />;
      case 'leave': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-lg">Loading attendance overview...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Attendance Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls: Class) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} - {cls.grade_level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="semester">This Semester</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadAttendanceStats} variant="outline">
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalDays}</p>
                <p className="text-sm text-gray-600">Total Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.presentDays}</p>
                <p className="text-sm text-gray-600">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.absentDays}</p>
                <p className="text-sm text-gray-600">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.sickDays}</p>
                <p className="text-sm text-gray-600">Sick Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.attendanceRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Attendance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Attendance Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Present</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{stats.presentDays}</p>
                  <p className="text-sm text-green-600">
                    {stats.totalDays > 0 ? ((stats.presentDays / stats.totalDays) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">Absent</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">{stats.absentDays}</p>
                  <p className="text-sm text-red-600">
                    {stats.totalDays > 0 ? ((stats.absentDays / stats.totalDays) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Sick</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-600">{stats.sickDays}</p>
                  <p className="text-sm text-yellow-600">
                    {stats.totalDays > 0 ? ((stats.sickDays / stats.totalDays) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Leave</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{stats.leaveDays}</p>
                  <p className="text-sm text-blue-600">
                    {stats.totalDays > 0 ? ((stats.leaveDays / stats.totalDays) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">📊 Today's Summary</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Get a quick overview of today's attendance across all classes.
                </p>
                <Button variant="outline" className="w-full">
                  View Today's Report
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">⚠️ Low Attendance Alert</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Identify students with attendance rates below 80%.
                </p>
                <Button variant="outline" className="w-full">
                  Check Low Attendance
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">📈 Monthly Trends</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Analyze attendance patterns and trends over time.
                </p>
                <Button variant="outline" className="w-full">
                  View Trends
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Recent attendance activities will appear here</p>
            <p className="text-sm">Data will be loaded from the backend</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}