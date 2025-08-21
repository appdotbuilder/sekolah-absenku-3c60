import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, AlertTriangle, Calendar, TrendingUp, BarChart3 } from 'lucide-react';

import type { AttendanceRecord, AttendanceStatus } from '../../../../server/src/schema';

interface AttendanceRecordProps {
  studentId: number;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  sickDays: number;
  attendanceRate: number;
}

export default function AttendanceRecord({ studentId }: AttendanceRecordProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    sickDays: 0,
    attendanceRate: 0
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadStudentAttendance = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load attendance records for the selected month
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
        .toISOString().split('T')[0];
      
      const records = await trpc.attendance.getByStudent.query({
        studentId,
        startDate,
        endDate
      });
      
      setAttendanceRecords(records);
      
      // Calculate statistics
      const stats = {
        totalDays: records.length,
        presentDays: records.filter(r => r.status === 'present').length,
        absentDays: records.filter(r => r.status === 'absent').length,
        leaveDays: records.filter(r => r.status === 'leave').length,
        sickDays: records.filter(r => r.status === 'sick').length,
        attendanceRate: records.length > 0 
          ? (records.filter(r => r.status === 'present').length / records.length) * 100 
          : 0
      };
      
      setStats(stats);
    } catch (error) {
      console.error('Failed to load student attendance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, selectedMonth]);

  useEffect(() => {
    loadStudentAttendance();
  }, [loadStudentAttendance]);

  useEffect(() => {
    let filtered = attendanceRecords;

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(record => record.status === selectedStatus);
    }

    setFilteredRecords(filtered);
  }, [attendanceRecords, selectedStatus]);

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'sick': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'leave': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const baseClasses = "flex items-center space-x-1 capitalize";
    switch (status) {
      case 'present': 
        return <Badge className={`${baseClasses} bg-green-100 text-green-800`}>
          <CheckCircle className="h-3 w-3" /><span>Present</span>
        </Badge>;
      case 'absent': 
        return <Badge className={`${baseClasses} bg-red-100 text-red-800`}>
          <XCircle className="h-3 w-3" /><span>Absent</span>
        </Badge>;
      case 'sick': 
        return <Badge className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
          <AlertTriangle className="h-3 w-3" /><span>Sick</span>
        </Badge>;
      case 'leave': 
        return <Badge className={`${baseClasses} bg-blue-100 text-blue-800`}>
          <Clock className="h-3 w-3" /><span>Leave</span>
        </Badge>;
      default: 
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    return options;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-lg">Loading your attendance record...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
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
                <p className="text-2xl font-bold">{stats.sickDays + stats.leaveDays}</p>
                <p className="text-sm text-gray-600">Sick/Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className={`text-2xl font-bold ${getAttendanceRateColor(stats.attendanceRate)}`}>
                  {stats.attendanceRate.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">Attendance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Performance Indicator */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">📊 Your Attendance Performance</h3>
              <div className="flex items-center space-x-4">
                <div className={`text-2xl font-bold ${getAttendanceRateColor(stats.attendanceRate)}`}>
                  {stats.attendanceRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  {stats.attendanceRate >= 90 && "🎉 Excellent attendance! Keep it up!"}
                  {stats.attendanceRate >= 75 && stats.attendanceRate < 90 && "👍 Good attendance, try to improve!"}
                  {stats.attendanceRate < 75 && "⚠️ Your attendance needs improvement"}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-lg font-semibold">
                {stats.presentDays} present out of {stats.totalDays} days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>My Attendance Record</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Select Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filter by Status</Label>
              <Select value={selectedStatus} onValueChange={(value: AttendanceStatus | 'all') => setSelectedStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present Only</SelectItem>
                  <SelectItem value="absent">Absent Only</SelectItem>
                  <SelectItem value="sick">Sick Only</SelectItem>
                  <SelectItem value="leave">Leave Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Attendance Records Table */}
          {filteredRecords.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Check-out Time</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record: AttendanceRecord) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.date.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {record.date.toLocaleDateString('en-US', { weekday: 'long' })}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        {record.check_in_time 
                          ? record.check_in_time.toLocaleTimeString() 
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {record.check_out_time 
                          ? record.check_out_time.toLocaleTimeString() 
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={record.notes || ''}>
                          {record.notes || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No attendance records found</p>
              <p className="text-sm text-gray-400">
                {attendanceRecords.length === 0 
                  ? `No records for ${new Date(selectedMonth).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                  : 'Try adjusting your filters to see more records'
                }
              </p>
            </div>
          )}

          {/* Summary for selected month */}
          {attendanceRecords.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3">
                📈 Summary for {new Date(selectedMonth).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.presentDays}</div>
                  <div className="text-gray-600">Present Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.absentDays}</div>
                  <div className="text-gray-600">Absent Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.sickDays}</div>
                  <div className="text-gray-600">Sick Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.leaveDays}</div>
                  <div className="text-gray-600">Leave Days</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}