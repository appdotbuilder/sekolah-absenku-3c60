import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  classesTable, 
  studentsTable, 
  leaveRequestsTable,
  attendanceRecordsTable 
} from '../db/schema';
import { 
  type CreateLeaveRequestInput, 
  type ApproveLeaveRequestInput 
} from '../schema';
import { 
  createLeaveRequest,
  approveLeaveRequest,
  getLeaveRequestsByStatus,
  getLeaveRequestsByStudent,
  getAllLeaveRequests,
  deleteLeaveRequest,
  getPendingLeaveRequests
} from '../handlers/leave_requests';
import { eq, and } from 'drizzle-orm';

describe('Leave Requests Handler', () => {
  let testUserId: number;
  let testTeacherId: number;
  let testClassId: number;
  let testStudentId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user (student)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'student123',
        password_hash: 'hashed_password',
        full_name: 'Test Student',
        email: 'student@test.com',
        role: 'student'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        username: 'teacher123',
        password_hash: 'hashed_password',
        full_name: 'Test Teacher',
        email: 'teacher@test.com',
        role: 'teacher'
      })
      .returning()
      .execute();
    testTeacherId = teacherResult[0].id;

    // Create test class
    const classResult = await db.insert(classesTable)
      .values({
        name: 'Class 10A',
        grade_level: '10',
        homeroom_teacher_id: testTeacherId
      })
      .returning()
      .execute();
    testClassId = classResult[0].id;

    // Create test student
    const studentResult = await db.insert(studentsTable)
      .values({
        user_id: testUserId,
        nis_nisn: 'STU123456',
        class_id: testClassId
      })
      .returning()
      .execute();
    testStudentId = studentResult[0].id;
  });

  afterEach(resetDB);

  describe('createLeaveRequest', () => {
    it('should create a leave request successfully', async () => {
      const input: CreateLeaveRequestInput = {
        student_id: testStudentId,
        start_date: '2024-01-15',
        end_date: '2024-01-17',
        reason: 'Family emergency'
      };

      const result = await createLeaveRequest(input);

      expect(result.id).toBeDefined();
      expect(result.student_id).toEqual(testStudentId);
      expect(result.start_date).toBeInstanceOf(Date);
      expect(result.end_date).toBeInstanceOf(Date);
      expect(result.reason).toEqual('Family emergency');
      expect(result.status).toEqual('pending');
      expect(result.approved_by).toBeNull();
      expect(result.approved_at).toBeNull();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.request_date).toBeInstanceOf(Date);
    });

    it('should save leave request to database', async () => {
      const input: CreateLeaveRequestInput = {
        student_id: testStudentId,
        start_date: '2024-01-15',
        end_date: '2024-01-17',
        reason: 'Medical appointment'
      };

      const result = await createLeaveRequest(input);

      const savedRequest = await db.select()
        .from(leaveRequestsTable)
        .where(eq(leaveRequestsTable.id, result.id))
        .execute();

      expect(savedRequest).toHaveLength(1);
      expect(savedRequest[0].student_id).toEqual(testStudentId);
      expect(savedRequest[0].reason).toEqual('Medical appointment');
      expect(savedRequest[0].status).toEqual('pending');
    });

    it('should throw error for non-existent student', async () => {
      const input: CreateLeaveRequestInput = {
        student_id: 9999,
        start_date: '2024-01-15',
        end_date: '2024-01-17',
        reason: 'Family emergency'
      };

      await expect(createLeaveRequest(input)).rejects.toThrow(/student not found/i);
    });

    it('should throw error when start date is after end date', async () => {
      const input: CreateLeaveRequestInput = {
        student_id: testStudentId,
        start_date: '2024-01-20',
        end_date: '2024-01-15',
        reason: 'Invalid date range'
      };

      await expect(createLeaveRequest(input)).rejects.toThrow(/start date must be before or equal to end date/i);
    });

    it('should handle single day leave request', async () => {
      const input: CreateLeaveRequestInput = {
        student_id: testStudentId,
        start_date: '2024-01-15',
        end_date: '2024-01-15',
        reason: 'Doctor appointment'
      };

      const result = await createLeaveRequest(input);

      expect(result.start_date).toEqual(result.end_date);
      expect(result.reason).toEqual('Doctor appointment');
    });
  });

  describe('approveLeaveRequest', () => {
    let testLeaveRequestId: number;

    beforeEach(async () => {
      const leaveRequest = await db.insert(leaveRequestsTable)
        .values({
          student_id: testStudentId,
          start_date: new Date('2024-01-15'),
          end_date: new Date('2024-01-17'),
          reason: 'Test leave',
          status: 'pending'
        })
        .returning()
        .execute();
      testLeaveRequestId = leaveRequest[0].id;
    });

    it('should approve leave request successfully', async () => {
      const input: ApproveLeaveRequestInput = {
        id: testLeaveRequestId,
        approved_by: testTeacherId,
        status: 'approved'
      };

      const result = await approveLeaveRequest(input);

      expect(result.id).toEqual(testLeaveRequestId);
      expect(result.status).toEqual('approved');
      expect(result.approved_by).toEqual(testTeacherId);
      expect(result.approved_at).toBeInstanceOf(Date);
    });

    it('should reject leave request successfully', async () => {
      const input: ApproveLeaveRequestInput = {
        id: testLeaveRequestId,
        approved_by: testTeacherId,
        status: 'rejected'
      };

      const result = await approveLeaveRequest(input);

      expect(result.status).toEqual('rejected');
      expect(result.approved_by).toEqual(testTeacherId);
      expect(result.approved_at).toBeInstanceOf(Date);
    });

    it('should create attendance records when leave is approved', async () => {
      const input: ApproveLeaveRequestInput = {
        id: testLeaveRequestId,
        approved_by: testTeacherId,
        status: 'approved'
      };

      await approveLeaveRequest(input);

      // Check that attendance records were created for the leave period
      const attendanceRecords = await db.select()
        .from(attendanceRecordsTable)
        .where(
          and(
            eq(attendanceRecordsTable.student_id, testStudentId),
            eq(attendanceRecordsTable.status, 'leave')
          )
        )
        .execute();

      // Should have 3 records: Jan 15, 16, 17
      expect(attendanceRecords.length).toEqual(3);
      
      attendanceRecords.forEach(record => {
        expect(record.status).toEqual('leave');
        expect(record.recorded_by).toEqual(testTeacherId);
        expect(record.notes).toContain('Approved leave: Test leave');
        expect(record.class_id).toEqual(testClassId);
      });
    });

    it('should not create duplicate attendance records', async () => {
      // Create an existing attendance record for one day in the leave period
      await db.insert(attendanceRecordsTable)
        .values({
          student_id: testStudentId,
          class_id: testClassId,
          date: new Date('2024-01-15'),
          status: 'present',
          recorded_by: testTeacherId
        })
        .execute();

      const input: ApproveLeaveRequestInput = {
        id: testLeaveRequestId,
        approved_by: testTeacherId,
        status: 'approved'
      };

      await approveLeaveRequest(input);

      // Should only create 2 new records (Jan 16, 17), not overwrite existing
      const leaveRecords = await db.select()
        .from(attendanceRecordsTable)
        .where(
          and(
            eq(attendanceRecordsTable.student_id, testStudentId),
            eq(attendanceRecordsTable.status, 'leave')
          )
        )
        .execute();

      expect(leaveRecords.length).toEqual(2);

      // Check existing record is still present
      const presentRecords = await db.select()
        .from(attendanceRecordsTable)
        .where(
          and(
            eq(attendanceRecordsTable.student_id, testStudentId),
            eq(attendanceRecordsTable.status, 'present')
          )
        )
        .execute();

      expect(presentRecords.length).toEqual(1);
    });

    it('should throw error for non-existent leave request', async () => {
      const input: ApproveLeaveRequestInput = {
        id: 9999,
        approved_by: testTeacherId,
        status: 'approved'
      };

      await expect(approveLeaveRequest(input)).rejects.toThrow(/leave request not found/i);
    });

    it('should throw error when trying to approve already processed request', async () => {
      // First approval
      const input: ApproveLeaveRequestInput = {
        id: testLeaveRequestId,
        approved_by: testTeacherId,
        status: 'approved'
      };

      await approveLeaveRequest(input);

      // Try to approve again
      await expect(approveLeaveRequest(input)).rejects.toThrow(/leave request has already been processed/i);
    });
  });

  describe('getLeaveRequestsByStatus', () => {
    beforeEach(async () => {
      // Create multiple leave requests with different statuses
      await db.insert(leaveRequestsTable)
        .values([
          {
            student_id: testStudentId,
            start_date: new Date('2024-01-15'),
            end_date: new Date('2024-01-17'),
            reason: 'Pending request 1',
            status: 'pending'
          },
          {
            student_id: testStudentId,
            start_date: new Date('2024-01-20'),
            end_date: new Date('2024-01-22'),
            reason: 'Pending request 2',
            status: 'pending'
          },
          {
            student_id: testStudentId,
            start_date: new Date('2024-01-10'),
            end_date: new Date('2024-01-12'),
            reason: 'Approved request',
            status: 'approved',
            approved_by: testTeacherId,
            approved_at: new Date()
          }
        ])
        .execute();
    });

    it('should get pending leave requests', async () => {
      const result = await getLeaveRequestsByStatus('pending');

      expect(result.length).toEqual(2);
      result.forEach(request => {
        expect(request.status).toEqual('pending');
      });
    });

    it('should get approved leave requests', async () => {
      const result = await getLeaveRequestsByStatus('approved');

      expect(result.length).toEqual(1);
      expect(result[0].status).toEqual('approved');
      expect(result[0].reason).toEqual('Approved request');
    });

    it('should return empty array for non-existent status', async () => {
      const result = await getLeaveRequestsByStatus('rejected');

      expect(result.length).toEqual(0);
    });
  });

  describe('getLeaveRequestsByStudent', () => {
    beforeEach(async () => {
      // Create multiple leave requests for the test student
      await db.insert(leaveRequestsTable)
        .values([
          {
            student_id: testStudentId,
            start_date: new Date('2024-01-15'),
            end_date: new Date('2024-01-17'),
            reason: 'Student request 1',
            status: 'pending'
          },
          {
            student_id: testStudentId,
            start_date: new Date('2024-01-20'),
            end_date: new Date('2024-01-22'),
            reason: 'Student request 2',
            status: 'approved'
          }
        ])
        .execute();
    });

    it('should get all leave requests for a student', async () => {
      const result = await getLeaveRequestsByStudent(testStudentId);

      expect(result.length).toEqual(2);
      result.forEach(request => {
        expect(request.student_id).toEqual(testStudentId);
      });
    });

    it('should throw error for non-existent student', async () => {
      await expect(getLeaveRequestsByStudent(9999)).rejects.toThrow(/student not found/i);
    });

    it('should return empty array for student with no leave requests', async () => {
      // Create another student
      const anotherUser = await db.insert(usersTable)
        .values({
          username: 'student456',
          password_hash: 'hashed_password',
          full_name: 'Another Student',
          email: 'another@test.com',
          role: 'student'
        })
        .returning()
        .execute();

      const anotherStudent = await db.insert(studentsTable)
        .values({
          user_id: anotherUser[0].id,
          nis_nisn: 'STU789012',
          class_id: testClassId
        })
        .returning()
        .execute();

      const result = await getLeaveRequestsByStudent(anotherStudent[0].id);

      expect(result.length).toEqual(0);
    });
  });

  describe('getAllLeaveRequests', () => {
    it('should return all leave requests', async () => {
      // Create test leave requests
      await db.insert(leaveRequestsTable)
        .values([
          {
            student_id: testStudentId,
            start_date: new Date('2024-01-15'),
            end_date: new Date('2024-01-17'),
            reason: 'Request 1',
            status: 'pending'
          },
          {
            student_id: testStudentId,
            start_date: new Date('2024-01-20'),
            end_date: new Date('2024-01-22'),
            reason: 'Request 2',
            status: 'approved'
          }
        ])
        .execute();

      const result = await getAllLeaveRequests();

      expect(result.length).toEqual(2);
    });

    it('should return empty array when no leave requests exist', async () => {
      const result = await getAllLeaveRequests();

      expect(result.length).toEqual(0);
    });
  });

  describe('deleteLeaveRequest', () => {
    let testLeaveRequestId: number;

    beforeEach(async () => {
      const leaveRequest = await db.insert(leaveRequestsTable)
        .values({
          student_id: testStudentId,
          start_date: new Date('2024-01-15'),
          end_date: new Date('2024-01-17'),
          reason: 'Test leave',
          status: 'pending'
        })
        .returning()
        .execute();
      testLeaveRequestId = leaveRequest[0].id;
    });

    it('should delete pending leave request successfully', async () => {
      const result = await deleteLeaveRequest(testLeaveRequestId);

      expect(result.success).toBe(true);

      // Verify it's actually deleted
      const deletedRequest = await db.select()
        .from(leaveRequestsTable)
        .where(eq(leaveRequestsTable.id, testLeaveRequestId))
        .execute();

      expect(deletedRequest.length).toEqual(0);
    });

    it('should throw error for non-existent leave request', async () => {
      await expect(deleteLeaveRequest(9999)).rejects.toThrow(/leave request not found/i);
    });

    it('should throw error when trying to delete approved leave request', async () => {
      // Approve the leave request first
      await db.update(leaveRequestsTable)
        .set({ 
          status: 'approved',
          approved_by: testTeacherId,
          approved_at: new Date()
        })
        .where(eq(leaveRequestsTable.id, testLeaveRequestId))
        .execute();

      await expect(deleteLeaveRequest(testLeaveRequestId)).rejects.toThrow(/can only delete pending leave requests/i);
    });

    it('should throw error when trying to delete rejected leave request', async () => {
      // Reject the leave request first
      await db.update(leaveRequestsTable)
        .set({ 
          status: 'rejected',
          approved_by: testTeacherId,
          approved_at: new Date()
        })
        .where(eq(leaveRequestsTable.id, testLeaveRequestId))
        .execute();

      await expect(deleteLeaveRequest(testLeaveRequestId)).rejects.toThrow(/can only delete pending leave requests/i);
    });
  });

  describe('getPendingLeaveRequests', () => {
    beforeEach(async () => {
      // Create multiple leave requests with different statuses
      await db.insert(leaveRequestsTable)
        .values([
          {
            student_id: testStudentId,
            start_date: new Date('2024-01-15'),
            end_date: new Date('2024-01-17'),
            reason: 'Pending request 1',
            status: 'pending'
          },
          {
            student_id: testStudentId,
            start_date: new Date('2024-01-20'),
            end_date: new Date('2024-01-22'),
            reason: 'Pending request 2',
            status: 'pending'
          },
          {
            student_id: testStudentId,
            start_date: new Date('2024-01-10'),
            end_date: new Date('2024-01-12'),
            reason: 'Approved request',
            status: 'approved',
            approved_by: testTeacherId,
            approved_at: new Date()
          },
          {
            student_id: testStudentId,
            start_date: new Date('2024-01-05'),
            end_date: new Date('2024-01-07'),
            reason: 'Rejected request',
            status: 'rejected',
            approved_by: testTeacherId,
            approved_at: new Date()
          }
        ])
        .execute();
    });

    it('should return only pending leave requests', async () => {
      const result = await getPendingLeaveRequests();

      expect(result.length).toEqual(2);
      result.forEach(request => {
        expect(request.status).toEqual('pending');
      });
    });

    it('should return empty array when no pending requests exist', async () => {
      // Update all requests to approved
      await db.update(leaveRequestsTable)
        .set({ 
          status: 'approved',
          approved_by: testTeacherId,
          approved_at: new Date()
        })
        .execute();

      const result = await getPendingLeaveRequests();

      expect(result.length).toEqual(0);
    });
  });
});