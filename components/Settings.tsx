
import React, { useState, useEffect } from 'react';
import { HostelSettings, Room, AgentConfig, RoomStatus } from '../types.ts';
import { exportDatabase } from '../services/db.ts';

interface SettingsProps {
  settings: HostelSettings;
  setSettings: (settings: HostelSettings) => void;
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, rooms, setRooms }) => {
  const [activeSubTab, setActiveSubTab] = useState<'GENERAL' | 'ROOMS' | 'AGENTS' | 'SECURITY'>('GENERAL');
  const [tempSettings, setTempSettings] = useState<HostelSettings>(settings);
  const [newRoom, setNewRoom] = useState<Partial<Room>>({ number: '', floor: 1, type: settings.roomTypes[0] || '', price: 0 });

  useEffect(() => { setTempSettings(settings); }, [settings]);

  const handleUpdate = (field: keyof HostelSettings, value: any) => {
    const updated = { ...tempSettings, [field]: value };
    setTempSettings(updated);
    setSettings(updated);
  };

  const addRoom = () => {
    if (!newRoom.number) return alert("Room number required");
    const r = { ...newRoom, id: Date.now().toString(), status: RoomStatus.VACANT } as Room;
    setRooms([...rooms, r]);
    setNewRoom({...newRoom, number: ''});
  };

  return (
    <div className="p-6 bg-[#f8fafc] min-h-full pb-20 text-black">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-2 rounded-2xl border shadow-sm sticky top-2 z-10">
          <div className="flex gap-1">
            <SubTab active={activeSubTab === 'GENERAL'} label="Profile" onClick={() => setActiveSubTab('GENERAL')} />
            <SubTab active={activeSubTab === 'ROOMS'} label="Inventory" onClick={() => setActiveSubTab('ROOMS')} />
            <SubTab active={activeSubTab === 'AGENTS'} label="Agents" onClick={() => setActiveSubTab('AGENTS')} />
            <SubTab active={activeSubTab === 'SECURITY'} label="Security" onClick={() => setActiveSubTab('SECURITY')} />
          </div>
        </div>

        {activeSubTab === 'GENERAL' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Branding & Billing</h3>
              <Input label="Business Name" value={tempSettings.name} onChange={v => handleUpdate('name', v)} />
              <Input label="GSTIN Number" value={tempSettings.gstNumber || ''} onChange={v => handleUpdate('gstNumber', v)} />
              <Input label="UPI ID for Payments" value={tempSettings.upiId || ''} onChange={v => handleUpdate('upiId', v)} />
              <Input label="Default Tax Rate (%)" type="number" value={tempSettings.taxRate?.toString() || '12'} onChange={v => handleUpdate('taxRate', parseFloat(v))} />
            </section>
            <section className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Data Management</h3>
              <button onClick={exportDatabase} className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg">Download Data Backup</button>
            </section>
          </div>
        )}

        {activeSubTab === 'ROOMS' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <section className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Inventory Enrollment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                <Input label="Room No." value={newRoom.number || ''} onChange={v => setNewRoom({...newRoom, number: v})} />
                <Input label="Floor Level" type="number" value={newRoom.floor?.toString() || '1'} onChange={v => setNewRoom({...newRoom, floor: parseInt(v) || 1})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400">Category</label>
                  <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50" value={newRoom.type} onChange={e => setNewRoom({...newRoom, type: e.target.value})}>
                    {tempSettings.roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <Input label="Rate/Day" value={newRoom.price?.toString() || ''} onChange={v => setNewRoom({...newRoom, price: parseFloat(v) || 0})} />
                <button onClick={addRoom} className="bg-blue-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg uppercase">Add Room</button>
              </div>
            </section>
            
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
               <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase font-black">
                     <tr><th className="p-5">Floor</th><th className="p-5">Room</th><th className="p-5">Type</th><th className="p-5 text-right">Rate</th><th className="p-5 text-center">Action</th></tr>
                  </thead>
                  <tbody className="divide-y font-bold text-black uppercase">
                     {rooms.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-5">{r.floor}</td>
                           <td className="p-5 font-black text-lg">{r.number}</td>
                           <td className="p-5">{r.type}</td>
                           <td className="p-5 text-right font-black">₹{r.price}</td>
                           <td className="p-5 text-center"><button onClick={() => setRooms(rooms.filter(rm => rm.id !== r.id))} className="text-red-500 text-[9px] font-black">Remove</button></td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeSubTab === 'SECURITY' && (
          <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6 animate-in fade-in duration-500">
             <h3 className="font-black uppercase text-xs tracking-widest border-b pb-4">Authentication Security</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Master Admin Password" type="password" value={tempSettings.adminPassword || ''} onChange={v => handleUpdate('adminPassword', v)} />
                <Input label="Receptionist Password" type="password" value={tempSettings.receptionistPassword || ''} onChange={v => handleUpdate('receptionistPassword', v)} />
                <Input label="Accountant Password" type="password" value={tempSettings.accountantPassword || ''} onChange={v => handleUpdate('accountantPassword', v)} />
                <Input label="Supervisor Password" type="password" value={tempSettings.supervisorPassword || ''} onChange={v => handleUpdate('supervisorPassword', v)} />
             </div>
             <div className="p-4 bg-blue-50 text-[10px] font-bold text-blue-900 uppercase leading-relaxed rounded-xl border border-blue-100">
                Note: Individual passwords allow staff to access only their assigned panels. The Master Admin password can bypass all panels.
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
