
import React, { useState, useEffect } from 'react';
import { Guest, Room, RoomStatus } from '../types';
import { INDIAN_STATES } from '../constants';
import CameraCapture from './CameraCapture';

interface ReservationEntryProps {
  onClose: () => void;
  existingGuests: Guest[];
  rooms: Room[];
  onSave: (data: { 
    guest: Partial<Guest>, 
    roomIds: string[], 
    bookingNo: string,
    checkInDate: string,
    checkInTime: string,
    checkOutDate: string,
    checkOutTime: string,
    purpose: string,
    mealPlan: string,
    agent: string,
    discount: number
  }) => void;
  settings?: any;
}

const ReservationEntry: React.FC<ReservationEntryProps> = ({ onClose, existingGuests, rooms, onSave, settings }) => {
  const [checkInDate, setCheckInDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  const [mobileNo, setMobileNo] = useState('');
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [nationality, setNationality] = useState('Indian');
  const [purpose, setPurpose] = useState('');
  
  const [mealPlan, setMealPlan] = useState('EP (Room Only)');
  const [bookingAgent, setBookingAgent] = useState('Direct');
  const [discount, setDiscount] = useState('0');

  const [bookingNo, setBookingNo] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Guest['documents']>({});
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    const d = new Date();
    setCheckInDate(d.toLocaleDateString('en-CA'));
    setCheckInTime(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }));
    const tomorrow = new Date(d);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCheckOutDate(tomorrow.toLocaleDateString('en-CA'));
    setBookingNo('RES-' + Date.now().toString().slice(-6));
  }, []);

  const handleSearchGuest = () => {
    const found = existingGuests.find(g => g.phone === mobileNo);
    if (found) {
      setGuestName(found.name);
      setEmail(found.email);
      setAddress(found.address);
      setCity(found.city);
      setState(found.state);
      setNationality(found.nationality || 'Indian');
      setDocuments(found.documents || {});
    } else {
      alert("No record found.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: keyof Guest['documents']) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setDocuments(prev => ({ ...prev, [type]: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!mobileNo || !guestName || selectedRoomIds.length === 0) return alert("Fill mandatory fields and select a room.");
    onSave({
      guest: { name: guestName, phone: mobileNo, email, address, city, state, nationality, documents },
      roomIds: selectedRoomIds,
      bookingNo, 
      checkInDate, 
      checkInTime, 
      checkOutDate, 
      checkOutTime, 
      purpose,
      mealPlan,
      agent: bookingAgent,
      discount: parseFloat(discount) || 0
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[1280px] h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
        {/* Header */}
        <div className="bg-[#f59e0b] px-10 py-6 flex justify-between items-center text-white">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Advanced Reservation Registry</h2>
            <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest mt-1">Ref ID: {bookingNo}</p>
          </div>
          <button type="button" onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-[380px] border-r bg-slate-50/50 p-8 overflow-y-auto custom-scrollbar space-y-6">
            <SectionHeader title="Guest & Stay Details" />
            
            <div className="grid grid-cols-2 gap-4">
              <Inp label="Arrival Date" type="date" value={checkInDate} onChange={setCheckInDate} />
              <Inp label="Arrival Time" type="time" value={checkInTime} onChange={setCheckInTime} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Inp label="Departure Date" type="date" value={checkOutDate} onChange={setCheckOutDate} />
              <Inp label="Departure Time" type="time" value={checkOutTime} onChange={setCheckOutTime} />
            </div>

            <hr className="border-slate-200" />

            <div className="flex gap-2 items-end">
              <Inp label="Mobile No *" value={mobileNo} onChange={setMobileNo} />
              <button type="button" onClick={handleSearchGuest} className="bg-orange-500 text-white px-4 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-all mb-0.5">Find</button>
            </div>

            <Inp label="Full Name *" value={guestName} onChange={setGuestName} />
            <Inp label="Email Address" value={email} onChange={setEmail} />

            <div className="grid grid-cols-2 gap-4">
              <Inp label="City" value={city} onChange={setCity} />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">State</label>
                <select className="w-full border-2 p-3 rounded-2xl text-[12px] font-black text-black bg-white focus:border-orange-500 outline-none transition-all shadow-sm" value={state} onChange={e => setState(e.target.value)}>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Inp label="Nationality" value={nationality} onChange={setNationality} />
              <Inp label="Discount (₹)" value={discount} onChange={setDiscount} type="number" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label="Meal Plan" value={mealPlan} options={['EP (Room Only)', 'CP (Breakfast)', 'MAP (Half Board)', 'AP (Full Board)']} onChange={setMealPlan} />
              <Select label="Booking Agent" value={bookingAgent} options={['Direct', 'Booking.com', 'Goibibo/MMT', 'Expedia']} onChange={setBookingAgent} />
            </div>

            <Inp label="Purpose of Visit" value={purpose} onChange={setPurpose} />
          </div>

          {/* Center Content: KYC */}
          <div className="flex-1 p-10 space-y-8 overflow-y-auto custom-scrollbar bg-white">
            <SectionHeader title="Identification Repository" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              <DocBox label="Aadhar Front" src={documents.aadharFront} onUpload={e => handleFileUpload(e, 'aadharFront')} />
              <DocBox label="Aadhar Back" src={documents.aadharBack} onUpload={e => handleFileUpload(e, 'aadharBack')} />
              <DocBox label="PAN Card" src={documents.pan} onUpload={e => handleFileUpload(e, 'pan')} />
              <DocBox label="Passport Front" src={documents.passportFront} onUpload={e => handleFileUpload(e, 'passportFront')} />
              <DocBox label="Passport Back" src={documents.passportBack} onUpload={e => handleFileUpload(e, 'passportBack')} />
              
              <div className="flex flex-col items-center justify-center gap-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-6 group hover:border-orange-400 transition-all">
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center ring-4 ring-orange-50">
                  {documents.photo ? <img src={documents.photo} className="w-full h-full object-cover" /> : <div className="text-[10px] font-black text-slate-300 uppercase">Live Photo</div>}
                </div>
                <button type="button" onClick={() => setIsCameraOpen(true)} className="bg-orange-500 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-lg hover:scale-105 active:scale-95 transition-all">Capture Live</button>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-[320px] border-l bg-slate-50/50 p-8 flex flex-col">
            <SectionHeader title="Inventory Selection" />
            <div className="flex-1 mt-6 overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-2 gap-3">
                {rooms.map(r => (
                  <button 
                    key={r.id} 
                    type="button" 
                    onClick={() => setSelectedRoomIds(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])} 
                    className={`p-4 rounded-2xl border-2 text-[11px] font-black uppercase transition-all shadow-sm ${selectedRoomIds.includes(r.id) ? 'bg-orange-500 text-white border-orange-500 shadow-orange-200' : 'bg-white text-slate-600 border-white hover:border-orange-200'}`}>
                    Room {r.number}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <button onClick={handleSave} className="w-full bg-orange-600 text-white font-black py-5 rounded-[1.5rem] uppercase shadow-2xl hover:bg-black hover:-translate-y-1 transition-all text-xs tracking-widest">Post Reservation</button>
              <button type="button" onClick={onClose} className="w-full text-slate-400 font-black py-2 rounded-2xl uppercase text-[10px] hover:text-gray-900 transition-colors">Discard Registry</button>
            </div>
          </div>
        </div>
      </div>
      {isCameraOpen && <CameraCapture onCapture={(img) => { setDocuments(prev => ({...prev, photo: img})); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
    <h3 className="font-black text-slate-800 uppercase text-[11px] tracking-wider">{title}</h3>
  </div>
);

const Inp = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1.5 w-full text-left">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <input 
      type={type}
      className="w-full border-2 p-3 rounded-2xl text-[12px] font-black text-black bg-white focus:border-orange-500 transition-all outline-none shadow-sm" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

const Select = ({ label, value, options, onChange }: any) => (
  <div className="space-y-1.5 w-full text-left">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <select className="w-full border-2 p-3 rounded-2xl text-[12px] font-black text-black bg-white focus:border-orange-500 transition-all outline-none shadow-sm" value={value} onChange={e => onChange(e.target.value)}>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const DocBox = ({ label, src, onUpload }: any) => (
  <div className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center overflow-hidden hover:border-orange-400 hover:bg-orange-50/20 transition-all group shadow-sm">
    {src ? (
      <img src={src} className="w-full h-full object-cover" />
    ) : (
      <div className="text-center p-4">
        <svg className="w-8 h-8 text-slate-300 mx-auto mb-2 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">{label}</span>
      </div>
    )}
    <input type="file" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
  </div>
);

export default ReservationEntry;
