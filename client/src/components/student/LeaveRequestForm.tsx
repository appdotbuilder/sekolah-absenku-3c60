import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plus, 
  Loader2, 
  AlertCircle, 
  Send,
  FileText
} from 'lucide-react';

import type { 
  LeaveRequest, 
  CreateLeaveRequestInput, 
  LeaveRequestStatus 
} from '../../../../server/src/schema';

interface LeaveRequestFormProps {
  studentId: number;
}

export default function LeaveRequestForm({ studentId }: LeaveRequestFormProps) {
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('create');

  // Form state
  const [formData, setFormData] = useState<CreateLeaveRequestInput>({
    student_id: studentId,
    start_date: '',
    end_date: '',
    reason: ''
  });

  const loadMyRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const requests = await trpc.leaveRequests.getByStudent.query({ studentId });
      setMyRequests(requests);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
      setError('Failed to load your leave requests');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadMyRequests();
  }, [loadMyRequests]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.start_date || !formData.end_date || !formData.reason.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      setError('End date must be after start date');
      return;
    }

    if (new Date(formData.start_date) < new Date()) {
      setError('Start date cannot be in the past');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newRequest = await trpc.leaveRequests.create.mutate(formData);
      setMyRequests((prev: LeaveRequest[]) => [newRequest, ...prev]);
      
      // Reset form
      setFormData({
        student_id: studentId,
        start_date: '',
        end_date: '',
        reason: ''
      });
      
      setSuccess('Leave request submitted successfully! It will be reviewed by your teacher.');
      setActiveTab('history');
      setTimeout(() => setSuccess(null), 5000);

    } catch (error) {
      console.error('Failed to submit leave request:', error);
      setError('Failed to submit leave request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: LeaveRequestStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 flex items-center space-x-1">
          <Clock className="h-3 w-3" /><span>Pending</span>
        </Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 flex items-center space-x-1">
          <CheckCircle className="h-3 w-3" /><span>Approved</span>
        </Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 flex items-center space-x-1">
          <XCircle className="h-3 w-3" /><span>Rejected</span>
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDateRange = (startDate: Date, endDate: Date) => {
    const start = startDate.toLocaleDateString();
    const end = endDate.toLocaleDateString();
    return start === end ? start : `${start} - ${end}`;
  };

  const calculateDuration = (startDate: Date, endDate: Date) => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    return diffDays;
  };

  const requestCounts = {
    total: myRequests.length,
    pending: myRequests.filter(req => req.status === 'pending').length,
    approved: myRequests.filter(req => req.status === 'approved').length,
    rejected: myRequests.filter(req => req.status === 'rejected').length
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-lg">Loading leave requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{requestCounts.total}</p>
                <p className="text-sm text-gray-600">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{requestCounts.pending}</p>
                <p className="text-sm text-gray-600">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{requestCounts.approved}</p>
                <p className="text-sm text-gray-600">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{requestCounts.rejected}</p>
                <p className="text-sm text-gray-600">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Leave Requests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>New Request</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>My Requests ({requestCounts.total})</span>
              </TabsTrigger>
            </TabsList>

            {/* Create Request Tab */}
            <TabsContent value="create" className="space-y-6">
              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">📝 Request Guidelines</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Submit requests at least 1 day in advance when possible</li>
                  <li>• Provide a clear and detailed reason for your leave</li>
                  <li>• Emergency requests may be submitted on the same day</li>
                  <li>• You will be notified once your request is reviewed</li>
                </ul>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date *</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateLeaveRequestInput) => ({ ...prev, start_date: e.target.value }))
                      }
                      min={new Date().toISOString().split('T')[0]}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date *</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateLeaveRequestInput) => ({ ...prev, end_date: e.target.value }))
                      }
                      min={formData.start_date || new Date().toISOString().split('T')[0]}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {formData.start_date && formData.end_date && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Duration:</strong> {calculateDuration(new Date(formData.start_date), new Date(formData.end_date))} day(s)
                      <br />
                      <strong>Period:</strong> {formatDateRange(new Date(formData.start_date), new Date(formData.end_date))}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Leave *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Please provide a detailed reason for your leave request..."
                    value={formData.reason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData((prev: CreateLeaveRequestInput) => ({ ...prev, reason: e.target.value }))
                    }
                    rows={4}
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500">
                    Be specific about your reason (e.g., family emergency, medical appointment, etc.)
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Request History Tab */}
            <TabsContent value="history" className="space-y-4">
              {myRequests.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date Submitted</TableHead>
                        <TableHead>Leave Period</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRequests.map((request: LeaveRequest) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.created_at.toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{formatDateRange(request.start_date, request.end_date)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {calculateDuration(request.start_date, request.end_date)} day(s)
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={request.reason}>
                              {request.reason}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No leave requests yet</p>
                  <p className="text-sm text-gray-400">Submit your first leave request using the form above</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setActiveTab('create')}
                  >
                    Create Request
                  </Button>
                </div>
              )}
              
              {/* Request Status Guide */}
              {myRequests.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">📋 Request Status Guide</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-yellow-800">Pending:</span>
                      <span className="text-gray-600">Under review</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-800">Approved:</span>
                      <span className="text-gray-600">Request accepted</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-800">Rejected:</span>
                      <span className="text-gray-600">Request declined</span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}