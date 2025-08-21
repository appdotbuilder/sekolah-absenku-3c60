import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, AlertTriangle, Save, Calendar, Users, Loader2, AlertCircle } from 'lucide-react';

import type { 
  Class, 
  Student, 
  AttendanceRecord, 
  RecordAttendanceInput, 
  AttendanceStatus 
} from '../../../../server/src/schema';

interface AttendanceManagementProps {
  teacherId: number;
}

export default function AttendanceManagement({ teacherId }: AttendanceManagementProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Attendance form state - student ID mapped to attendance data
  const [attendanceForm, setAttendanceForm] = useState<Record<number, {
    status: AttendanceStatus;
    check_in_time: string;
    check_out_time: string;
    notes: string;
  }>>({});

  const loadTeacherClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const teacherClasses = await trpc.classes.getByTeacher.query({ teacherId });
      setClasses(teacherClasses);
      
      if (teacherClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(teacherClasses[0].id.toString());
      }
    } catch (error) {
      console.error('Failed to load teacher classes:', error);
      setError('Failed to load your classes');
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, selectedClassId]);

  const loadClassStudents = useCallback(async () => {
    if (!selectedClassId) return;

    try {
      const classStudents = await trpc.students.getByClass.query({ classId: parseInt(selectedClassId) });
      setStudents(classStudents);
      
      // Initialize attendance form for each student
      const initialForm: Record<number, any> = {};
      classStudents.forEach((student: Student) => {
        initialForm[student.id] = {
          status: 'present' as AttendanceStatus,
          check_in_time: '08:00',
          check_out_time: '15:00',
          notes: ''
        };
      });
      setAttendanceForm(initialForm);
    } catch (error) {
      console.error('Failed to load class students:', error);
      setError('Failed to load students for this class');
    }
  }, [selectedClassId]);

  const loadExistingAttendance = useCallback(async () => {
    if (!selectedClassId || !selectedDate) return;

    try {
      const existingAttendance = await trpc.attendance.getByClass.query({
        classId: parseInt(selectedClassId),
        date: selectedDate
      });
      
      setAttendanceRecords(existingAttendance);
      
      // Update form with existing data
      const updatedForm = { ...attendanceForm };
      existingAttendance.forEach((record: AttendanceRecord) => {
        if (updatedForm[record.student_id]) {
          updatedForm[record.student_id] = {
            status: record.status,
            check_in_time: record.check_in_time ? 
              new Date(record.check_in_time).toTimeString().slice(0, 5) : '08:00',
            check_out_time: record.check_out_time ? 
              new Date(record.check_out_time).toTimeString().slice(0, 5) : '15:00',
            notes: record.notes || ''
          };
        }
      });
      setAttendanceForm(updatedForm);
    } catch (error) {
      console.error('Failed to load existing attendance:', error);
    }
  }, [selectedClassId, selectedDate, attendanceForm]);

  useEffect(() => {
    loadTeacherClasses();
  }, [loadTeacherClasses]);

  useEffect(() => {
    if (selectedClassId) {
      loadClassStudents();
    }
  }, [loadClassStudents]);

  useEffect(() => {
    if (selectedClassId && selectedDate && students.length > 0) {
      loadExistingAttendance();
    }
  }, [selectedClassId, selectedDate, students.length]);

  const handleAttendanceChange = (studentId: number, field: string, value: string) => {
    setAttendanceForm(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleBulkStatusChange = (status: AttendanceStatus) => {
    const updatedForm = { ...attendanceForm };
    Object.keys(updatedForm).forEach(studentId => {
      updatedForm[parseInt(studentId)].status = status;
    });
    setAttendanceForm(updatedForm);
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || !selectedDate) {
      setError('Please select a class and date');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const attendanceInputs: RecordAttendanceInput[] = students.map((student: Student) => {
        const formData = attendanceForm[student.id];
        const checkInDateTime = `${selectedDate}T${formData.check_in_time}:00`;
        const checkOutDateTime = `${selectedDate}T${formData.check_out_time}:00`;
        
        return {
          student_id: student.id,
          class_id: parseInt(selectedClassId),
          date: selectedDate,
          status: formData.status,
          check_in_time: formData.status === 'present' ? checkInDateTime : null,
          check_out_time: formData.status === 'present' ? checkOutDateTime : null,
          notes: formData.notes || null,
          recorded_by: teacherId
        };
      });
      
      await trpc.attendance.bulkRecord.mutate(attendanceInputs);
      await loadExistingAttendance(); // Reload to show saved data
      
      setSuccess('Attendance saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Failed to save attendance:', error);
      setError('Failed to save attendance. Please try again.');
    } finally {
      setIsSaving(false);
    }
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

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-green-50 border-green-200';
      case 'absent': return 'bg-red-50 border-red-200';
      case 'sick': return 'bg-yellow-50 border-yellow-200';
      case 'leave': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-lg">Loading attendance management...</div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No classes assigned</p>
            <p className="text-sm text-gray-400">Contact your administrator to get assigned to classes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Class and Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Take Attendance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls: Class) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} - {cls.grade_level}
                    </SelectItem>
                  ))}
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
          </div>
        </CardContent>
      </Card>

      {selectedClassId && students.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Student Attendance - {new Date(selectedDate).toLocaleDateString()}</span>
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {students.length} students in {classes.find(c => c.id.toString() === selectedClassId)?.name}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right text-sm text-gray-600">
                  <p>Quick Actions:</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('present')}>
                  Mark All Present
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('absent')}>
                  Mark All Absent
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {students.map((student: Student) => {
                const formData = attendanceForm[student.id] || {
                  status: 'present' as AttendanceStatus,
                  check_in_time: '08:00',
                  check_out_time: '15:00',
                  notes: ''
                };

                return (
                  <div 
                    key={student.id} 
                    className={`p-4 border rounded-lg ${getStatusColor(formData.status)}`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                      {/* Student Info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(formData.status)}
                          <div>
                            <p className="font-medium">Student ID: {student.id}</p>
                            <p className="text-sm text-gray-600">NIS/NISN: {student.nis_nisn}</p>
                          </div>
                        </div>
                      </div>

                      {/* Status Selection */}
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: AttendanceStatus) => 
                            handleAttendanceChange(student.id, 'status', value)
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span>Present</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="absent">
                              <div className="flex items-center space-x-2">
                                <XCircle className="h-3 w-3 text-red-600" />
                                <span>Absent</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="sick">
                              <div className="flex items-center space-x-2">
                                <AlertTriangle className="h-3 w-3 text-yellow-600" />
                                <span>Sick</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="leave">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3 text-blue-600" />
                                <span>Leave</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Check-in Time */}
                      <div className="space-y-1">
                        <Label className="text-xs">Check-in</Label>
                        <Input
                          type="time"
                          value={formData.check_in_time}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleAttendanceChange(student.id, 'check_in_time', e.target.value)
                          }
                          disabled={formData.status !== 'present'}
                          className="h-8"
                        />
                      </div>

                      {/* Check-out Time */}
                      <div className="space-y-1">
                        <Label className="text-xs">Check-out</Label>
                        <Input
                          type="time"
                          value={formData.check_out_time}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleAttendanceChange(student.id, 'check_out_time', e.target.value)
                          }
                          disabled={formData.status !== 'present'}
                          className="h-8"
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-1">
                        <Label className="text-xs">Notes</Label>
                        <Input
                          placeholder="Optional notes..."
                          value={formData.notes}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleAttendanceChange(student.id, 'notes', e.target.value)
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6">
              <Button
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="flex items-center space-x-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Attendance'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClassId && students.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No students found in this class</p>
              <p className="text-sm text-gray-400">Contact your administrator to add students to this class</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}