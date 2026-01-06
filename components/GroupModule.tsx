
import React, { useState, useMemo } from 'react';
import { GroupProfile, Room, Booking, Guest, RoomStatus, Transaction } from '../types';
import { INDIAN_STATES } from '../constants';

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
}

const GroupModule: React.FC<GroupModuleProps> = ({ groups, setGroups, rooms, bookings, setBookings, guests, setGuests, setRooms, onAddTransaction }) => {
  const [activeSubMenu, setActiveSubMenu] = useState<'PROFILES' | 'RESERVATIONS' | 'ROOMING' | 'BILLING' | 'PAYMENTS'>('PROFILES');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupProfile | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const SubNav = () => (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-print">
      <SubMenuBtn active={activeSubMenu === 'PROFILES'} label="Profiles" onClick={() => setActiveSubMenu('PROFILES')} />
      <SubMenuBtn active={activeSubMenu === 'RESERVATIONS'} label="Reservations" onClick={() => setActiveSubMenu('RESERVATIONS')} />
      <SubMenuBtn active={activeSubMenu === 'ROOMING'} label="Rooming List" onClick={() => setActiveSubMenu('ROOMING')} />
      <SubMenuBtn active={activeSubMenu === 'BILLING'} label="Billing Desk" onClick={() => setActiveSubMenu('BILLING')} />
      <SubMenuBtn active={activeSubMenu === 'PAYMENTS'} label="Payments" onClick={() => setActiveSubMenu('PAYMENTS')} />
    </div>
  );

  const handleBulkStatusChange = (groupId: string, newStatus: Booking['status']) => {
    const updatedBookings = bookings.map(b => b.groupId === groupId ? { ...b, status: newStatus } : b);
    setBookings(updatedBookings);
    
    // Also update rooms
    const groupRoomIds = bookings.filter(b => b.groupId === groupId).map(b => b.roomId);
    const roomStatus = newStatus === 'ACTIVE' ? RoomStatus.OCCUPIED : newStatus === 'COMPLETED' ? RoomStatus.DIRTY : RoomStatus.VACANT;
    const updatedRooms = rooms.map(r => groupRoomIds.includes(r.id) ? { ...r, status: roomStatus } : r);
    setRooms(updatedRooms);
    
    alert(`Bulk ${newStatus.toLowerCase()} processed for all group units.`);
  };

  const handleGroupPayment = (amt: number, method: string, remarks: string) => {
    if (!selectedGroup) return;
    const tx: Transaction = {
      id: `TX-GRP-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'RECEIPT',
      accountGroup: 'Direct Income',
      ledger: method,
      amount: amt,
      entityName: selectedGroup.groupName,
      description: `Group Payment: ${selectedGroup.groupName} - ${remarks}`
    };
    onAddTransaction(tx);
    setShowPaymentModal(false);
    alert("Group payment recorded successfully.");
  };

  return (
    <div className="p-8 bg-[#f8fafc] min-h-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter">Group Master Console</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Multi-Room & Corporate Lifecycle Management</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-6">
            <StatSmall label="Active Blocks" value={groups.filter(g => g.status === 'ACTIVE').length} />
            <div className="w-px h-8 bg-gray-100"></div>
            <StatSmall label="Group Rooms" value={bookings.filter(b => b.groupId).length} />
          </div>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 transition-all">+ New Group Account</button>
        </div>
      </div>

      <SubNav />

      <div className="flex-1">
        {activeSubMenu === 'PROFILES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {groups.map(group => (
              <div key={group.id} className="bg-white border-2 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group" onClick={() => setSelectedGroup(group)}>
                <div className="flex justify-between items-start mb-6">
                  <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${group.groupType === 'Wedding' ? 'bg-pink-100 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                    {group.groupType}
                  </div>
                  <span className={`text-[9px] font-black uppercase flex items-center gap-1.5 ${group.status === 'ACTIVE' ? 'text-green-500' : 'text-gray-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${group.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                    {group.status}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter mb-1 group-hover:text-blue-600 transition-colors">{group.groupName}</h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase mb-8">{group.headName} • {group.phone}</p>
                
                <div className="grid grid-cols-2 gap-6 border-t pt-6">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-gray-300">Folio Routing</p>
                    <p className="text-[10px] font-black uppercase text-gray-700">{group.billingPreference} BILLING</p>
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
          <div className="bg-white rounded-[3rem] border-2 shadow-sm p-12 space-y-8 animate-in fade-in duration-500">
             <div className="flex justify-between items-center border-b pb-8">
                <div>
                   <h2 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Group Settlement Desk</h2>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">Consolidated Invoicing & Master Folios</p>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {groups.map(g => {
                   const gBookings = bookings.filter(b => b.groupId === g.id);
                   const total = gBookings.reduce((s,b) => s + b.basePrice, 0);
                   return (
                      <div key={g.id} className="bg-gray-50 border-2 rounded-[2.5rem] p-10 flex flex-col justify-between">
                         <div className="flex justify-between items-start mb-8">
                            <div>
                               <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">{g.groupName}</h3>
                               <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{g.billingPreference} Mode</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] font-black text-gray-400 uppercase">Total Dues</p>
                               <p className="text-2xl font-black text-gray-900">₹{total}</p>
                            </div>
                         </div>
                         <div className="flex gap-4">
                            <button onClick={() => alert("Invoice generation module active.")} className="flex-1 bg-blue-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg">Process Invoice</button>
                            <button onClick={() => setSelectedGroup(g)} className="flex-1 bg-white border-2 border-blue-900 text-blue-900 py-4 rounded-2xl font-black text-[10px] uppercase">Review Folios</button>
                         </div>
                      </div>
                   )
                })}
             </div>
          </div>
        )}
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onSave={(g) => { setGroups([...groups, g]); setShowCreate(false); }} />}
      {selectedGroup && (
        <GroupDetailView 
          group={selectedGroup} 
          bookings={bookings} 
          rooms={rooms} 
          onClose={() => setSelectedGroup(null)} 
          onBulkCheckIn={() => handleBulkStatusChange(selectedGroup.id, 'ACTIVE')}
          onBulkCheckOut={() => handleBulkStatusChange(selectedGroup.id, 'COMPLETED')}
          onPayment={() => setShowPaymentModal(true)}
          onPrint={() => window.print()}
        />
      )}
      {showPaymentModal && selectedGroup && (
        <GroupPaymentModal 
          group={selectedGroup} 
          onClose={() => setShowPaymentModal(false)} 
          onSubmit={handleGroupPayment} 
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
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-green-600 p-8 text-white text-center">
          <h2 className="text-xl font-black uppercase">Post Group Payment</h2>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{group.groupName}</p>
        </div>
        <div className="p-10 space-y-6">
          <Inp label="Amount Received (₹)" type="number" value={amt} onChange={setAmt} />
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Payment Mode</label>
             <select className="w-full border-2 p-3 rounded-2xl font-black text-xs" value={method} onChange={e => setMethod(e.target.value)}>
                <option value="Cash">Cash Account</option>
                <option value="UPI">UPI / Digital</option>
                <option value="Bank">Bank Transfer</option>
             </select>
          </div>
          <Inp label="Remarks / Narration" value={remarks} onChange={setRemarks} />
          <div className="flex gap-4 pt-4">
            <button onClick={onClose} className="flex-1 text-gray-400 uppercase font-black text-[10px]">Cancel</button>
            <button onClick={() => onSubmit(parseFloat(amt), method, remarks)} className="flex-1 bg-green-600 text-white py-4 rounded-2xl uppercase font-black text-[10px] shadow-lg">Confirm Payment</button>
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
    orgName: '',
    gstNumber: '',
    billingPreference: 'Single',
    status: 'ACTIVE',
    documents: {}
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-blue-900 p-10 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-widest leading-none">Group Enrollment Registry</h2>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.2em] mt-2">New Master Folio Entry</p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-4 rounded-2xl hover:bg-white/20 transition-all font-black uppercase text-[10px]">Close</button>
        </div>
        <div className="p-12 space-y-10">
          <div className="grid grid-cols-2 gap-8">
            <Inp label="Group Name *" value={formData.groupName} onChange={v => setFormData({...formData, groupName: v})} />
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Group Classification</label>
              <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 outline-none focus:border-blue-500 transition-all" value={formData.groupType} onChange={e => setFormData({...formData, groupType: e.target.value as any})}>
                <option value="Tour">Tour Group</option>
                <option value="Corporate">Corporate / B2B</option>
                <option value="Wedding">Wedding Party</option>
                <option value="School">Educational Tour</option>
                <option value="Religious">Religious / Spiritual</option>
                <option value="Sports">Sports Team</option>
              </select>
            </div>
            <Inp label="Team Leader / Head Name *" value={formData.headName} onChange={v => setFormData({...formData, headName: v})} />
            <Inp label="Primary Contact Number *" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
            <Inp label="Official Email ID" value={formData.email} onChange={v => setFormData({...formData, email: v})} />
            <Inp label="Organization Name" value={formData.orgName} onChange={v => setFormData({...formData, orgName: v})} />
            <Inp label="GSTIN Number" value={formData.gstNumber} onChange={v => setFormData({...formData, gstNumber: v})} />
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Billing & Settlement Mode</label>
              <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 outline-none focus:border-blue-500 transition-all" value={formData.billingPreference} onChange={e => setFormData({...formData, billingPreference: e.target.value as any})}>
                <option value="Single">Consolidated (Master Folio)</option>
                <option value="Split">Split (Individual Folios)</option>
                <option value="Mixed">Mixed Routing Rules</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 pt-10 border-t">
            <button onClick={() => onSave(formData)} className="flex-1 bg-blue-900 text-white font-black py-6 rounded-2xl uppercase shadow-2xl text-xs tracking-[0.2em] hover:bg-black transition-all">Establish Group Profile</button>
            <button onClick={onClose} className="px-12 text-gray-400 font-black uppercase text-[10px] hover:text-gray-900 transition-colors">Discard Draft</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GroupDetailView = ({ group, bookings, rooms, onClose, onBulkCheckIn, onBulkCheckOut, onPayment, onPrint }: any) => {
  const groupBookings = bookings.filter((b: any) => b.groupId === group.id);
  const total = groupBookings.reduce((s:number, b:any)=>s+b.basePrice, 0);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 no-print-backdrop">
      <div className="bg-[#f8fafc] w-full max-w-7xl h-[95vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-500">
        <div className="bg-blue-900 p-12 text-white flex justify-between items-start no-print">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <span className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{group.groupType} PROFILE</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">ID: {group.id}</span>
            </div>
            <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{group.groupName}</h2>
            <p className="text-xs font-bold text-blue-300 uppercase tracking-[0.3em] mt-4 flex items-center gap-4">
              <span>LEADER: {group.headName}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
              <span>BILLING: {group.billingPreference}</span>
            </p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-6 rounded-3xl hover:bg-white/20 transition-all font-black uppercase text-xs tracking-widest">Exit Management Desk</button>
        </div>
        
        <div className="flex-1 p-12 overflow-y-auto grid grid-cols-1 lg:grid-cols-4 gap-12 custom-scrollbar invoice-sheet">
          <div className="lg:col-span-3 space-y-12">
            <section className="bg-white p-10 rounded-[3rem] border-2 shadow-sm">
              <div className="flex justify-between items-center mb-10 no-print">
                 <h3 className="font-black text-blue-900 uppercase text-sm border-l-8 border-blue-600 pl-6 tracking-widest">Active Rooming List</h3>
                 <button className="text-blue-600 font-black uppercase text-[10px] hover:underline">Bulk Upload Guest Details</button>
              </div>
              <div className="border rounded-3xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 uppercase font-black text-gray-400">
                    <tr><th className="p-6">Unit</th><th className="p-6">Resident Guest</th><th className="p-6">Type</th><th className="p-6 text-right">Debit Balance</th></tr>
                  </thead>
                  <tbody className="divide-y font-bold uppercase text-gray-700">
                    {groupBookings.map((b: any) => {
                      const room = rooms.find((r:any)=>r.id === b.roomId);
                      return (
                        <tr key={b.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-6 font-black text-blue-900 text-lg">{room?.number}</td>
                          <td className="p-6">{b.guestName || 'Waitlist / Unassigned'}</td>
                          <td className="p-6"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[9px] font-black uppercase">{room?.type}</span></td>
                          <td className="p-6 text-right font-black">₹{b.basePrice}</td>
                        </tr>
                      );
                    })}
                    {groupBookings.length === 0 && <tr><td colSpan={4} className="p-20 text-center text-gray-300 font-black uppercase tracking-widest">No room units allocated to block</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="space-y-8 no-print">
            <div className="bg-blue-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                 <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.82v-1.91c-1.84-.44-3.32-1.54-3.41-3.55h2.12c.09 1.05.85 1.76 2.05 1.76 1.34 0 2.01-.7 2.01-1.63 0-1.05-.62-1.48-2.22-2.11-2.11-.84-3.46-1.82-3.46-3.83 0-1.78 1.35-3.04 3.12-3.43V3.5h2.82v1.88c1.55.33 2.76 1.37 2.89 3.09h-2.12c-.11-.83-.75-1.37-1.81-1.37-1.12 0-1.79.54-1.79 1.4 0 .93.72 1.34 2.22 1.96 2.19.9 3.47 1.94 3.47 3.99.01 2.06-1.47 3.14-3.34 3.59z"/></svg>
               </div>
               <p className="text-[10px] font-black uppercase text-blue-300 tracking-[0.3em] mb-2">Master Folio Total</p>
               <h3 className="text-5xl font-black tracking-tighter mb-10">₹{total}</h3>
               <div className="space-y-4">
                  <button onClick={onPayment} className="w-full bg-white text-blue-900 py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Post Master Receipt</button>
                  <button onClick={onBulkCheckOut} className="w-full bg-blue-800 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest border border-blue-700 hover:bg-blue-700 transition-all">Final Settlement</button>
               </div>
            </div>
            
            <div className="bg-white p-10 rounded-[3rem] border-2 space-y-4 shadow-sm">
               <h4 className="font-black text-[9px] uppercase text-gray-300 tracking-[0.3em] text-center mb-4">Operations Hub</h4>
               <ActionButton label="Bulk Check-in" onClick={onBulkCheckIn} />
               <ActionButton label="Bulk Check-out" onClick={onBulkCheckOut} />
               <ActionButton label="Folio Split Manager" onClick={() => alert("Split manager activated.")} />
               <ActionButton label="Print Rooming List" variant="secondary" onClick={onPrint} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ label, variant = 'primary', onClick }: { label: string, variant?: 'primary' | 'secondary', onClick?: () => void }) => (
  <button onClick={onClick} className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${variant === 'primary' ? 'bg-gray-50 text-gray-600 hover:bg-blue-600 hover:text-white' : 'border-2 text-gray-400 hover:border-blue-600 hover:text-blue-600'}`}>{label}</button>
);

const SubMenuBtn = ({ active, label, onClick }: any) => (
  <button onClick={onClick} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all shadow-sm flex-shrink-0 ${active ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200'}`}>{label}</button>
);

const StatSmall = ({ label, value }: { label: string, value: number | string }) => (
  <div className="text-center">
    <p className="text-[8px] font-black uppercase text-gray-300 tracking-widest">{label}</p>
    <p className="text-lg font-black text-blue-900 leading-tight">{value}</p>
  </div>
);

const Inp = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">{label}</label>
    <input type={type} className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 focus:bg-white focus:border-blue-500 transition-all outline-none" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default GroupModule;
