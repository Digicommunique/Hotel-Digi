
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
  const [activeSubTab, setActiveSubTab] = useState<'GENERAL' | 'ROOMS' | 'SUPERVISORS' | 'DATA' | 'TAX' | 'SECURITY' | 'CLOUD'>('GENERAL');
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
        
        <div className="flex items-center justify-between bg-white p-2 md:p-3 rounded-2xl md:rounded-[2rem] border shadow-xl sticky top-2 z-10 overflow-x-auto scrollbar-hide no-print gap-1">
          <SubTab active={activeSubTab === 'GENERAL'} label="Profile" onClick={() => setActiveSubTab('GENERAL')} />
          <SubTab active={activeSubTab === 'ROOMS'} label="Inventory" onClick={() => setActiveSubTab('ROOMS')} />
          <SubTab active={activeSubTab === 'SUPERVISORS'} label="Staff" onClick={() => setActiveSubTab('SUPERVISORS')} />
          <SubTab active={activeSubTab === 'DATA'} label="Backups" onClick={() => setActiveSubTab('DATA')} />
          <SubTab active={activeSubTab === 'TAX'} label="Taxation" onClick={() => setActiveSubTab('TAX')} />
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

        {activeSubTab === 'SUPERVISORS' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Supervisor Roster</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage staff access and floor assignments</p>
                </div>
                <button onClick={() => setShowAddSupervisor(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">+ Add Member</button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {supervisors.map(sup => (
                  <div key={sup.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6 group">
                     <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-900 text-xl font-black">
                           {sup.name.charAt(0)}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${sup.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                           {sup.status}
                        </span>
                     </div>
                     <div>
                        <h4 className="text-xl font-black text-blue-900 uppercase tracking-tight">{sup.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {sup.loginId}</p>
                     </div>
                     <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                        <p className="text-[9px] font-black uppercase text-blue-900">
                           {sup.assignedRoomIds?.length || 0} Units Assigned
                        </p>
                        <button onClick={() => handleDeleteSupervisor(sup.id)} className="text-red-400 hover:text-red-600 font-black text-xs uppercase">Delete</button>
                     </div>
                  </div>
                ))}
             </div>

             {showAddSupervisor && (
               <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                     <div className="bg-blue-900 p-10 text-white flex justify-between items-center">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Add Staff Member</h3>
                        <button onClick={() => setShowAddSupervisor(false)} className="text-[10px] font-black uppercase opacity-60">Cancel</button>
                     </div>
                     <div className="p-10 space-y-6">
                        <Input label="Full Name" value={newSup.name} onChange={v => setNewSup({...newSup, name: v})} />
                        <div className="grid grid-cols-2 gap-4">
                           <Input label="Login ID" value={newSup.loginId} onChange={v => setNewSup({...newSup, loginId: v})} />
                           <Input label="Password" type="password" value={newSup.password} onChange={v => setNewSup({...newSup, password: v})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Select Room Blocks</label>
                           <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2 bg-slate-50 rounded-2xl border">
                              {rooms.map(r => (
                                <button 
                                  key={r.id}
                                  onClick={() => {
                                    const ids = newSup.assignedRoomIds || [];
                                    const updated = ids.includes(r.id) ? ids.filter(x => x !== r.id) : [...ids, r.id];
                                    setNewSup({...newSup, assignedRoomIds: updated});
                                  }}
                                  className={`p-2 rounded-xl border-2 font-black text-[9px] uppercase transition-all ${newSup.assignedRoomIds?.includes(r.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-white'}`}
                                >
                                  Room {r.number}
                                </button>
                              ))}
                           </div>
                        </div>
                        <button onClick={handleSaveSupervisor} className="w-full bg-blue-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all">Authorize & Create Account</button>
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
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed text-center px-4">
                   Exports include all Guest Profiles, Booking History, Transactions, Room Data, and Global Settings. Restoring will overwrite existing local data.
                </p>
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
                   <button onClick={handleClearBookings} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all">Factory Reset (Wipe Bills & Txs)</button>
                   <p className="text-[9px] font-black text-red-400 uppercase text-center">This will delete all bookings and financial ledger. Rooms and guest database will remain.</p>
                </div>
             </section>
          </div>
        )}

        {activeSubTab === 'TAX' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 animate-in fade-in duration-500">
             <section className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] border shadow-sm space-y-6 md:space-y-8">
                <h3 className="font-black uppercase text-xs text-blue-900 tracking-widest border-b pb-4 md:pb-6">Taxation Profile</h3>
                <Input label="GSTIN Number" value={tempSettings.gstNumber || ''} onChange={v => handleUpdate('gstNumber', v)} />
                <Input label="SAC/HSN Code" value={tempSettings.hsnCode || '9963'} onChange={v => handleUpdate('hsnCode', v)} />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input label="CGST Rate (%)" type="number" value={tempSettings.cgstRate?.toString() || '6'} onChange={v => handleUpdate('cgstRate', parseFloat(v))} />
                  <Input label="SGST Rate (%)" type="number" value={tempSettings.sgstRate?.toString() || '6'} onChange={v => handleUpdate('sgstRate', parseFloat(v))} />
                </div>
                <Input label="IGST Rate (%)" type="number" value={tempSettings.igstRate?.toString() || '12'} onChange={v => handleUpdate('igstRate', parseFloat(v))} />
                
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                   <p className="text-[10px] font-bold text-orange-800 uppercase">Note: CGST + SGST is used for intra-state billing. IGST is used for inter-state billing. These will be itemized in the Tax Invoice.</p>
                </div>
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

        {activeSubTab === 'CLOUD' && (
          <div className="bg-white p-12 rounded-[3rem] border shadow-sm space-y-8 animate-in fade-in duration-500">
             <div className="flex items-center gap-6 border-b pb-8">
               <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl">☁️</div>
               <div>
                 <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Supabase Real-time Cloud</h2>
                 <p className="text-[10px] font-bold text-black uppercase tracking-widest">Multi-terminal Data Synchronization</p>
               </div>
             </div>
             <div className="p-10 bg-blue-50 border-2 border-dashed border-blue-200 rounded-[3rem] space-y-6">
                <p className="text-xs text-black font-black uppercase tracking-tight">Run this SQL in Supabase Editor to initialize/fix full remote database:</p>
                <pre className="bg-white p-6 rounded-2xl border font-mono text-[10px] text-black overflow-x-auto shadow-inner select-all leading-relaxed h-[600px] overflow-y-auto">
{`-- HOTELSPHERE PRO: ABSOLUTE MASTER SETUP SCRIPT --
-- RUN THIS IN SUPABASE SQL EDITOR TO RESOLVE SCHEMA MISMATCH ERRORS --

-- 1. TABLES CONSTRUCTION --
CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, number TEXT, floor INT, type TEXT, price NUMERIC, status TEXT, "currentBookingId" TEXT);

CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY, 
    name TEXT, 
    "surName" TEXT,
    "givenName" TEXT,
    gender TEXT,
    dob TEXT,
    phone TEXT, 
    email TEXT, 
    address TEXT, 
    city TEXT, 
    state TEXT, 
    nationality TEXT, 
    "idType" TEXT,
    "idNumber" TEXT, 
    adults INT DEFAULT 1, 
    children INT DEFAULT 0, 
    kids INT DEFAULT 0, 
    others INT DEFAULT 0, 
    gstin TEXT,
    country TEXT,
    "passportNo" TEXT,
    "passportPlaceOfIssue" TEXT,
    "passportDateOfIssue" TEXT,
    "passportDateOfExpiry" TEXT,
    "visaNo" TEXT,
    "visaType" TEXT,
    "visaPlaceOfIssue" TEXT,
    "visaDateOfIssue" TEXT,
    "visaDateOfExpiry" TEXT,
    "embassyCountry" TEXT,
    "arrivalFrom" TEXT,
    "nextDestination" TEXT,
    "arrivalInIndiaDate" TEXT,
    "stayDurationIndia" TEXT,
    "purposeOfVisit" TEXT,
    "employedInIndia" BOOLEAN,
    "contactInIndia" TEXT,
    "cellInIndia" TEXT,
    "residingCountryContact" TEXT,
    "addressInIndia" TEXT,
    "applicationId" TEXT,
    remarks TEXT,
    documents JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, 
    "bookingNo" TEXT, 
    "roomId" TEXT, 
    "guestId" TEXT, 
    "groupId" TEXT, 
    "checkInDate" TEXT, 
    "checkInTime" TEXT, 
    "checkOutDate" TEXT, 
    "checkOutTime" TEXT, 
    status TEXT, 
    charges JSONB DEFAULT '[]'::jsonb, 
    payments JSONB DEFAULT '[]'::jsonb, 
    "basePrice" NUMERIC, 
    discount NUMERIC DEFAULT 0, 
    adults INT,
    children INT,
    kids INT,
    others INT,
    "mealPlan" TEXT, 
    agent TEXT, 
    purpose TEXT, 
    company TEXT,
    occupants JSONB DEFAULT '[]'::jsonb,
    "secondaryGuest" JSONB
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, 
    date TEXT, 
    type TEXT, 
    "accountGroup" TEXT, 
    ledger TEXT, 
    amount NUMERIC, 
    "entityName" TEXT, 
    description TEXT, 
    "referenceId" TEXT
);

CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY, 
    "groupName" TEXT, 
    "groupType" TEXT, 
    "headName" TEXT, 
    phone TEXT, 
    email TEXT, 
    "orgName" TEXT, 
    "gstNumber" TEXT, 
    "billingPreference" TEXT, 
    documents JSONB DEFAULT '{}'::jsonb, 
    status TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY, 
    name TEXT, 
    address TEXT, 
    agents JSONB DEFAULT '[]'::jsonb, 
    "roomTypes" JSONB DEFAULT '[]'::jsonb,
    "gstNumber" TEXT,
    "taxRate" NUMERIC DEFAULT 12,
    "cgstRate" NUMERIC DEFAULT 6,
    "sgstRate" NUMERIC DEFAULT 6,
    "igstRate" NUMERIC DEFAULT 12,
    "hsnCode" TEXT DEFAULT '9963',
    "upiId" TEXT,
    "adminPassword" TEXT DEFAULT 'admin',
    "receptionistPassword" TEXT DEFAULT 'receptionist',
    "accountantPassword" TEXT DEFAULT 'accountant',
    "supervisorPassword" TEXT DEFAULT 'supervisor',
    logo TEXT,
    signature TEXT
);

CREATE TABLE IF NOT EXISTS supervisors (
    id TEXT PRIMARY KEY,
    name TEXT,
    "loginId" TEXT,
    password TEXT,
    "assignedRoomIds" JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'ACTIVE',
    "lastActive" TEXT
);

CREATE TABLE IF NOT EXISTS "shiftLogs" (id TEXT PRIMARY KEY, "bookingId" TEXT, "guestName" TEXT, "fromRoom" TEXT, "toRoom" TEXT, date TEXT, reason TEXT);
CREATE TABLE IF NOT EXISTS "cleaningLogs" (id TEXT PRIMARY KEY, "roomId" TEXT, date TEXT, "staffName" TEXT);
CREATE TABLE IF NOT EXISTS quotations (id TEXT PRIMARY KEY, date TEXT, "guestName" TEXT, amount NUMERIC, remarks TEXT);

-- 2. SCHEMA MIGRATION / RECOVERY --
-- Run these if tables already exist but required columns are reported missing --

ALTER TABLE guests ADD COLUMN IF NOT EXISTS "surName" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "givenName" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "dob" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "passportNo" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "passportPlaceOfIssue" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "passportDateOfIssue" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "passportDateOfExpiry" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "visaNo" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "visaType" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "visaPlaceOfIssue" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "visaDateOfIssue" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "visaDateOfExpiry" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "embassyCountry" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "arrivalFrom" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "nextDestination" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "arrivalInIndiaDate" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "stayDurationIndia" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "purposeOfVisit" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "employedInIndia" BOOLEAN;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "contactInIndia" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "cellInIndia" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "residingCountryContact" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "addressInIndia" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "applicationId" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS remarks TEXT;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS adults INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS children INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS kids INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS others INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "mealPlan" TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agent TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS occupants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "secondaryGuest" JSONB;

-- 3. SECURITY POLICIES (RLS) --
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shiftLogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cleaningLogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- CLEAN UP EXISTING POLICIES TO AVOID DUPLICATES --
DROP POLICY IF EXISTS "AllowAll" ON rooms;
DROP POLICY IF EXISTS "AllowAll" ON guests;
DROP POLICY IF EXISTS "AllowAll" ON bookings;
DROP POLICY IF EXISTS "AllowAll" ON transactions;
DROP POLICY IF EXISTS "AllowAll" ON groups;
DROP POLICY IF EXISTS "AllowAll" ON settings;
DROP POLICY IF EXISTS "AllowAll" ON supervisors;
DROP POLICY IF EXISTS "AllowAll" ON "shiftLogs";
DROP POLICY IF EXISTS "AllowAll" ON "cleaningLogs";
DROP POLICY IF EXISTS "AllowAll" ON quotations;

CREATE POLICY "AllowAll" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "AllowAll" ON guests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "AllowAll" ON bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "AllowAll" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "AllowAll" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "AllowAll" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "AllowAll" ON supervisors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "AllowAll" ON "shiftLogs" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "AllowAll" ON "cleaningLogs" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "AllowAll" ON quotations FOR ALL USING (true) WITH CHECK (true);

-- 4. CACHE REFRESH --
NOTIFY pgrst, 'reload schema';`}
                </pre>
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
