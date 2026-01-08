
import React, { useState, useEffect } from 'react';
import { Guest, Room, RoomStatus, HostelSettings, Payment } from '../types';
import { INDIAN_STATES } from '../constants';
import CameraCapture from './CameraCapture';
import GRCFormView from './GRCFormView.tsx';

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
    discount: number,
    advanceAmount: number,
    advanceMethod: string,
    secondaryGuest?: any
  }) => void;
  settings: HostelSettings;
}

const ReservationEntry: React.FC<ReservationEntryProps> = ({ onClose, existingGuests, rooms, onSave, settings }) => {
  const [checkInDate, setCheckInDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  const [mobileNo, setMobileNo] = useState('');
  const [guestName, setGuestName] = useState('');
  const [gender, setGender] = useState<'Male'|'Female'|'Other'>('Male');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [nationality, setNationality] = useState('Indian');
  const [purpose, setPurpose] = useState('TOUR');
  
  const [adults, setAdults] = useState('1');
  const [children, setChildren] = useState('0');
  const [kids, setKids] = useState('0');
  const [others, setOthers] = useState('0');

  const [advanceAmount, setAdvanceAmount] = useState('0');
  const [advanceMethod, setAdvanceMethod] = useState('Cash');
  const [discount, setDiscount] = useState('0');
  const [mealPlan, setMealPlan] = useState('EP (Room Only)');
  const [bookingAgent, setBookingAgent] = useState('Direct');

  const [secondaryGuest, setSecondaryGuest] = useState({
    name: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    documents: { aadharFront: '', aadharBack: '' }
  });

  const [bookingNo, setBookingNo] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Guest['documents']>({});
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showGRCPreview, setShowGRCPreview] = useState(false);

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
      setGender(found.gender || 'Male');
      setEmail(found.email);
      setIdNumber(found.idNumber || '');
      setAddress(found.address);
      setCity(found.city);
      setState(found.state);
      setNationality(found.nationality || 'Indian');
      setDocuments(found.documents || {});
    } else {
      alert("No record found.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: keyof Guest['documents'], isSecondary = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isSecondary) {
          setSecondaryGuest(prev => ({ ...prev, documents: { ...prev.documents, [type]: result } }));
        } else {
          setDocuments(prev => ({ ...prev, [type]: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!mobileNo || !guestName || selectedRoomIds.length === 0) return alert("Fill mandatory fields and select a room.");
    onSave({
      guest: { 
        name: guestName, gender, phone: mobileNo, email, address, city, state, 
        nationality, idNumber, adults: parseInt(adults), children: parseInt(children), 
        kids: parseInt(kids), others: parseInt(others), documents, purposeOfVisit: purpose
      },
      roomIds: selectedRoomIds,
      bookingNo, checkInDate, checkInTime, checkOutDate, checkOutTime, purpose, mealPlan,
      agent: bookingAgent, discount: parseFloat(discount) || 0,
      advanceAmount: parseFloat(advanceAmount) || 0, advanceMethod,
      secondaryGuest: secondaryGuest.name ? secondaryGuest : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[1280px] h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
        <div className="bg-[#f59e0b] px-10 py-6 flex justify-between items-center text-white no-print">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Advanced Reservation Registry</h2>
            <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest mt-1">Ref ID: {bookingNo} | Total Pax: {parseInt(adults)+parseInt(children)+parseInt(kids)+parseInt(others)}</p>
          </div>
          <button type="button" onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden no-print">
          <div className="w-[400px] border-r bg-slate-50/50 p-8 overflow-y-auto custom-scrollbar space-y-6">
            <SectionHeader title="Guest Stay Details" />
            <div className="grid grid-cols-2 gap-4">
              <Inp label="Arrival Date" type="date" value={checkInDate} onChange={setCheckInDate} />
              <Inp label="Arrival Time" type="time" value={checkInTime} onChange={setCheckInTime} />
            </div>
            <div className="flex gap-2 items-end">
              <Inp label="Mobile No *" value={mobileNo} onChange={setMobileNo} />
              <button type="button" onClick={handleSearchGuest} className="bg-orange-500 text-white px-4 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-all mb-0.5">Find</button>
            </div>
            <Inp label="Display Name *" value={guestName} onChange={setGuestName} />
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender</label>
                 <select className="w-full border-2 p-3 rounded-2xl text-[12px] font-black bg-white" value={gender} onChange={e => setGender(e.target.value as any)}>
                   <option value="Male">Male</option>
                   <option value="Female">Female</option>
                   <option value="Other">Other</option>
                 </select>
               </div>
               <Inp label="Nationality" value={nationality} onChange={setNationality} />
            </div>
            <Inp label="ID Number" value={idNumber} onChange={setIdNumber} />
            
            <SectionHeader title="Advance Payment" />
            <div className="grid grid-cols-2 gap-4">
              <Inp label="Amount (₹)" type="number" value={advanceAmount} onChange={setAdvanceAmount} />
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mode</label>
                <select className="w-full border-2 p-3 rounded-2xl text-[12px] font-black bg-white" value={advanceMethod} onChange={e => setAdvanceMethod(e.target.value)}>
                   <option value="Cash">Cash</option>
                   <option value="UPI">UPI</option>
                   <option value="Card">Card</option>
                   <option value="Bank">Bank</option>
                </select>
              </div>
            </div>

            <SectionHeader title="Occupancy Counts" />
            <div className="grid grid-cols-4 gap-2">
               <Inp label="Adult" type="number" value={adults} onChange={setAdults} />
               <Inp label="Child" type="number" value={children} onChange={setChildren} />
               <Inp label="Kid" type="number" value={kids} onChange={setKids} />
               <Inp label="Other" type="number" value={others} onChange={setOthers} />
            </div>
          </div>

          <div className="flex-1 p-10 space-y-8 overflow-y-auto custom-scrollbar bg-white">
            <SectionHeader title="Second Occupant Documents" />
            <div className="grid grid-cols-2 gap-6">
               <Inp label="2nd Occupant Name" value={secondaryGuest.name} onChange={(v: string) => setSecondaryGuest({...secondaryGuest, name: v})} />
               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender</label>
                 <select className="w-full border-2 p-3 rounded-2xl text-[12px] font-black bg-slate-100" value={secondaryGuest.gender} onChange={e => setSecondaryGuest({...secondaryGuest, gender: e.target.value as any})}>
                   <option value="Male">Male</option>
                   <option value="Female">Female</option>
                   <option value="Other">Other</option>
                 </select>
               </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              <DocBox label="2nd Aadhar Front" src={secondaryGuest.documents.aadharFront} onUpload={e => handleFileUpload(e, 'aadharFront', true)} />
              <DocBox label="2nd Aadhar Back" src={secondaryGuest.documents.aadharBack} onUpload={e => handleFileUpload(e, 'aadharBack', true)} />
            </div>

            <SectionHeader title="Primary Identification" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              <DocBox label="Aadhar Front" src={documents.aadharFront} onUpload={e => handleFileUpload(e, 'aadharFront')} />
              <DocBox label="Aadhar Back" src={documents.aadharBack} onUpload={e => handleFileUpload(e, 'aadharBack')} />
              <div className="flex flex-col items-center justify-center gap-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-6">
                {documents.photo ? <img src={documents.photo} className="w-20 h-20 rounded-full object-cover" /> : <div className="text-[8px] font-black text-slate-300">LIVE PHOTO</div>}
                <button type="button" onClick={() => setIsCameraOpen(true)} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase">Capture Live</button>
              </div>
            </div>
          </div>

          <div className="w-[320px] border-l bg-slate-50/50 p-8 flex flex-col">
            <SectionHeader title="Inventory Selection" />
            <div className="flex-1 mt-6 overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-2 gap-3">
                {rooms.map(r => (
                  <button key={r.id} onClick={() => setSelectedRoomIds(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])} className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${selectedRoomIds.includes(r.id) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-white hover:border-orange-200'}`}>Room {r.number}</button>
                ))}
              </div>
            </div>
            <button onClick={handleSave} className="w-full mt-8 bg-orange-600 text-white font-black py-5 rounded-[1.5rem] uppercase shadow-2xl hover:bg-black transition-all text-xs">Post Reservation</button>
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
    <input type={type} className="w-full border-2 p-3 rounded-2xl text-[12px] font-black text-black bg-white focus:border-orange-500 transition-all outline-none" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

const DocBox = ({ label, src, onUpload }: any) => (
  <div className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center overflow-hidden hover:border-orange-400 transition-all group">
    {src ? <img src={src} className="w-full h-full object-cover" /> : (
      <div className="text-center p-4">
        <svg className="w-6 h-6 text-slate-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
        <span className="text-[9px] font-black uppercase text-slate-400 block">{label}</span>
      </div>
    )}
    <input type="file" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
  </div>
);

export default ReservationEntry;
