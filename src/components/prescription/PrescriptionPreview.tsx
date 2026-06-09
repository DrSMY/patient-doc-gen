
import React from 'react';
import { PrescriptionData } from '@/lib/types';

interface PrescriptionPreviewProps {
  data: PrescriptionData;
  id: string;
}

export const PrescriptionPreview: React.FC<PrescriptionPreviewProps> = ({ data, id }) => {
  return (
    <div id={id} className="w-[210mm] h-[297mm] bg-[#fef9ef] flex flex-col relative text-[#183b3e] font-['Google_Sans_Flex',sans-serif] shadow-none overflow-hidden leading-snug">
      {/* Watermark */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-[0.02] rotate-[-45deg] select-none whitespace-nowrap">
          <span className="text-[120px] font-black tracking-[30px] leading-none mb-10 uppercase">VALIDATE</span>
          <span className="text-[120px] font-black tracking-[30px] leading-none uppercase">AUTHENTIC</span>
      </div>

      {/* Header */}
      <div className="pt-[40px] px-[60px] pb-5 flex justify-between items-start z-10">
        <div>
           <div className="w-[100px] mb-2">
              {data.logo ? (
                <img src={data.logo} alt="Clinic Logo" className="max-h-[42px] w-auto object-contain" />
              ) : (
                <span className="text-2xl font-black tracking-tighter">DarDoc</span>
              )}
           </div>
        </div>
        <div className="text-right flex flex-col gap-1.5 min-w-[280px]">
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
      
      <div className="mx-[60px] h-px bg-[#dfd6ca] mb-6"></div>

      {/* Content Area */}
      <div className="px-[60px] flex-1 flex flex-col z-10 pb-16">
        
        {/* Title and ERX ID */}
        <div className="flex justify-between items-end mb-6">
           <h1 className="text-[42px] font-light tracking-tight m-0 leading-none">Prescription</h1>
           <div className="flex items-baseline gap-3 mb-1">
             <span className="text-[10px] font-black text-[#183b3e]/30 tracking-[0.2em] uppercase">ERX</span>
             <span className="text-xl font-bold tracking-[0.2em] text-[#183b3e]/60">
               {data.erxIdSerial} <span className="opacity-40">{data.erxIdMonth} {data.erxIdYear}</span>
             </span>
           </div>
        </div>

        {/* Patient Info Card */}
        <div className="bg-[#f8efe1] border-t border-l border-[#dfd6ca] border-r-2 border-b-2 border-[#cfc5b8] rounded-[24px] p-7 mb-8 shadow-[8px_8px_0px_rgba(223,214,202,0.5)]">
           <div className="grid grid-cols-5 gap-y-6">
              <div className="col-span-3">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] mb-1.5">PATIENT NAME</p>
                  <p className="text-lg font-bold tracking-tight">{data.patientName}</p>
              </div>
              <div className="col-span-2">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] mb-1.5">DATE OF ISSUE</p>
                  <p className="text-lg font-bold tracking-tight">{data.date}</p>
              </div>
              <div className="col-span-3">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] mb-1.5">DATE OF BIRTH / AGE</p>
                  <p className="text-lg font-bold tracking-tight">{data.patientDob}</p>
              </div>
              <div className="col-span-2">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] mb-1.5">GENDER</p>
                  <p className="text-lg font-bold tracking-tight">{data.patientGender}</p>
              </div>
           </div>
        </div>

        {/* Prescription List */}
        <div className="mb-8">
           <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#89948f] mb-3 px-2">MEDICATIONS PRESCRIBED</p>
           <div className="space-y-0">
               {data.medications.map((med, i) => (
                   <div key={med.id || i} className="flex justify-between items-center py-3 border-b border-[#dfd6ca] group">
                       <div className="flex flex-col gap-0.5">
                           <div className="flex items-center gap-4">
                               <h3 className="text-lg font-bold tracking-tight leading-none">{med.name}</h3>
                               <span className="text-[12px] font-medium text-[#89948f] pt-0.5">{med.dosage}</span>
                           </div>
                           {med.instructions && (
                             <p className="text-[12px] font-medium text-[#183b3e]/60 leading-relaxed mt-1">{med.instructions}</p>
                           )}
                       </div>
                       <div className="text-lg font-bold text-[#183b3e]/70 ml-8 whitespace-nowrap">{med.quantity || 'x1'}</div>
                   </div>
               ))}
           </div>
        </div>

        {/* Notes/Warnings */}
        {(data.notes || data.warnings) && (
            <div className="grid grid-cols-2 gap-8 mb-8">
                {data.notes && (
                    <div className="space-y-1.5">
                         <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-[#89948f]">CLINICAL NOTES</p>
                         <p className="text-[12px] font-light text-[#183b3e]/80 leading-relaxed whitespace-pre-wrap">{data.notes}</p>
                    </div>
                )}
                {data.warnings && (
                    <div className="space-y-1.5">
                         <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-[#89948f]">PRECAUTIONS</p>
                         <p className="text-[12px] font-light text-[#183b3e]/80 leading-relaxed whitespace-pre-wrap">{data.warnings}</p>
                    </div>
                )}
            </div>
        )}

        {/* Signature Area */}
        <div className="mt-4 w-[340px]">
            <div className="h-20 flex items-end">
                {data.signature && (
                    <img src={data.signature} alt="Signature" className="max-h-20 mix-blend-multiply opacity-90 scale-125 origin-bottom-left" />
                )}
            </div>
            <div className="h-px bg-[#dfd6ca] mb-2.5"></div>
            <p className="text-[14px] font-bold tracking-tight mb-0.5">{data.doctorName}</p>
            <p className="text-[11px] font-medium text-[#183b3e]/50 italic leading-tight mb-0.5">{data.doctorTitle}</p>
            <p className="text-[9px] font-bold tracking-wide text-[#183b3e]/30 uppercase">{data.doctorRegNo}</p>
        </div>
      </div>

      {/* Dispensed Stamp */}
      {data.showDispensedStamp && (
        <div className="absolute left-[120px] bottom-[110px] transform rotate-[-7deg] border-[3px] border-[#A63A3A] p-1 rounded-sm opacity-90 mix-blend-multiply flex items-center justify-center z-20 pointer-events-none">
            <div className="border border-[#A63A3A] px-6 py-2.5 text-center">
                <p className="text-[18px] font-black tracking-[0.15em] uppercase text-[#A63A3A] leading-none mb-1">Rx Dispensed</p>
                <div className="h-px bg-[#A63A3A] w-2/3 mx-auto my-1.5 opacity-60"></div>
                <p className="text-[10px] font-black tracking-[0.12em] uppercase text-[#A63A3A] leading-none">Not Valid for Refills</p>
            </div>
        </div>
      )}

      {/* Official Uploaded Stamp */}
      {data.stamp && (
        <div className="absolute right-[80px] bottom-[140px] w-40 h-40 pointer-events-none z-20 mix-blend-multiply opacity-90">
            <img src={data.stamp} alt="Official Stamp" className="w-full h-full object-contain rotate-[5deg]" />
        </div>
      )}

      {/* Validity Footer Note */}
      {data.footerNote && (
          <div className="absolute left-[60px] right-[60px] bottom-[80px] z-20 flex items-center gap-1.5">
              <span className="text-[11px] font-black text-red-600 uppercase tracking-wider whitespace-nowrap">NOTE:</span>
              <p className="text-[12px] font-bold text-red-600 tracking-tight leading-tight">{data.footerNote}</p>
          </div>
      )}

      {/* Footer Branding */}
      <div className="mt-auto px-[60px] py-6 relative z-10">
          <div className="h-px bg-[#dfd6ca] mb-4"></div>
          <div className="flex justify-between items-center text-[9px] font-bold text-[#89948f] tracking-[0.2em] uppercase">
              <span>DARDOC HEALTH SERVICES L.L.C</span>
              <span>{data.doctorRegNo}</span>
          </div>
      </div>
    </div>
  );
};
