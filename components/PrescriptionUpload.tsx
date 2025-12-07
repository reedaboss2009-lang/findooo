import React, { useState } from 'react';
import { Upload, FileText, Check, Clock, AlertCircle } from 'lucide-react';
import { WILAYAS } from '../constants';
import { mockService } from '../services/mockService';
import { Prescription, PrescriptionResponse, AvailabilityStatus } from '../types';

export const PrescriptionUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [wilaya, setWilaya] = useState(WILAYAS[0]);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'UPLOAD' | 'LIST'>('UPLOAD');
  const [loading, setLoading] = useState(false);
  
  // State for responses view
  const [myPrescriptions, setMyPrescriptions] = useState<{p: Prescription, r: PrescriptionResponse[]}[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !phone) return;
    
    setLoading(true);
    await mockService.sendPrescription(file, wilaya, phone);
    setLoading(false);
    
    // Switch to list view and fetch
    await fetchResponses();
    setStep('LIST');
  };

  const fetchResponses = async () => {
      const data = await mockService.getUserPrescriptionResponses(phone);
      setMyPrescriptions(data);
  };

  if (step === 'LIST') {
      return (
          <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">وصفاتي الطبية</h2>
                  <button onClick={() => setStep('UPLOAD')} className="text-emerald-600 text-sm font-bold">إرسال وصفة جديدة</button>
              </div>

              {myPrescriptions.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl shadow">
                      <p className="text-gray-500">لا توجد وصفات مسجلة لهذا الرقم.</p>
                  </div>
              ) : (
                  myPrescriptions.map(({p, r}) => (
                      <div key={p.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                              <span className="text-sm text-gray-500 flex items-center gap-2"><Clock size={16}/> {new Date(p.timestamp).toLocaleString('ar-DZ')}</span>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${r.length > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {r.length > 0 ? `${r.length} ردود` : 'في انتظار الرد...'}
                              </span>
                          </div>
                          <div className="p-4 flex gap-4">
                              <img src={p.image_url} alt="Prescription" className="w-20 h-20 object-cover rounded-lg border" />
                              <div className="flex-1">
                                  <h3 className="font-bold text-gray-800">الردود من الصيدليات:</h3>
                                  {r.length === 0 && <p className="text-gray-400 text-sm mt-2">جاري إرسال الوصفة لصيدليات {p.wilaya}...</p>}
                                  <div className="space-y-2 mt-2">
                                      {r.map(res => (
                                          <div key={res.id} className="bg-emerald-50 p-3 rounded-lg flex justify-between items-start">
                                              <div>
                                                  <p className="font-bold text-emerald-800 text-sm">{res.pharmacy_name}</p>
                                                  <p className="text-xs text-gray-600 mt-1">{res.notes}</p>
                                              </div>
                                              <div className="text-xs font-bold bg-white px-2 py-1 rounded shadow-sm">
                                                  {res.response}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))
              )}
               <div className="text-center mt-8">
                  <button onClick={fetchResponses} className="text-emerald-600 hover:underline flex items-center justify-center gap-2 w-full"><Clock size={16}/> تحديث الردود</button>
              </div>
          </div>
      )
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-emerald-600 p-6 text-white text-center">
        <Upload className="mx-auto h-12 w-12 mb-2 opacity-80" />
        <h2 className="text-xl font-bold">إرسال وصفة طبية</h2>
        <p className="text-emerald-100 text-sm mt-1">أرسل وصفتك وسيقوم الصيادلة بالرد عليك فوراً</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">صورة الوصفة</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer relative">
            <input type="file" onChange={handleFileChange} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
            {file ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <Check size={20} />
                    <span className="font-bold">{file.name}</span>
                </div>
            ) : (
                <div className="text-gray-400">
                    <FileText className="mx-auto h-8 w-8 mb-2" />
                    <span className="text-sm">اضغط لرفع صورة</span>
                </div>
            )}
          </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الولاية</label>
            <select 
              value={wilaya} 
              onChange={(e) => setWilaya(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
                {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف (لاستلام الردود)</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0550 00 00 00"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              required 
            />
        </div>

        <button 
            type="submit" 
            disabled={loading || !file}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-md"
        >
            {loading ? 'جاري الإرسال...' : 'إرسال للبحث'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4 flex items-center justify-center gap-1">
            <AlertCircle size={12} />
            يتم مشاركة الوصفة فقط مع الصيدليات المعتمدة
        </p>

         {/* Link to check existing status */}
         <div className="border-t pt-4 mt-2 text-center">
            <button type="button" onClick={() => setStep('LIST')} className="text-emerald-600 text-sm font-bold hover:underline">
                هل أرسلت وصفة من قبل؟ تابع الردود هنا
            </button>
        </div>
      </form>
    </div>
  );
};