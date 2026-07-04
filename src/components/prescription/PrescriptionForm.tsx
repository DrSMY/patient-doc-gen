import React, { useRef, useState, useEffect } from 'react';
import { PrescriptionData, PrescriptionMedication } from '@/lib/types';
import { Plus, Trash2, Upload, X, Sparkles, Loader2, Search, Heart, Database, BookOpen, Save, User } from 'lucide-react';
import { parseMedications, parsePrescription } from '@/lib/geminiService';
import { getFormattedDate } from '@/lib/dateUtils';
import { Switch } from '@/components/ui/switch';
import { useCloudMedications } from '@/hooks/useCloudSync';

interface PrescriptionFormProps {
  data: PrescriptionData;
  onChange: (data: PrescriptionData) => void;
  savedSignatures: string[];
  setSavedSignatures: (sigs: string[]) => void;
  savedStamps: string[];
  setSavedStamps: (stps: string[]) => void;
  savedLogos: string[];
  setSavedLogos: (lgs: string[]) => void;
}

const COMMON_MEDS_LIBRARY = [
  { name: 'Amoxicillin', dosage: '500 mg', instructions: '1 tab PO TID for 7 days' },
  { name: 'Paracetamol (Panadol)', dosage: '500 mg', instructions: '1-2 tabs PO every 6 hours PRN for pain/fever' },
  { name: 'Metformin', dosage: '500 mg', instructions: '1 tab PO BID with meals' },
  { name: 'Atorvastatin', dosage: '20 mg', instructions: '1 tab PO daily at bedtime' },
  { name: 'Lisinopril', dosage: '10 mg', instructions: '1 tab PO daily' },
  { name: 'Amlodipine', dosage: '5 mg', instructions: '1 tab PO daily' },
  { name: 'Salbutamol Inhaler', dosage: '100 mcg/actuation', instructions: '2 puffs inhaled every 4-6 hours PRN' },
  { name: 'Azithromycin', dosage: '500 mg', instructions: '1 tab PO daily for 3 days' },
  { name: 'Omeprazole', dosage: '20 mg', instructions: '1 cap PO daily 30 mins before breakfast' },
  { name: 'Cetirizine', dosage: '10 mg', instructions: '1 tab PO daily at bedtime' },
];

export const PrescriptionForm: React.FC<PrescriptionFormProps> = ({ 
  data, 
  onChange,
  savedSignatures,
  setSavedSignatures,
  savedStamps,
  setSavedStamps,
  savedLogos,
  setSavedLogos
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [fullAiInput, setFullAiInput] = useState('');
  const [isAnalyzingFull, setIsAnalyzingFull] = useState(false);
  const [errorVisible, setErrorVisible] = useState<string | null>(null);
  
  // Medication Library States
  const [searchQuery, setSearchQuery] = useState('');
  const [userMedDatabase, setUserMedDatabase] = useState<Partial<PrescriptionMedication>[]>([]);
  
  // Database Entry Form State
  const [newDbMed, setNewDbMed] = useState({ name: '', dosage: '', instructions: '' });
  const [showDbForm, setShowDbForm] = useState(false);

  // Bulk import state
  const [bulkImportText, setBulkImportText] = useState('');
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Load med database from local storage (images now handled by App)
  useEffect(() => {
    const savedMeds = localStorage.getItem('docgenie_med_database');
    if (savedMeds) {
      try { setUserMedDatabase(JSON.parse(savedMeds)); } catch (e) {}
    }
  }, []);

  const saveSignatureToLibrary = () => {
    if (!data.signature || savedSignatures.includes(data.signature)) return;
    setSavedSignatures([data.signature, ...savedSignatures]);
  };

  const removeSignatureFromLibrary = (idx: number) => {
    setSavedSignatures(savedSignatures.filter((_, i) => i !== idx));
  };

  const saveStampToLibrary = () => {
    if (!data.stamp || savedStamps.includes(data.stamp)) return;
    setSavedStamps([data.stamp, ...savedStamps]);
  };

  const removeStampFromLibrary = (idx: number) => {
    setSavedStamps(savedStamps.filter((_, i) => i !== idx));
  };

  const saveLogoToLibrary = () => {
    if (!data.logo || savedLogos.includes(data.logo)) return;
    setSavedLogos([data.logo, ...savedLogos]);
  };

  const removeLogoFromLibrary = (idx: number) => {
    setSavedLogos(savedLogos.filter((_, i) => i !== idx));
  };

  const saveToDatabase = (med: Partial<PrescriptionMedication>) => {
    if (!med.name) return;
    const cleanMed = { name: med.name, dosage: med.dosage || '', instructions: med.instructions || '' };
    
    // Check for duplicates
    const exists = userMedDatabase.some(m => m.name?.toLowerCase() === med.name?.toLowerCase() && m.dosage === med.dosage);
    if (exists) {
        alert("This medication entry already exists in your database.");
        return;
    }

    const updated = [cleanMed, ...userMedDatabase];
    setUserMedDatabase(updated);
    localStorage.setItem('docgenie_med_database', JSON.stringify(updated));
    setNewDbMed({ name: '', dosage: '', instructions: '' });
    setShowDbForm(false);
  };

  const removeFromDatabase = (idx: number) => {
    const updated = userMedDatabase.filter((_, i) => i !== idx);
    setUserMedDatabase(updated);
    localStorage.setItem('docgenie_med_database', JSON.stringify(updated));
  };

  // Parse a delimited row into [name, dosage, instructions].
  const splitRow = (line: string): string[] => {
    if (line.includes('\t')) return line.split('\t');
    // CSV with basic quote support
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const bulkImportToDatabase = (raw: string): { added: number; skipped: number } => {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed: Partial<PrescriptionMedication>[] = [];
    lines.forEach((line, idx) => {
      const cols = splitRow(line).map(c => c.trim().replace(/^"|"$/g, ''));
      const name = cols[0] || '';
      // Skip a header row like "name,dosage,instructions"
      if (idx === 0 && /^(drug\s*)?name$/i.test(name) && /dosage|dose/i.test(cols[1] || '')) return;
      if (!name) return;
      parsed.push({ name, dosage: cols[1] || '', instructions: cols[2] || '' });
    });

    const merged = [...userMedDatabase];
    let added = 0;
    let skipped = 0;
    parsed.forEach(med => {
      const exists = merged.some(m => m.name?.toLowerCase() === med.name?.toLowerCase() && (m.dosage || '') === (med.dosage || ''));
      if (exists) { skipped++; return; }
      merged.unshift(med);
      added++;
    });
    setUserMedDatabase(merged);
    localStorage.setItem('docgenie_med_database', JSON.stringify(merged));
    return { added, skipped };
  };

  const handleBulkImport = () => {
    if (!bulkImportText.trim()) return;
    const { added, skipped } = bulkImportToDatabase(bulkImportText);
    setBulkImportText('');
    alert(`Imported ${added} medication${added === 1 ? '' : 's'}${skipped ? ` · ${skipped} duplicate${skipped === 1 ? '' : 's'} skipped` : ''}.`);
  };

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const { added, skipped } = bulkImportToDatabase(reader.result as string);
      alert(`Imported ${added} medication${added === 1 ? '' : 's'}${skipped ? ` · ${skipped} duplicate${skipped === 1 ? '' : 's'} skipped` : ''}.`);
    };
    reader.readAsText(file);
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
  };

  const handleChange = (field: keyof PrescriptionData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleMedicationChange = (id: string, field: keyof PrescriptionMedication, value: any) => {
    const newMeds = data.medications.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange({ ...data, medications: newMeds });
  };

  const addMedicationFromLibrary = (preset: Partial<PrescriptionMedication>) => {
    const newItem: PrescriptionMedication = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: preset.name || 'Medication Name',
      dosage: preset.dosage || '500 mg',
      instructions: preset.instructions || '1 tab PO BID after meal',
      quantity: 'x1'
    };
    onChange({ ...data, medications: [...data.medications, newItem] });
    setSearchQuery('');
  };

  const addEmptyMedication = () => {
    const newItem: PrescriptionMedication = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: '',
      dosage: '',
      instructions: '',
      quantity: 'x1'
    };
    onChange({ ...data, medications: [...data.medications, newItem] });
  };

  const removeMedication = (id: string) => {
    onChange({ ...data, medications: data.medications.filter(i => i.id !== id) });
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        handleChange('signature', result);
        if (!savedSignatures.includes(result)) setSavedSignatures([result, ...savedSignatures]);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSignature = () => {
    handleChange('signature', undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        handleChange('stamp', result);
        if (!savedStamps.includes(result)) setSavedStamps([result, ...savedStamps]);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearStamp = () => {
    handleChange('stamp', undefined);
    if (stampInputRef.current) stampInputRef.current.value = '';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        handleChange('logo', result);
        if (!savedLogos.includes(result)) setSavedLogos([result, ...savedLogos]);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    handleChange('logo', undefined);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // Search logic: Combine Common and User Database
  const combinedSearchList = [
    ...userMedDatabase.map(m => ({ ...m, source: 'database' })),
    ...COMMON_MEDS_LIBRARY.map(m => ({ ...m, source: 'common' }))
  ].filter(med => 
    med.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFullPrescriptionParse = async () => {
    if (!fullAiInput.trim()) return;
    setIsAnalyzingFull(true);
    setErrorVisible(null);
    try {
        const parsedData = await parsePrescription(fullAiInput);
        if (parsedData) {
            const newMeds: PrescriptionMedication[] = (parsedData.medications || []).map((m: any, idx: number) => ({
                id: Date.now().toString() + idx,
                name: m.name || '',
                dosage: m.dosage || '',
                instructions: m.instructions || '',
                quantity: m.quantity || 'x1'
            }));
            onChange({
                ...data,
                clinicName: parsedData.clinicName || data.clinicName,
                doctorName: parsedData.doctorName || data.doctorName,
                doctorTitle: parsedData.doctorTitle || data.doctorTitle,
                doctorRegNo: parsedData.doctorRegNo || data.doctorRegNo,
                patientName: parsedData.patientName || data.patientName,
                patientDob: parsedData.patientDob ? parsedData.patientDob.replace(/\D/g, '') : data.patientDob,
                patientGender: parsedData.patientGender || data.patientGender,
                date: getFormattedDate(),
                notes: parsedData.notes || data.notes,
                medications: newMeds.length > 0 ? newMeds : data.medications,
                signature: data.signature
            });
            setFullAiInput('');
        } else {
            setErrorVisible("AI could not extract enough details. Please ensure the text is clear.");
        }
    } catch (error) {
        console.error("Failed to parse full prescription", error);
        setErrorVisible("AI processing failed. Please check your connection or try a shorter text.");
    } finally {
        setIsAnalyzingFull(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Clinic Logo Branding */}
      <div className="p-5 bg-white rounded-3xl border border-[#E5E3DD] shadow-sm space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-black text-[#173B3D] uppercase tracking-widest">Clinic Logo</h3>
            {data.logo && !savedLogos.includes(data.logo) && (
              <button 
                onClick={saveLogoToLibrary}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 hover:underline"
              >
                <Save className="w-3 h-3" /> Save to Library
              </button>
            )}
          </div>

          {savedLogos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
               {savedLogos.map((lg, idx) => (
                 <div key={idx} className="relative group aspect-square bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-all overflow-hidden"
                   onClick={() => handleChange('logo', lg)}
                 >
                    <img src={lg} alt={`Saved Logo ${idx}`} className="max-h-full max-w-full object-contain filter mix-blend-multiply" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeLogoFromLibrary(idx); }}
                      className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-md text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {data.logo === lg && (
                      <div className="absolute inset-0 bg-indigo-500/10 border-2 border-indigo-500 rounded-xl" />
                    )}
                 </div>
               ))}
            </div>
          )}

          {data.logo ? (
              <div className="relative w-full h-32 bg-[#F5F4F0] rounded-xl border border-[#E5E3DD] flex items-center justify-center group overflow-hidden">
                  <img src={data.logo} alt="Logo" className="max-h-full max-w-full p-4 object-contain mix-blend-multiply" />
                  <button 
                      onClick={clearLogo}
                      className="absolute top-3 right-3 p-2 bg-white rounded-xl shadow-lg text-[#A0A6A6] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
          ) : (
              <div 
                  className="border-2 border-dashed border-[#E5E3DD] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F5F4F0] transition-all group"
                  onClick={() => logoInputRef.current?.click()}
              >
                  <Upload className="w-10 h-10 text-[#A0A6A6] mb-3 group-hover:text-[#173B3D] transition-colors" />
                  <p className="text-[10px] font-black text-[#6B7575] uppercase tracking-widest">Upload Clinic Logo</p>
                  <input 
                      ref={logoInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleLogoUpload}
                  />
              </div>
          )}
      </div>

      {/* AI Smart Import */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-indigo-900">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-black uppercase tracking-widest">AI Auto-Fill</span>
        </div>
        <div className="relative">
          <textarea
            value={fullAiInput}
            onChange={(e) => setFullAiInput(e.target.value)}
            placeholder="Paste full prescription text here..."
            className="w-full rounded-xl border-slate-200 bg-white shadow-sm p-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px] outline-none border"
          />
          {errorVisible && (
            <div className="absolute top-0 left-0 right-0 -mt-8 bg-red-100 text-red-700 text-[10px] font-bold py-1 px-3 rounded-t-lg border-x border-t border-red-200 flex justify-between items-center z-20">
              <span>{errorVisible}</span>
              <X className="w-3 h-3 cursor-pointer" onClick={() => setErrorVisible(null)} />
            </div>
          )}
          <button
            onClick={handleFullPrescriptionParse}
            disabled={isAnalyzingFull || !fullAiInput.trim()}
            className="absolute bottom-3 right-3 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 flex items-center"
          >
            {isAnalyzingFull ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Plus className="w-3 h-3 mr-2" />}
            Auto-Fill
          </button>
        </div>
      </div>

      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/60 transition-all">
        <h1 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Prescription ID</h1>
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_1fr] items-center gap-3 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 pl-3">
                <span className="text-xs font-black text-slate-800 tracking-tighter">ERX</span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-slate-200"></div>
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center">Serial</p>
              <input
                  type="text"
                  value={data.erxIdSerial}
                  onChange={(e) => handleChange('erxIdSerial', e.target.value.replace(/\D/g,'').slice(0, 5))}
                  placeholder="00001"
                  className="w-full bg-transparent py-1 text-sm font-bold focus:outline-none tracking-[0.2em] text-center"
              />
            </div>
            <div className="hidden sm:block h-6 w-px bg-slate-200"></div>
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center">Month</p>
              <select
                  value={data.erxIdMonth}
                  onChange={(e) => handleChange('erxIdMonth', e.target.value)}
                  className="w-full bg-transparent text-sm font-bold focus:outline-none appearance-none text-center px-2 cursor-pointer"
              >
                  {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                      <option key={m} value={m}>{m}</option>
                  ))}
              </select>
            </div>
            <div className="hidden sm:block h-6 w-px bg-slate-200"></div>
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center">Year</p>
              <input
                  type="text"
                  value={data.erxIdYear}
                  onChange={(e) => handleChange('erxIdYear', e.target.value.replace(/\D/g,'').slice(0, 2))}
                  placeholder="26"
                  className="w-full bg-transparent py-1 text-sm font-bold focus:outline-none tracking-tight text-center"
              />
            </div>
        </div>
      </div>

      {/* Patient Details */}
      <div className="space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7575] border-b border-[#E5E3DD] pb-2 ml-1">Patient</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200/60">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[#6B7575] ml-1">Patient name</label>
            <input
              type="text"
              value={data.patientName}
              onChange={(e) => handleChange('patientName', e.target.value)}
              placeholder="Patient Name"
              className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#173B3D] outline-none border transition-all"
            />
          </div>
          
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Date of birth / Age</p>
            <input
              type="text"
              value={data.patientDob}
              onChange={(e) => handleChange('patientDob', e.target.value.replace(/\D/g, ''))}
              placeholder="00"
              className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 lg:py-2 text-sm font-bold focus:ring-2 focus:ring-[#173B3D] outline-none border"
            />
          </div>
          
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Gender</p>
            <select
              value={data.patientGender}
              onChange={(e) => handleChange('patientGender', e.target.value)}
              className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 lg:py-2 text-sm font-bold focus:ring-2 focus:ring-[#173B3D] outline-none border appearance-none"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[#6B7575] ml-1">Date of issue</label>
            <input
              type="text"
              value={data.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 lg:py-2 text-sm font-bold focus:ring-2 focus:ring-[#173B3D] outline-none border"
            />
          </div>
        </div>
      </div>

      {/* Medication Library & Database */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E3DD] pb-2 ml-1">
          <h3 className="text-[11px] font-black text-[#6B7575] uppercase tracking-widest flex items-center gap-2">
            Medication Library
          </h3>
          <button 
            onClick={() => setShowDbForm(!showDbForm)}
            className="text-[10px] font-black text-[#1E4C4E] uppercase tracking-widest flex items-center gap-1.5 hover:underline"
          >
            <Database className="w-3 h-3" /> {showDbForm ? 'Close Form' : 'Add to Database'}
          </button>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A6A6]" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search database or common meds..."
            className="w-full bg-white border border-[#E5E3DD] rounded-xl pl-10 pr-4 py-3 text-sm focus:border-[#173B3D] outline-none transition-all shadow-sm"
          />
          {searchQuery.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E3DD] rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto p-1">
              {combinedSearchList.map((med, i) => (
                <div key={i} className="group flex items-center gap-1 hover:bg-[#F5F4F0] rounded-lg transition-colors">
                  <button 
                    onClick={() => addMedicationFromLibrary(med)}
                    className="flex-1 text-left px-4 py-3 text-sm flex flex-col"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#173B3D]">{med.name}</span>
                      {med.source === 'database' && <Database className="w-2.5 h-2.5 text-indigo-400" />}
                    </div>
                    <span className="text-[10px] text-[#A0A6A6] uppercase tracking-wider">{med.dosage}</span>
                  </button>
                  {med.source === 'database' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Find index in userMedDatabase
                        const dbIdx = userMedDatabase.findIndex(m => m.name === med.name && m.dosage === med.dosage);
                        if (dbIdx > -1) removeFromDatabase(dbIdx);
                      }}
                      className="p-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove from database"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Database Entry Content */}
        {showDbForm && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="p-5 bg-[#F5F4F0] border border-[#E5E3DD] rounded-2xl space-y-4">
              <h4 className="text-[10px] font-black text-[#173B3D] uppercase tracking-widest mb-1">New Database Entry</h4>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Drug Name"
                  value={newDbMed.name}
                  onChange={(e) => setNewDbMed({ ...newDbMed, name: e.target.value })}
                  className="w-full bg-white border-[#E5E3DD] rounded-md px-3 py-2 text-xs font-bold outline-none border focus:border-[#173B3D]"
                />
                <input
                  type="text"
                  placeholder="Dosage"
                  value={newDbMed.dosage}
                  onChange={(e) => setNewDbMed({ ...newDbMed, dosage: e.target.value })}
                  className="w-full bg-white border-[#E5E3DD] rounded-md px-3 py-2 text-xs font-bold outline-none border focus:border-[#173B3D]"
                />
              </div>
              <input
                type="text"
                placeholder="Instructions (e.g. 1 tab PO BID)"
                value={newDbMed.instructions}
                onChange={(e) => setNewDbMed({ ...newDbMed, instructions: e.target.value })}
                className="w-full bg-white border-[#E5E3DD] rounded-md px-3 py-2 text-xs font-bold outline-none border focus:border-[#173B3D]"
              />
              <button
                onClick={() => saveToDatabase(newDbMed)}
                className="w-full bg-[#173B3D] text-white py-2 rounded-xl text-xs font-bold shadow-md hover:bg-[#0F2A2C] transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <Save className="w-3.5 h-3.5" /> Save to Database
              </button>
            </div>

            {/* Bulk Import */}
            <div className="p-5 bg-[#F5F4F0] border border-[#E5E3DD] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-[#173B3D] uppercase tracking-widest flex items-center gap-1.5">
                  <Upload className="w-3 h-3" /> Bulk Import
                </h4>
                <button
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="text-[10px] font-black text-[#1E4C4E] uppercase tracking-widest hover:underline"
                >
                  Upload CSV
                </button>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv,text/plain"
                  className="hidden"
                  onChange={handleBulkFileUpload}
                />
              </div>
              <p className="text-[10px] text-[#6B7575] leading-relaxed">
                Paste one medication per line as <span className="font-bold">Name, Dosage, Instructions</span> (comma or tab separated). A header row is skipped automatically.
              </p>
              <textarea
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                placeholder={"Amoxicillin, 500 mg, 1 tab PO TID for 7 days\nMetformin, 500 mg, 1 tab PO BID with meals"}
                className="w-full bg-white border border-[#E5E3DD] rounded-md px-3 py-2 text-xs font-medium outline-none focus:border-[#173B3D] min-h-[90px] font-mono"
              />
              <button
                onClick={handleBulkImport}
                disabled={!bulkImportText.trim()}
                className="w-full bg-[#1E4C4E] text-white py-2 rounded-xl text-xs font-bold shadow-md hover:bg-[#173B3D] disabled:opacity-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <Database className="w-3.5 h-3.5" /> Import to Database
              </button>
            </div>


            {userMedDatabase.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Saved Medications ({userMedDatabase.length})</p>
                <div className="grid grid-cols-1 gap-2">
                  {userMedDatabase.map((med, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-[#E5E3DD] rounded-xl group hover:border-[#173B3D]/30 transition-all">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#173B3D]">{med.name}</span>
                        <span className="text-[10px] text-[#A0A6A6]">{med.dosage}</span>
                      </div>
                      <button 
                        onClick={() => removeFromDatabase(idx)}
                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prescription Medications List */}
      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-center px-1 border-b border-[#E5E3DD] pb-2">
          <h3 className="text-[11px] font-black text-[#6B7575] uppercase tracking-widest">Medications Prescribed</h3>
          <button onClick={addEmptyMedication} className="text-[10px] font-bold text-[#1E4C4E] hover:underline">
            + Add Row
          </button>
        </div>

        <div className="space-y-3">
          {data.medications.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-[#E5E3DD] rounded-3xl text-center bg-[#F5F4F0]/30">
              <p className="text-[11px] text-[#A0A6A6] font-bold uppercase tracking-widest leading-relaxed">No medications added.<br/>Use the library above.</p>
            </div>
          ) : (
            data.medications.map((item, idx) => (
              <div key={item.id} className="p-5 bg-[#F5F4F0] border border-[#E5E3DD] rounded-2xl relative group hover:border-[#173B3D]/30 transition-all">
                <div className="absolute top-4 right-4 flex gap-1">
                  <button 
                    onClick={() => saveToDatabase(item)}
                    className="p-1.5 text-[#A0A6A6] hover:text-[#173B3D] transition-all"
                    title="Save to Database"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => removeMedication(item.id)}
                    className="p-1.5 text-[#A0A6A6] hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-[#A0A6A6] uppercase tracking-wider ml-1">Drug Name</p>
                    <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleMedicationChange(item.id, 'name', e.target.value)}
                        className="w-full bg-white border-[#E5E3DD] rounded-lg px-3 py-2 text-sm font-bold focus:border-[#173B3D] transition-all outline-none border"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <p className="text-[9px] font-black text-[#A0A6A6] uppercase tracking-wider ml-1">Dosage / Container</p>
                      <input
                          type="text"
                          value={item.dosage}
                          onChange={(e) => handleMedicationChange(item.id, 'dosage', e.target.value)}
                          className="w-full bg-white border-[#E5E3DD] rounded-lg px-3 py-2 text-sm font-bold focus:border-[#173B3D] transition-all outline-none border"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-[#A0A6A6] uppercase tracking-wider ml-1 text-center">Qty (e.g. x1)</p>
                      <input
                          type="text"
                          value={item.quantity || ''}
                          onChange={(e) => handleMedicationChange(item.id, 'quantity', e.target.value)}
                          placeholder="x1"
                          className="w-full bg-white border-[#E5E3DD] rounded-lg px-3 py-2 text-sm font-bold text-center focus:border-[#173B3D] transition-all outline-none border"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-[#A0A6A6] uppercase tracking-wider ml-1">Instructions</p>
                    <input
                        type="text"
                        value={item.instructions}
                        onChange={(e) => handleMedicationChange(item.id, 'instructions', e.target.value)}
                        placeholder="e.g. 1 tab PO BID"
                        className="w-full bg-white border-[#E5E3DD] rounded-lg px-3 py-2 text-sm font-medium focus:border-[#173B3D] transition-all outline-none border italic"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Doctor & Clinic */}
      <div className="space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7575] border-b border-[#E5E3DD] pb-2 ml-1">Doctor</div>
        <div className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-200/60">
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[#6B7575] ml-1">Doctor name</label>
            <input
              type="text"
              value={data.doctorName}
              onChange={(e) => handleChange('doctorName', e.target.value)}
              className="w-full bg-white border-[#E5E3DD] rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#173B3D] outline-none border transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[#6B7575] ml-1">Doctor title</label>
            <textarea
              value={data.doctorTitle}
              onChange={(e) => handleChange('doctorTitle', e.target.value)}
              className="w-full bg-white border-[#E5E3DD] rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#173B3D] outline-none border transition-all font-medium"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[#6B7575] ml-1">Licence / Reg No</label>
            <input
              type="text"
              value={data.doctorRegNo}
              onChange={(e) => handleChange('doctorRegNo', e.target.value)}
              className="w-full bg-white border-[#E5E3DD] rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-[#173B3D] outline-none border transition-all"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-[#6B7575] uppercase tracking-widest ml-1">Notes</label>
          <textarea
            value={data.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full bg-white border-[#E5E3DD] rounded-xl px-4 py-3 text-sm focus:border-[#173B3D] outline-none border transition-all"
            rows={3}
            placeholder="Additional clinical notes..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-[#6B7575] uppercase tracking-widest ml-1">Warnings</label>
          <textarea
            value={data.warnings}
            onChange={(e) => handleChange('warnings', e.target.value)}
            className="w-full bg-white border-[#E5E3DD] rounded-xl px-4 py-3 text-sm focus:border-[#173B3D] outline-none border transition-all"
            rows={3}
            placeholder="Important warnings..."
          />
        </div>
      </div>

      <div className="space-y-3 bg-red-50 p-5 rounded-2xl border border-red-100">
        <label className="text-[10px] font-black text-red-600 uppercase tracking-widest ml-1 flex items-center gap-2">
            Important Footer Note (Red)
        </label>
        <textarea
           value={data.footerNote}
           onChange={(e) => handleChange('footerNote', e.target.value)}
           className="w-full bg-white border-red-200 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-red-500 outline-none border transition-all text-red-600 font-bold"
           rows={2}
           placeholder="Appears in red at bottom (e.g. Not valid for refills)"
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E5E3DD] shadow-sm">
        <label htmlFor="dispensed-stamp" className="text-[11px] font-black text-[#173B3D] uppercase tracking-widest cursor-pointer">
          Show Rx Dispensed Stamp
        </label>
        <Switch
          id="dispensed-stamp"
          checked={data.showDispensedStamp ?? true}
          onCheckedChange={(checked) => handleChange('showDispensedStamp', checked)}
        />
      </div>

      <div className="p-5 bg-white rounded-3xl border border-[#E5E3DD] shadow-sm space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-black text-[#173B3D] uppercase tracking-widest">Official Signature</h3>
            {data.signature && !savedSignatures.includes(data.signature) && (
              <button 
                onClick={saveSignatureToLibrary}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 hover:underline"
              >
                <Save className="w-3 h-3" /> Save to Library
              </button>
            )}
          </div>

          {savedSignatures.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
               {savedSignatures.map((sig, idx) => (
                 <div key={idx} className="relative group aspect-video bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-all overflow-hidden"
                   onClick={() => handleChange('signature', sig)}
                 >
                    <img src={sig} alt={`Saved Sig ${idx}`} className="max-h-full max-w-full object-contain filter mix-blend-multiply" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeSignatureFromLibrary(idx); }}
                      className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-md text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {data.signature === sig && (
                      <div className="absolute inset-0 bg-indigo-500/10 border-2 border-indigo-500 rounded-xl" />
                    )}
                 </div>
               ))}
            </div>
          )}

          {data.signature ? (
              <div className="relative w-full h-32 bg-[#F5F4F0] rounded-xl border border-[#E5E3DD] flex items-center justify-center group overflow-hidden">
                  <img src={data.signature} alt="Signature" className="max-h-full max-w-full p-4 object-contain mix-blend-multiply" />
                  <button 
                      onClick={clearSignature}
                      className="absolute top-3 right-3 p-2 bg-white rounded-xl shadow-lg text-[#A0A6A6] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
          ) : (
              <div 
                  className="border-2 border-dashed border-[#E5E3DD] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F5F4F0] transition-all group"
                  onClick={() => fileInputRef.current?.click()}
              >
                  <Upload className="w-10 h-10 text-[#A0A6A6] mb-3 group-hover:text-[#173B3D] transition-colors" />
                  <p className="text-[10px] font-black text-[#6B7575] uppercase tracking-widest">Upload Signature Image</p>
                  <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleSignatureUpload}
                  />
              </div>
          )}
      </div>

      <div className="p-5 bg-white rounded-3xl border border-[#E5E3DD] shadow-sm space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-black text-[#173B3D] uppercase tracking-widest">Official Stamp</h3>
            {data.stamp && !savedStamps.includes(data.stamp) && (
              <button 
                onClick={saveStampToLibrary}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 hover:underline"
              >
                <Save className="w-3 h-3" /> Save to Library
              </button>
            )}
          </div>

          {savedStamps.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
               {savedStamps.map((stp, idx) => (
                 <div key={idx} className="relative group aspect-square bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-all overflow-hidden"
                   onClick={() => handleChange('stamp', stp)}
                 >
                    <img src={stp} alt={`Saved Stamp ${idx}`} className="max-h-full max-w-full object-contain filter mix-blend-multiply" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeStampFromLibrary(idx); }}
                      className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-md text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {data.stamp === stp && (
                      <div className="absolute inset-0 bg-indigo-500/10 border-2 border-indigo-500 rounded-xl" />
                    )}
                 </div>
               ))}
            </div>
          )}

          {data.stamp ? (
              <div className="relative w-full h-32 bg-[#F5F4F0] rounded-xl border border-[#E5E3DD] flex items-center justify-center group overflow-hidden">
                  <img src={data.stamp} alt="Stamp" className="max-h-full max-w-full p-4 object-contain mix-blend-multiply" />
                  <button 
                      onClick={clearStamp}
                      className="absolute top-3 right-3 p-2 bg-white rounded-xl shadow-lg text-[#A0A6A6] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
          ) : (
              <div 
                  className="border-2 border-dashed border-[#E5E3DD] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F5F4F0] transition-all group"
                  onClick={() => stampInputRef.current?.click()}
              >
                  <Upload className="w-10 h-10 text-[#A0A6A6] mb-3 group-hover:text-[#173B3D] transition-colors" />
                  <p className="text-[10px] font-black text-[#6B7575] uppercase tracking-widest">Upload Stamp Image</p>
                  <input 
                      ref={stampInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleStampUpload}
                  />
              </div>
          )}
      </div>
    </div>
  );
};