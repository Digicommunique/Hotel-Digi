
import React, { useState, useMemo, useEffect } from 'react';
import { Booking, Guest, Room, Charge, Payment, RoomStatus, Transaction } from '../types.ts';
import CameraCapture from './CameraCapture.tsx';

interface StayManagementProps {
  booking: Booking;
  guest: Guest;
  room: Room;
  allRooms: Room[];
  allBookings: Booking[];
  settings: any;
  onUpdate: (booking: Booking) => void;
  onAddPayment: (payment: Payment) => void;
  onUpdateGuest: (guest: Guest) => void;
  onShiftRoom: () => void;
  onClose: () => void;
}

const StayManagement: React.FC<StayManagementProps> = ({ 
  booking, guest, room, settings, onUpdate, onAddPayment, onUpdateGuest, onClose 
}) => {
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newCharge, setNewCharge] = useState({ description: '', amount: '' });
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'Cash', remarks: '' });

  const totals = useMemo(() => {
    const totalCharges = (booking.charges || []).reduce((sum, c) => sum + c.amount, 0);
    const totalPayments = (booking.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const roomRent = booking.basePrice || 0;
    const balance = (roomRent + totalCharges) - totalPayments;
    return { totalCharges, totalPayments, roomRent, balance };
  }, [booking]);

  const handleAddCharge = () => {
    const charge: Charge = {
      id: Math.random().toString(36).substr(2, 9),
      description: newCharge.description,
      amount: parseFloat(newCharge.amount) || 0,
      date: new Date().toISOString()
    };
    onUpdate({ ...booking, charges: [...(booking.charges || []), charge] });
    setShowAddCharge(false);
    setNewCharge({ description: '', amount: '' });
  };

  const handlePostPayment = () => {
    const payment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      amount: parseFloat(newPayment.amount) || 0,
      date: new Date().toISOString(),
      method: newPayment.method,
      remarks: newPayment.remarks
    };
    onAddPayment(payment);
    setShowAddPayment(false);
    setNewPayment({ amount: '', method: 'Cash', remarks: '' });
  };

  const handleCheckout = () => {
    if (totals.balance > 0) {
      if (!confirm(`Warning: Pending balance of ₹${totals.balance.toFixed(2)}. Proceed with checkout and mark room as dirty?`)) return;
    }
    onUpdate({ ...booking, status: 'COMPLETED' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-7xl h-[95vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        {/* Header Management Bar */}
        <div className="bg-[#003d80] p-10 text-white flex justify-between items-start no-print">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <span className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">In-House Resident Hub</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Unit {room.number} &bull; Registry No: {booking.bookingNo}</span>
            </div>
            <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{guest.name}</h2>
            <p className="text-[11px] font-bold text-blue-200 uppercase tracking-[0.2em] mt-4">{guest.phone} &bull; {guest.state} &bull; Arrival: {booking.checkInDate} {booking.checkInTime}</p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-6 rounded-3xl hover:bg-white/20 transition-all font-black uppercase text-xs tracking-widest">Exit Management</button>
        </div>

        <div className="flex-1 overflow-y-auto p-12 grid grid-cols-1 lg:grid-cols-4 gap-12 custom-scrollbar invoice-sheet">
          <div className="lg:col-span-3 space-y-12">
            <section className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-8 no-print">
                <h3 className="font-black text-blue-900 uppercase text-sm border-l-8 border-blue-600 pl-6 tracking-widest">Resident Folio Ledger</h3>
                <button onClick={() => setShowAddCharge(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-all">+ Add Service Charge</button>
              </div>
              <div className="border rounded-3xl overflow-hidden border-slate-100">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 uppercase font-black text-slate-400">
                    <tr><th className="p-6">Trans Date</th><th className="p-6">Particulars / Narrative</th><th className="p-6 text-right">Debit (₹)</th><th className="p-6 text-right">Credit (₹)</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold uppercase text-slate-700">
                    <tr className="bg-blue-50/20">
                      <td className="p-6">{booking.checkInDate}</td>
                      <td className="p-6">Daily Occupancy Rent - {room.type}</td>
                      <td className="p-6 text-right font-black">₹{booking.basePrice.toFixed(2)}</td>
                      <td className="p-6 text-right">-</td>
                    </tr>
                    {(booking.charges || []).map(c => (
                      <tr key={c.id}>
                        <td className="p-6">{new Date(c.date).toLocaleDateString('en-GB')}</td>
                        <td className="p-6">{c.description}</td>
                        <td className="p-6 text-right font-black">₹{c.amount.toFixed(2)}</td>
                        <td className="p-6 text-right">-</td>
                      </tr>
                    ))}
                    {(booking.payments || []).map(p => (
                      <tr key={p.id} className="bg-green-50/20">
                        <td className="p-6">{new Date(p.date).toLocaleDateString('en-GB')}</td>
                        <td className="p-6">Settlement Receipt ({p.method})</td>
                        <td className="p-6 text-right">-</td>
                        <td className="p-6 text-right text-green-600 font-black">₹{p.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-black border-t-2">
                    <tr>
                      <td colSpan={3} className="p-6 text-right uppercase opacity-40">Folio Balance Due</td>
                      <td className="p-6 text-right text-2xl text-blue-900">₹{totals.balance.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>

          {/* Controls Sidebar */}
          <div className="space-y-8 no-print">
            <div className="bg-[#003d80] p-12 rounded-[4rem] text-white shadow-2xl space-y-8 relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-2">Net Financial Position</p>
                <h3 className="text-5xl font-black tracking-tighter">₹{totals.balance.toFixed(2)}</h3>
              </div>
              <div className="space-y-4 relative z-10">
                <button onClick={() => setShowAddPayment(true)} className="w-full bg-white text-blue-900 py-5 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Settle & Receipt</button>
                <button onClick={() => window.print()} className="w-full bg-blue-800 text-white py-5 rounded-3xl font-black uppercase text-[11px] tracking-widest border border-blue-700 hover:bg-blue-700 transition-all">Print Tax Invoice</button>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 space-y-4 shadow-sm">
              <h4 className="font-black text-[9px] uppercase text-slate-300 tracking-[0.3em] text-center mb-4">Operations Console</h4>
              <button onClick={handleCheckout} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-orange-600 transition-all">Execute Checkout</button>
              <button className="w-full py-4 border-2 border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:border-blue-600 hover:text-blue-600 transition-all">Move Resident (Shift)</button>
              <button className="w-full py-2 text-red-400 font-black uppercase text-[9px] hover:text-red-600 transition-colors">Void Active Folio</button>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Modals */}
      {showAddCharge && (
        <FolioModal title="Post Service Charge" onClose={() => setShowAddCharge(false)}>
          <div className="space-y-6">
            <FolioInput label="Service Narrative" value={newCharge.description} onChange={(v: string) => setNewCharge({...newCharge, description: v})} />
            <FolioInput label="Service Amount (₹)" type="number" value={newCharge.amount} onChange={(v: string) => setNewCharge({...newCharge, amount: v})} />
            <button onClick={handleAddCharge} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">Post to Folio</button>
          </div>
        </FolioModal>
      )}

      {showAddPayment && (
        <FolioModal title="Post Payment Receipt" onClose={() => setShowAddPayment(false)}>
          <div className="space-y-6">
            <FolioInput label="Collection Amount (₹)" type="number" value={newPayment.amount} onChange={(v: string) => setNewPayment({...newPayment, amount: v})} />
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Settlement Method</label>
              <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50 outline-none focus:border-blue-500 transition-all" value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}>
                <option value="Cash">Cash Account</option>
                <option value="UPI">UPI / Digital Gateway</option>
                <option value="Card">Terminal / Card Payment</option>
                <option value="Bank">Direct NEFT / RTGS</option>
              </select>
            </div>
            <FolioInput label="Internal Remarks" value={newPayment.remarks} onChange={(v: string) => setNewPayment({...newPayment, remarks: v})} />
            <button onClick={handlePostPayment} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-green-700 transition-all">Acknowledge Receipt</button>
          </div>
        </FolioModal>
      )}
    </div>
  );
};

const FolioModal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 z-[100] bg-slate-900/80 flex items-center justify-center p-4">
    <div className="bg-white rounded-[4rem] w-full max-w-md overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
      <div className="bg-slate-900 p-10 text-white text-center">
        <h2 className="text-xl font-black uppercase tracking-widest">{title}</h2>
      </div>
      <div className="p-12">{children}</div>
      <button onClick={onClose} className="w-full py-5 text-slate-300 font-black uppercase text-[10px] hover:text-slate-900 border-t transition-colors">Abort Action</button>
    </div>
  </div>
);

const FolioInput = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{label}</label>
    <input 
      type={type} 
      className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50 focus:bg-white focus:border-blue-500 transition-all outline-none" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

export default StayManagement;
