import { db } from '../db';
import { 
  attendanceRecordsTable, 
  studentsTable, 
  usersTable, 
  classesTable 
} from '../db/schema';
import { 
  type AttendanceReportFilter, 
  type ExportFormat 
} from '../schema';
import { eq, and, gte, lte, count, desc, SQL } from 'drizzle-orm';

interface AttendanceReportRow {
  student_name: string;
  nis_nisn: string;
  class_name: string;
  date: string;
  status: 'present' | 'leave' | 'sick' | 'absent';
  check_in_time: string | null;
  check_out_time: string | null;
}

export async function generateAttendanceReport(filters: AttendanceReportFilter): Promise<AttendanceReportRow[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (filters.class_id !== undefined) {
      conditions.push(eq(attendanceRecordsTable.class_id, filters.class_id));
    }

    if (filters.student_id !== undefined) {
      conditions.push(eq(attendanceRecordsTable.student_id, filters.student_id));
    }

    if (filters.start_date) {
      conditions.push(gte(attendanceRecordsTable.date, new Date(filters.start_date)));
    }

    if (filters.end_date) {
      conditions.push(lte(attendanceRecordsTable.date, new Date(filters.end_date)));
    }

    if (filters.status) {
      conditions.push(eq(attendanceRecordsTable.status, filters.status));
    }

    // Build complete query in one go
    const baseQuery = db.select({
      student_name: usersTable.full_name,
      nis_nisn: studentsTable.nis_nisn,
      class_name: classesTable.name,
      date: attendanceRecordsTable.date,
      status: attendanceRecordsTable.status,
      check_in_time: attendanceRecordsTable.check_in_time,
      check_out_time: attendanceRecordsTable.check_out_time
    })
    .from(attendanceRecordsTable)
    .innerJoin(studentsTable, eq(attendanceRecordsTable.student_id, studentsTable.id))
    .innerJoin(usersTable, eq(studentsTable.user_id, usersTable.id))
    .innerJoin(classesTable, eq(attendanceRecordsTable.class_id, classesTable.id));

    // Apply where clause and ordering
    const query = conditions.length > 0
      ? baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(attendanceRecordsTable.date), usersTable.full_name)
      : baseQuery.orderBy(desc(attendanceRecordsTable.date), usersTable.full_name);

    const results = await query.execute();

    // Format results
    return results.map(result => ({
      student_name: result.student_name,
      nis_nisn: result.nis_nisn,
      class_name: result.class_name,
      date: result.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      status: result.status,
      check_in_time: result.check_in_time ? result.check_in_time.toISOString() : null,
      check_out_time: result.check_out_time ? result.check_out_time.toISOString() : null
    }));
  } catch (error) {
    console.error('Attendance report generation failed:', error);
    throw error;
  }
}

export async function getAttendanceSummaryReport(
  filters: AttendanceReportFilter
): Promise<{
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
}> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (filters.class_id !== undefined) {
      conditions.push(eq(attendanceRecordsTable.class_id, filters.class_id));
    }

    if (filters.student_id !== undefined) {
      conditions.push(eq(attendanceRecordsTable.student_id, filters.student_id));
    }

    if (filters.start_date) {
      conditions.push(gte(attendanceRecordsTable.date, new Date(filters.start_date)));
    }

    if (filters.end_date) {
      conditions.push(lte(attendanceRecordsTable.date, new Date(filters.end_date)));
    }

    if (filters.status) {
      conditions.push(eq(attendanceRecordsTable.status, filters.status));
    }

    // Build complete query in one go
    const baseQuery = db.select({
      status: attendanceRecordsTable.status,
      class_id: attendanceRecordsTable.class_id,
      class_name: classesTable.name,
      student_id: attendanceRecordsTable.student_id
    })
    .from(attendanceRecordsTable)
    .innerJoin(classesTable, eq(attendanceRecordsTable.class_id, classesTable.id));

    // Apply where clause if we have conditions
    const query = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const allRecords = await query.execute();

    // Calculate totals
    const total_records = allRecords.length;
    const unique_students = new Set(allRecords.map(r => r.student_id)).size;
    const unique_dates = new Set(allRecords.map(r => r.class_id)).size; // Approximation

    const present_count = allRecords.filter(r => r.status === 'present').length;
    const absent_count = allRecords.filter(r => r.status === 'absent').length;
    const leave_count = allRecords.filter(r => r.status === 'leave').length;
    const sick_count = allRecords.filter(r => r.status === 'sick').length;

    const overall_attendance_rate = total_records > 0 
      ? Math.round((present_count / total_records) * 100 * 100) / 100 
      : 0;

    // Calculate class summaries
    const classSummaryMap = new Map<string, { class_name: string; total: number; present: number; students: Set<number> }>();

    allRecords.forEach(record => {
      const key = record.class_name;
      if (!classSummaryMap.has(key)) {
        classSummaryMap.set(key, {
          class_name: record.class_name,
          total: 0,
          present: 0,
          students: new Set()
        });
      }
      const summary = classSummaryMap.get(key)!;
      summary.total++;
      summary.students.add(record.student_id);
      if (record.status === 'present') {
        summary.present++;
      }
    });

    const class_summaries = Array.from(classSummaryMap.values()).map(summary => ({
      class_name: summary.class_name,
      student_count: summary.students.size,
      attendance_rate: summary.total > 0 
        ? Math.round((summary.present / summary.total) * 100 * 100) / 100 
        : 0
    }));

    return {
      total_students: unique_students,
      total_days: unique_dates,
      present_count,
      absent_count,
      leave_count,
      sick_count,
      overall_attendance_rate,
      class_summaries
    };
  } catch (error) {
    console.error('Attendance summary report generation failed:', error);
    throw error;
  }
}

export async function exportAttendanceReportToPDF(
  filters: AttendanceReportFilter,
  filename?: string
): Promise<{ buffer: Buffer; filename: string }> {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is to generate PDF reports using a library like
  // PDFKit or Puppeteer to create properly formatted attendance reports
  // with headers, school information, and tabular data.
  return {
    buffer: Buffer.from('placeholder pdf content'),
    filename: filename || `attendance_report_${new Date().toISOString().split('T')[0]}.pdf`
  };
}

export async function exportAttendanceReportToExcel(
  filters: AttendanceReportFilter,
  filename?: string
): Promise<{ buffer: Buffer; filename: string }> {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is to generate Excel reports using a library like
  // ExcelJS to create spreadsheets with proper formatting, headers, and
  // formula calculations for attendance statistics.
  return {
    buffer: Buffer.from('placeholder excel content'),
    filename: filename || `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`
  };
}

export async function exportReport(
  filters: AttendanceReportFilter,
  format: ExportFormat,
  filename?: string
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is to provide a unified interface for exporting
  // reports in different formats based on the format parameter.
  const mimeTypes = {
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  if (format === 'pdf') {
    const result = await exportAttendanceReportToPDF(filters, filename);
    return { ...result, mimeType: mimeTypes.pdf };
  } else {
    const result = await exportAttendanceReportToExcel(filters, filename);
    return { ...result, mimeType: mimeTypes.excel };
  }
}