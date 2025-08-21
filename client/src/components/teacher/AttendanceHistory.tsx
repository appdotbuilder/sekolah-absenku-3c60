import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, AlertTriangle, Calendar, Users, Edit, Search, Filter } from 'lucide-react';

import type { 
  Class, 
  AttendanceRecord, 
  UpdateAttendanceInput, 
  AttendanceStatus 
} from '../../../../server/src/schema';

interface AttendanceHistoryProps {
  teacherId: number;
}

export default function AttendanceHistory({ teacherId }: AttendanceHistoryProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateAttendanceInput>({
    id: 0,
    status: 'present',
    check_in_time: null,
    check_out_time: null,
    notes: null
  });

  const loadTeacherClasses = useCallback(async () => {
    try {
      const teacherClasses = await trpc.classes.getByTeacher.query({ teacherId });
      setClasses(teacherClasses);
    } catch (error) {
      console.error('Failed to load teacher classes:', error);
    }
  }, [teacherId]);

  const loadAttendanceHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get attendance records for all teacher's classes
      const allRecords: AttendanceRecord[] = [];
      
      for (const cls of classes) {
        try {
          const classRecords = await trpc.attendance.getReport.query({
            class_id: cls.id,
            start_date: undefined,
            end_date: undefined
          });
          allRecords.push(...classRecords);
        } catch (error) {
          console.error(`Failed to load records for class ${cls.id}:`, error);
        }
      }
      
      // Filter records to only include those recorded by this teacher
      const teacherRecords = allRecords.filter(record => record.recorded_by === teacherId);
      
      setAttendanceRecords(teacherRecords);
      setFilteredRecords(teacherRecords);
    } catch (error) {
      console.error('Failed to load attendance history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [classes, teacherId]);

  useEffect(() => {
    loadTeacherClasses();
  }, [loadTeacherClasses]);

  useEffect(() => {
    if (classes.length > 0) {
      loadAttendanceHistory();
    }
  }, [classes, loadAttendanceHistory]);

  useEffect(() => {
    let filtered = attendanceRecords;

    // Filter by class
    if (selectedClassId !== 'all') {
      filtered = filtered.filter(record => record.class_id.toString() === selectedClassId);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(record => record.status === selectedStatus);
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(record => 
        record.date.toISOString().split('T')[0] === selectedDate
      );
    }

    // Filter by search term (student ID)
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.student_id.toString().includes(searchTerm) ||
        (record.notes && record.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredRecords(filtered);
  }, [attendanceRecords, selectedClassId, selectedStatus, selectedDate, searchTerm]);

  const handleEditRecord = async (recordId: number) => {
    try {
      const updatedRecord = await trpc.attendance.update.mutate(editForm);
      
      // Update the local state
      setAttendanceRecords(prev => 
        prev.map(record => record.id === updatedRecord.id ? updatedRecord : record)
      );
      
      setEditingRecord(null);
    } catch (error) {
      console.error('Failed to update attendance record:', error);
    }
  };

  const openEditDialog = (record: AttendanceRecord) => {
    setEditForm({
      id: record.id,
      status: record.status,
      check_in_time: record.check_in_time ? record.check_in_time.toTimeString().slice(0, 5) : null,
      check_out_time: record.check_out_time ? record.check_out_time.toTimeString().slice(0, 5) : null,
      notes: record.notes
    });
    setEditingRecord(record);
  };

  const resetFilters = () => {
    setSelectedClassId('all');
    setSelectedStatus('all');
    setSelectedDate('');
    setSearchTerm('');
  };

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

  const getClassName = (classId: number) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name} - ${cls.grade_level}` : `Class ${classId}`;
  };

  const recordCounts = {
    total: attendanceRecords.length,
    present: attendanceRecords.filter(r => r.status === 'present').length,
    absent: attendanceRecords.filter(r => r.status === 'absent').length,
    sick: attendanceRecords.filter(r => r.status === 'sick').length,
    leave: attendanceRecords.filter(r => r.status === 'leave').length
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-lg">Loading attendance history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{recordCounts.total}</p>
            <p className="text-sm text-gray-600">Total Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{recordCounts.present}</p>
            <p className="text-sm text-gray-600">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{recordCounts.absent}</p>
            <p className="text-sm text-gray-600">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{recordCounts.sick}</p>
            <p className="text-sm text-gray-600">Sick</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{recordCounts.leave}</p>
            <p className="text-sm text-gray-600">Leave</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Attendance History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue />
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

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={(value: AttendanceStatus | 'all') => setSelectedStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Student ID or notes..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={resetFilters} className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredRecords.length} of {attendanceRecords.length} records
            </p>
          </div>

          {/* Attendance Records Table */}
          {filteredRecords.length > 0 ? (
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Recorded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record: AttendanceRecord) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.date.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{getClassName(record.class_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">Student {record.student_id}</TableCell>
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
                      <TableCell>{record.created_at.toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
                  ? 'Start taking attendance to see records here'
                  : 'Try adjusting your filters to see more records'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Record Dialog */}
      {editingRecord && (
        <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Attendance Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">Student ID: {editingRecord.student_id}</p>
                <p className="text-sm text-gray-600">Date: {editingRecord.date.toLocaleDateString()}</p>
                <p className="text-sm text-gray-600">Class: {getClassName(editingRecord.class_id)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value: AttendanceStatus) =>
                      setEditForm(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editForm.status === 'present' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-in Time</Label>
                    <Input
                      type="time"
                      value={editForm.check_in_time || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditForm(prev => ({ ...prev, check_in_time: e.target.value || null }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out Time</Label>
                    <Input
                      type="time"
                      value={editForm.check_out_time || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditForm(prev => ({ ...prev, check_out_time: e.target.value || null }))
                      }
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editForm.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditForm(prev => ({ ...prev, notes: e.target.value || null }))
                  }
                  placeholder="Optional notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingRecord(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleEditRecord(editingRecord.id)}
                >
                  Update Record
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}