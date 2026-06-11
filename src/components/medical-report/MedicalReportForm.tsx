import React, { useRef, useState } from 'react';
import { MedicalReportData } from '@/lib/types';
import { Upload, X, Stamp, Sparkles, Loader2 } from 'lucide-react';
import { AIAssistButton } from '@/components/ui/AIAssistButton';
import { parseMedicalReport } from '@/lib/geminiService';
import { getTodayDate } from '@/lib/dateUtils';

interface MedicalReportFormProps {
  data: MedicalReportData;
  onChange: (data: MedicalReportData) => void;
  savedSignatures: string[];
  setSavedSignatures: (sigs: string[]) => void;
  savedStamps: string[];
  setSavedStamps: (stps: string[]) => void;
  savedLogos: string[];
  setSavedLogos: (lgs: string[]) => void;
}

export const MedicalReportForm: React.FC<MedicalReportFormProps> = ({ 
    data, 
    onChange,
    savedSignatures,
    setSavedSignatures,
    savedStamps,
    setSavedStamps,
    savedLogos,
    setSavedLogos
}) => {
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // State for Full Report AI
  const [aiInput, setAiInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fullError, setFullError] = useState<string | null>(null);

  // State for Basic Info AI
  const [basicInfoAiInput, setBasicInfoAiInput] = useState('');
  const [isAnalyzingBasic, setIsAnalyzingBasic] = useState(false);
  const [basicError, setBasicError] = useState<string | null>(null);

  const handleChange = (field: keyof MedicalReportData, value: any) => {
    onChange({ ...data, [field]: value });
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

  const clearSignature = () => {
    handleChange('signature', undefined);
    if (signatureInputRef.current) {
        signatureInputRef.current.value = '';
    }
  };

  const clearStamp = () => {
    handleChange('stamp', undefined);
    if (stampInputRef.current) {
        stampInputRef.current.value = '';
    }
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
    if (logoInputRef.current) {
        logoInputRef.current.value = '';
    }
  };

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

  const handleAIParse = async () => {
    if (!aiInput.trim()) return;
    
    setIsAnalyzing(true);
    setFullError(null);
    try {
        const parsedData = await parseMedicalReport(aiInput);
        
        if (parsedData) {
            // Clean age if present
            if (parsedData.patientDob) {
                parsedData.patientDob = parsedData.patientDob.replace(/\D/g, '');
            }
            
            // Merge parsed data with existing data, keeping images if they exist
            onChange({ 
                ...data, 
                ...parsedData,
                reportDate: getTodayDate(),
                consultationDate: getTodayDate(),
                signature: data.signature, // Preserve existing signature
                stamp: data.stamp // Preserve existing stamp
            });
            setAiInput(''); // Clear input on success
        } else {
            setFullError("AI could not extract enough details. Please ensure the text is clear.");
        }
    } catch (error) {
        console.error("Failed to parse medical report", error);
        setFullError("AI processing failed. Please check your connection or try a shorter text.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleBasicInfoParse = async () => {
    if (!basicInfoAiInput.trim()) return;

    setIsAnalyzingBasic(true);
    setBasicError(null);
    try {
        // We reuse the same parser as it extracts patient info well
        const parsedData = await parseMedicalReport(basicInfoAiInput);

        if (parsedData) {
            // Clean age if present
            const cleanAge = parsedData.patientDob ? parsedData.patientDob.replace(/\D/g, '') : data.patientDob;
            
            // Only update patient and header related fields
            onChange({
                ...data,
                // Patient Details
                patientName: parsedData.patientName || data.patientName,
                patientDob: cleanAge,
                patientGender: parsedData.patientGender || data.patientGender,
                // Vitals
                height: parsedData.height || data.height,
                weight: parsedData.weight || data.weight,
                bmi: parsedData.bmi || data.bmi,
                weightLossGoal: parsedData.weightLossGoal || data.weightLossGoal,
                // Header Info (often pasted with patient info)
                reportDate: getTodayDate(),
                consultationDate: getTodayDate(),
                attendingPhysician: parsedData.attendingPhysician || data.attendingPhysician
            });
            setBasicInfoAiInput('');
        } else {
            setBasicError("AI could not extract enough details. Please ensure the text is clear.");
        }
    } catch (error) {
        console.error("Failed to parse basic info", error);
        setBasicError("AI processing failed. Please check your connection.");
    } finally {
        setIsAnalyzingBasic(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo Branding */}
      <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-700 uppercase">Clinic Logo</h3>
              {data.logo && !savedLogos.includes(data.logo) && (
                <button 
                  onClick={saveLogoToLibrary}
                  className="text-[10px] font-bold text-teal-600 uppercase tracking-wider hover:underline"
                >
                  Save to Library
                </button>
              )}
          </div>

          {savedLogos.length > 0 && (
            <div className="grid grid-cols-4 gap-2 bg-gray-50 p-2 rounded-md border border-gray-100">
               {savedLogos.map((lg, idx) => (
                 <div key={idx} className="relative group aspect-square bg-white rounded border border-gray-200 p-1 flex items-center justify-center cursor-pointer hover:border-teal-400 transition-all overflow-hidden"
                   onClick={() => handleChange('logo', lg)}
                 >
                    <img src={lg} alt="Logo" className="max-h-full max-w-full object-contain filter mix-blend-multiply" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeLogoFromLibrary(idx); }}
                      className="absolute top-0 right-0 p-1 bg-white/80 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {data.logo === lg && <div className="absolute inset-0 border-2 border-teal-500 rounded" />}
                 </div>
               ))}
            </div>
          )}

          {data.logo ? (
              <div className="relative w-full h-24 bg-gray-50 rounded border border-gray-200 flex items-center justify-center group">
                  <img src={data.logo} alt="Logo Preview" className="max-h-full max-w-full p-2 object-contain filter mix-blend-multiply" />
                  <button 
                      onClick={clearLogo}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow text-gray-500 hover:text-red-600"
                      title="Remove Logo"
                  >
                      <X className="w-4 h-4" />
                  </button>
              </div>
          ) : (
              <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-colors h-24"
                  onClick={() => logoInputRef.current?.click()}
              >
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Upload Clinic Logo</p>
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

      {/* AI Smart Import Section (Full Report) */}
      <div className="bg-gradient-to-br from-teal-50 to-blue-50 p-4 rounded-lg border border-teal-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-teal-900">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold uppercase tracking-wide">Full Report Import</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">
                Paste the full medical report text here to auto-fill all fields (Header, Patient, Clinical, etc.).
            </p>
            <div className="relative">
                <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Paste full medical report content..."
                    className="w-full rounded-md border-gray-200 shadow-sm p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[80px]"
                />
                {fullError && (
                    <div className="absolute top-0 left-0 right-0 -mt-6 bg-red-50 text-red-600 text-[10px] font-bold py-0.5 px-2 rounded-t-md border border-red-100 flex justify-between items-center z-10">
                        <span>{fullError}</span>
                        <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setFullError(null)} />
                    </div>
                )}
                <button
                    onClick={handleAIParse}
                    disabled={isAnalyzing || !aiInput.trim()}
                    className="absolute bottom-2 right-2 bg-teal-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        'Auto-Fill Full Report'
                    )}
                </button>
            </div>
        </div>

      {/* Header Details */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Report Header</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-xs font-medium text-gray-700">Report Date</label>
                <input
                    type="text"
                    value={data.reportDate}
                    onChange={(e) => handleChange('reportDate', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                />
            </div>
             <div>
                <label className="block text-xs font-medium text-gray-700">Consultation Date</label>
                <input
                    type="text"
                    value={data.consultationDate}
                    onChange={(e) => handleChange('consultationDate', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Attending Physician</label>
            <input
              type="text"
              value={data.attendingPhysician}
              onChange={(e) => handleChange('attendingPhysician', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Patient Details with AI Import */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-blue-900">Patient Information</h3>
        </div>

        {/* AI Basic Info Import */}
        <div className="mb-4 bg-white/60 p-3 rounded-md border border-blue-100">
            <div className="flex items-center gap-2 mb-1.5 text-blue-800">
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Quick Import Patient Details</span>
            </div>
            <div className="relative">
                <textarea
                    value={basicInfoAiInput}
                    onChange={(e) => setBasicInfoAiInput(e.target.value)}
                    placeholder="Paste patient info (Name, DOB, Height, Weight...)"
                    className="w-full rounded-md border-gray-200 shadow-sm p-2 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent min-h-[50px] pr-20"
                />
                {basicError && (
                    <div className="absolute top-0 left-0 right-0 -mt-5 bg-red-50 text-red-600 text-[9px] font-bold py-0.5 px-2 rounded-t flex justify-between items-center z-10 border border-red-100 border-b-0">
                        <span>{basicError}</span>
                        <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setBasicError(null)} />
                    </div>
                )}
                <button
                    onClick={handleBasicInfoParse}
                    disabled={isAnalyzingBasic || !basicInfoAiInput.trim()}
                    className="absolute bottom-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                >
                    {isAnalyzingBasic ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        'Fill Details'
                    )}
                </button>
            </div>
        </div>

        <div className="space-y-3">
            <input
              type="text"
              value={data.patientName}
              onChange={(e) => handleChange('patientName', e.target.value)}
              placeholder="Full Name"
              className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
                <input
                    type="text"
                    value={data.patientDob}
                    onChange={(e) => handleChange('patientDob', e.target.value.replace(/\D/g, ''))}
                    placeholder="00"
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm font-bold"
                />
                <input
                    type="text"
                    value={data.patientGender}
                    onChange={(e) => handleChange('patientGender', e.target.value)}
                    placeholder="Gender"
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                />
            </div>
            
            <h4 className="text-xs font-semibold text-gray-500 mt-2 uppercase">Vitals & Goals</h4>
            <div className="grid grid-cols-2 gap-3">
                <input
                    type="text"
                    value={data.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                    placeholder="Height (e.g. 147 cm)"
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                />
                <input
                    type="text"
                    value={data.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    placeholder="Weight (e.g. 59 kg)"
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                />
                <input
                    type="text"
                    value={data.bmi}
                    onChange={(e) => handleChange('bmi', e.target.value)}
                    placeholder="BMI (e.g. 27.3 kg/m2)"
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                />
                <input
                    type="text"
                    value={data.weightLossGoal}
                    onChange={(e) => handleChange('weightLossGoal', e.target.value)}
                    placeholder="Goal (e.g. Lose 5-15 kg)"
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                />
            </div>
        </div>
      </div>

      {/* Clinical Summary */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Summary</label>
        <textarea
           value={data.clinicalSummary}
           onChange={(e) => handleChange('clinicalSummary', e.target.value)}
           className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm pr-10"
           rows={6}
        />
        <AIAssistButton 
            currentText={data.clinicalSummary}
            onReplace={(txt) => handleChange('clinicalSummary', txt)}
            context="Medical Clinical Summary"
        />
      </div>

      {/* Clinical Flags */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Flags</label>
        <textarea
           value={data.clinicalFlags}
           onChange={(e) => handleChange('clinicalFlags', e.target.value)}
           className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm pr-10 font-mono"
           rows={5}
           placeholder="• Bullet points..."
        />
      </div>

      {/* Assessment */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Assessment</label>
        <textarea
           value={data.assessment}
           onChange={(e) => handleChange('assessment', e.target.value)}
           className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm pr-10"
           rows={5}
        />
         <AIAssistButton 
            currentText={data.assessment}
            onReplace={(txt) => handleChange('assessment', txt)}
            context="Medical Assessment"
        />
      </div>

      {/* Treatment Plan */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Plan</label>
        <textarea
           value={data.treatmentPlan}
           onChange={(e) => handleChange('treatmentPlan', e.target.value)}
           className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm pr-10"
           rows={6}
        />
         <AIAssistButton 
            currentText={data.treatmentPlan}
            onReplace={(txt) => handleChange('treatmentPlan', txt)}
            context="Medical Treatment Plan"
        />
      </div>

      {/* Prognosis */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Prognosis</label>
        <textarea
           value={data.prognosis}
           onChange={(e) => handleChange('prognosis', e.target.value)}
           className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm pr-10"
           rows={3}
        />
      </div>

      {/* Physician's Notes */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Physician's Notes</label>
        <textarea
           value={data.physicianNotes}
           onChange={(e) => handleChange('physicianNotes', e.target.value)}
           className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm pr-10"
           rows={3}
        />
      </div>

      {/* Footer Details */}
       <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Footer Info</h3>
          <div className="space-y-3 mb-4">
             <input
              type="text"
              value={data.footerDoctorName}
              onChange={(e) => handleChange('footerDoctorName', e.target.value)}
              placeholder="Footer Doctor Name"
              className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            />
             <input
              type="text"
              value={data.footerDoctorTitle}
              onChange={(e) => handleChange('footerDoctorTitle', e.target.value)}
              placeholder="Footer Title (e.g. Medical Director...)"
              className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            />
             <input
              type="text"
              value={data.footerLocation}
              onChange={(e) => handleChange('footerLocation', e.target.value)}
              placeholder="Location (e.g. Dubai, UAE)"
              className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            />
          </div>
      </div>

      {/* Signature & Stamp Uploads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                 <h3 className="text-xs font-semibold text-gray-700 uppercase">Signature</h3>
                 {data.signature && !savedSignatures.includes(data.signature) && (
                    <button 
                      onClick={saveSignatureToLibrary}
                      className="text-[10px] font-bold text-teal-600 uppercase tracking-wider hover:underline"
                    >
                      Save to Library
                    </button>
                 )}
              </div>

              {savedSignatures.length > 0 && (
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded-md border border-gray-100">
                  {savedSignatures.map((sig, idx) => (
                    <div key={idx} className="relative group aspect-video bg-white rounded border border-gray-200 p-1 flex items-center justify-center cursor-pointer hover:border-teal-400 transition-all overflow-hidden"
                      onClick={() => handleChange('signature', sig)}
                    >
                        <img src={sig} alt="Sig" className="max-h-full max-w-full object-contain filter mix-blend-multiply" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeSignatureFromLibrary(idx); }}
                          className="absolute top-0 right-0 p-1 bg-white/80 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {data.signature === sig && <div className="absolute inset-0 border-2 border-teal-500 rounded" />}
                    </div>
                  ))}
                </div>
              )}

              {data.signature ? (
                  <div className="relative w-full h-24 bg-gray-50 rounded border border-gray-200 flex items-center justify-center group">
                      <img src={data.signature} alt="Signature Preview" className="max-h-full max-w-full p-2 object-contain" />
                      <button 
                          onClick={clearSignature}
                          className="absolute top-2 right-2 p-1 bg-white rounded-full shadow text-gray-500 hover:text-red-600"
                          title="Remove Signature"
                      >
                          <X className="w-4 h-4" />
                      </button>
                  </div>
              ) : (
                  <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors h-24"
                      onClick={() => signatureInputRef.current?.click()}
                  >
                      <Upload className="w-6 h-6 text-gray-400 mb-1" />
                      <p className="text-xs text-gray-500">Upload Signature</p>
                      <input 
                          ref={signatureInputRef}
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleSignatureUpload}
                      />
                  </div>
              )}
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                 <h3 className="text-xs font-semibold text-gray-700 uppercase">Stamp</h3>
                 {data.stamp && !savedStamps.includes(data.stamp) && (
                    <button 
                      onClick={saveStampToLibrary}
                      className="text-[10px] font-bold text-teal-600 uppercase tracking-wider hover:underline"
                    >
                      Save to Library
                    </button>
                 )}
              </div>

              {savedStamps.length > 0 && (
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded-md border border-gray-100">
                  {savedStamps.map((stp, idx) => (
                    <div key={idx} className="relative group aspect-square bg-white rounded border border-gray-200 p-1 flex items-center justify-center cursor-pointer hover:border-teal-400 transition-all overflow-hidden"
                      onClick={() => handleChange('stamp', stp)}
                    >
                        <img src={stp} alt="Stamp" className="max-h-full max-w-full object-contain filter mix-blend-multiply" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeStampFromLibrary(idx); }}
                          className="absolute top-0 right-0 p-1 bg-white/80 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {data.stamp === stp && <div className="absolute inset-0 border-2 border-teal-500 rounded" />}
                    </div>
                  ))}
                </div>
              )}

              {data.stamp ? (
                  <div className="relative w-full h-24 bg-gray-50 rounded border border-gray-200 flex items-center justify-center group">
                      <img src={data.stamp} alt="Stamp Preview" className="max-h-full max-w-full p-2 object-contain" />
                      <button 
                          onClick={clearStamp}
                          className="absolute top-2 right-2 p-1 bg-white rounded-full shadow text-gray-500 hover:text-red-600"
                          title="Remove Stamp"
                      >
                          <X className="w-4 h-4" />
                      </button>
                  </div>
              ) : (
                  <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors h-24"
                      onClick={() => stampInputRef.current?.click()}
                  >
                      <Stamp className="w-6 h-6 text-gray-400 mb-1" />
                      <p className="text-xs text-gray-500">Upload Stamp</p>
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
    </div>
  );
};