
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
  onAddPayment: (bookingId: string, payment: Payment) => void; // Changed signature to allow targeting specific bookings
  onUpdateGuest: (guest: Guest) => void;
  onShiftRoom: (newRoomId: string) => void;
  onClose: () => void;
}

const StayManagement: React.FC<StayManagementProps> = ({ 
  booking, guest, room, allRooms, allBookings, settings, onUpdate, onAddPayment, onUpdateGuest, onShiftRoom, onClose 
}) => {
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showRoomShift, setShowRoomShift] = useState(false);
  const [showExtension, setShowExtension] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showLiveQR, setShowLiveQR] = useState(false);
  const [isConsolidated, setIsConsolidated] = useState(false);
  
  const [newCharge, setNewCharge] = useState({ description: '', amount: '' });
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'Cash', remarks: '' });
  const [newCheckOut, setNewCheckOut] = useState(booking.checkOutDate);

  const relatedBookings = useMemo(() => {
    if (!booking.groupId) return [booking];
    return allBookings.filter(b => b.groupId === booking.groupId && (b.status === 'ACTIVE' || b.status === 'RESERVED'));
  }, [booking.groupId, allBookings]);

  const calculateBookingTotal = (b: Booking) => {
    const start = new Date(b.checkInDate);
    const end = new Date(b.checkOutDate);
    const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    const roomRent = (b.basePrice || 0) * nights;
    const totalCharges = (b.charges || []).reduce((sum, c) => sum + c.amount, 0);
    const totalPayments = (b.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const subTotal = roomRent + totalCharges - (b.discount || 0);
    const tax = (subTotal * (settings.taxRate || 0)) / 100;
    const grandTotal = subTotal + tax;
    return { grandTotal, totalPayments, balance: grandTotal - totalPayments };
  };

  const totals = useMemo(() => {
    const activeBookings = isConsolidated ? relatedBookings : [booking];
    
    let totalRoomRent = 0;
    let totalCharges = 0;
    let totalPayments = 0;
    let totalDiscount = 0;
    let maxNights = 0;

    activeBookings.forEach(b => {
      const start = new Date(b.checkInDate);
      const end = new Date(b.checkOutDate);
      const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
      maxNights = Math.max(maxNights, nights);
      
      totalRoomRent += (b.basePrice || 0) * nights;
      totalCharges += (b.charges || []).reduce((sum, c) => sum + c.amount, 0);
      totalPayments += (b.payments || []).reduce((sum, p) => sum + p.amount, 0);
      totalDiscount += (b.discount || 0);
    });
    
    const subTotal = totalRoomRent + totalCharges - totalDiscount;
    const taxRate = settings.taxRate || 0;
    const taxAmount = (subTotal * taxRate) / 100;
    const grandTotal = subTotal + taxAmount;
    const balance = grandTotal - totalPayments;
    
    return { 
      totalCharges, 
      totalPayments, 
      roomRent: totalRoomRent, 
      subTotal, 
      taxAmount, 
      grandTotal, 
      balance, 
      nights: maxNights,
      count: activeBookings.length 
    };
  }, [booking, relatedBookings, isConsolidated, settings.taxRate]);

  const upiUrl = `upi://pay?pa=${settings.upiId || ''}&pn=${encodeURIComponent(settings.name)}&am=${totals.balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Stay ' + (isConsolidated ? 'Group' : 'Unit ' + room.number))}`;
  const upiQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;

  const handleWhatsAppBill = () => {
    const activeBookings = isConsolidated ? relatedBookings : [booking];
    let message = `*INVOICE: ${settings.name}*\n` +
      `--------------------------\n` +
      `Guest: *${guest.name}*\n` +
      `Bill Ref: ${booking.bookingNo}\n`;

    if (isConsolidated) {
      message += `Rooms: ${activeBookings.map(b => allRooms.find(r => r.id === b.roomId)?.number).join(', ')}\n`;
    } else {
      message += `Room: *${room.number}* (${room.type})\n`;
    }

    message += `Stay: ${booking.checkInDate} to ${booking.checkOutDate}\n` +
      `--------------------------\n` +
      `Grand Total: ₹${totals.grandTotal.toFixed(2)}\n` +
      `Received: ₹${totals.totalPayments.toFixed(2)}\n` +
      `*Balance Due: ₹${totals.balance.toFixed(2)}*\n\n` +
      (settings.upiId ? `UPI ID: ${settings.upiId}\n` : '') +
      `--------------------------\n` +
      `Thank you for staying with us!`;

    const cleanPhone = guest.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleAddCharge = () => {
    const charge: Charge = { id: Math.random().toString(36).substr(2, 9), description: newCharge.description, amount: parseFloat(newCharge.amount) || 0, date: new Date().toISOString() };
    onUpdate({ ...booking, charges: [...(booking.charges || []), charge] });
    setShowAddCharge(false); setNewCharge({ description: '', amount: '' });
  };

  const handlePostPayment = () => {
    const totalAmt = parseFloat(newPayment.amount) || 0;
    if (totalAmt <= 0) return;

    if (!isConsolidated) {
      const payment: Payment = { id: Math.random().toString(36).substr(2, 9), amount: totalAmt, date: new Date().toISOString(), method: newPayment.method, remarks: newPayment.remarks };
      onAddPayment(booking.id, payment);
    } else {
      // Automatic distribution among all related rooms
      let remaining = totalAmt;
      
      // Sort related bookings by balance (highest first) to clear large debts
      const sortedByBalance = [...relatedBookings].map(b => ({
        b,
        data: calculateBookingTotal(b)
      })).sort((a, b) => b.data.balance - a.data.balance);

      sortedByBalance.forEach(({ b, data }) => {
        if (remaining <= 0) return;
        const allocation = Math.min(remaining, Math.max(0, data.balance));
        // If there's still money after clearing all balances, put the excess in the primary booking
        const finalAllocation = (b.id === booking.id && remaining > 0 && allocation === data.balance) ? remaining : allocation;
        
        if (finalAllocation > 0) {
          const payment: Payment = { 
            id: Math.random().toString(36).substr(2, 9), 
            amount: finalAllocation, 
            date: new Date().toISOString(), 
            method: newPayment.method, 
            remarks: `Distributed: ${newPayment.remarks || 'Consolidated Settlement'}` 
          };
          onAddPayment(b.id, payment);
          remaining -= finalAllocation;
        }
      });
      
      // If there's STILL money (e.g. overpayment and first room was not primary), 
      // ensuring primary room takes any extra remainder not caught above
      if (remaining > 0) {
        const payment: Payment = { 
          id: Math.random().toString(36).substr(2, 9), 
          amount: remaining, 
          date: new Date().toISOString(), 
          method: newPayment.method, 
          remarks: `Excess: ${newPayment.remarks || 'Consolidated Settlement'}` 
        };
        onAddPayment(booking.id, payment);
      }
    }
    
    setShowAddPayment(false); 
    setNewPayment({ amount: '', method: 'Cash', remarks: '' });
  };

  const handleExtendStay = () => {
    onUpdate({ ...booking, checkOutDate: newCheckOut });
    setShowExtension(false);
  };

  const handleCheckout = () => {
    if (totals.balance > 0 && !confirm(`Pending balance of ₹${totals.balance.toFixed(2)}. Proceed with checkout?`)) return;
    
    if (isConsolidated) {
      relatedBookings.forEach(b => {
        onUpdate({ ...b, status: 'COMPLETED' });
      });
    } else {
      onUpdate({ ...booking, status: 'COMPLETED' });
    }
    onClose();
  };

  const vacantRooms = allRooms.filter(r => r.status === RoomStatus.VACANT);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#f8fafc] w-full max-w-7xl h-[92vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        
        {/* FIXED HEADER */}
        <div className="bg-[#003d80] p-6 md:p-8 text-white flex justify-between items-center no-print flex-shrink-0">
          <div className="flex items-center gap-4 md:gap-8">
            <button 
              onClick={onClose} 
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-4 md:px-6 py-3 rounded-2xl transition-all border border-white/20 group shadow-lg"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden md:inline font-black text-[11px] uppercase tracking-widest">Back</span>
            </button>
            
            <div>
              <div className="flex items-center gap-4 mb-1">
                <span className="bg-green-500/20 text-green-400 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-500/30">Resident Active</span>
                <span className="hidden sm:inline text-[10px] font-black uppercase text-blue-200 tracking-widest opacity-60">Bill: {booking.bookingNo}</span>
              </div>
              <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter leading-none">{guest.name}</h2>
              <p className="text-[9px] md:text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-2 opacity-80 truncate max-w-[200px] md:max-w-none">
                {guest.phone} &bull; {isConsolidated ? `${relatedBookings.length} Rooms Combined` : `Unit ${room.number}`} &bull; {totals.nights} Nights
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
             {booking.groupId && (
               <button 
                onClick={() => setIsConsolidated(!isConsolidated)} 
                className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-3.5 rounded-2xl transition-all font-black uppercase text-[9px] md:text-[10px] border border-white/10 shadow-xl ${isConsolidated ? 'bg-orange-600' : 'bg-white/10 hover:bg-white/20'}`}
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                 <span className="hidden sm:inline">{isConsolidated ? 'Viewing Single Bill' : 'View Consolidated Bill'}</span>
                 <span className="sm:hidden">{isConsolidated ? 'Single' : 'Group'}</span>
               </button>
             )}
             <button onClick={() => setShowPrintView(true)} className="bg-green-600 hidden md:flex items-center gap-3 px-6 py-3.5 rounded-2xl hover:bg-green-700 transition-all font-black uppercase text-[10px] border border-white/10 shadow-xl">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5zm10 8H5V6h10v6zM7 16a1 1 0 100 2h6a1 1 0 100-2H7z"/></svg>
               Print
             </button>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-12 grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-12 custom-scrollbar no-print">
          
          <div className="lg:col-span-3 space-y-6 md:space-y-8">
            <div className="grid grid-cols-3 gap-3 md:gap-6">
               <SummaryStat label="Folio Balance" value={`₹${totals.balance.toFixed(2)}`} color="bg-red-50 text-red-600" />
               <SummaryStat label="Total Charges" value={`₹${totals.totalCharges.toFixed(2)}`} color="bg-blue-50 text-blue-600" />
               <SummaryStat label="Paid Amount" value={`₹${totals.totalPayments.toFixed(2)}`} color="bg-green-50 text-green-600" />
            </div>

            <section className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] border shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-4 md:pb-6">
                <h3 className="font-black text-blue-900 uppercase text-[10px] md:text-xs tracking-widest">
                  {isConsolidated ? 'Combined Service & Rent Ledger' : 'Resident Service Register'}
                </h3>
                {!isConsolidated && (
                  <button onClick={() => setShowAddCharge(true)} className="bg-blue-900 text-white px-4 md:px-6 py-2 rounded-xl font-black text-[9px] md:text-[10px] uppercase shadow-md">+ Service</button>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border overflow-x-auto">
                 <table className="w-full text-[10px] md:text-xs text-left min-w-[500px]">
                    <thead className="bg-gray-50 font-black uppercase text-gray-400">
                       <tr><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4 text-right">Amount (₹)</th></tr>
                    </thead>
                    <tbody className="divide-y font-bold uppercase text-gray-700">
                       {(isConsolidated ? relatedBookings : [booking]).map(b => {
                          const r = allRooms.find(x => x.id === b.roomId);
                          const start = new Date(b.checkInDate);
                          const end = new Date(b.checkOutDate);
                          const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                          return (
                            <React.Fragment key={b.id}>
                              <tr className="bg-blue-50/20">
                                <td className="p-4 whitespace-nowrap">{b.checkInDate.slice(5)}</td>
                                <td className="p-4">
                                  <span className="text-blue-900 font-black mr-2">Unit {r?.number}:</span> 
                                  Rent {r?.type.slice(0, 10)} (₹{b.basePrice}/N x {nights}N)
                                </td>
                                <td className="p-4 text-right">₹{(b.basePrice * nights).toFixed(2)}</td>
                              </tr>
                              {b.discount > 0 && (
                                <tr className="text-red-500 bg-red-50/30">
                                   <td className="p-4">-</td>
                                   <td className="p-4"><span className="opacity-60 mr-2">Unit {r?.number}:</span> Discount Applied</td>
                                   <td className="p-4 text-right">-₹{b.discount.toFixed(2)}</td>
                                </tr>
                              )}
                              {(b.charges || []).map(c => (
                                <tr key={c.id}>
                                   <td className="p-4 whitespace-nowrap">{c.date.split('T')[0].slice(5)}</td>
                                   <td className="p-4"><span className="opacity-60 mr-2">Unit {r?.number}:</span> {c.description}</td>
                                   <td className="p-4 text-right">₹{c.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
            </section>

            <section className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] border shadow-sm space-y-6">
               <div className="flex justify-between items-center border-b pb-4 md:pb-6">
                  <h3 className="font-black text-green-700 uppercase text-[10px] md:text-xs tracking-widest">Receipt Ledger</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setShowLiveQR(true)} className="bg-blue-50 text-blue-900 px-4 py-2 rounded-xl font-black text-[9px] uppercase shadow-md border border-blue-100 hidden sm:inline">QR Pay</button>
                    {!isConsolidated && (
                      <button onClick={() => setShowAddPayment(true)} className="bg-green-600 text-white px-4 md:px-6 py-2 rounded-xl font-black text-[9px] md:text-[10px] uppercase shadow-md">+ Record</button>
                    )}
                  </div>
               </div>
               <div className="overflow-hidden rounded-2xl border overflow-x-auto">
                  <table className="w-full text-[10px] md:text-xs text-left min-w-[500px]">
                     <thead className="bg-gray-50 font-black uppercase text-gray-400">
                        <tr><th className="p-4">Date</th><th className="p-4">Method</th><th className="p-4">Remarks</th><th className="p-4 text-right">Amount (₹)</th></tr>
                     </thead>
                     <tbody className="divide-y font-bold uppercase text-gray-700">
                        {(isConsolidated ? relatedBookings : [booking]).map(b => (
                          <React.Fragment key={b.id}>
                            {(b.payments || []).map(p => (
                              <tr key={p.id}>
                                 <td className="p-4 whitespace-nowrap">{p.date.split('T')[0].slice(5)}</td>
                                 <td className="p-4">{p.method} {isConsolidated && <span className="text-[8px] text-blue-400 ml-2">(R{allRooms.find(x=>x.id===b.roomId)?.number})</span>}</td>
                                 <td className="p-4 italic text-gray-400 max-w-[150px] truncate">{p.remarks || '-'}</td>
                                 <td className="p-4 text-right text-green-700">₹{p.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                        {totals.totalPayments === 0 && <tr><td colSpan={4} className="p-10 text-center text-gray-300 italic uppercase">No payments recorded</td></tr>}
                     </tbody>
                  </table>
               </div>
            </section>
          </div>

          <div className="space-y-6 md:space-y-8 no-print">
            <div className="bg-[#003d80] p-8 md:p-10 rounded-3xl md:rounded-[3rem] text-white shadow-2xl space-y-6 md:space-y-8">
              <div className="text-center">
                <p className="text-[9px] font-black uppercase text-blue-200 tracking-widest mb-1">{isConsolidated ? 'Combined Total' : 'Net Outstanding'}</p>
                <h3 className="text-3xl md:text-4xl font-black tracking-tighter">₹{totals.balance.toFixed(2)}</h3>
              </div>
              <div className="space-y-3">
                 <button onClick={() => setShowAddPayment(true)} className="w-full bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-green-600 transition-all">Settle Bill Now</button>
                 <button onClick={() => setShowLiveQR(true)} className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] border border-white/20 shadow-xl flex items-center justify-center gap-3">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z"/></svg>
                    Pay Via UPI
                 </button>
                 <button onClick={handleWhatsAppBill} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] border border-white/20 shadow-xl flex items-center justify-center gap-3 hover:bg-green-700 transition-all">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.7 17.8 69.4 27.2 106.2 27.2 122.4 0 222-99.6 222-222 0-59.3-23-115.1-65-157.1zM223.9 446.3c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 365.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.5-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 54.1 81.2 54.1 130.4 0 101.7-82.8 184.5-184.5 184.5zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18s-8.8-2.8-12.4 2.8-14.1 18-17.2 21.6-6.3 4.1-11.8 1.3c-5.5-2.8-23.4-8.6-44.5-27.4-16.4-14.6-27.5-32.7-30.7-38.2s-.3-8.5 2.4-11.2c2.5-2.4 5.5-6.4 8.2-9.6s3.7-5.5 5.5-9.1 1-6.9-.5-9.6-12.4-29.9-17-41c-4.5-10.8-9.1-9.3-12.4-9.5-3.2-.2-6.9-.2-10.5-.2s-9.6 1.3-14.6 6.9c-5 5.5-19.2 18.8-19.2 45.8s19.7 53 22.4 56.7c2.8 3.7 38.8 59.2 94 83 13.1 5.7 23.4 9.1 31.4 11.7 13.2 4.2 25.2 3.6 34.8 2.1 10.7-1.6 32.8-13.4 37.4-26.4s4.6-24.1 3.2-26.4-5.5-3.7-11-6.5z"/></svg>
                    WhatsApp Bill
                 </button>
              </div>
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[3rem] border-2 space-y-4">
               <h4 className="text-center font-black uppercase text-[9px] text-gray-400 tracking-widest">Ops Console</h4>
               <SidebarAction label="Extend Stay" onClick={() => setShowExtension(true)} />
               <SidebarAction label="Room Shift" onClick={() => setShowRoomShift(true)} />
               <div className="pt-4">
                  <button onClick={handleCheckout} className="w-full bg-red-600 text-white py-4 md:py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all">Establish Checkout</button>
               </div>
            </div>
          </div>
        </div>

        {/* MODALS REMAIN SIMILAR BUT ENSURE WRAPPERS ARE MOBILE FRIENDLY */}
        {showPrintView && (
          <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col no-print-backdrop overflow-hidden">
             <div className="bg-black p-4 flex justify-between items-center no-print border-b border-white/10 shrink-0">
                <div className="flex gap-2">
                   <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px]">Print</button>
                   <button onClick={() => setShowPrintView(false)} className="bg-white/10 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px]">Back</button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto bg-gray-500/20 p-4 md:p-8 custom-scrollbar">
                <InvoiceView 
                  guest={guest} 
                  booking={isConsolidated ? undefined : booking}
                  groupBookings={isConsolidated ? relatedBookings.map(b => ({
                    ...b,
                    roomNumber: allRooms.find(x => x.id === b.roomId)?.number || '?',
                    roomType: allRooms.find(x => x.id === b.roomId)?.type || '?'
                  })) : undefined}
                  room={room} 
                  settings={settings} 
                  payments={isConsolidated ? relatedBookings.reduce((acc, b) => [...acc, ...(b.payments || [])], [] as any[]) : (booking.payments || [])}
                />
             </div>
          </div>
        )}

        {showLiveQR && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
             <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 text-center space-y-6 animate-in zoom-in duration-500">
                <div>
                   <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter">Settlement QR</h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scan & Pay ₹{totals.balance.toFixed(2)}</p>
                </div>
                <div className="aspect-square bg-slate-50 rounded-2xl border-4 border-slate-100 flex items-center justify-center p-4 shadow-inner">
                   <img src={upiQrSrc} className="w-full h-full mix-blend-multiply" alt="UPI QR" />
                </div>
                <button onClick={() => setShowLiveQR(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Close</button>
             </div>
          </div>
        )}

        {showAddPayment && (
          <FolioModal title={isConsolidated ? "Group Settlement" : "Unit Settlement"} onClose={() => setShowAddPayment(false)}>
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-[9px] font-black text-blue-900 uppercase">
                {isConsolidated ? "Automated Distribution: Payment will be distributed across all group rooms starting from highest balance." : "Standard Unit Payment Posting."}
              </div>
              <FolioInput label="Settlement Amount (₹)" type="number" value={newPayment.amount} onChange={(v: string) => setNewPayment({...newPayment, amount: v})} />
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Method</label>
                <select className="w-full border-2 p-3.5 rounded-2xl font-black text-[11px] bg-slate-50" value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}>
                    <option value="Cash">Cash Account</option>
                    <option value="UPI">Digital (UPI)</option>
                    <option value="Card">Bank Card</option>
                    <option value="Bank">Transfer</option>
                </select>
              </div>
              <button onClick={handlePostPayment} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Post & Distribute</button>
            </div>
          </FolioModal>
        )}

        {showAddCharge && (
          <FolioModal title="Service Charge" onClose={() => setShowAddCharge(false)}>
            <div className="space-y-6">
              <FolioInput label="Description" value={newCharge.description} onChange={(v: string) => setNewCharge({...newCharge, description: v})} />
              <FolioInput label="Amount (₹)" type="number" value={newCharge.amount} onChange={(v: string) => setNewCharge({...newCharge, amount: v})} />
              <button onClick={handleAddCharge} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Post Charge</button>
            </div>
          </FolioModal>
        )}

        {showExtension && (
          <FolioModal title="Extend Stay" onClose={() => setShowExtension(false)}>
             <div className="space-y-6">
                <FolioInput label="New Departure" type="date" value={newCheckOut} onChange={setNewCheckOut} />
                <button onClick={handleExtendStay} className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Update</button>
             </div>
          </FolioModal>
        )}

        {showRoomShift && (
          <FolioModal title="Room Shift" onClose={() => setShowRoomShift(false)}>
             <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {vacantRooms.map(vr => (
                  <button key={vr.id} onClick={() => { onShiftRoom(vr.id); setShowRoomShift(false); }} className="w-full bg-slate-50 border-2 border-white hover:border-blue-500 p-4 rounded-2xl flex justify-between items-center transition-all">
                    <span className="font-black text-blue-900 uppercase">Unit {vr.number}</span>
                    <span className="bg-white px-3 py-1 rounded-full border text-[8px] font-black uppercase text-blue-600">Select</span>
                  </button>
                ))}
                {vacantRooms.length === 0 && <p className="text-center text-[10px] font-black py-10 opacity-30">No Vacancy</p>}
             </div>
          </FolioModal>
        )}

      </div>
    </div>
  );
};

const SummaryStat = ({ label, value, color }: { label: string, value: string, color: string }) => (
  <div className={`${color} p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-current/10 shadow-sm`}>
    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60 mb-2 truncate">{label}</p>
    <p className="text-lg md:text-2xl font-black tracking-tighter truncate">{value}</p>
  </div>
);

const SidebarAction = ({ label, onClick }: { label: string, onClick: () => void }) => (
  <button onClick={onClick} className="w-full py-3.5 px-6 rounded-xl border-2 border-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:border-blue-600 hover:text-blue-600 transition-all text-left flex justify-between items-center group">
    {label}
    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
  </button>
);

const FolioModal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 z-[250] bg-slate-900/80 flex items-center justify-center p-4">
    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-300">
      <div className="bg-slate-900 p-6 text-white text-center"><h2 className="text-sm font-black uppercase tracking-widest">{title}</h2></div>
      <div className="p-8">{children}</div>
      <button onClick={onClose} className="w-full py-4 text-slate-300 font-black uppercase text-[9px] border-t hover:text-slate-900 transition-colors">Cancel</button>
    </div>
  </div>
);

const FolioInput = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1 text-left w-full">
    <label className="text-[9px] font-black uppercase text-slate-400 ml-1">{label}</label>
    <input type={type} className="w-full border-2 p-3.5 rounded-xl font-black text-[11px] bg-slate-50 outline-none focus:border-blue-500 text-black" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default StayManagement;
