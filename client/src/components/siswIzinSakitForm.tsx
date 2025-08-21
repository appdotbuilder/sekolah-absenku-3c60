import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { trpc } from '@/utils/trpc';
import type { PengajuanIzinInput } from '../../../../server/src/schema';

interface IzinSakitFormProps {
  siswaId: number;
  kelasId: number;
  onSubmitSuccess: () => void;
}

export default function IzinSakitForm({ 
  siswaId, 
  kelasId, 
  onSubmitSuccess 
}: IzinSakitFormProps) {
  const [formData, setFormData] = useState<PengajuanIzinInput>({
    siswa_id: siswaId,
    kelas_id: kelasId,
    tanggal: new Date(),
    status: 'izin',
    keterangan: ''
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      alert('Silakan pilih tanggal');
      return;
    }

    if (!formData.keterangan.trim()) {
      alert('Silakan masukkan keterangan');
      return;
    }

    setIsLoading(true);
    try {
      const submitData = {
        ...formData,
        tanggal: selectedDate
      };

      await trpc.absensi.pengajuanIzin.mutate(submitData);
      
      alert(`Pengajuan ${formData.status} berhasil dikirim! Menunggu verifikasi guru. 📝`);
      
      // Reset form
      setFormData({
        siswa_id: siswaId,
        kelas_id: kelasId,
        tanggal: new Date(),
        status: 'izin',
        keterangan: ''
      });
      setSelectedDate(new Date());
      
      onSubmitSuccess();
    } catch (error: any) {
      console.error('Failed to submit pengajuan:', error);
      alert(error.message || `Gagal mengajukan ${formData.status}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Prevent selecting past dates
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>📝</span>
          <span>Pengajuan Izin / Sakit</span>
        </CardTitle>
        <CardDescription>
          Ajukan permohonan izin atau sakit untuk hari tertentu
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Jenis Pengajuan */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Jenis Pengajuan 📋
              </label>
              <Select 
                value={formData.status} 
                onValueChange={(value: 'izin' | 'sakit') =>
                  setFormData((prev: PengajuanIzinInput) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="izin">📝 Izin</SelectItem>
                  <SelectItem value="sakit">🤒 Sakit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tanggal */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Tanggal 📅
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left"
                  >
                    {selectedDate ? formatDate(selectedDate) : 'Pilih tanggal'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={isDateDisabled}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500">
                * Hanya bisa memilih tanggal hari ini atau kedepan
              </p>
            </div>
          </div>

          {/* Keterangan */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Keterangan / Alasan {formData.status === 'izin' ? '📝' : '🏥'}
            </label>
            <Textarea
              value={formData.keterangan}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev: PengajuanIzinInput) => ({ ...prev, keterangan: e.target.value }))
              }
              placeholder={
                formData.status === 'izin' 
                  ? 'Contoh: Menghadiri acara keluarga, keperluan mendadak, dll.'
                  : 'Contoh: Demam tinggi, sakit perut, flu, dll.'
              }
              className="min-h-[100px] resize-none"
              required
            />
            <p className="text-xs text-gray-500">
              * Berikan alasan yang jelas dan dapat dipertanggungjawabkan
            </p>
          </div>

          {/* Informasi Tambahan */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">ℹ️ Informasi Penting:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Pengajuan akan dikirim ke guru untuk diverifikasi</li>
              <li>• Status awal: <strong>PENDING</strong> hingga guru memverifikasi</li>
              <li>• Pastikan alasan yang diberikan jelas dan dapat dipertanggungjawabkan</li>
              <li>• Pengajuan untuk hari ini harus dilakukan sebelum jam sekolah berakhir</li>
            </ul>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !selectedDate || !formData.keterangan.trim()}
            className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Mengirim Pengajuan...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>📤</span>
                <span>Kirim Pengajuan {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}</span>
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}