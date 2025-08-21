import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  BarChart3, 
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

import type { 
  Class, 
  AttendanceReportFilter, 
  ExportFormat,
  AttendanceStatus
} from '../../../../server/src/schema';

interface AttendanceReportRow {
  student_name: string;
  nis_nisn: string;
  class_name: string;
  date: string;
  status: AttendanceStatus;
  check_in_time: string | null;
  check_out_time: string | null;
}

interface AttendanceSummary {
  total_students: number;
  total_days: number;
  present_count: number;
  absent_count: number;
  leave_count: number;
  sick_count: number;
  overall_attendance_rate: number;
  class_summaries: Array<{
    class_name: string;
    student_count: number;
    attendance_rate: number;
  }>;
}

export default function ReportsGeneration() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [reportData, setReportData] = useState<AttendanceReportRow[]>([]);
  const [summaryData, setSummaryData] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('generate');

  // Report filters
  const [filters, setFilters] = useState<AttendanceReportFilter>({
    class_id: undefined,
    student_id: undefined,
    start_date: undefined,
    end_date: undefined,
    status: undefined
  });

  const loadClasses = useCallback(async () => {
    try {
      const allClasses = await trpc.classes.getAll.query();
      setClasses(allClasses);
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleGenerateReport = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [reportResult, summaryResult] = await Promise.all([
        trpc.reports.generate.query(filters),
        trpc.reports.getSummary.query(filters)
      ]);
      
      setReportData(reportResult);
      setSummaryData(summaryResult);
      setActiveTab('results');
    } catch (error) {
      console.error('Failed to generate report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = async (format: ExportFormat) => {
    try {
      setIsExporting(true);
      setError(null);

      const result = await trpc.reports.export.mutate({
        filters,
        format,
        filename: `attendance_report_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      });

      // Create download link
      const blob = new Blob([result.buffer], { type: result.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Failed to export report:', error);
      setError('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      class_id: undefined,
      student_id: undefined,
      start_date: undefined,
      end_date: undefined,
      status: undefined
    });
    setReportData([]);
    setSummaryData(null);
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'sick': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
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
          <AlertCircle className="h-3 w-3" /><span>Sick</span>
        </Badge>;
      case 'leave': 
        return <Badge className={`${baseClasses} bg-blue-100 text-blue-800`}>
          <Clock className="h-3 w-3" /><span>Leave</span>
        </Badge>;
      default: 
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Attendance Reports</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Generate Report</span>
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Results</span>
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex items-center space-x-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Summary</span>
              </TabsTrigger>
            </TabsList>

            {/* Generate Report Tab */}
            <TabsContent value="generate" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Class Filter */}
                <div className="space-y-2">
                  <Label>Class (Optional)</Label>
                  <Select
                    value={filters.class_id?.toString() || 'all'}
                    onValueChange={(value: string) =>
                      setFilters(prev => ({
                        ...prev,
                        class_id: value === 'all' ? undefined : parseInt(value)
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All classes" />
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

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label>Status (Optional)</Label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value: string) =>
                      setFilters(prev => ({
                        ...prev,
                        status: value === 'all' ? undefined : value as AttendanceStatus
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Student ID Filter */}
                <div className="space-y-2">
                  <Label>Student ID (Optional)</Label>
                  <Input
                    type="number"
                    placeholder="Enter student ID"
                    value={filters.student_id || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFilters(prev => ({
                        ...prev,
                        student_id: e.target.value ? parseInt(e.target.value) : undefined
                      }))
                    }
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label>Start Date (Optional)</Label>
                  <Input
                    type="date"
                    value={filters.start_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFilters(prev => ({
                        ...prev,
                        start_date: e.target.value || undefined
                      }))
                    }
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={filters.end_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFilters(prev => ({
                        ...prev,
                        end_date: e.target.value || undefined
                      }))
                    }
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={resetFilters}>
                  Reset Filters
                </Button>
                <div className="space-x-2">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    <span>{isLoading ? 'Generating...' : 'Generate Report'}</span>
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-6">
              {reportData.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No report data available</p>
                  <p className="text-sm text-gray-400">Generate a report to see results here</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">Attendance Report</h3>
                      <p className="text-sm text-gray-600">{reportData.length} records found</p>
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handleExportReport('pdf')}
                        disabled={isExporting}
                        className="flex items-center space-x-2"
                      >
                        {isExporting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span>Export PDF</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleExportReport('excel')}
                        disabled={isExporting}
                        className="flex items-center space-x-2"
                      >
                        {isExporting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4" />
                        )}
                        <span>Export Excel</span>
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>NIS/NISN</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Check-out</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((row: AttendanceReportRow, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{row.student_name}</TableCell>
                            <TableCell>{row.nis_nisn}</TableCell>
                            <TableCell>{row.class_name}</TableCell>
                            <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                            <TableCell>{getStatusBadge(row.status)}</TableCell>
                            <TableCell>
                              {row.check_in_time 
                                ? new Date(row.check_in_time).toLocaleTimeString() 
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              {row.check_out_time 
                                ? new Date(row.check_out_time).toLocaleTimeString() 
                                : '-'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-6">
              {summaryData ? (
                <>
                  {/* Overall Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{summaryData.total_students}</p>
                        <p className="text-sm text-gray-600">Total Students</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">{summaryData.total_days}</p>
                        <p className="text-sm text-gray-600">Total Days</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{summaryData.present_count}</p>
                        <p className="text-sm text-gray-600">Present</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{summaryData.absent_count}</p>
                        <p className="text-sm text-gray-600">Absent</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{summaryData.sick_count}</p>
                        <p className="text-sm text-gray-600">Sick</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-indigo-600">
                          {summaryData.overall_attendance_rate.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600">Attendance Rate</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Class-wise Summary */}
                  {summaryData.class_summaries.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Class-wise Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Class</TableHead>
                                <TableHead>Student Count</TableHead>
                                <TableHead>Attendance Rate</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {summaryData.class_summaries.map((classSummary, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{classSummary.class_name}</TableCell>
                                  <TableCell>{classSummary.student_count}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <div 
                                        className={`px-2 py-1 rounded text-sm font-medium ${
                                          classSummary.attendance_rate >= 90 
                                            ? 'bg-green-100 text-green-800'
                                            : classSummary.attendance_rate >= 75
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}
                                      >
                                        {classSummary.attendance_rate.toFixed(1)}%
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No summary data available</p>
                  <p className="text-sm text-gray-400">Generate a report to see summary statistics</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}