
import React, { useState, useEffect } from 'react';
import { Room, RoomStatus, Guest, Booking } from '../types.ts';
import { INDIAN_STATES } from '../constants.tsx';
import CameraCapture from './CameraCapture.tsx';

interface GuestCheckinProps {
  room: Room;
  allRooms: Room[];
  existingGuests: Guest[];
  onClose: () => void;
  onSave: (data: { guest: Partial<Guest>, bookings: any[] }) => void;
  settings?: any;
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
  onSwitchToReservation 
}) => {
  const [guest, setGuest] = useState<Partial<Guest>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    nationality: 'Indian',
    documents: {}
  });

  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInTime, setCheckInTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(initialSelectedRoomIds.length > 0 ? initialSelectedRoomIds : [room.id]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleSearchGuest = () => {
    if (!guest.phone) return;
    const found = existingGuests.find(g => g.phone === guest.phone);
    if (found) {
      setGuest({ ...found });
    } else {
      alert("No previous record found for this mobile number.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, docType: keyof Guest['documents']) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGuest(prev => ({
          ...prev,
          documents: { ...prev.documents, [docType]: reader.result as string }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!guest.name || !guest.phone || selectedRoomIds.length === 0) {
      alert("Please fill name, phone and select at least one room.");
      return;
    }

    const bookings = selectedRoomIds.map(rid => ({
      bookingNo: 'BK-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      roomId: rid,
      checkInDate: checkInDate,
      checkInTime: checkInTime,
      checkOutDate: checkOutDate,
      checkOutTime: checkOutTime,
      status: 'ACTIVE',
      basePrice: allRooms.find(r => r.id === rid)?.price || 0,
      charges: [],
      payments: []
    }));

    onSave({ guest, bookings });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        {/* Registry Header */}
        <div className="bg-[#003d80] p-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Guest Registration & Check-in</h2>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Property Management Console</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-3 gap-10 custom-scrollbar">
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-4">
              <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-2">Primary Guest Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex gap-2 items-end">
                  <Inp label="Mobile Number *" value={guest.phone} onChange={(v: string) => setGuest({...guest, phone: v})} />
                  <button onClick={handleSearchGuest} className="bg-blue-600 text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase mb-0.5 shadow-lg">Fetch</button>
                </div>
                <Inp label="Full Name *" value={guest.name} onChange={(v: string) => setGuest({...guest, name: v})} />
                <Inp label="Email Address" value={guest.email} onChange={(v: string) => setGuest({...guest, email: v})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">State</label>
                  <select className="w-full border-2 p-3 rounded-2xl text-[12px] font-black bg-slate-50 outline-none focus:border-blue-500 transition-all" value={guest.state} onChange={e => setGuest({...guest, state: e.target.value})}>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <textarea 
                className="w-full border-2 p-4 rounded-2xl text-[12px] font-black bg-slate-50 h-24 resize-none outline-none focus:border-blue-500 transition-all" 
                placeholder="Residential Address..." 
                value={guest.address} 
                onChange={e => setGuest({...guest, address: e.target.value})} 
              />
            </section>

            <section className="space-y-4">
               <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-2">Stay Schedule</h3>
               <div className="grid grid-cols-2 gap-4">
                  <Inp label="Arrival Date" type="date" value={checkInDate} onChange={setCheckInDate} />
                  <Inp label="Arrival Time" type="time" value={checkInTime} onChange={setCheckInTime} />
                  <Inp label="Departure Date" type="date" value={checkOutDate} onChange={setCheckOutDate} />
                  <Inp label="Departure Time" type="time" value={checkOutTime} onChange={setCheckOutTime} />
               </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-2">KYC Document Repository</h3>
              <div className="grid grid-cols-3 gap-4">
                <DocBox label="Aadhar Front" src={guest.documents?.aadharFront} onChange={(e: any) => handleFileUpload(e, 'aadharFront')} />
                <DocBox label="Aadhar Back" src={guest.documents?.aadharBack} onChange={(e: any) => handleFileUpload(e, 'aadharBack')} />
                <DocBox label="PAN / Passport" src={guest.documents?.pan} onChange={(e: any) => handleFileUpload(e, 'pan')} />
              </div>
              <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 rounded-full bg-white border-2 flex items-center justify-center overflow-hidden shadow-inner">
                  {guest.documents?.photo ? <img src={guest.documents.photo} className="w-full h-full object-cover" /> : <span className="text-[8px] font-black text-slate-300 uppercase text-center">Live Portrait</span>}
                </div>
                <button onClick={() => setIsCameraOpen(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-all">Capture Live Identity</button>
              </div>
            </section>
          </div>

          <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-100 space-y-6">
            <h3 className="font-black text-xs uppercase text-slate-400 tracking-widest border-b pb-2">Inventory Assignment</h3>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {allRooms.map(r => (
                <button 
                  key={r.id} 
                  type="button"
                  onClick={() => setSelectedRoomIds(prev => prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id])}
                  className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${selectedRoomIds.includes(r.id) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-white text-slate-400 hover:border-blue-200'}`}
                >
                  Room {r.number}
                </button>
              ))}
            </div>
            <div className="pt-10 space-y-3">
              <button onClick={handleSave} className="w-full bg-[#003d80] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black transition-all">Post Entry & Check-in</button>
              {onSwitchToReservation && (
                <button onClick={onSwitchToReservation} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-orange-600 transition-all">Switch to Reservation</button>
              )}
              <button onClick={onClose} className="w-full py-2 text-slate-400 font-black uppercase text-[9px] hover:text-slate-900 transition-colors">Discard Draft</button>
            </div>
          </div>
        </div>
      </div>
      {isCameraOpen && <CameraCapture onCapture={(img) => { setGuest(prev => ({...prev, documents: {...prev.documents, photo: img}})); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};

const Inp = ({ label, value, onChange, onBlur, type = "text" }: any) => (
  <div className="space-y-1 w-full">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{label}</label>
    <input 
      type={type} 
      className="w-full border-2 p-3 rounded-2xl font-black text-[12px] bg-slate-50 outline-none focus:border-blue-500 transition-all" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      onBlur={onBlur} 
    />
  </div>
);

const DocBox = ({ label, src, onChange }: any) => (
  <div className="relative aspect-video bg-white border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center group hover:border-blue-400 transition-all shadow-sm">
    {src ? <img src={src} className="w-full h-full object-cover" /> : (
      <div className="text-center">
        <svg className="w-6 h-6 text-slate-200 mx-auto mb-1 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center block">{label}</span>
      </div>
    )}
    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onChange} />
  </div>
);

export default GuestCheckin;
