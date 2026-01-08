
import React, { useState, useMemo } from 'react';
import { GroupProfile, Room, Booking, Guest, RoomStatus, Transaction, HostelSettings, Charge } from '../types';
import { INDIAN_STATES } from '../constants';
import InvoiceView from './InvoiceView.tsx';

interface GroupModuleProps {
  groups: GroupProfile[];
  setGroups: (groups: GroupProfile[]) => void;
  rooms: Room[];
  bookings: Booking[];
  setBookings: (bookings: Booking[]) => void;
  guests: Guest[];
  setGuests: (guests: Guest[]) => void;
  setRooms: (rooms: Room[]) => void;
  onAddTransaction: (tx: Transaction) => void;
  onGroupPayment: (groupId: string, amount: number, method: string, remarks: string) => void;
  settings: HostelSettings;
}

const GroupModule: React.FC<GroupModuleProps> = ({ groups, setGroups, rooms, bookings, setBookings, guests, setGuests, setRooms, onAddTransaction, onGroupPayment, settings }) => {
  const [activeSubMenu, setActiveSubMenu] = useState<'PROFILES' | 'RESERVATIONS' | 'ROOMING' | 'BILLING' | 'SERVICES'>('PROFILES');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupProfile | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConsolidatedInvoice, setShowConsolidatedInvoice] = useState(false);

  // Bulk Charge States
  const [bulkChargeData, setBulkChargeData] = useState({ description: '', amount: '' });
  const [targetRoomIds, setTargetRoomIds] = useState<string[]>([]);

  const handleBulkStatusChange = (groupId: string, newStatus: Booking['status']) => {
    const updatedBookings = bookings.map(b => b.groupId === groupId ? { ...b, status: newStatus } : b);
    setBookings(updatedBookings);
    
    const groupRoomIds = bookings.filter(b => b.groupId === groupId).map(b => b.roomId);
    const roomStatus = newStatus === 'ACTIVE' ? RoomStatus.OCCUPIED : newStatus === 'COMPLETED' ? RoomStatus.DIRTY : RoomStatus.VACANT;
    const updatedRooms = rooms.map(r => groupRoomIds.includes(r.id) ? { ...r, status: roomStatus } : r);
    setRooms(updatedRooms);
    
    alert(`Bulk ${newStatus.toLowerCase()} processed for group.`);
  };

  const handleApplyBulkCharge = (groupId: string) => {
    if (!bulkChargeData.description || !bulkChargeData.amount || targetRoomIds.length === 0) {
      alert("Please fill description, amount and select rooms.");
      return;
    }

    const amt = parseFloat(bulkChargeData.amount);
    const updatedBookings = bookings.map(b => {
      if (targetRoomIds.includes(b.roomId) && b.groupId === groupId) {
        const newCharge: Charge = {
          id: Math.random().toString(36).substr(2, 9),
          description: bulkChargeData.description,
          amount: amt,
          date: new Date().toISOString()
        };
        return { ...b, charges: [...(b.charges || []), newCharge] };
      }
      return b;
    });

    setBookings(updatedBookings);
    setBulkChargeData({ description: '', amount: '' });
    setTargetRoomIds([]);
    alert(`Posted charge of ₹${amt} to ${targetRoomIds.length} rooms.`);
  };

  return (
    <div className="p-8 bg-[#f8fafc] min-h-full flex flex-col gap-8">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter">Group Master Console</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Single Point Billing & Multi-Room Ops</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 transition-all">+ Register Group</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-print">
        <SubMenuBtn active={activeSubMenu === 'PROFILES'} label="Account Profiles" onClick={() => setActiveSubMenu('PROFILES')} />
        <SubMenuBtn active={activeSubMenu === 'BILLING'} label="Billing & Master Invoicing" onClick={() => setActiveSubMenu('BILLING')} />
        <SubMenuBtn active={activeSubMenu === 'SERVICES'} label="Services Desk (Bulk Charges)" onClick={() => setActiveSubMenu('SERVICES')} />
      </div>

      <div className="flex-1">
        {activeSubMenu === 'PROFILES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {groups.map(group => (
              <div key={group.id} className="bg-white border-2 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group" onClick={() => setSelectedGroup(group)}>
                <div className="flex justify-between items-start mb-6">
                  <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600`}>{group.groupType}</div>
                  <span className={`text-[9px] font-black uppercase text-green-500`}>{group.status}</span>
                </div>
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter mb-1">{group.groupName}</h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase mb-8">{group.headName} • {group.phone}</p>
                <div className="grid grid-cols-2 gap-6 border-t pt-6">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-gray-300">Folio Mode</p>
                    <p className="text-[10px] font-black uppercase text-gray-700">{group.billingPreference}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-gray-300">Room Block</p>
                    <p className="text-[10px] font-black uppercase text-gray-700">{bookings.filter(b => b.groupId === group.id).length} Units</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubMenu === 'BILLING' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
             {groups.map(g => {
                const gBookings = bookings.filter(b => b.groupId === g.id);
                const total = gBookings.reduce((s,b) => {
                   const start = new Date(b.checkInDate);
                   const end = new Date(b.checkOutDate);
                   const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                   const rent = b.basePrice * nights;
                   const charges = (b.charges || []).reduce((sc, c) => sc + c.amount, 0);
                   const subTotal = rent + charges - (b.discount || 0);
                   const tax = (subTotal * (settings.taxRate || 0)) / 100;
                   return s + (subTotal + tax);
                }, 0);
                const totalPaid = gBookings.reduce((s, b) => s + (b.payments || []).reduce((sp, p) => sp + p.amount, 0), 0);
                return (
                   <div key={g.id} className="bg-white border-2 rounded-[2.5rem] p-10 flex flex-col justify-between shadow-sm">
                      <div className="flex justify-between items-start mb-8">
                         <div>
                            <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">{g.groupName}</h3>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{gBookings.length} Active Folios</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[8px] font-black text-gray-400 uppercase">Master Balance</p>
                            <p className="text-2xl font-black text-red-600">₹{(total - totalPaid).toFixed(2)}</p>
                         </div>
                      </div>
                      <div className="flex gap-3">
                         <button onClick={() => { setSelectedGroup(g); setShowPaymentModal(true); }} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg">Post Receipt</button>
                         <button onClick={() => { setSelectedGroup(g); setShowConsolidatedInvoice(true); }} className="flex-1 bg-blue-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg">Consolidated Bill</button>
                      </div>
                   </div>
                )
             })}
          </div>
        )}

        {activeSubMenu === 'SERVICES' && (
          <div className="bg-white rounded-[3rem] border-2 shadow-sm p-12 space-y-10 animate-in fade-in duration-500">
             <div>
                <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tighter">Bulk Service Desk</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Apply charges to multiple rooms simultaneously</p>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="space-y-6">
                   <div className="p-8 bg-slate-50 rounded-[2.5rem] border space-y-6">
                      <h4 className="font-black text-xs uppercase text-slate-400 border-b pb-4">1. Select Group Account</h4>
                      <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-white" value={selectedGroup?.id || ''} onChange={e => {
                        const found = groups.find(g => g.id === e.target.value);
                        setSelectedGroup(found || null);
                        setTargetRoomIds([]);
                      }}>
                         <option value="">Select a Group...</option>
                         {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
                      </select>
                   </div>
                   {selectedGroup && (
                     <div className="p-8 bg-blue-900 rounded-[2.5rem] text-white space-y-6 shadow-xl">
                        <h4 className="font-black text-xs uppercase text-blue-300 border-b border-white/10 pb-4">2. Charge Details</h4>
                        <InpWhite label="Service Description" value={bulkChargeData.description} onChange={v => setBulkChargeData({...bulkChargeData, description: v})} />
                        <InpWhite label="Amount Per Room (₹)" type="number" value={bulkChargeData.amount} onChange={v => setBulkChargeData({...bulkChargeData, amount: v})} />
                        <button 
                          onClick={() => handleApplyBulkCharge(selectedGroup.id)}
                          className="w-full bg-white text-blue-900 py-5 rounded-2xl font-black uppercase text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all"
                        >
                          Post to {targetRoomIds.length} Rooms
                        </button>
                     </div>
                   )}
                </div>
                
                <div className="lg:col-span-2">
                   <div className="p-8 bg-white border-2 rounded-[2.5rem] min-h-[400px] flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="font-black text-xs uppercase text-slate-400">3. Target Selection (Select Rooms)</h4>
                        <div className="flex gap-2">
                           <button onClick={() => setTargetRoomIds(bookings.filter(b => b.groupId === selectedGroup?.id).map(b => b.roomId))} className="text-[9px] font-black uppercase text-blue-600 underline">Select All</button>
                           <button onClick={() => setTargetRoomIds([])} className="text-[9px] font-black uppercase text-gray-400 underline ml-3">Deselect All</button>
                        </div>
                      </div>
                      {!selectedGroup ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 italic uppercase">
                           <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                           Select a group to see room inventory
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                           {bookings.filter(b => b.groupId === selectedGroup.id).map(b => {
                              const r = rooms.find(rm => rm.id === b.roomId);
                              const isSelected = targetRoomIds.includes(b.roomId);
                              return (
                                <button 
                                  key={b.id} 
                                  onClick={() => setTargetRoomIds(prev => isSelected ? prev.filter(x => x !== b.roomId) : [...prev, b.roomId])}
                                  className={`p-5 rounded-2xl border-2 transition-all font-black uppercase flex flex-col items-center gap-1 ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-200'}`}
                                >
                                   <span className="text-xl leading-none">{r?.number}</span>
                                   <span className="text-[8px] opacity-60">Folio {b.bookingNo.slice(-4)}</span>
                                </button>
                              );
                           })}
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onSave={(g) => { setGroups([...groups, g]); setShowCreate(false); }} />}
      
      {showConsolidatedInvoice && selectedGroup && (
        <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col no-print-backdrop">
           <div className="bg-black p-4 flex justify-between items-center no-print">
              <p className="text-white font-black uppercase text-xs tracking-widest">Master Consolidated Bill View</p>
              <div className="flex gap-3">
                 <button onClick={() => window.print()} className="bg-green-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-xl">Print Invoce</button>
                 <button onClick={() => setShowConsolidatedInvoice(false)} className="text-white bg-white/10 px-6 py-2 rounded-xl font-black text-[10px] uppercase border border-white/20">Close [X]</button>
              </div>
           </div>
           <div className="flex-1 overflow-y-auto bg-gray-500/20 p-10 custom-scrollbar">
              <InvoiceView 
                settings={settings}
                guest={guests.find(g => g.phone === selectedGroup.phone) || { name: selectedGroup.groupName, address: selectedGroup.orgName || '', phone: selectedGroup.phone } as any}
                groupBookings={bookings.filter(b => b.groupId === selectedGroup.id).map(b => ({
                  ...b,
                  roomNumber: rooms.find(r => r.id === b.roomId)?.number || '?',
                  roomType: rooms.find(r => r.id === b.roomId)?.type || '?'
                }))}
                payments={bookings.filter(b => b.groupId === selectedGroup.id).reduce((acc, b) => [...acc, ...(b.payments || [])], [] as any[])}
              />
           </div>
        </div>
      )}

      {showPaymentModal && selectedGroup && (
        <GroupPaymentModal 
          group={selectedGroup} 
          onClose={() => setShowPaymentModal(false)} 
          onSubmit={(amt, method, remarks) => {
             onGroupPayment(selectedGroup.id, amt, method, remarks);
             setShowPaymentModal(false);
          }} 
        />
      )}
    </div>
  );
};

const GroupPaymentModal = ({ group, onClose, onSubmit }: any) => {
  const [amt, setAmt] = useState('');
  const [method, setMethod] = useState('Cash');
  const [remarks, setRemarks] = useState('');

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl">
        <div className="bg-green-600 p-8 text-white text-center">
          <h2 className="text-xl font-black uppercase tracking-tight">Group Settlement Protocol</h2>
        </div>
        <div className="p-10 space-y-6">
          <Inp label="Amount (₹)" type="number" value={amt} onChange={setAmt} />
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-gray-400">Account</label>
             <select className="w-full border-2 p-3 rounded-2xl font-black text-xs bg-slate-50" value={method} onChange={e => setMethod(e.target.value)}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank</option>
                <option value="Card">Card</option>
             </select>
          </div>
          <Inp label="Remarks" value={remarks} onChange={setRemarks} />
          <div className="flex gap-4 pt-4">
            <button onClick={onClose} className="flex-1 text-gray-400 uppercase font-black text-[10px]">Discard</button>
            <button onClick={() => onSubmit(parseFloat(amt), method, remarks)} className="flex-1 bg-green-600 text-white py-4 rounded-2xl uppercase font-black text-[10px]">Confirm Receipt</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateGroupModal = ({ onClose, onSave }: any) => {
  const [formData, setFormData] = useState<Partial<GroupProfile>>({
    id: 'GRP-' + Math.random().toString(36).substr(2, 9),
    groupName: '',
    groupType: 'Tour',
    headName: '',
    phone: '',
    email: '',
    billingPreference: 'Single',
    status: 'ACTIVE',
    documents: {}
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden">
        <div className="bg-blue-900 p-10 text-white flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase">Group Registration</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="p-12 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <Inp label="Group Name *" value={formData.groupName} onChange={v => setFormData({...formData, groupName: v})} />
            <Inp label="Contact Head *" value={formData.headName} onChange={v => setFormData({...formData, headName: v})} />
            <Inp label="Phone *" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Invoicing Type</label>
              <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50" value={formData.billingPreference} onChange={e => setFormData({...formData, billingPreference: e.target.value as any})}>
                <option value="Single">Consolidated (Master Bill)</option>
                <option value="Split">Split (Room Wise)</option>
              </select>
            </div>
          </div>
          <button onClick={() => onSave(formData)} className="w-full bg-blue-900 text-white font-black py-6 rounded-2xl uppercase text-xs">Save Account</button>
        </div>
      </div>
    </div>
  );
};

const SubMenuBtn = ({ active, label, onClick }: any) => (
  <button onClick={onClick} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all shrink-0 ${active ? 'bg-blue-900 text-white border-blue-900 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200'}`}>{label}</button>
);

const Inp = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{label}</label>
    <input type={type} className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 outline-none" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const InpWhite = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1 text-white">
    <label className="text-[10px] font-black uppercase opacity-60 ml-1">{label}</label>
    <input type={type} className="w-full border-2 border-white/20 p-4 rounded-2xl font-black text-xs bg-white/10 text-white outline-none focus:bg-white/20" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default GroupModule;
