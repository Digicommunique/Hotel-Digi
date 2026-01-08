import React, { useState, useEffect } from 'react';
import { Room, Guest, Booking, HostelSettings, Payment } from '../types.ts';
import { INDIAN_STATES } from '../constants.tsx';
import CameraCapture from './CameraCapture.tsx';
import GRCFormView from './GRCFormView.tsx';

interface GuestCheckinProps {
  room: Room;
  allRooms: Room[];
  existingGuests: Guest[];
  onClose: () => void;
  onSave: (data: { guest: Partial<Guest>, bookings: any[] }) => void;
  settings: HostelSettings;
  initialSelectedRoomIds?: string[];
  onSwitchToReservation?: () => void;
}

const GuestCheckin: React.FC<GuestCheckinProps> = ({ 
  room, 
  allRooms, 
  existingGuests, 
  onClose, 
  onSave, 
  settings,
  initialSelectedRoomIds = [],
}) => {
  const [guest, setGuest] = useState<Partial<Guest>>({
    name: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    nationality: 'Indian',
    idType: 'Aadhar',
    idNumber: '',
    adults: 1,
    children: 0,
    kids: 0,
    others: 0, 
    documents: {}
  });

  const [secondaryGuest, setSecondaryGuest] = useState({
    name: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    documents: { aadharFront: '', aadharBack: '' }
  });

  const [checkInDate, setCheckInDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  
  const [mealPlan, setMealPlan] = useState('EP (Room Only)');
  const [discount, setDiscount] = useState(0);
  const [roomTariff, setRoomTariff] = useState(room.price);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(initialSelectedRoomIds.length > 0 ? initialSelectedRoomIds : [room.id]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeDocCapture, setActiveDocCapture] = useState<{ type: keyof Guest['documents'], isSecondary: boolean } | null>(null);
  const [showGRCPreview, setShowGRCPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<'BASIC' | 'OCCUPANTS' | 'DOCUMENTS' | 'GRC'>('BASIC');

  useEffect(() => {
    const now = new Date();
    setCheckInDate(now.toISOString().split('T')[0]);
    setCheckInTime(now.toTimeString().split(' ')[0].substring(0, 5));
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCheckOutDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleSearchGuest = () => {
    if (!guest.phone) return;
    const found = existingGuests.find(g => g.phone === guest.phone);
    if (found) setGuest({ ...found });
    else alert("No previous record found.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, docType: keyof Guest['documents'], isSecondary = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        applyDocumentUpdate(docType, result, isSecondary);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyDocumentUpdate = (docType: keyof Guest['documents'], data: string, isSecondary: boolean) => {
    if (isSecondary) {
      setSecondaryGuest(prev => ({
        ...prev,
        documents: { ...prev.documents, [docType]: data }
      }));
    } else {
      setGuest(prev => ({
        ...prev,
        documents: { ...prev.documents, [docType]: data }
      }));
    }
  };

  const handleCameraCapture = (imageData: string) => {
    if (activeDocCapture) {
      applyDocumentUpdate(activeDocCapture.type, imageData, activeDocCapture.isSecondary);
    }
    setIsCameraOpen(false);
    setActiveDocCapture(null);
  };

  const handleSave = () => {
    if (!guest.name || !guest.phone || selectedRoomIds.length === 0) {
      alert("Please fill name, phone and select at least one room.");
      return;
    }

    const initialPayments: Payment[] = advanceAmount > 0 ? [{
      id: 'ADV-' + Date.now(),
      amount: advanceAmount,
      date: new Date().toISOString(),
      method: paymentMode,
      remarks: 'Advance during check-in'
    }] : [];

    const sessionGroupId = selectedRoomIds.length > 1 ? 'GRP-' + Math.random().toString(36).substr(2, 6).toUpperCase() : undefined;

    const bookings = selectedRoomIds.map(rid => ({
      bookingNo: 'BK-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      roomId: rid,
      groupId: sessionGroupId,
      checkInDate, checkInTime, checkOutDate, checkOutTime,
      status: 'ACTIVE',
      basePrice: rid === room.id ? roomTariff : (allRooms.find(r => r.id === rid)?.price || 0),
      discount: rid === room.id ? discount : 0, 
      mealPlan,
      adults: guest.adults, children: guest.children, kids: guest.kids, others: guest.others,
      charges: [], payments: initialPayments,
      secondaryGuest: secondaryGuest.name ? secondaryGuest : undefined
    }));

    onSave({ guest, bookings });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-7xl rounded-[3rem] shadow-2xl flex flex-col h-[92vh] overflow-hidden">
        <div className="bg-[#003d80] p-8 text-white flex justify-between items-center no-print flex-shrink-0">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Guest Registration</h2>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Room {room.number} | Global Intake</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowGRCPreview(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all">Print GRC</button>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-4 gap-10 custom-scrollbar no-print">
          <div className="lg:col-span-3 space-y-8">
            <div className="flex gap-1 border-b pb-4 sticky top-0 bg-white z-10">
              <button onClick={() => setActiveSection('BASIC')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${activeSection === 'BASIC' ? 'bg-blue-900 text-white' : 'bg-slate-50 text-slate-400'}`}>Guest Info</button>
              <button onClick={() => setActiveSection('OCCUPANTS')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${activeSection === 'OCCUPANTS' ? 'bg-blue-900 text-white' : 'bg-slate-50 text-slate-400'}`}>Occupants</button>
              <button onClick={() => setActiveSection('DOCUMENTS')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${activeSection === 'DOCUMENTS' ? 'bg-blue-900 text-white' : 'bg-slate-50 text-slate-400'}`}>Documents</button>
              <button onClick={() => setActiveSection('GRC')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${activeSection === 'GRC' ? 'bg-blue-900 text-white' : 'bg-slate-50 text-slate-400'}`}>Form-C</button>
            </div>

            {activeSection === 'BASIC' && (
              <div className="space-y-8">
                <section className="space-y-4">
                  <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-2">Identification Profile</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex gap-2 items-end col-span-2">
                      <Inp label="Mobile Number *" value={guest.phone} onChange={(v: string) => setGuest({...guest, phone: v})} />
                      <button onClick={handleSearchGuest} className="bg-blue-600 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase mb-0.5 shadow-lg">Find</button>
                    </div>
                    <Inp label="Nationality" value={guest.nationality} onChange={(v: string) => setGuest({...guest, nationality: v})} />
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender</label>
                      <select className="w-full border-2 p-3 rounded-2xl text-[12px] font-black bg-slate-50 outline-none" value={guest.gender} onChange={e => setGuest({...guest, gender: e.target.value as any})}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                       <Inp label="Full Name *" value={guest.name} onChange={(v: string) => setGuest({...guest, name: v})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Document Type</label>
                      <select className="w-full border-2 p-3 rounded-2xl text-[12px] font-black bg-slate-50 outline-none" value={guest.idType} onChange={e => setGuest({...guest, idType: e.target.value as any})}>
                        <option value="Aadhar">Aadhar Card</option>
                        <option value="Passport">Passport</option>
                        <option value="PAN">PAN Card</option>
                        <option value="VoterId">Voter ID</option>
                        <option value="License">Driving License</option>
                        <option value="Other">Other ID</option>
                      </select>
                    </div>
                    <Inp label="ID Number" value={guest.idNumber} onChange={(v: string) => setGuest({...guest, idNumber: v})} />
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-2">Stay Timeline</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Inp label="Arrival Date" type="date" value={checkInDate} onChange={setCheckInDate} />
                    <Inp label="Arrival Time" type="time" value={checkInTime} onChange={setCheckInTime} />
                    <Inp label="Exp. Departure" type="date" value={checkOutDate} onChange={setCheckOutDate} />
                    <Inp label="Check-Out Time" type="time" value={checkOutTime} onChange={setCheckOutTime} />
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-2">Unit Assignment</h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                     {allRooms.map(r => (
                        <button key={r.id} onClick={() => setSelectedRoomIds(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])} className={`p-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${selectedRoomIds.includes(r.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-200'}`}>{r.number}</button>
                     ))}
                  </div>
                </section>
              </div>
            )}

            {activeSection === 'OCCUPANTS' && (
              <section className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-2">Secondary Resident</h3>
                <div className="grid grid-cols-2 gap-6">
                  <Inp label="Full Name" value={secondaryGuest.name} onChange={(v: string) => setSecondaryGuest({...secondaryGuest, name: v})} />
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender</label>
                    <select className="w-full border-2 p-3 rounded-2xl text-[12px] font-black bg-slate-50 outline-none" value={secondaryGuest.gender} onChange={e => setSecondaryGuest({...secondaryGuest, gender: e.target.value as any})}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DocBox 
                    label="Secondary ID Front" 
                    src={secondaryGuest.documents.aadharFront} 
                    onChange={(e: any) => handleFileUpload(e, 'aadharFront', true)} 
                    onCapture={() => { setActiveDocCapture({ type: 'aadharFront', isSecondary: true }); setIsCameraOpen(true); }}
                  />
                  <DocBox 
                    label="Secondary ID Back" 
                    src={secondaryGuest.documents.aadharBack} 
                    onChange={(e: any) => handleFileUpload(e, 'aadharBack', true)} 
                    onCapture={() => { setActiveDocCapture({ type: 'aadharBack', isSecondary: true }); setIsCameraOpen(true); }}
                  />
                </div>
              </section>
            )}

            {activeSection === 'DOCUMENTS' && (
              <section className="space-y-8 animate-in fade-in duration-300">
                <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-2">KYC Document Uploads</h3>
                <div className="grid grid-cols-3 gap-4">
                   <DocBox label="ID/Aadhar Front" src={guest.documents?.aadharFront} onChange={(e: any) => handleFileUpload(e, 'aadharFront')} onCapture={() => { setActiveDocCapture({type:'aadharFront', isSecondary:false}); setIsCameraOpen(true); }} />
                   <DocBox label="ID/Aadhar Back" src={guest.documents?.aadharBack} onChange={(e: any) => handleFileUpload(e, 'aadharBack')} onCapture={() => { setActiveDocCapture({type:'aadharBack', isSecondary:false}); setIsCameraOpen(true); }} />
                   <DocBox label="Passport/Alt ID" src={guest.documents?.passportFront} onChange={(e: any) => handleFileUpload(e, 'passportFront')} onCapture={() => { setActiveDocCapture({type:'passportFront', isSecondary:false}); setIsCameraOpen(true); }} />
                   <div className="flex flex-col items-center justify-center gap-2 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-4">
                    {guest.documents?.photo ? <img src={guest.documents.photo} className="w-16 h-16 rounded-full object-cover" /> : <div className="text-[8px] font-black text-slate-300">RESIDENT PHOTO</div>}
                    <button onClick={() => { setActiveDocCapture({type:'photo', isSecondary:false}); setIsCameraOpen(true); }} className="text-[9px] font-black text-blue-600 uppercase underline">Snap Live</button>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'GRC' && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-2">Mandatory Form-C Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Inp label="Travelled From" value={guest.arrivalFrom} onChange={(v: string) => setGuest({...guest, arrivalFrom: v})} />
                  <Inp label="Next Destination" value={guest.nextDestination} onChange={(v: string) => setGuest({...guest, nextDestination: v})} />
                  <Inp label="Purpose of Stay" value={guest.purposeOfVisit} onChange={(v: string) => setGuest({...guest, purposeOfVisit: v})} />
                </div>
              </section>
            )}
          </div>

          <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-100 space-y-6 flex-shrink-0">
            <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-2">Financial Summary</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Plan</label>
                <select className="w-full border-2 p-3 rounded-2xl text-[12px] font-black bg-white outline-none" value={mealPlan} onChange={e => setMealPlan(e.target.value)}>
                  <option value="EP (Room Only)">EP (Room Only)</option>
                  <option value="CP (Room + B/Fast)">CP (Room + B/Fast)</option>
                  <option value="MAP (Room + 2 Meals)">MAP (Room + 2 Meals)</option>
                  <option value="AP (Room + All Meals)">AP (Room + All Meals)</option>
                </select>
              </div>
              <Inp label="Base Rent" type="number" value={roomTariff.toString()} onChange={(v: string) => setRoomTariff(parseFloat(v) || 0)} />
              <Inp label="Advance Paid" type="number" value={advanceAmount.toString()} onChange={(v: string) => setAdvanceAmount(parseFloat(v) || 0)} />
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Payment Type</label>
                <select className="w-full border-2 p-3 rounded-2xl text-[12px] font-black bg-white outline-none" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                   <option value="Cash">Cash Account</option>
                   <option value="UPI">Digital (UPI)</option>
                   <option value="Card">Bank Card</option>
                </select>
              </div>
            </div>
            <div className="pt-6 space-y-3">
              <button onClick={handleSave} className="w-full bg-[#003d80] text-white py-5 rounded-2xl font-black uppercase text-xs shadow-2xl hover:bg-black transition-all">Authorize Check-in</button>
              <button onClick={() => setShowGRCPreview(true)} className="w-full bg-blue-100 text-blue-900 py-4 rounded-2xl font-black uppercase text-[10px] hover:bg-blue-200 transition-all">Preview Form-C</button>
              <button onClick={onClose} className="w-full py-2 text-slate-400 font-black uppercase text-[9px] hover:text-red-500 transition-colors">Cancel Desk</button>
            </div>
          </div>
        </div>

        {showGRCPreview && (
          <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col no-print-backdrop">
             <div className="bg-black p-4 flex justify-between items-center no-print">
                <p className="text-white font-black uppercase text-xs">Form-C Official Preview</p>
                <button onClick={() => setShowGRCPreview(false)} className="text-white font-black uppercase text-xs">Close [X]</button>
             </div>
             <div className="flex-1 overflow-y-auto bg-gray-500/20 p-8 custom-scrollbar">
                <GRCFormView guest={guest} booking={{ checkInDate, checkInTime, checkOutDate, checkOutTime }} room={room} settings={settings} />
             </div>
          </div>
        )}
      </div>
      {isCameraOpen && <CameraCapture onCapture={handleCameraCapture} onClose={() => { setIsCameraOpen(false); setActiveDocCapture(null); }} />}
    </div>
  );
};

const Inp = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <input type={type} className="w-full border-2 p-3 rounded-2xl font-black text-[12px] bg-slate-50 outline-none focus:border-blue-500 transition-all text-black" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

const DocBox = ({ label, src, onChange, onCapture }: any) => (
  <div className="relative aspect-video bg-white border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center group hover:border-blue-400 transition-all shadow-sm">
    {src ? (
      <img src={src} className="w-full h-full object-cover" />
    ) : (
      <div className="text-center p-2">
        <svg className="w-6 h-6 text-slate-200 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center block">{label}</span>
      </div>
    )}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/60 flex items-center justify-center gap-2 transition-opacity">
       <div className="relative overflow-hidden bg-white p-2 rounded-lg cursor-pointer">
          <span className="text-[8px] font-black uppercase">Upload</span>
          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onChange} />
       </div>
       <button type="button" onClick={onCapture} className="bg-blue-600 text-white p-2 rounded-lg text-[8px] font-black uppercase">Snap</button>
    </div>
  </div>
);

export default GuestCheckin;