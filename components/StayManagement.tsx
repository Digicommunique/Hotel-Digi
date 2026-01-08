
import React, { useState, useMemo } from 'react';
import { Booking, Guest, Room, Charge, Payment, RoomStatus, Transaction } from '../types.ts';
import InvoiceView from './InvoiceView.tsx';

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
  onShiftRoom: (newRoomId: string) => void;
  onClose: () => void;
}

const StayManagement: React.FC<StayManagementProps> = ({ 
  booking, guest, room, allRooms, settings, onUpdate, onAddPayment, onUpdateGuest, onShiftRoom, onClose 
}) => {
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showRoomShift, setShowRoomShift] = useState(false);
  const [showExtension, setShowExtension] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showLiveQR, setShowLiveQR] = useState(false);
  
  const [newCharge, setNewCharge] = useState({ description: '', amount: '' });
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'Cash', remarks: '' });
  const [newCheckOut, setNewCheckOut] = useState(booking.checkOutDate);

  const totals = useMemo(() => {
    const totalCharges = (booking.charges || []).reduce((sum, c) => sum + c.amount, 0);
    const totalPayments = (booking.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const roomRent = booking.basePrice || 0;
    const discount = booking.discount || 0;
    const subTotal = roomRent + totalCharges - discount;
    const taxRate = settings.taxRate || 0;
    const taxAmount = (subTotal * taxRate) / 100;
    const grandTotal = subTotal + taxAmount;
    const balance = grandTotal - totalPayments;
    return { totalCharges, totalPayments, roomRent, subTotal, taxAmount, grandTotal, balance };
  }, [booking, settings.taxRate]);

  const upiUrl = `upi://pay?pa=${settings.upiId || ''}&pn=${encodeURIComponent(settings.name)}&am=${totals.balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Stay Unit ' + room.number)}`;
  const upiQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;

  const handleWhatsAppBill = () => {
    const message = `*INVOICE: ${settings.name}*\n` +
      `--------------------------\n` +
      `Guest: *${guest.name}*\n` +
      `Room: *${room.number}* (${room.type})\n` +
      `Bill No: ${booking.bookingNo}\n\n` +
      `Room Rent: ₹${booking.basePrice}\n` +
      `Services: ₹${totals.totalCharges}\n` +
      (booking.discount ? `Discount: -₹${booking.discount}\n` : '') +
      `Tax: ₹${totals.taxAmount}\n` +
      `--------------------------\n` +
      `*Grand Total: ₹${totals.grandTotal.toFixed(2)}*\n` +
      `Settled: ₹${totals.totalPayments}\n` +
      `*Balance Due: ₹${totals.balance.toFixed(2)}*\n\n` +
      `Stay: ${booking.checkInDate} to ${booking.checkOutDate}\n` +
      `UPI ID: ${settings.upiId}\n` +
      `--------------------------\n` +
      `Thank you for staying with us!`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleAddCharge = () => {
    const charge: Charge = { id: Math.random().toString(36).substr(2, 9), description: newCharge.description, amount: parseFloat(newCharge.amount) || 0, date: new Date().toISOString() };
    onUpdate({ ...booking, charges: [...(booking.charges || []), charge] });
    setShowAddCharge(false); setNewCharge({ description: '', amount: '' });
  };

  const handlePostPayment = () => {
    const payment: Payment = { id: Math.random().toString(36).substr(2, 9), amount: parseFloat(newPayment.amount) || 0, date: new Date().toISOString(), method: newPayment.method, remarks: newPayment.remarks };
    onAddPayment(payment);
    setShowAddPayment(false); setNewPayment({ amount: '', method: 'Cash', remarks: '' });
  };

  const handleExtendStay = () => {
    onUpdate({ ...booking, checkOutDate: newCheckOut });
    setShowExtension(false);
    alert(`Stay extended until ${newCheckOut}`);
  };

  const handleCheckout = () => {
    if (totals.balance > 0 && !confirm(`Pending balance of ₹${totals.balance.toFixed(2)}. Proceed with checkout?`)) return;
    onUpdate({ ...booking, status: 'COMPLETED' });
    onClose();
  };

  const vacantRooms = allRooms.filter(r => r.status === RoomStatus.VACANT);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#f8fafc] w-full max-w-7xl min-h-[95vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        
        <div className="bg-[#003d80] p-8 text-white flex justify-between items-center no-print">
          <div className="flex items-center gap-8">
            <button 
              onClick={onClose} 
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl transition-all border border-white/20 group shadow-lg"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-black text-[11px] uppercase tracking-widest">Back</span>
            </button>
            
            <div>
              <div className="flex items-center gap-4 mb-1">
                <span className="bg-green-500/20 text-green-400 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-500/30">Resident Active</span>
                <span className="text-[10px] font-black uppercase text-blue-200 tracking-widest opacity-60">Bill: {booking.bookingNo}</span>
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{guest.name}</h2>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-2 opacity-80">
                {guest.phone} &bull; Unit {room.number}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
             <button onClick={() => setShowLiveQR(true)} className="bg-blue-600 flex items-center gap-3 px-6 py-3.5 rounded-2xl hover:bg-blue-700 transition-all font-black uppercase text-[10px] border border-white/10 shadow-xl">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z"/></svg>
               Show Pay QR
             </button>
             <button onClick={() => setShowPrintView(true)} className="bg-green-600 flex items-center gap-3 px-6 py-3.5 rounded-2xl hover:bg-green-700 transition-all font-black uppercase text-[10px] border border-white/10 shadow-xl">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5zm10 8H5V6h10v6zM7 16a1 1 0 100 2h6a1 1 0 100-2H7z"/></svg>
               Print Bill
             </button>
             <button onClick={onClose} className="bg-red-500/20 flex items-center gap-3 hover:bg-red-600 text-white px-6 py-3.5 rounded-2xl transition-all font-black uppercase text-[10px] border border-white/10">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
               Close Bill
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 grid grid-cols-1 lg:grid-cols-4 gap-12 custom-scrollbar no-print">
          
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-3 gap-6">
               <SummaryStat label="Folio Balance" value={`₹${totals.balance.toFixed(2)}`} color="bg-red-50 text-red-600" />
               <SummaryStat label="Total Charges" value={`₹${totals.totalCharges.toFixed(2)}`} color="bg-blue-50 text-blue-600" />
               <SummaryStat label="Paid Amount" value={`₹${totals.totalPayments.toFixed(2)}`} color="bg-green-50 text-green-600" />
            </div>

            <section className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-6">
                <h3 className="font-black text-blue-900 uppercase text-xs tracking-widest">Service & Charge Register</h3>
                <button onClick={() => setShowAddCharge(true)} className="bg-blue-900 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-md">+ Add Service</button>
              </div>
              <div className="overflow-hidden rounded-2xl border">
                 <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 font-black uppercase text-gray-400">
                       <tr><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4 text-right">Amount (₹)</th></tr>
                    </thead>
                    <tbody className="divide-y font-bold uppercase text-gray-700">
                       <tr>
                          <td className="p-4">{booking.checkInDate}</td>
                          <td className="p-4">Daily Base Tariff - {room.type}</td>
                          <td className="p-4 text-right">₹{booking.basePrice.toFixed(2)}</td>
                       </tr>
                       {booking.discount > 0 && (
                         <tr className="text-red-500 bg-red-50/30">
                            <td className="p-4">-</td>
                            <td className="p-4">Applied Discount</td>
                            <td className="p-4 text-right">-₹{booking.discount.toFixed(2)}</td>
                         </tr>
                       )}
                       {booking.charges.map(c => (
                         <tr key={c.id}>
                            <td className="p-4">{c.date.split('T')[0]}</td>
                            <td className="p-4">{c.description}</td>
                            <td className="p-4 text-right">₹{c.amount.toFixed(2)}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </section>

            <section className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-6">
               <div className="flex justify-between items-center border-b pb-6">
                  <h3 className="font-black text-green-700 uppercase text-xs tracking-widest">Payment & Receipt Ledger</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setShowLiveQR(true)} className="bg-blue-50 text-blue-900 px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-md border border-blue-100">Live QR Pay</button>
                    <button onClick={() => setShowAddPayment(true)} className="bg-green-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-md">+ Record Receipt</button>
                  </div>
               </div>
               <div className="overflow-hidden rounded-2xl border">
                  <table className="w-full text-xs text-left">
                     <thead className="bg-gray-50 font-black uppercase text-gray-400">
                        <tr><th className="p-4">Date</th><th className="p-4">Method</th><th className="p-4">Remarks</th><th className="p-4 text-right">Amount (₹)</th></tr>
                     </thead>
                     <tbody className="divide-y font-bold uppercase text-gray-700">
                        {booking.payments.map(p => (
                          <tr key={p.id}>
                             <td className="p-4">{p.date.split('T')[0]}</td>
                             <td className="p-4">{p.method}</td>
                             <td className="p-4 italic text-gray-400">{p.remarks || '-'}</td>
                             <td className="p-4 text-right text-green-700">₹{p.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                        {booking.payments.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-gray-300 italic uppercase">No payments recorded yet</td></tr>}
                     </tbody>
                  </table>
               </div>
            </section>
          </div>

          <div className="space-y-8 no-print">
            <div className="bg-[#003d80] p-10 rounded-[3rem] text-white shadow-2xl space-y-8">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-1">Final Settlement</p>
                <h3 className="text-4xl font-black tracking-tighter">₹{totals.balance.toFixed(2)}</h3>
              </div>
              <div className="space-y-3">
                 <button onClick={() => setShowAddPayment(true)} className="w-full bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-green-600 transition-all">Settle Now</button>
                 <button onClick={() => setShowLiveQR(true)} className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] border border-white/20 shadow-xl flex items-center justify-center gap-3">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z"/></svg>
                    Display Pay QR
                 </button>
                 <button onClick={() => setShowPrintView(true)} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] border border-white/20 shadow-xl flex items-center justify-center gap-3">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5zm10 8H5V6h10v6zM7 16a1 1 0 100 2h6a1 1 0 100-2H7z"/></svg>
                    Print Bill
                 </button>
                 <button onClick={handleWhatsAppBill} className="w-full bg-white/10 text-white py-4 rounded-2xl font-black uppercase text-[10px] border border-white/20">Send WhatsApp Bill</button>
                 <button onClick={onClose} className="w-full bg-red-600/80 hover:bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] border border-white/10 flex items-center justify-center gap-3 transition-all mt-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                    Close & Exit
                 </button>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-[3rem] border-2 space-y-4">
               <h4 className="text-center font-black uppercase text-[9px] text-gray-400 tracking-widest">Operational Actions</h4>
               <SidebarAction label="Room Shift" onClick={() => setShowRoomShift(true)} />
               <SidebarAction label="Extend Check-out" onClick={() => setShowExtension(true)} />
               <SidebarAction label="Preview Invoice" onClick={() => setShowPrintView(true)} />
               <div className="pt-4">
                  <button onClick={handleCheckout} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all">Close Folio & Checkout</button>
               </div>
            </div>
          </div>
        </div>

        {/* Live Payment QR Modal */}
        {showLiveQR && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
             <div className="bg-white rounded-[4rem] w-full max-w-md p-12 text-center space-y-8 animate-in zoom-in duration-500">
                <div>
                   <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter mb-2">Scan & Pay Now</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instant Settlement Protocol</p>
                </div>
                <div className="aspect-square bg-slate-50 rounded-[3rem] border-4 border-slate-100 flex items-center justify-center p-8 shadow-inner">
                   <img src={upiQrSrc} className="w-full h-full mix-blend-multiply" alt="UPI QR Code" />
                </div>
                <div>
                   <p className="text-3xl font-black text-blue-900 mb-1">₹{totals.balance.toFixed(2)}</p>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Outstanding</p>
                </div>
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                   <p className="text-[11px] font-black text-blue-600 uppercase mb-2">UPI ID: {settings.upiId || 'Not Configured'}</p>
                   <p className="text-[8px] font-bold text-blue-400 uppercase">Wait for clerk to confirm after scanning</p>
                </div>
                <button onClick={() => setShowLiveQR(false)} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">Close QR Screen</button>
             </div>
          </div>
        )}

        {showPrintView && (
          <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col no-print-backdrop overflow-hidden">
             <div className="bg-black p-4 flex justify-between items-center no-print border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-black text-xs uppercase shadow-lg">IV</div>
                  <p className="text-white font-black uppercase text-xs tracking-widest">Tax Invoice Fulfillment Console</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => window.print()} className="bg-green-600 text-white px-8 py-2 rounded-xl font-black uppercase text-xs shadow-xl">Download / Print</button>
                   <button onClick={handleWhatsAppBill} className="bg-white text-black px-8 py-2 rounded-xl font-black uppercase text-xs shadow-xl">Share on WhatsApp</button>
                   <button onClick={() => setShowPrintView(false)} className="bg-white/10 text-white px-8 py-2 rounded-xl font-black uppercase text-xs border border-white/20">Back to Management</button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto bg-gray-500/20 p-8 custom-scrollbar">
                <InvoiceView 
                  guest={guest} 
                  booking={booking} 
                  room={room} 
                  settings={settings} 
                  payments={booking.payments}
                />
             </div>
             <div className="bg-black p-4 flex justify-center no-print">
                 <button onClick={() => setShowPrintView(false)} className="bg-orange-600 text-white px-12 py-3 rounded-2xl font-black uppercase text-xs shadow-xl tracking-widest">Back To Management</button>
             </div>
          </div>
        )}
      </div>

      {showExtension && (
        <FolioModal title="Extend Resident Stay" onClose={() => setShowExtension(false)}>
           <div className="space-y-6">
              <FolioInput label="New Checkout Date" type="date" value={newCheckOut} onChange={setNewCheckOut} />
              <button onClick={handleExtendStay} className="w-full bg-blue-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl">Post Stay Extension</button>
           </div>
        </FolioModal>
      )}

      {showRoomShift && (
        <FolioModal title="Internal Room Shift" onClose={() => setShowRoomShift(false)}>
           <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-[10px] font-black uppercase text-gray-400 text-center mb-4">Select Target Vacant Unit</p>
              {vacantRooms.map(vr => (
                <button 
                  key={vr.id} 
                  onClick={() => { onShiftRoom(vr.id); setShowRoomShift(false); }}
                  className="w-full bg-slate-50 border-2 border-white hover:border-blue-500 p-5 rounded-[2rem] flex justify-between items-center transition-all shadow-sm"
                >
                  <div>
                    <span className="font-black text-blue-900 uppercase text-lg block leading-none">Unit {vr.number}</span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{vr.type}</span>
                  </div>
                  <span className="bg-white px-4 py-1.5 rounded-full border text-[9px] font-black uppercase text-blue-600">Select</span>
                </button>
              ))}
              {vacantRooms.length === 0 && <p className="text-center text-xs font-bold text-red-400 py-10">No Vacant Inventory Available</p>}
           </div>
        </FolioModal>
      )}

      {showAddCharge && (
        <FolioModal title="Post Service Charge" onClose={() => setShowAddCharge(false)}>
          <div className="space-y-6">
            <FolioInput label="Service Description" value={newCharge.description} onChange={(v: string) => setNewCharge({...newCharge, description: v})} />
            <FolioInput label="Amount to Charge (₹)" type="number" value={newCharge.amount} onChange={(v: string) => setNewCharge({...newCharge, amount: v})} />
            <button onClick={handleAddCharge} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Post Charge</button>
          </div>
        </FolioModal>
      )}

      {showAddPayment && (
        <FolioModal title="Folio Settlement" onClose={() => setShowAddPayment(false)}>
          <div className="space-y-6">
            <FolioInput label="Settlement Amount (₹)" type="number" value={newPayment.amount} onChange={(v: string) => setNewPayment({...newPayment, amount: v})} />
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Receipt Method</label>
              <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50" value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}>
                  <option value="Cash">Cash Account</option>
                  <option value="UPI">UPI / Digital Gateway</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="Bank">Direct Bank Transfer</option>
              </select>
            </div>
            <button onClick={handlePostPayment} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl">Confirm Settlement</button>
          </div>
        </FolioModal>
      )}
    </div>
  );
};

const SummaryStat = ({ label, value, color }: { label: string, value: string, color: string }) => (
  <div className={`${color} p-6 rounded-[2.5rem] border border-current/10 shadow-sm`}>
    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">{label}</p>
    <p className="text-2xl font-black tracking-tighter">{value}</p>
  </div>
);

const SidebarAction = ({ label, onClick, variant = 'primary' }: { label: string, onClick: () => void, variant?: 'primary' | 'secondary' }) => (
  <button onClick={onClick} className="w-full py-4 px-6 rounded-2xl border-2 border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-blue-600 hover:text-blue-600 transition-all text-left flex justify-between items-center group">
    {label}
    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
  </button>
);

const FolioModal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 z-[100] bg-slate-900/80 flex items-center justify-center p-4">
    <div className="bg-white rounded-[4rem] w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
      <div className="bg-slate-900 p-8 text-white text-center shadow-xl"><h2 className="text-lg font-black uppercase tracking-widest leading-none">{title}</h2></div>
      <div className="p-10">{children}</div>
      <button onClick={onClose} className="w-full py-5 text-slate-300 font-black uppercase text-[10px] border-t hover:text-slate-900 transition-colors">Discard & Close</button>
    </div>
  </div>
);

const FolioInput = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <input type={type} className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50 outline-none focus:border-blue-500 text-black shadow-inner" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default StayManagement;
