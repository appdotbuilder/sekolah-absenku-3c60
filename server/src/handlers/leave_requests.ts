import { db } from '../db';
import { leaveRequestsTable, studentsTable, attendanceRecordsTable } from '../db/schema';
import { 
  type CreateLeaveRequestInput, 
  type ApproveLeaveRequestInput, 
  type LeaveRequest 
} from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export async function createLeaveRequest(input: CreateLeaveRequestInput): Promise<LeaveRequest> {
  try {
    // Verify student exists
    const student = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.student_id))
      .execute();

    if (student.length === 0) {
      throw new Error('Student not found');
    }

    // Validate date range
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);
    
    if (startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    // Insert leave request
    const result = await db.insert(leaveRequestsTable)
      .values({
        student_id: input.student_id,
        start_date: startDate,
        end_date: endDate,
        reason: input.reason,
        status: 'pending'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Leave request creation failed:', error);
    throw error;
  }
}

export async function approveLeaveRequest(input: ApproveLeaveRequestInput): Promise<LeaveRequest> {
  try {
    // First, get the current leave request
    const existingRequest = await db.select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.id, input.id))
      .execute();

    if (existingRequest.length === 0) {
      throw new Error('Leave request not found');
    }

    const request = existingRequest[0];

    if (request.status !== 'pending') {
      throw new Error('Leave request has already been processed');
    }

    // Update leave request status
    const updateData: any = {
      status: input.status,
      approved_by: input.approved_by,
      approved_at: new Date()
    };

    const result = await db.update(leaveRequestsTable)
      .set(updateData)
      .where(eq(leaveRequestsTable.id, input.id))
      .returning()
      .execute();

    // If approved, create attendance records for the leave period
    if (input.status === 'approved') {
      await createAttendanceRecordsForLeave(request, input.approved_by);
    }

    return result[0];
  } catch (error) {
    console.error('Leave request approval failed:', error);
    throw error;
  }
}

async function createAttendanceRecordsForLeave(
  leaveRequest: typeof leaveRequestsTable.$inferSelect, 
  approvedBy: number
): Promise<void> {
  // Get student's class
  const student = await db.select()
    .from(studentsTable)
    .where(eq(studentsTable.id, leaveRequest.student_id))
    .execute();

  if (student.length === 0) {
    throw new Error('Student not found');
  }

  const classId = student[0].class_id;
  
  // Create attendance records for each day in the leave period
  const startDate = new Date(leaveRequest.start_date);
  const endDate = new Date(leaveRequest.end_date);
  const attendanceRecords = [];

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    // Check if attendance record already exists for this date
    const existingRecord = await db.select()
      .from(attendanceRecordsTable)
      .where(
        and(
          eq(attendanceRecordsTable.student_id, leaveRequest.student_id),
          eq(attendanceRecordsTable.date, new Date(date))
        )
      )
      .execute();

    // Only create if no record exists
    if (existingRecord.length === 0) {
      attendanceRecords.push({
        student_id: leaveRequest.student_id,
        class_id: classId,
        date: new Date(date),
        status: 'leave' as const,
        recorded_by: approvedBy,
        notes: `Approved leave: ${leaveRequest.reason}`
      });
    }
  }

  // Insert all attendance records
  if (attendanceRecords.length > 0) {
    await db.insert(attendanceRecordsTable)
      .values(attendanceRecords)
      .execute();
  }
}

export async function getLeaveRequestsByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<LeaveRequest[]> {
  try {
    const result = await db.select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.status, status))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to get leave requests by status:', error);
    throw error;
  }
}

export async function getLeaveRequestsByStudent(studentId: number): Promise<LeaveRequest[]> {
  try {
    // Verify student exists
    const student = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, studentId))
      .execute();

    if (student.length === 0) {
      throw new Error('Student not found');
    }

    const result = await db.select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.student_id, studentId))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to get leave requests by student:', error);
    throw error;
  }
}

export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const result = await db.select()
      .from(leaveRequestsTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to get all leave requests:', error);
    throw error;
  }
}

export async function deleteLeaveRequest(id: number): Promise<{ success: boolean }> {
  try {
    // Check if leave request exists and is still pending
    const existingRequest = await db.select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.id, id))
      .execute();

    if (existingRequest.length === 0) {
      throw new Error('Leave request not found');
    }

    if (existingRequest[0].status !== 'pending') {
      throw new Error('Can only delete pending leave requests');
    }

    // Delete the leave request
    await db.delete(leaveRequestsTable)
      .where(eq(leaveRequestsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Failed to delete leave request:', error);
    throw error;
  }
}

export async function getPendingLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const result = await db.select()
      .from(leaveRequestsTable)
      .where(eq(leaveRequestsTable.status, 'pending'))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to get pending leave requests:', error);
    throw error;
  }
}