import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Users, CheckCircle, XCircle, TrendingUp, Calendar } from 'lucide-react';

import type { Class, Student } from '../../../../server/src/schema';

interface ClassOverviewProps {
  teacherId: number;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  sickDays: number;
  attendanceRate: number;
}

export default function ClassOverview({ teacherId }: ClassOverviewProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [classStats, setClassStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    sickDays: 0,
    attendanceRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

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
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, selectedClassId]);

  const loadClassData = useCallback(async () => {
    if (!selectedClassId) return;

    try {
      const [classStudents, attendanceStats] = await Promise.all([
        trpc.students.getByClass.query({ classId: parseInt(selectedClassId) }),
        trpc.attendance.getStats.query({
          classId: parseInt(selectedClassId),
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
          endDate: new Date().toISOString().split('T')[0]
        })
      ]);
      
      setStudents(classStudents);
      setClassStats(attendanceStats);
    } catch (error) {
      console.error('Failed to load class data:', error);
    }
  }, [selectedClassId]);

  useEffect(() => {
    loadTeacherClasses();
  }, [loadTeacherClasses]);

  useEffect(() => {
    if (selectedClassId) {
      loadClassData();
    }
  }, [loadClassData]);

  const getSelectedClass = () => {
    return classes.find(c => c.id.toString() === selectedClassId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-lg">Loading class overview...</div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No classes assigned</p>
            <p className="text-sm text-gray-400">Contact your administrator to get assigned to classes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedClass = getSelectedClass();

  return (
    <div className="space-y-6">
      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>My Classes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class to view" />
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
            <Badge variant="outline" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{classes.length} classes assigned</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <>
          {/* Class Information */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{students.length}</p>
                    <p className="text-sm text-gray-600">Total Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-green-500">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{classStats.attendanceRate.toFixed(1)}%</p>
                    <p className="text-sm text-gray-600">Attendance Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{classStats.totalDays}</p>
                    <p className="text-sm text-gray-600">Days Recorded</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">{classStats.presentDays}</p>
                    <p className="text-sm text-gray-600">Present Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Class Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>{selectedClass.name} - {selectedClass.grade_level}</span>
                </div>
                {selectedClass.homeroom_teacher_id === teacherId && (
                  <Badge className="bg-green-100 text-green-800">Homeroom Teacher</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Class Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Class Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Class Name:</span>
                      <span className="font-medium">{selectedClass.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Grade Level:</span>
                      <span className="font-medium">{selectedClass.grade_level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Students:</span>
                      <span className="font-medium">{students.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Class Created:</span>
                      <span className="font-medium">{selectedClass.created_at.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Attendance Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Attendance Summary (Last 30 Days)</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-800">Present</span>
                      </div>
                      <span className="font-medium text-green-600">{classStats.presentDays}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-red-800">Absent</span>
                      </div>
                      <span className="font-medium text-red-600">{classStats.absentDays}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-yellow-800">Sick</span>
                      </div>
                      <span className="font-medium text-yellow-600">{classStats.sickDays}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-800">Leave</span>
                      </div>
                      <span className="font-medium text-blue-600">{classStats.leaveDays}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Students in {selectedClass.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>NIS/NISN</TableHead>
                        <TableHead>Enrollment Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student: Student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span>Student {student.id}</span>
                            </div>
                          </TableCell>
                          <TableCell>{student.nis_nisn}</TableCell>
                          <TableCell>{student.created_at.toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // This would open a detailed student view
                                console.log('View student details:', student.id);
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No students enrolled in this class</p>
                  <p className="text-sm text-gray-400">Contact your administrator to add students</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <Calendar className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-2">Take Today's Attendance</h3>
                  <p className="text-sm text-gray-600 mb-3">Record attendance for all students in this class</p>
                  <Button className="w-full" size="sm">
                    Take Attendance
                  </Button>
                </div>

                <div className="p-4 border rounded-lg text-center">
                  <TrendingUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-2">View Attendance Report</h3>
                  <p className="text-sm text-gray-600 mb-3">Generate detailed attendance reports for this class</p>
                  <Button className="w-full" size="sm" variant="outline">
                    Generate Report
                  </Button>
                </div>

                <div className="p-4 border rounded-lg text-center">
                  <Users className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-2">Student Performance</h3>
                  <p className="text-sm text-gray-600 mb-3">Check individual student attendance rates</p>
                  <Button className="w-full" size="sm" variant="outline">
                    View Students
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}