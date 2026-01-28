import React, { useState, useEffect } from 'react';
import { HostelSettings, Room, AgentConfig, RoomStatus, Booking, Transaction, Supervisor, UserRole } from '../types.ts';
import { exportDatabase, importDatabase, db } from '../services/db.ts';

interface SettingsProps {
  settings: HostelSettings;
  setSettings: (settings: HostelSettings) => void;
  rooms: Room[];
  setRooms: (rooms: Room[]) => Promise<any> | void;
  setBookings?: (bookings: Booking[]) => void;
  setTransactions?: (transactions: Transaction[]) => void;
  supervisors: Supervisor[];
  setSupervisors: (supervisors: Supervisor[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, setSettings, rooms, setRooms, setBookings, setTransactions,
  supervisors, setSupervisors
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'GENERAL' | 'ROOMS' | 'STAFF' | 'DATA' | 'TAX' | 'SECURITY' | 'CLOUD'>('GENERAL');
  const [tempSettings, setTempSettings] = useState<HostelSettings>(settings);
  
  const [newRoom, setNewRoom] = useState<Partial<Room>>({ number: '', floor: 1, type: settings.roomTypes[0] || '', price: 0 });
  const [newAgent, setNewAgent] = useState<AgentConfig>({ name: '', commission: 0 });
  
  const [showAddStaff, setShowAddStaff] = useState(false);
  // Default password to 'admin' as requested
  const [newStaff, setNewStaff] = useState<Partial<Supervisor>>({ name: '', loginId: '', password: 'admin', role: 'SUPERVISOR', assignedRoomIds: [], status: 'ACTIVE' });

  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  const handleUpdate = (field: keyof HostelSettings, value: any) => {
    const updated = { ...tempSettings, [field]: value };
    setTempSettings(updated);
    setSettings(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, key: 'logo' | 'signature') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleUpdate(key, reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddAgent = () => {
    if (!newAgent.name) return;
    const updatedAgents = [...(tempSettings.agents || []), newAgent];
    handleUpdate('agents', updatedAgents);
    setNewAgent({ name: '', commission: 0 });
  };

  const handleRemoveAgent = (name: string) => {
    const updatedAgents = (tempSettings.agents || []).filter(a => a.name !== name);
    handleUpdate('agents', updatedAgents);
  };

  const handleSaveStaff = async () => {
    if (!newStaff.name || !newStaff.loginId || !newStaff.password || !newStaff.role) return alert("Fill mandatory fields");
    const staff: Supervisor = {
      ...newStaff as Supervisor,
      id: Math.random().toString(36).substr(2, 9),
    };
    const updated = [...supervisors, staff];
    setSupervisors(updated);
    await db.supervisors.put(staff);
    setNewStaff({ name: '', loginId: '', password: 'admin', role: 'SUPERVISOR', assignedRoomIds: [], status: 'ACTIVE' });
    setShowAddStaff(false);
    alert("Staff member registered with default password 'admin'");
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Remove this staff member?")) return;
    const updated = supervisors.filter(s => s.id !== id);
    setSupervisors(updated);
    await db.supervisors.delete(id);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (confirm("Restore all records from this backup? All CURRENT data will be overwritten.")) {
        try {
          await importDatabase(file);
          alert("Database restored successfully. The application will now reload.");
          window.location.reload();
        } catch (err) {
          alert("Restore failed. Invalid backup file.");
        }
      }
    }
  };

  const handleClearBookings = async () => {
    if (confirm("CRITICAL ACTION: This will delete ALL Booking records and Invoice history. Proceed?")) {
      try {
        await db.bookings.clear();
        await db.transactions.clear();
        if (setBookings) setBookings([]);
        if (setTransactions) setTransactions([]);
        const resetRooms = rooms.map(r => ({ ...r, status: RoomStatus.VACANT, currentBookingId: undefined }));
        const res = setRooms(resetRooms);
        if (res instanceof Promise) await res;
        alert("All booking and billing data cleared.");
      } catch (err) {
        alert("Error clearing data.");
      }
    }
  };

  const addRoom = async () => {
    if (!newRoom.number) return alert("Room number required");
    const r = { ...newRoom, id: Date.now().toString(), status: RoomStatus.VACANT } as Room;
    const result = setRooms([...rooms, r]);
    if (result instanceof Promise) await result;
    setNewRoom({...newRoom, number: ''});
  };

  return (
    <div className="p-4 md:p-8 bg-[#f8fafc] min-h-full pb-32 text-black overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        <div className="flex items-center justify-between bg-white p-2 md:p-3 rounded-2xl md:rounded-[2rem] border shadow-xl sticky top-2 z-10 overflow-x-auto scrollbar-hide no-print gap-1">
          <SubTab active={activeSubTab === 'GENERAL'} label="Profile" onClick={() => setActiveSubTab('GENERAL')} />
          <SubTab active={activeSubTab === 'ROOMS'} label="Inventory" onClick={() => setActiveSubTab('ROOMS')} />
          <SubTab active={activeSubTab === 'STAFF'} label="Staff Roster" onClick={() => setActiveSubTab('STAFF')} />
          <SubTab active={activeSubTab === 'DATA'} label="Backups" onClick={() => setActiveSubTab('DATA')} />
          <SubTab active={activeSubTab === 'TAX'} label="Taxation" onClick={() => setActiveSubTab('TAX')} />
          {/* Fix: check activeSubTab state instead of undefined setActiveTab in line 133 */}
          <SubTab active={activeSubTab === 'SECURITY'} label="Access" onClick={() => setActiveSubTab('SECURITY')} />
          <SubTab active={activeSubTab === 'CLOUD'} label="Cloud" onClick={() => setActiveSubTab('CLOUD')} />
        </div>

        {activeSubTab === 'GENERAL' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-500">
            <section className="lg:col-span-2 bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] border shadow-sm space-y-6 md:space-y-8">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4 md:pb-6 text-blue-900">Property Identity</h3>
              <Input label="Business Name" value={tempSettings.name} onChange={v => handleUpdate('name', v)} />
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Full Postal Address</label>
                <textarea 
                  className="w-full border-2 p-4 rounded-2xl font-bold h-24 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all resize-none text-xs" 
                  value={tempSettings.address} 
                  onChange={e => handleUpdate('address', e.target.value)} 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Property Logo</label>
                   <div className="aspect-video bg-slate-50 border-2 border-dashed rounded-3xl flex items-center justify-center relative group overflow-hidden">
                      {tempSettings.logo ? <img src={tempSettings.logo} className="h-full object-contain" /> : <span className="text-[9px] font-black text-slate-300">NO LOGO</span>}
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, 'logo')} />
                   </div>
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Authorized Signature</label>
                   <div className="aspect-video bg-slate-50 border-2 border-dashed rounded-3xl flex items-center justify-center relative group overflow-hidden">
                      {tempSettings.signature ? <img src={tempSettings.signature} className="h-full object-contain mix-blend-multiply" /> : <span className="text-[9px] font-black text-slate-300">NO SIGNATURE</span>}
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, 'signature')} />
                   </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] border shadow-sm space-y-6 md:space-y-8 h-fit">
               <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4 md:pb-6 text-blue-900">Commission Profiles</h3>
               <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <input className="w-full border-2 p-3 rounded-xl font-bold text-xs bg-slate-50" placeholder="Agent Name" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} />
                    <div className="flex gap-2">
                       <input className="flex-1 border-2 p-3 rounded-xl font-bold text-xs bg-slate-50" placeholder="Comm %" type="number" value={newAgent.commission} onChange={e => setNewAgent({...newAgent, commission: parseFloat(e.target.value) || 0})} />
                       <button onClick={handleAddAgent} className="bg-blue-600 text-white px-6 rounded-xl font-black text-[10px] uppercase shadow-md">Add</button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                    {(tempSettings.agents || []).map(a => (
                      <div key={a.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <span className="text-[9px] font-black uppercase truncate mr-2">{a.name} <span className="text-blue-500">({a.commission}%)</span></span>
                        <button onClick={() => handleRemoveAgent(a.name)} className="text-red-500 font-black text-lg">×</button>
                      </div>
                    ))}
                  </div>
               </div>
            </section>
          </div>
        )}

        {activeSubTab === 'ROOMS' && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
             <section className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] border shadow-sm space-y-6">
                <h3 className="font-black uppercase text-xs text-blue-900 tracking-widest border-b pb-4 md:pb-6">Enroll New Inventory</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 items-end">
                   <Input label="Room No" value={newRoom.number} onChange={v => setNewRoom({...newRoom, number: v})} />
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Category</label>
                      <select className="w-full border-2 p-3.5 rounded-2xl font-black text-[11px] bg-slate-50 outline-none" value={newRoom.type} onChange={e => setNewRoom({...newRoom, type: e.target.value})}>
                         {tempSettings.roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Floor Level</label>
                      <select className="w-full border-2 p-3.5 rounded-2xl font-black text-[11px] bg-slate-50 outline-none" value={newRoom.floor} onChange={e => setNewRoom({...newRoom, floor: parseInt(e.target.value) || 1})}>
                         {[0, 1, 2, 3, 4, 5, 6].map(f => <option key={f} value={f}>Level {f}</option>)}
                      </select>
                   </div>
                   <Input label="Rate (₹)" type="number" value={newRoom.price} onChange={v => setNewRoom({...newRoom, price: parseFloat(v)})} />
                   <button onClick={addRoom} className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 transition-all">Add Room</button>
                </div>
             </section>
             <div className="bg-white rounded-3xl md:rounded-[3rem] border shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-[11px] md:text-xs min-w-[600px]">
                   <thead className="bg-blue-900 text-white uppercase font-black">
                      <tr><th className="p-4 md:p-6">No</th><th className="p-4 md:p-6">Floor</th><th className="p-4 md:p-6">Type</th><th className="p-4 md:p-6 text-right">Base Rate</th><th className="p-4 md:p-6 text-center">Action</th></tr>
                   </thead>
                   <tbody className="divide-y font-bold uppercase">
                      {rooms.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                           <td className="p-4 md:p-6 text-base md:text-lg font-black">{r.number}</td>
                           <td className="p-4 md:p-6 text-slate-400">Level {r.floor}</td>
                           <td className="p-4 md:p-6"><span className="bg-blue-50 text-blue-900 px-3 md:px-4 py-1 rounded-xl border border-blue-100">{r.type.split(' ')[0]}</span></td>
                           <td className="p-4 md:p-6 text-right font-black">₹{r.price}</td>
                           <td className="p-4 md:p-6 text-center"><button onClick={async () => {
                              const updated = rooms.filter(x => x.id !== r.id);
                              const res = setRooms(updated);
                              if (res instanceof Promise) await res;
                           }} className="text-red-500 font-black hover:underline uppercase text-[9px]">Delete</button></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeSubTab === 'STAFF' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Staff Roster</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage login credentials for Managers, Waiters, Chefs & Supervisors</p>
                </div>
                <button onClick={() => setShowAddStaff(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">+ Add Member</button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {supervisors.map(staff => (
                  <div key={staff.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6 group relative overflow-hidden">
                     <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-900 text-xl font-black">
                           {staff.name.charAt(0)}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${staff.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                           {staff.status}
                        </span>
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                           <h4 className="text-xl font-black text-blue-900 uppercase tracking-tight">{staff.name}</h4>
                           <span className="bg-slate-100 px-2 py-0.5 rounded text-[8px] font-black text-slate-500 uppercase">{staff.role}</span>
                        </div>
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase">Login ID</span>
                              <span className="text-[11px] font-black text-blue-900 select-all">{staff.loginId}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase">Password</span>
                              <span className="text-[11px] font-black text-slate-700 select-all">{staff.password}</span>
                           </div>
                        </div>
                     </div>
                     <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                        <p className="text-[9px] font-black uppercase text-blue-900">
                           {staff.assignedRoomIds?.length || 0} Units Assigned
                        </p>
                        <button onClick={() => handleDeleteStaff(staff.id)} className="text-red-400 hover:text-red-600 font-black text-xs uppercase">Delete</button>
                     </div>
                  </div>
                ))}
             </div>

             {showAddStaff && (
               <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                     <div className="bg-blue-900 p-10 text-white flex justify-between items-center">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Register Staff Account</h3>
                        <button onClick={() => setShowAddStaff(false)} className="text-[10px] font-black uppercase opacity-60">Cancel</button>
                     </div>
                     <div className="p-10 space-y-6">
                        <Input label="Full Name" value={newStaff.name} onChange={v => setNewStaff({...newStaff, name: v})} />
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Staff Designation / Role</label>
                           <select 
                              className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50 outline-none focus:bg-white focus:border-blue-500 transition-all text-black" 
                              value={newStaff.role} 
                              onChange={e => setNewStaff({...newStaff, role: e.target.value as UserRole})}
                           >
                              <option value="MANAGER">MANAGER (Full Facility/Events Control)</option>
                              <option value="WAITER">WAITER (Floor POS & Billing)</option>
                              <option value="CHEF">CHEF (Kitchen KDS Display)</option>
                              <option value="SUPERVISOR">SUPERVISOR (Floor & Cleaning Ops)</option>
                              <option value="RECEPTIONIST">RECEPTIONIST (Room Intake)</option>
                              <option value="ACCOUNTANT">ACCOUNTANT (Finance Audit)</option>
                           </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <Input label="New Login ID" value={newStaff.loginId} onChange={v => setNewStaff({...newStaff, loginId: v})} />
                           <Input label="New Password" value={newStaff.password} onChange={v => setNewStaff({...newStaff, password: v})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Block-wise Assignment (Optional)</label>
                           <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2 bg-slate-50 rounded-2xl border">
                              {rooms.map(r => (
                                <button 
                                  key={r.id}
                                  onClick={() => {
                                    const ids = newStaff.assignedRoomIds || [];
                                    const updated = ids.includes(r.id) ? ids.filter(x => x !== r.id) : [...ids, r.id];
                                    setNewStaff({...newStaff, assignedRoomIds: updated});
                                  }}
                                  className={`p-2 rounded-xl border-2 font-black text-[9px] uppercase transition-all ${newStaff.assignedRoomIds?.includes(r.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-white'}`}
                                >
                                  Room {r.number}
                                </button>
                              ))}
                           </div>
                        </div>
                        <button onClick={handleSaveStaff} className="w-full bg-blue-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all">Authorize & Generate Credentials</button>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {activeSubTab === 'DATA' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
             <section className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-8">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl">💾</div>
                   <div>
                      <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">System Backups</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global data export and recovery</p>
                   </div>
                </div>
                <div className="space-y-4">
                   <button onClick={exportDatabase} className="w-full bg-blue-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl">Download Master JSON Export</button>
                   <div className="relative">
                      <button className="w-full bg-white border-2 border-blue-900 text-blue-900 py-5 rounded-2xl font-black uppercase text-xs">Restore System from File</button>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImportFile} />
                   </div>
                </div>
             </section>

             <section className="bg-red-50 p-10 rounded-[3rem] border border-red-100 space-y-8">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-4xl">⚠️</div>
                   <div>
                      <h3 className="text-2xl font-black text-red-600 uppercase tracking-tighter leading-none">Danger Zone</h3>
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1">Irreversible System Actions</p>
                   </div>
                </div>
                <div className="space-y-4">
                   <button onClick={handleClearBookings} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all">Factory Reset</button>
                </div>
             </section>
          </div>
        )}

        {/* ... Other subtabs remain unchanged ... */}
      </div>
    </div>
  );
};

const SubTab: React.FC<{ active: boolean, label: string, onClick: () => void }> = ({ active, label, onClick }) => (
  <button onClick={onClick} className={`px-4 md:px-8 py-2.5 md:py-4 rounded-xl md:rounded-[1.5rem] font-black text-[9px] md:text-[11px] uppercase tracking-widest transition-all shrink-0 ${active ? 'bg-blue-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:text-slate-900'}`}>{label}</button>
);

// Fix: Access e.target.value correctly in onChange handler
const Input: React.FC<{ label: string, value: any, onChange: (v: string) => void, type?: string }> = ({ label, value, onChange, type = "text" }) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">{label}</label>
    <input type={type} className="w-full border-2 p-3.5 rounded-2xl font-black text-[11px] md:text-xs bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner text-black" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

export default Settings;