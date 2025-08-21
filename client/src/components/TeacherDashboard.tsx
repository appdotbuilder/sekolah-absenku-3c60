import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, CheckCircle, BookOpen } from 'lucide-react';

// Import teacher components
import AttendanceManagement from '@/components/teacher/AttendanceManagement';
import ClassOverview from '@/components/teacher/ClassOverview';
import AttendanceHistory from '@/components/teacher/AttendanceHistory';

import type { AuthContext } from '../../../server/src/schema';

interface TeacherDashboardProps {
  user: AuthContext;
}

export default function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState('attendance');

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">👩‍🏫 Teacher Dashboard</h2>
        <p className="text-green-100">
          Welcome back, {user.full_name}! Manage attendance for your assigned classes.
        </p>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Assigned classes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Students under my supervision</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--%</div>
            <p className="text-xs text-muted-foreground">Average attendance rate</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records Today</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Attendance records created</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attendance" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Take Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>My Classes</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Attendance History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceManagement teacherId={user.user_id} />
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <ClassOverview teacherId={user.user_id} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <AttendanceHistory teacherId={user.user_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}