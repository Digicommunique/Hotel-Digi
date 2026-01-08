
import React, { useState, useEffect } from 'react';
import { HostelSettings, Room, AgentConfig, RoomStatus, Booking, Transaction, Supervisor } from '../types.ts';
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
  const [activeSubTab, setActiveSubTab] = useState<'GENERAL' | 'ROOMS' | 'SUPERVISORS' | 'DATA' | 'TAX' | 'SECURITY'>('GENERAL');
  const [tempSettings, setTempSettings] = useState<HostelSettings>(settings);
  
  const [newRoom, setNewRoom] = useState<Partial<Room>>({ number: '', floor: 1, type: settings.roomTypes[0] || '', price: 0 });
  const [newAgent, setNewAgent] = useState<AgentConfig>({ name: '', commission: 0 });
  
  const [showAddSupervisor, setShowAddSupervisor] = useState(false);
  const [newSup, setNewSup] = useState<Partial<Supervisor>>({ name: '', loginId: '', password: '', assignedRoomIds: [], status: 'ACTIVE' });

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

  const handleSaveSupervisor = async () => {
    if (!newSup.name || !newSup.loginId || !newSup.password) return alert("Fill mandatory fields");
    const sup: Supervisor = {
      ...newSup as Supervisor,
      id: Math.random().toString(36).substr(2, 9),
    };
    const updated = [...supervisors, sup];
    setSupervisors(updated);
    await db.supervisors.put(sup);
    setNewSup({ name: '', loginId: '', password: '', assignedRoomIds: [], status: 'ACTIVE' });
    setShowAddSupervisor(false);
  };

  const handleDeleteSupervisor = async (id: string) => {
    if (!confirm("Remove this supervisor?")) return;
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
        
        {/* Tabs - Scrollable on mobile */}
        <div className="flex items-center justify-between bg-white p-2 md:p-3 rounded-2xl md:rounded-[2rem] border shadow-xl sticky top-2 z-10 overflow-x-auto scrollbar-hide no-print gap-1">
          <SubTab active={activeSubTab === 'GENERAL'} label="Profile" onClick={() => setActiveSubTab('GENERAL')} />
          <SubTab active={activeSubTab === 'ROOMS'} label="Inventory" onClick={() => setActiveSubTab('ROOMS')} />
          <SubTab active={activeSubTab === 'SUPERVISORS'} label="Staff" onClick={() => setActiveSubTab('SUPERVISORS')} />
          <SubTab active={activeSubTab === 'DATA'} label="Backups" onClick={() => setActiveSubTab('DATA')} />
          <SubTab active={activeSubTab === 'TAX'} label="Taxation" onClick={() => setActiveSubTab('TAX')} />
          <SubTab active={activeSubTab === 'SECURITY'} label="Access" onClick={() => setActiveSubTab('SECURITY')} />
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

        {activeSubTab === 'SUPERVISORS' && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                   <h2 className="text-2xl md:text-3xl font-black text-blue-900 uppercase tracking-tighter leading-none">Supervisor Registry</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Staff deployments and assignments</p>
                </div>
                <button onClick={() => setShowAddSupervisor(true)} className="w-full md:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">Enroll Supervisor</button>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {supervisors.map(sup => (
                   <div key={sup.id} className="bg-white border-2 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm group hover:border-blue-500 transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-xl md:rounded-2xl flex items-center justify-center text-xl">👤</div>
                        <button onClick={() => handleDeleteSupervisor(sup.id)} className="text-red-500 font-black text-[9px] uppercase hover:underline">Remove</button>
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-blue-900 uppercase tracking-tighter leading-none truncate">{sup.name}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-6">UID: <span className="text-blue-600">{sup.loginId}</span></p>
                      
                      <div className="space-y-2 border-t pt-4">
                         <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Inventory Management</p>
                         <p className="text-[11px] font-black text-slate-700">{sup.assignedRoomIds.length} Rooms Assigned</p>
                         <div className="flex flex-wrap gap-1 pt-2">
                            {sup.assignedRoomIds.slice(0, 4).map(rid => (
                               <span key={rid} className="bg-slate-100 text-[7px] font-black px-2 py-1 rounded-lg">R{rooms.find(x=>x.id===rid)?.number}</span>
                            ))}
                            {sup.assignedRoomIds.length > 4 && <span className="bg-slate-100 text-[7px] font-black px-2 py-1 rounded-lg">+{sup.assignedRoomIds.length-4}</span>}
                         </div>
                      </div>
                   </div>
                ))}
             </div>

             {showAddSupervisor && (
               <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
                  <div className="bg-white w-full max-w-2xl h-full md:h-auto overflow-y-auto rounded-3xl md:rounded-[4rem] shadow-2xl animate-in zoom-in duration-300">
                     <div className="bg-blue-900 p-6 md:p-10 text-white flex justify-between items-center shrink-0">
                        <h2 className="text-xl md:text-2xl font-black uppercase">Enrollment</h2>
                        <button onClick={() => setShowAddSupervisor(false)} className="uppercase font-black text-[10px]">Exit</button>
                     </div>
                     <div className="p-6 md:p-12 space-y-6 md:space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                           <Input label="Staff Name *" value={newSup.name} onChange={v => setNewSup({...newSup, name: v})} />
                           <Input label="Login ID *" value={newSup.loginId} onChange={v => setNewSup({...newSup, loginId: v})} />
                           <div className="md:col-span-2">
                             <Input label="Access Key *" type="password" value={newSup.password} onChange={v => setNewSup({...newSup, password: v})} />
                           </div>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Inventory Assignment</label>
                           <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-3 border-2 rounded-2xl bg-slate-50 custom-scrollbar">
                              {rooms.map(r => (
                                 <button key={r.id} onClick={() => {
                                    const ids = newSup.assignedRoomIds || [];
                                    setNewSup({...newSup, assignedRoomIds: ids.includes(r.id) ? ids.filter(x => x !== r.id) : [...ids, r.id]});
                                 }} className={`p-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase border-2 transition-all ${newSup.assignedRoomIds?.includes(r.id) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}>{r.number}</button>
                              ))}
                           </div>
                        </div>
                        <button onClick={handleSaveSupervisor} className="w-full bg-blue-900 text-white font-black py-5 rounded-[1.5rem] uppercase text-xs shadow-2xl mt-4">Authorize Access</button>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {activeSubTab === 'DATA' && (
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-500">
            <div className="bg-blue-900 p-8 md:p-12 rounded-3xl md:rounded-[4rem] text-white space-y-6 shadow-2xl relative overflow-hidden text-center md:text-left">
               <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-tight">Property Data Vault</h2>
               <button onClick={exportDatabase} className="relative z-10 w-full bg-white text-blue-900 py-5 md:py-6 rounded-2xl md:rounded-3xl font-black uppercase text-[10px] md:text-xs shadow-2xl hover:scale-105 transition-all">Download Full System Backup</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-white p-8 md:p-10 rounded-3xl md:rounded-[3rem] border-2 border-dashed border-slate-200 text-center space-y-4 md:space-y-6">
                 <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase">Restore Records</h3>
                 <div className="relative">
                    <button className="w-full bg-slate-900 text-white px-4 py-4 rounded-2xl font-black uppercase text-[10px]">Upload Backup</button>
                    <input type="file" accept=".json" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImportFile} />
                 </div>
              </div>
              <div className="bg-white p-8 md:p-10 rounded-3xl md:rounded-[3rem] border-2 border-red-100 text-center space-y-4 md:space-y-6">
                 <h3 className="text-lg md:text-xl font-black text-red-600 uppercase">Purge History</h3>
                 <button onClick={handleClearBookings} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Format Data</button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'TAX' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-in fade-in duration-500">
             <section className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] border shadow-sm space-y-6 md:space-y-8">
                <h3 className="font-black uppercase text-xs text-blue-900 tracking-widest border-b pb-4 md:pb-6">Taxation Profile</h3>
                <Input label="GSTIN Number" value={tempSettings.gstNumber || ''} onChange={v => handleUpdate('gstNumber', v)} />
                <Input label="SAC/HSN Code" value={tempSettings.hsnCode || '9963'} onChange={v => handleUpdate('hsnCode', v)} />
                <Input label="GST Rate (%)" type="number" value={tempSettings.taxRate?.toString() || '12'} onChange={v => handleUpdate('taxRate', parseFloat(v))} />
             </section>
             <div className="bg-blue-50 p-6 md:p-10 rounded-3xl md:rounded-[3rem] border border-blue-100 flex flex-col justify-center text-center space-y-4">
                <div className="text-4xl">🧾</div>
                <h4 className="text-xl font-black text-blue-900 uppercase">Taxation Control</h4>
                <p className="text-[10px] font-bold text-blue-400 uppercase leading-relaxed px-4 md:px-10">
                   Configure standard tax rates and legal identifiers used for automated invoicing and digital billing records.
                </p>
             </div>
          </div>
        )}

        {activeSubTab === 'SECURITY' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-in fade-in duration-500">
             <section className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] border shadow-sm space-y-6 md:space-y-8">
                <h3 className="font-black uppercase text-xs text-blue-900 tracking-widest border-b pb-4 md:pb-6">Access Credentials</h3>
                <Input label="Admin Portal Key" value={tempSettings.adminPassword || ''} onChange={v => handleUpdate('adminPassword', v)} type="password" />
                <Input label="Receptionist Key" value={tempSettings.receptionistPassword || ''} onChange={v => handleUpdate('receptionistPassword', v)} type="password" />
                <Input label="Accountant Key" value={tempSettings.accountantPassword || ''} onChange={v => handleUpdate('accountantPassword', v)} type="password" />
             </section>
             <div className="bg-blue-50 p-6 md:p-10 rounded-3xl md:rounded-[3rem] border border-blue-100 flex flex-col justify-center text-center space-y-4">
                <div className="text-4xl">🔐</div>
                <h4 className="text-xl font-black text-blue-900 uppercase">Access Security</h4>
                <p className="text-[10px] font-bold text-blue-400 uppercase leading-relaxed px-4 md:px-10">
                   Manage tiered access credentials for different system functions. Ensure master keys are rotated periodically for property security.
                </p>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

const SubTab: React.FC<{ active: boolean, label: string, onClick: () => void }> = ({ active, label, onClick }) => (
  <button onClick={onClick} className={`px-4 md:px-8 py-2.5 md:py-4 rounded-xl md:rounded-[1.5rem] font-black text-[9px] md:text-[11px] uppercase tracking-widest transition-all shrink-0 ${active ? 'bg-blue-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:text-slate-900'}`}>{label}</button>
);

const Input: React.FC<{ label: string, value: any, onChange: (v: string) => void, type?: string }> = ({ label, value, onChange, type = "text" }) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">{label}</label>
    <input type={type} className="w-full border-2 p-3.5 rounded-2xl font-black text-[11px] md:text-xs bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner text-black" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

export default Settings;
