import React from 'react';
import { MedicalReportData } from '@/lib/types';

interface MedicalReportPreviewProps {
  data: MedicalReportData;
  id: string;
}

export const MedicalReportPreview: React.FC<MedicalReportPreviewProps> = ({ data, id }) => {
  return (
    <div id={id} className="w-[210mm] min-h-[297mm] bg-[#fef9ef] flex flex-col relative text-[#183b3e] font-['Google_Sans_Flex',sans-serif] shadow-none overflow-hidden leading-snug">
      {/* Watermark */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-[0.02] rotate-[-45deg] select-none whitespace-nowrap">
          <span className="text-[120px] font-black tracking-[30px] leading-none mb-10 uppercase">MEDICAL</span>
          <span className="text-[120px] font-black tracking-[30px] leading-none uppercase">REPORT</span>
      </div>

      {/* Header */}
      <div className="p-[60px] pb-0 relative z-10">
        <div className="flex justify-between items-start">
           <div className="flex flex-col">
              {data.logo ? (
                <img src={data.logo} alt="Clinic Logo" className="max-h-16 w-auto object-contain object-left mb-2" />
              ) : (
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-black tracking-tighter text-[#183b3e]">DARDOC</span>
                  <span className="text-xl font-bold tracking-tighter text-[#183b3e]/40">داردوك</span>
                </div>
              )}
           </div>
           <div className="flex gap-3 items-start justify-end">
              <div className="flex flex-col text-right">
                  <span className="text-[10px] font-black leading-tight uppercase tracking-[0.1em]">DARDOC HEALTH SERVICES L.L.C</span>
                  <span className="text-[8.5px] font-medium text-[#183b3e]/50 leading-tight mt-1">
                    701, Opal Tower, Burj Khalifa Blvd,<br/>
                    Business Bay, Dubai, UAE
                  </span>
                  <span className="text-[8px] font-medium text-[#183b3e]/40 leading-tight mt-0.5">
                    clinic@dardoc.com
                  </span>
              </div>
           </div>
        </div>
      </div>
      
      <div className="mx-[60px] h-px bg-[#dfd6ca] mt-6 mb-8"></div>

      {/* Content Area */}
      <div className="px-[60px] flex-1 flex flex-col z-10 pb-16">
        
        <div className="flex justify-between items-end mb-8">
           <h1 className="text-[42px] font-light tracking-tight m-0 leading-none">Medical Report</h1>
           <div className="flex items-baseline gap-3 mb-1">
             <span className="text-[10px] font-black text-[#183b3e]/30 tracking-[0.2em] uppercase">DATE</span>
             <span className="text-xl font-bold tracking-[0.2em] text-[#183b3e]/60">
               {data.reportDate}
             </span>
           </div>
        </div>

        {/* Patient & Vitals 3D Card */}
        <div className="bg-[#f8efe1] border-t border-l border-[#dfd6ca] border-r-2 border-b-2 border-[#cfc5b8] rounded-[24px] p-7 mb-10 shadow-[8px_8px_0px_rgba(223,214,202,0.5)]">
           <div className="grid grid-cols-5 gap-y-6">
              <div className="col-span-3">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] mb-1.5">PATIENT NAME</p>
                  <p className="text-lg font-bold tracking-tight">{data.patientName}</p>
              </div>
              <div className="col-span-2">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] mb-1.5">INITIAL CONSULTATION</p>
                  <p className="text-lg font-bold tracking-tight">{data.consultationDate}</p>
              </div>
              
              <div className="col-span-5 grid grid-cols-6 gap-4 mt-2">
                 <div className="col-span-1">
                    <p className="text-[8px] font-black tracking-widest uppercase text-[#89948f] mb-1">AGE</p>
                    <p className="text-sm font-bold">{data.patientDob}</p>
                 </div>
                 <div className="col-span-1">
                    <p className="text-[8px] font-black tracking-widest uppercase text-[#89948f] mb-1">GENDER</p>
                    <p className="text-sm font-bold">{data.patientGender}</p>
                 </div>
                 <div className="col-span-1">
                    <p className="text-[8px] font-black tracking-widest uppercase text-[#89948f] mb-1">HEIGHT</p>
                    <p className="text-sm font-bold">{data.height}</p>
                 </div>
                 <div className="col-span-1">
                    <p className="text-[8px] font-black tracking-widest uppercase text-[#89948f] mb-1">WEIGHT</p>
                    <p className="text-sm font-bold">{data.weight}</p>
                 </div>
                 <div className="col-span-1">
                    <p className="text-[8px] font-black tracking-widest uppercase text-[#89948f] mb-1">BMI</p>
                    <p className="text-sm font-bold">{data.bmi}</p>
                 </div>
                 <div className="col-span-1">
                    <p className="text-[8px] font-black tracking-widest uppercase text-[#89948f] mb-1">GOAL</p>
                    <p className="text-sm font-bold text-emerald-600">{data.weightLossGoal}</p>
                 </div>
              </div>

              <div className="col-span-5 mt-2">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] mb-1.5">ATTENDING PHYSICIAN</p>
                  <p className="text-[13px] font-bold tracking-tight">{data.attendingPhysician}</p>
              </div>
           </div>
        </div>

        {/* Clinical Sections */}
        <div className="space-y-8">
            {data.clinicalSummary && (
                <div className="space-y-2">
                    <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] px-1">CLINICAL SUMMARY</p>
                    <div className="text-[13px] text-[#183b3e]/80 whitespace-pre-wrap text-justify leading-relaxed px-1">
                        {data.clinicalSummary}
                    </div>
                </div>
            )}

            {data.clinicalFlags && (
                <div className="space-y-2">
                    <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] px-1">CLINICAL FLAGS</p>
                    <div className="text-[13px] text-red-600/80 font-medium whitespace-pre-wrap leading-relaxed px-1">
                        {data.clinicalFlags}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-10">
                {data.assessment && (
                    <div className="space-y-2">
                        <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] px-1">ASSESSMENT</p>
                        <div className="text-[13px] text-[#183b3e]/80 whitespace-pre-wrap leading-relaxed px-1">
                            {data.assessment}
                        </div>
                    </div>
                )}
                {data.treatmentPlan && (
                    <div className="space-y-2">
                        <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] px-1">TREATMENT PLAN</p>
                        <div className="text-[13px] text-[#183b3e]/80 whitespace-pre-wrap leading-relaxed px-1">
                            {data.treatmentPlan}
                        </div>
                    </div>
                )}
            </div>

            {data.prognosis && (
                <div className="space-y-2">
                    <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] px-1">PROGNOSIS</p>
                    <div className="text-[13px] text-[#183b3e]/80 whitespace-pre-wrap leading-relaxed px-1 text-justify">
                        {data.prognosis}
                    </div>
                </div>
            )}
        </div>

        {/* Signature & Footer Area */}
        <div className="mt-auto pt-10 px-1">
            <div className="h-px bg-[#dfd6ca] mb-6"></div>
            <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                    <p className="text-[15px] font-bold tracking-tight">{data.footerDoctorName}</p>
                    <p className="text-[11px] font-medium text-[#183b3e]/60 italic leading-tight">{data.footerDoctorTitle}</p>
                    <p className="text-[9px] font-black tracking-widest text-[#183b3e]/20 uppercase pt-2">{data.footerLocation}</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {data.signature && (
                        <div className="h-20 w-40 flex flex-col items-center justify-center relative">
                            <img 
                                src={data.signature} 
                                alt="Signature" 
                                className="max-h-full max-w-full object-contain mix-blend-multiply opacity-90 scale-110" 
                            />
                            <div className="w-full h-[0.5px] bg-[#dfd6ca]/50 mt-1"></div>
                            <span className="text-[7px] font-black text-[#183b3e]/20 tracking-[0.1em] uppercase mt-1">Authorized Signature</span>
                        </div>
                    )}
                    {data.stamp && (
                        <div className="h-28 w-28 flex items-center justify-center">
                            <img 
                                src={data.stamp} 
                                alt="Stamp" 
                                className="max-h-full max-w-full object-contain filter mix-blend-multiply opacity-70 rotate-6" 
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Footer Branding */}
        <div className="mt-10 pt-6 border-t border-[#dfd6ca]">
            <div className="flex justify-between items-center text-[9px] font-bold text-[#89948f] tracking-[0.2em] uppercase">
                <span>DARDOC HEALTH SERVICES L.L.C</span>
                <span>MEDICAL REPORT • {data.reportDate}</span>
            </div>
        </div>
      </div>
    </div>
  );
};