import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Search, AlertCircle, GraduationCap, Users, UserCheck } from 'lucide-react';

import type { Class, CreateClassInput, UpdateClassInput, User } from '../../../../server/src/schema';

export default function ClassManagement() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create class form
  const [createForm, setCreateForm] = useState<CreateClassInput>({
    name: '',
    grade_level: '',
    homeroom_teacher_id: null
  });

  // Edit class form
  const [editForm, setEditForm] = useState<UpdateClassInput>({
    id: 0,
    name: '',
    grade_level: '',
    homeroom_teacher_id: null
  });

  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allClasses, allTeachers] = await Promise.all([
        trpc.classes.getAll.query(),
        trpc.users.getByRole.query({ role: 'teacher' })
      ]);
      setClasses(allClasses);
      setFilteredClasses(allClasses);
      setTeachers(allTeachers);
    } catch (error) {
      console.error('Failed to load classes:', error);
      setError('Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    let filtered = classes;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(cls =>
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.grade_level.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredClasses(filtered);
  }, [classes, searchTerm]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newClass = await trpc.classes.create.mutate(createForm);
      setClasses((prev: Class[]) => [...prev, newClass]);
      setCreateForm({
        name: '',
        grade_level: '',
        homeroom_teacher_id: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create class:', error);
      setError('Failed to create class');
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedClass = await trpc.classes.update.mutate(editForm);
      setClasses((prev: Class[]) => prev.map(cls => cls.id === updatedClass.id ? updatedClass : cls));
      setEditingClass(null);
    } catch (error) {
      console.error('Failed to update class:', error);
      setError('Failed to update class');
    }
  };

  const handleDeleteClass = async (classId: number) => {
    if (!confirm('Are you sure you want to delete this class? This will affect all students in this class.')) return;
    
    try {
      await trpc.classes.delete.mutate({ id: classId });
      setClasses((prev: Class[]) => prev.filter(cls => cls.id !== classId));
    } catch (error) {
      console.error('Failed to delete class:', error);
      setError('Failed to delete class');
    }
  };

  const openEditDialog = (cls: Class) => {
    setEditForm({
      id: cls.id,
      name: cls.name,
      grade_level: cls.grade_level,
      homeroom_teacher_id: cls.homeroom_teacher_id
    });
    setEditingClass(cls);
  };

  const getTeacherName = (teacherId: number | null) => {
    if (!teacherId) return 'No homeroom teacher';
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.full_name : 'Unknown teacher';
  };

  const classCounts = {
    total: classes.length,
    withHomeroom: classes.filter(c => c.homeroom_teacher_id !== null).length,
    withoutHomeroom: classes.filter(c => c.homeroom_teacher_id === null).length
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-lg">Loading classes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{classCounts.total}</p>
                <p className="text-sm text-gray-600">Total Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{classCounts.withHomeroom}</p>
                <p className="text-sm text-gray-600">With Homeroom Teacher</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{classCounts.withoutHomeroom}</p>
                <p className="text-sm text-gray-600">Without Homeroom Teacher</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5" />
              <span>Class Management</span>
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Class</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateClass} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-name">Class Name</Label>
                      <Input
                        id="create-name"
                        value={createForm.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateForm((prev: CreateClassInput) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="e.g., Class 7A"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-grade">Grade Level</Label>
                      <Input
                        id="create-grade"
                        value={createForm.grade_level}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateForm((prev: CreateClassInput) => ({ ...prev, grade_level: e.target.value }))
                        }
                        placeholder="e.g., Grade 7"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-teacher">Homeroom Teacher (Optional)</Label>
                    <Select
                      value={createForm.homeroom_teacher_id?.toString() || 'none'}
                      onValueChange={(value: string) =>
                        setCreateForm((prev: CreateClassInput) => ({
                          ...prev,
                          homeroom_teacher_id: value === 'none' ? null : parseInt(value)
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No homeroom teacher</SelectItem>
                        {teachers.map((teacher: User) => (
                          <SelectItem key={teacher.id} value={teacher.id.toString()}>
                            {teacher.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Class</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search Control */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search classes..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Classes Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Homeroom Teacher</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((cls: Class) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <GraduationCap className="h-4 w-4 text-blue-600" />
                        <span>{cls.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{cls.grade_level}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {cls.homeroom_teacher_id ? (
                          <>
                            <UserCheck className="h-4 w-4 text-green-600" />
                            <span>{getTeacherName(cls.homeroom_teacher_id)}</span>
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500">No homeroom teacher</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">-- students</Badge>
                    </TableCell>
                    <TableCell>{cls.created_at.toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(cls)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClass(cls.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredClasses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No classes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Class Dialog */}
      {editingClass && (
        <Dialog open={!!editingClass} onOpenChange={() => setEditingClass(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Class: {editingClass.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditClass} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Class Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditForm((prev: UpdateClassInput) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-grade">Grade Level</Label>
                  <Input
                    id="edit-grade"
                    value={editForm.grade_level || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditForm((prev: UpdateClassInput) => ({ ...prev, grade_level: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-teacher">Homeroom Teacher</Label>
                <Select
                  value={editForm.homeroom_teacher_id?.toString() || 'none'}
                  onValueChange={(value: string) =>
                    setEditForm((prev: UpdateClassInput) => ({
                      ...prev,
                      homeroom_teacher_id: value === 'none' ? null : parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No homeroom teacher</SelectItem>
                    {teachers.map((teacher: User) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingClass(null)}>
                  Cancel
                </Button>
                <Button type="submit">Update Class</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}