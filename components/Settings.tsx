
import React, { useState, useEffect } from 'react';
import { HostelSettings, Room, AgentConfig, RoomStatus } from '../types.ts';
import { exportDatabase, db } from '../services/db.ts';

interface SettingsProps {
  settings: HostelSettings;
  setSettings: (settings: HostelSettings) => void;
  rooms: Room[];
  setRooms: (rooms: Room[]) => Promise<any>;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, rooms, setRooms }) => {
  const [activeSubTab, setActiveSubTab] = useState<'GENERAL' | 'ROOMS' | 'AGENTS' | 'TAX' | 'SECURITY' | 'CLOUD' | 'MAINTENANCE'>('GENERAL');
  const [tempSettings, setTempSettings] = useState<HostelSettings>(settings);
  const [newRoom, setNewRoom] = useState<Partial<Room>>({ 
    number: '', 
    floor: 1, 
    type: settings.roomTypes[0] || '', 
    price: 0,
    status: RoomStatus.VACANT 
  });
  const [newRoomType, setNewRoomType] = useState('');
  const [newAgent, setNewAgent] = useState<AgentConfig>({ name: '', commission: 0 });

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
      reader.onloadend = () => {
        handleUpdate(key, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addRoom = async () => {
    if (!newRoom.number) return alert("Room number required");
    const r = { ...newRoom, id: Date.now().toString(), status: newRoom.status || RoomStatus.VACANT } as Room;
    await setRooms([...rooms, r]);
    setNewRoom({...newRoom, number: '', floor: newRoom.floor}); 
  };

  const addAgent = () => {
    if (!newAgent.name) return;
    handleUpdate('agents', [...(tempSettings.agents || []), newAgent]);
    setNewAgent({ name: '', commission: 0 });
  };

  const addRoomType = () => {
    if (!newRoomType) return;
    handleUpdate('roomTypes', [...tempSettings.roomTypes, newRoomType]);
    setNewRoomType('');
  };

  const handleClearHistory = async () => {
    if (confirm("⚠️ DANGER: This will delete all Guest Records, Bookings, Transactions, and Payments. Rooms and Settings will be preserved. Proceed?")) {
      if (confirm("FINAL CONFIRMATION: Are you absolutely sure you want to clear all transactional history? This cannot be undone.")) {
        try {
          await Promise.all([
            db.bookings.clear(),
            db.guests.clear(),
            db.transactions.clear(),
            db.shiftLogs.clear(),
            db.cleaningLogs.clear(),
            db.quotations.clear(),
            db.groups.clear()
          ]);
          const resetRooms = rooms.map(r => ({ ...r, status: RoomStatus.VACANT, currentBookingId: undefined }));
          await setRooms(resetRooms);
          alert("History cleared successfully. The application will now reload.");
          window.location.reload();
        } catch (e) {
          console.error("Failed to clear history:", e);
          alert("An error occurred during cleanup. Please check console.");
        }
      }
    }
  };

  const handleFactoryReset = async () => {
    if (confirm("🔴 CRITICAL: This will delete EVERYTHING including Rooms, Settings, and all Data. The app will return to its initial state. Proceed?")) {
      try {
        await (db as any).delete();
        alert("Full System Reset complete. Reloading...");
        window.location.reload();
      } catch (e) {
        console.error("Factory reset failed:", e);
        alert("System reset failed. You might need to clear browser site data manually.");
      }
    }
  };

  const handleResetRoomStatuses = async () => {
     if (confirm("Reset all occupied/dirty rooms to Vacant? This might cause data mismatch if active bookings exist.")) {
        const resetRooms = rooms.map(r => ({ ...r, status: RoomStatus.VACANT, currentBookingId: undefined }));
        await setRooms(resetRooms);
        alert("All units marked as VACANT.");
     }
  };

  return (
    <div className="p-6 bg-[#f8fafc] min-h-full pb-20 text-black">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-2 rounded-2xl border shadow-sm sticky top-2 z-10 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1">
            <SubTab active={activeSubTab === 'GENERAL'} label="Property" onClick={() => setActiveSubTab('GENERAL')} />
            <SubTab active={activeSubTab === 'ROOMS'} label="Inventory" onClick={() => setActiveSubTab('ROOMS')} />
            <SubTab active={activeSubTab === 'AGENTS'} label="Agents" onClick={() => setActiveSubTab('AGENTS')} />
            <SubTab active={activeSubTab === 'TAX'} label="Taxation" onClick={() => setActiveSubTab('TAX')} />
            <SubTab active={activeSubTab === 'SECURITY'} label="Security" onClick={() => setActiveSubTab('SECURITY')} />
            <SubTab active={activeSubTab === 'CLOUD'} label="Cloud Sync" onClick={() => setActiveSubTab('CLOUD')} />
            <SubTab active={activeSubTab === 'MAINTENANCE'} label="Maintenance" onClick={() => setActiveSubTab('MAINTENANCE')} />
          </div>
        </div>

        {activeSubTab === 'GENERAL' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Business Profile</h3>
              <Input label="Hostel / Hotel Name" value={tempSettings.name} onChange={v => handleUpdate('name', v)} />
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Address</label>
                <textarea 
                  className="w-full border-2 p-4 rounded-2xl font-bold text-black h-24 outline-none transition-all bg-gray-50 focus:bg-white focus:border-blue-500 shadow-inner resize-none text-xs" 
                  value={tempSettings.address} 
                  onChange={e => handleUpdate('address', e.target.value)}
                />
              </div>
              <Input label="UPI ID (for Payments)" value={tempSettings.upiId || ''} onChange={v => handleUpdate('upiId', v)} />
            </section>

            <section className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Branding & Authority</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Property Logo</label>
                  <div className="relative aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 transition-all group">
                    {tempSettings.logo ? (
                      <>
                        <img src={tempSettings.logo} className="w-full h-full object-contain p-2" />
                        <button onClick={() => handleUpdate('logo', undefined)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z"/></svg>
                        <span className="text-[8px] font-black uppercase text-gray-400 block">Upload Logo</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, 'logo')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Authorized Sign</label>
                  <div className="relative aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 transition-all group">
                    {tempSettings.signature ? (
                      <>
                        <img src={tempSettings.signature} className="w-full h-full object-contain p-2" />
                        <button onClick={() => handleUpdate('signature', undefined)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        <span className="text-[8px] font-black uppercase text-gray-400 block">Upload Signature</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, 'signature')} />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                 <p className="text-[9px] font-bold text-blue-700 uppercase leading-relaxed text-center">
                   Logo appears in the header of invoices and reports. Signature appears at the bottom of tax invoices.
                 </p>
              </div>
            </section>
          </div>
        )}

        {activeSubTab === 'MAINTENANCE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-3xl border border-red-100 shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b border-red-50 text-red-600 pb-4">Transactional Cleanup</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                Use these tools to clear old records like bookings, guest history, and billing while keeping your room inventory and settings intact.
              </p>
              <div className="space-y-3">
                <button onClick={handleClearHistory} className="w-full bg-red-50 text-red-600 border border-red-200 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all shadow-sm">
                  Clear All History (Bookings, Bills, Guests)
                </button>
                <button onClick={handleResetRoomStatuses} className="w-full bg-orange-50 text-orange-600 border border-orange-200 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-orange-600 hover:text-white transition-all shadow-sm">
                  Reset All Rooms to VACANT
                </button>
              </div>
            </section>

            <section className="bg-white p-8 rounded-3xl border border-black shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Danger Zone</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                Wipe the entire system to a blank state. This deletes everything including your property profile and room formation.
              </p>
              <button onClick={handleFactoryReset} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-red-700 transition-all">
                Full Factory Reset
              </button>
              <div className="mt-4 p-4 bg-gray-50 rounded-xl text-[9px] font-black text-slate-400 uppercase text-center border">
                Note: Ensure you have a backup before proceeding.
              </div>
            </section>
          </div>
        )}

        {activeSubTab === 'TAX' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Tax Configuration</h3>
              <Input label="GSTIN Number" value={tempSettings.gstNumber || ''} onChange={v => handleUpdate('gstNumber', v)} />
              <Input label="HSN Code" value={tempSettings.hsnCode || '9963'} onChange={v => handleUpdate('hsnCode', v)} />
              <Input label="Default Tax Rate (%)" type="number" value={tempSettings.taxRate?.toString() || '12'} onChange={v => handleUpdate('taxRate', parseFloat(v))} />
            </section>
          </div>
        )}

        {activeSubTab === 'AGENTS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Booking Agents</h3>
              <div className="flex gap-2">
                <input className="flex-1 border-2 p-3 rounded-xl font-bold text-xs bg-gray-50 outline-none focus:border-blue-500 text-black" placeholder="Agent Name" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} />
                <input className="w-24 border-2 p-3 rounded-xl font-bold text-xs bg-gray-50 outline-none focus:border-blue-500 text-black" placeholder="Comm %" type="number" value={newAgent.commission} onChange={e => setNewAgent({...newAgent, commission: parseFloat(e.target.value) || 0})} />
                <button onClick={addAgent} className="bg-blue-600 text-white px-6 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-all">Add</button>
              </div>
              <div className="space-y-2 mt-4">
                {tempSettings.agents?.map(a => (
                  <div key={a.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border group">
                    <span className="font-black text-xs uppercase text-black">{a.name} <span className="text-blue-500 ml-2">({a.commission}%)</span></span>
                  </div>
                ))}
              </div>
            </section>
            <section className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Categories</h3>
              <div className="flex gap-2">
                <input className="flex-1 border-2 p-3 rounded-xl font-bold text-xs bg-gray-50 outline-none focus:border-blue-500 text-black" placeholder="New Category" value={newRoomType} onChange={e => setNewRoomType(e.target.value)} />
                <button onClick={addRoomType} className="bg-blue-600 text-white px-6 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-all">Create</button>
              </div>
            </section>
          </div>
        )}

        {activeSubTab === 'ROOMS' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Inventory Enrollment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                <Input label="Room No." value={newRoom.number || ''} onChange={v => setNewRoom({...newRoom, number: v})} />
                <Input label="Floor Level" type="number" value={newRoom.floor?.toString() || '1'} onChange={v => setNewRoom({...newRoom, floor: parseInt(v) || 1})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">Category</label>
                  <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 outline-none focus:border-blue-500" value={newRoom.type} onChange={e => setNewRoom({...newRoom, type: e.target.value})}>
                    {tempSettings.roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <Input label="Rate/Day" value={newRoom.price?.toString() || ''} onChange={v => setNewRoom({...newRoom, price: parseFloat(v) || 0})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">Initial Status</label>
                  <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 outline-none focus:border-blue-500" value={newRoom.status} onChange={e => setNewRoom({...newRoom, status: e.target.value as RoomStatus})}>
                    <option value={RoomStatus.VACANT}>VACANT (Ready)</option>
                    <option value={RoomStatus.REPAIR}>REPAIR (Maintenance)</option>
                    <option value={RoomStatus.DIRTY}>DIRTY (Needs Service)</option>
                    <option value={RoomStatus.MANAGEMENT}>MANAGEMENT BLOCK</option>
                  </select>
                </div>
                <button onClick={addRoom} className="bg-blue-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg uppercase mb-0.5">Add Unit</button>
              </div>
            </section>
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
               <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase font-black">
                     <tr>
                        <th className="p-5">Floor</th>
                        <th className="p-5">Room</th>
                        <th className="p-5">Type</th>
                        <th className="p-5">Status</th>
                        <th className="p-5 text-right">Rate</th>
                        <th className="p-5 text-center">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y font-bold text-black uppercase">
                     {rooms.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-5">{r.floor}</td>
                           <td className="p-5 font-black text-lg">{r.number}</td>
                           <td className="p-5">{r.type}</td>
                           <td className="p-5">
                             <span className={`px-3 py-1 rounded-full text-[9px] font-black border border-current ${r.status === RoomStatus.VACANT ? 'text-green-500' : r.status === RoomStatus.REPAIR ? 'text-amber-800' : 'text-blue-500'}`}>
                                {r.status}
                             </span>
                           </td>
                           <td className="p-5 text-right font-black">₹{r.price}</td>
                           <td className="p-5 text-center"><button onClick={() => setRooms(rooms.filter(rm => rm.id !== r.id))} className="text-red-500 text-[9px] font-black hover:underline">Delete</button></td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeSubTab === 'SECURITY' && (
          <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6 animate-in fade-in duration-500">
             <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-black uppercase text-xs tracking-widest">Auth Security Console</h3>
                <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full">All Passwords Visible to Admin</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Admin Password" type="text" value={tempSettings.adminPassword || ''} onChange={v => handleUpdate('adminPassword', v)} />
                <Input label="Reception Password" type="text" value={tempSettings.receptionistPassword || ''} onChange={v => handleUpdate('receptionistPassword', v)} />
                <Input label="Accountant Password" type="text" value={tempSettings.accountantPassword || ''} onChange={v => handleUpdate('accountantPassword', v)} />
                <Input label="Supervisor Password" type="text" value={tempSettings.supervisorPassword || ''} onChange={v => handleUpdate('supervisorPassword', v)} />
             </div>
          </div>
        )}

        {activeSubTab === 'CLOUD' && (
          <div className="bg-white p-12 rounded-[3rem] border shadow-sm space-y-8 animate-in fade-in duration-500">
             <div className="flex items-center gap-6 border-b pb-8">
               <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl">☁️</div>
               <div>
                 <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Cloud Synchronization</h2>
                 <p className="text-[10px] font-bold text-black uppercase tracking-widest">Real-time backup to Supabase</p>
               </div>
             </div>
             
             {/* MASTER SQL SETUP SECTION */}
             <div className="p-10 bg-blue-50 border-2 border-dashed border-blue-200 rounded-[3rem] space-y-6">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-black">!</div>
                   <div>
                      <h3 className="text-sm font-black text-blue-900 uppercase">Master SQL Setup Script</h3>
                      <p className="text-[10px] font-bold text-blue-400 uppercase">Run this in your Supabase SQL Editor to build all tables</p>
                   </div>
                </div>
                <pre className="bg-white p-6 rounded-2xl border font-mono text-[9px] text-black overflow-x-auto shadow-inner select-all leading-relaxed h-80 overflow-y-auto custom-scrollbar">
{`-- HOTELSPHERE PRO: MASTER SUPABASE SCHEMA SETUP --

-- 1. Create Tables (If Not Exists)
CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, number TEXT, floor INT, type TEXT, price NUMERIC, status TEXT, "currentBookingId" TEXT);
CREATE TABLE IF NOT EXISTS guests (id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, address TEXT, city TEXT, state TEXT, nationality TEXT, "idNumber" TEXT, adults INT, children INT, kids INT, others INT, documents JSONB);
CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, "bookingNo" TEXT, "roomId" TEXT, "guestId" TEXT, "groupId" TEXT, "checkInDate" TEXT, "checkInTime" TEXT, "checkOutDate" TEXT, "checkOutTime" TEXT, status TEXT, charges JSONB, payments JSONB, "basePrice" NUMERIC, discount NUMERIC, mealPlan TEXT, agent TEXT, purpose TEXT, company TEXT);
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, date TEXT, type TEXT, "accountGroup" TEXT, ledger TEXT, amount NUMERIC, "entityName" TEXT, description TEXT, "referenceId" TEXT);
CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, "groupName" TEXT, "groupType" TEXT, "headName" TEXT, phone TEXT, email TEXT, "orgName" TEXT, "gstNumber" TEXT, "billingPreference" TEXT, documents JSONB, status TEXT);
CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, name TEXT, address TEXT, agents JSONB, "roomTypes" JSONB);
CREATE TABLE IF NOT EXISTS "shiftLogs" (id TEXT PRIMARY KEY, "bookingId" TEXT, "guestName" TEXT, "fromRoom" TEXT, "toRoom" TEXT, date TEXT, reason TEXT);
CREATE TABLE IF NOT EXISTS "cleaningLogs" (id TEXT PRIMARY KEY, "roomId" TEXT, date TEXT, "staffName" TEXT);
CREATE TABLE IF NOT EXISTS quotations (id TEXT PRIMARY KEY, date TEXT, "guestName" TEXT, amount NUMERIC, remarks TEXT);

-- 2. Ensure Extended Columns Exist (Fix for sync errors)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "surName" TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS "givenName" TEXT;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "secondaryGuest" JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "adults" INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "children" INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "kids" INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "others" INT;

ALTER TABLE settings ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "signature" TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "gstNumber" TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "taxRate" NUMERIC;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "hsnCode" TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "upiId" TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "adminPassword" TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "receptionistPassword" TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "accountantPassword" TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "supervisorPassword" TEXT;

-- 3. Refresh PostgREST Schema Cache (MANDATORY)
NOTIFY pgrst, 'reload schema';`}
                </pre>
                <p className="text-[9px] font-bold text-blue-400 uppercase text-center">
                   Copy the entire block above and run it in the <b>Supabase SQL Editor</b> to resolve all schema cache errors.
                </p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SubTab: React.FC<{ active: boolean, label: string, onClick: () => void }> = ({ active, label, onClick }) => (
  <button onClick={onClick} className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${active ? 'bg-blue-900 text-white shadow-lg' : 'text-black hover:bg-gray-50'}`}>{label}</button>
);

const Input: React.FC<{ label: string, value: string, onChange: (v: string) => void, type?: string }> = ({ label, value, onChange, type = "text" }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-2">{label}</label>
    <input type={type} className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 focus:bg-white focus:border-blue-500 shadow-inner text-black" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default Settings;
