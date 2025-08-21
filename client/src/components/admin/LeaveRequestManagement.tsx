import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Calendar, User, AlertCircle, FileText } from 'lucide-react';

import type { LeaveRequest, LeaveRequestStatus, ApproveLeaveRequestInput } from '../../../../server/src/schema';

export default function LeaveRequestManagement() {
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalForm, setApprovalForm] = useState<{
    status: 'approved' | 'rejected';
    notes: string;
  }>({
    status: 'approved',
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  const loadLeaveRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allReqs, pendingReqs] = await Promise.all([
        trpc.leaveRequests.getAll.query(),
        trpc.leaveRequests.getPending.query()
      ]);
      setAllRequests(allReqs);
      setPendingRequests(pendingReqs);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
      setError('Failed to load leave requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaveRequests();
  }, [loadLeaveRequests]);

  const handleApproveRequest = async (requestId: number, status: 'approved' | 'rejected', approvedBy: number = 1) => {
    try {
      const approvalData: ApproveLeaveRequestInput = {
        id: requestId,
        approved_by: approvedBy,
        status
      };
      
      await trpc.leaveRequests.approve.mutate(approvalData);
      await loadLeaveRequests(); // Reload data
      setIsApprovalDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Failed to approve/reject leave request:', error);
      setError('Failed to process leave request');
    }
  };

  const handleDeleteRequest = async (requestId: number) => {
    if (!confirm('Are you sure you want to delete this leave request?')) return;
    
    try {
      await trpc.leaveRequests.delete.mutate({ id: requestId });
      await loadLeaveRequests();
    } catch (error) {
      console.error('Failed to delete leave request:', error);
      setError('Failed to delete leave request');
    }
  };

  const openApprovalDialog = (request: LeaveRequest, status: 'approved' | 'rejected') => {
    setSelectedRequest(request);
    setApprovalForm({ status, notes: '' });
    setIsApprovalDialogOpen(true);
  };

  const getStatusBadge = (status: LeaveRequestStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getFilteredRequests = (status?: LeaveRequestStatus) => {
    if (!status) return allRequests;
    return allRequests.filter(req => req.status === status);
  };

  const requestCounts = {
    total: allRequests.length,
    pending: allRequests.filter(req => req.status === 'pending').length,
    approved: allRequests.filter(req => req.status === 'approved').length,
    rejected: allRequests.filter(req => req.status === 'rejected').length
  };

  const formatDateRange = (startDate: Date, endDate: Date) => {
    const start = startDate.toLocaleDateString();
    const end = endDate.toLocaleDateString();
    return start === end ? start : `${start} - ${end}`;
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
                <p className="text-sm text-gray-600">Pending</p>
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
            <FileText className="h-5 w-5" />
            <span>Leave Request Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Pending ({requestCounts.pending})</span>
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Approved ({requestCounts.approved})</span>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center space-x-2">
                <XCircle className="h-4 w-4" />
                <span>Rejected ({requestCounts.rejected})</span>
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>All ({requestCounts.total})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <LeaveRequestTable
                requests={getFilteredRequests('pending')}
                onApprove={(request) => openApprovalDialog(request, 'approved')}
                onReject={(request) => openApprovalDialog(request, 'rejected')}
                onDelete={handleDeleteRequest}
                showActions={true}
              />
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              <LeaveRequestTable
                requests={getFilteredRequests('approved')}
                onDelete={handleDeleteRequest}
                showActions={false}
              />
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <LeaveRequestTable
                requests={getFilteredRequests('rejected')}
                onDelete={handleDeleteRequest}
                showActions={false}
              />
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <LeaveRequestTable
                requests={getFilteredRequests()}
                onApprove={(request) => openApprovalDialog(request, 'approved')}
                onReject={(request) => openApprovalDialog(request, 'rejected')}
                onDelete={handleDeleteRequest}
                showActions={true}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      {selectedRequest && (
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {approvalForm.status === 'approved' ? 'Approve' : 'Reject'} Leave Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">Student ID: {selectedRequest.student_id}</p>
                <p className="text-sm text-gray-600">
                  {formatDateRange(selectedRequest.start_date, selectedRequest.end_date)}
                </p>
                <p className="text-sm mt-2"><strong>Reason:</strong> {selectedRequest.reason}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {approvalForm.status === 'approved' ? 'Approval Notes (Optional)' : 'Rejection Reason'}
                </label>
                <Textarea
                  value={approvalForm.notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setApprovalForm(prev => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder={`Enter ${approvalForm.status === 'approved' ? 'approval notes' : 'rejection reason'}...`}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsApprovalDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleApproveRequest(selectedRequest.id, approvalForm.status)}
                  className={approvalForm.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {approvalForm.status === 'approved' ? 'Approve Request' : 'Reject Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface LeaveRequestTableProps {
  requests: LeaveRequest[];
  onApprove?: (request: LeaveRequest) => void;
  onReject?: (request: LeaveRequest) => void;
  onDelete: (requestId: number) => void;
  showActions: boolean;
}

function LeaveRequestTable({ requests, onApprove, onReject, onDelete, showActions }: LeaveRequestTableProps) {
  const formatDateRange = (startDate: Date, endDate: Date) => {
    const start = startDate.toLocaleDateString();
    const end = endDate.toLocaleDateString();
    return start === end ? start : `${start} - ${end}`;
  };

  const getStatusBadge = (status: LeaveRequestStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Date Range</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request: LeaveRequest) => (
            <TableRow key={request.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>Student ID: {request.student_id}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDateRange(request.start_date, request.end_date)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-xs truncate" title={request.reason}>
                  {request.reason}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell>{request.created_at.toLocaleDateString()}</TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {request.status === 'pending' && onApprove && onReject && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onApprove(request)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onReject(request)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="text-center py-8 text-gray-500">
                No leave requests found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}