
import React, { useState, useMemo, useEffect } from 'react';
import { Booking, Guest, Room, Charge, Payment, RoomStatus, Transaction } from '../types';
import CameraCapture from './CameraCapture';

interface StayManagementProps {
  booking: Booking;
  guest: Guest;
  room: Room;
  allRooms: Room[];
  allBookings: Booking[];
  onUpdate: (booking: Booking) => void;
  onAddPayment: (payment: any) => void;
  onUpdateGuest: (guest: Guest) => void;
  onShiftRoom: (bookingId: string, fromRoomId: string, toRoomId: string) => void;
  onClose: () => void;
  settings: any;
}

const StayManagement: React.FC<StayManagementProps> = ({ booking, guest, room, allRooms, allBookings, onUpdate, onAddPayment, onUpdateGuest, onClose, settings }) => {
  const [activeTab, setActiveTab] = useState<'INFO' | 'BILLING' | 'DOCS'>('INFO');
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [tempGuest, setTempGuest] = useState<Guest>(guest);
  const [finalBooking, setFinalBooking] = useState<Booking>(booking);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [newCheckoutDate, setNewCheckoutDate] = useState(booking.checkOutDate);

  useEffect(() => { setTempGuest(guest); }, [guest]);
  useEffect(() => { setFinalBooking(booking); }, [booking]);

  const calculateTotals = (b: Booking) => {
    const taxRate = settings.taxRate || 12;
    const rent = Number(b.isComplementary ? 0 : (b.basePrice || 0));
    const charges = (b.charges || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const taxable = rent + charges - Number(b.discount || 0);
    const totalTax = taxable * (taxRate / 100);
    const sgst = totalTax / 2;
    const cgst = totalTax / 2;
    const debit = taxable + totalTax;
    const credit = (b.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { rent, charges, taxable, sgst, cgst, debit, credit, balance: debit - credit, taxRate };
  };

  const totals = calculateTotals(finalBooking);

  const handleAutoSave = (field: keyof Guest, value: string) => {
    const updatedGuest = { ...tempGuest, [field]: value };
    setTempGuest(updatedGuest);
    onUpdateGuest(updatedGuest);
  };

  const handleDocumentUpload = (type: keyof Guest['documents'], base64: string) => {
    const updatedGuest = {
      ...tempGuest,
      documents: { ...tempGuest.documents, [type]: base64 }
    };
    setTempGuest(updatedGuest);
    onUpdateGuest(updatedGuest);
  };

  const handleCheckout = () => {
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-CA'); 
    const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (totals.balance > 0) {
      if (!confirm(`Outstanding balance: ₹${totals.balance.toFixed(2)}. Confirm checkout?`)) return;
    }

    const updatedBooking: Booking = {
      ...booking,
      status: 'COMPLETED',
      checkOutDate: currentDate,
      checkOutTime: currentTime
    };
    
    setFinalBooking(updatedBooking);
    onUpdate(updatedBooking);
    setShowInvoice(true);
  };

  const handleExtendStay = () => {
    const updatedBooking: Booking = {
      ...booking,
      checkOutDate: newCheckoutDate
    };
    onUpdate(updatedBooking);
    setFinalBooking(updatedBooking);
    setShowExtensionModal(false);
    alert(`Stay extended until ${newCheckoutDate}`);
  };

  const shareOnWhatsApp = () => {
    const cleanPhone = guest.phone.replace(/\D/g, '');
    const message = `Invoice from ${settings.name}\nRoom: ${room.number}\nGuest: ${guest.name}\nTotal: ₹${totals.debit.toFixed(2)}\nBalance: ₹${totals.balance.toFixed(2)}\nStatus: ${finalBooking.status}\nRef: ${finalBooking.bookingNo}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const downloadFolioCSV = () => {
    const headers = "Date,Description,Debit,Credit\n";
    const rentRow = `${finalBooking.checkInDate},Room Rent,${totals.rent.toFixed(2)},0\n`;
    const chargeRows = (finalBooking.charges || []).map(c => `${c.date},${c.description},${c.amount.toFixed(2)},0`).join('\n');
    const paymentRows = (finalBooking.payments || []).map(p => `${p.date},Payment: ${p.method},0,${p.amount.toFixed(2)}`).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + rentRow + chargeRows + "\n" + paymentRows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Folio_${room.number}_${guest.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (showInvoice) {
    return <InvoiceView booking={finalBooking} guest={guest} room={room} settings={settings} totals={totals} onClose={() => setShowInvoice(false)} onFinalize={onClose} onWhatsApp={shareOnWhatsApp} />;
  }

  return (
    <div className="p-6 h-full flex flex-col gap-6 bg-[#f0f2f5] animate-in fade-in duration-500 text-black">
      <div className="bg-white border-b shadow-sm px-10 py-5 flex justify-between items-center no-print rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#003d80] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg uppercase">
            {room.number.slice(-1)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-black uppercase tracking-tighter">ROOM {room.number} &bull; {guest.name}</h1>
            <p className="text-[10px] font-bold text-black uppercase tracking-widest">Stay Desk & Billing</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowExtensionModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase shadow-lg hover:bg-blue-700 transition-all tracking-widest">Extend Stay</button>
          <button onClick={handleCheckout} className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-black text-[11px] uppercase shadow-lg hover:bg-orange-600 transition-all tracking-widest">Final Checkout</button>
          <button onClick={onClose} className="bg-slate-100 text-black px-6 py-3 rounded-2xl text-[11px] font-black uppercase transition-all hover:bg-slate-200">Exit Desk</button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="w-[320px] space-y-4 no-print flex flex-col">
          <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm p-2 flex flex-col gap-1">
            <TabBtn active={activeTab === 'INFO'} label="Guest Profile" onClick={() => setActiveTab('INFO')} />
            <TabBtn active={activeTab === 'BILLING'} label="Folio Ledger" onClick={() => setActiveTab('BILLING')} />
            <TabBtn active={activeTab === 'DOCS'} label="Documents" onClick={() => setActiveTab('DOCS')} />
          </div>

          <div className={`p-8 rounded-[2.5rem] border text-center shadow-xl transition-all relative overflow-hidden group ${totals.balance > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <p className="text-[10px] font-black uppercase text-black tracking-[0.2em] mb-2">Current Balance</p>
            <p className={`text-4xl font-black tracking-tighter ${totals.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{totals.balance.toFixed(2)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-[2rem] border text-[10px] font-black text-black uppercase space-y-2">
            <div className="flex justify-between"><span>Check-in</span><span>{finalBooking.checkInDate}</span></div>
            <div className="flex justify-between"><span>Expected Out</span><span className="text-blue-600">{finalBooking.checkOutDate}</span></div>
          </div>

          <div className="flex-1"></div>
          <div className="bg-white p-6 rounded-[2rem] border text-[10px] font-black text-black uppercase text-center tracking-widest italic leading-relaxed">
            Changes auto-save in real-time
          </div>
        </div>

        <div className="flex-1 bg-white border rounded-[3rem] shadow-2xl p-12 overflow-y-auto custom-scrollbar no-print-backdrop">
          {activeTab === 'INFO' && (
            <div className="space-y-12 animate-in fade-in duration-300">
              <SectionHeader title="Guest Information" />
              <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                <Inp label="Guest Full Name" value={tempGuest.name} onChange={(v: string) => handleAutoSave('name', v)} />
                <Inp label="Mobile / Contact" value={tempGuest.phone} onChange={(v: string) => handleAutoSave('phone', v)} />
                <Inp label="Email ID" value={tempGuest.email} onChange={(v: string) => handleAutoSave('email', v)} />
                <Inp label="Permanent Address" value={tempGuest.address} onChange={(v: string) => handleAutoSave('address', v)} />
                <Inp label="City" value={tempGuest.city} onChange={(v: string) => handleAutoSave('city', v)} />
                <Inp label="State" value={tempGuest.state} onChange={(v: string) => handleAutoSave('state', v)} />
                <Inp label="GSTIN Number" value={tempGuest.gstin || ''} onChange={(v: string) => handleAutoSave('gstin', v)} />
                <Inp label="Nationality" value={tempGuest.nationality || 'Indian'} onChange={(v: string) => handleAutoSave('nationality', v)} />
              </div>
            </div>
          )}

          {activeTab === 'BILLING' && (
            <div className="space-y-10 animate-in fade-in duration-300 invoice-sheet">
              <div className="flex justify-between items-center no-print">
                <SectionHeader title="Folio Transactions" />
                <div className="flex gap-3">
                  <button onClick={() => setShowAddCharge(true)} className="bg-[#003d80] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all tracking-widest">+ Add Service</button>
                  <button onClick={() => setShowAddPayment(true)} className="bg-green-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-green-700 transition-all tracking-widest">+ Post Payment</button>
                </div>
              </div>
              <div className="border rounded-[2.5rem] overflow-hidden shadow-sm bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-white uppercase font-black tracking-widest">
                    <tr><th className="p-6">Trans Description</th><th className="p-6 text-right">Debit (₹)</th><th className="p-6 text-right">Credit (₹)</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold uppercase text-black">
                    <tr className="bg-blue-50/30 font-black">
                      <td className="p-6 text-black">Room Rent ({room.number})</td>
                      <td className="p-6 text-right">₹{totals.rent.toFixed(2)}</td>
                      <td className="p-6 text-right text-black">-</td>
                    </tr>
                    {(finalBooking.charges || []).map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-6">{c.description}</td>
                        <td className="p-6 text-right">₹{c.amount.toFixed(2)}</td>
                        <td className="p-6 text-right text-black">-</td>
                      </tr>
                    ))}
                    {(finalBooking.payments || []).map(p => (
                      <tr key={p.id} className="bg-green-50/20 text-black font-black">
                        <td className="p-6">Payment: {p.method} ({p.date})</td>
                        <td className="p-6 text-right text-black">-</td>
                        <td className="p-6 text-right">₹{p.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-black">
                    <tr className="border-t-2">
                       <td className="p-6 text-black">Tax Summary (GST {totals.taxRate}%)</td>
                       <td className="p-6 text-right text-black">₹{(totals.sgst + totals.cgst).toFixed(2)}</td>
                       <td className="p-6 text-right text-black">-</td>
                    </tr>
                    <tr className="bg-slate-900 text-white">
                      <td colSpan={2} className="p-6 text-right text-[10px] tracking-widest opacity-50 uppercase">Balance Payable</td>
                      <td className="p-6 text-right text-2xl font-black">₹{totals.balance.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex gap-4 no-print">
                 <button onClick={() => window.print()} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black">Print Folio</button>
                 <button onClick={downloadFolioCSV} className="bg-blue-100 text-blue-900 px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-200">Download Data</button>
              </div>
            </div>
          )}
          
          {activeTab === 'DOCS' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex justify-between items-center no-print">
                <SectionHeader title="Document Repository" />
                <button onClick={() => setIsCameraOpen(true)} className="bg-orange-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg">Capture Guest Photo</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <DocBox label="Aadhar Front" src={tempGuest.documents.aadharFront} onUpload={(base64) => handleDocumentUpload('aadharFront', base64)} />
                <DocBox label="Aadhar Back" src={tempGuest.documents.aadharBack} onUpload={(base64) => handleDocumentUpload('aadharBack', base64)} />
                <DocBox label="PAN Card" src={tempGuest.documents.pan} onUpload={(base64) => handleDocumentUpload('pan', base64)} />
                <DocBox label="Passport Front" src={tempGuest.documents.passportFront} onUpload={(base64) => handleDocumentUpload('passportFront', base64)} />
                <DocBox label="Passport Back" src={tempGuest.documents.passportBack} onUpload={(base64) => handleDocumentUpload('passportBack', base64)} />
                <DocBox label="Guest Photo" src={tempGuest.documents.photo} onUpload={(base64) => handleDocumentUpload('photo', base64)} isPhoto />
              </div>
            </div>
          )}
        </div>
      </div>

      {showExtensionModal && (
        <div className="fixed inset-0 z-[400] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-black no-print">
          <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-10 bg-blue-900 text-white font-black uppercase text-xs tracking-widest text-center">Extend Guest Stay</div>
            <div className="p-12 space-y-6">
               <Inp label="New Checkout Date" type="date" value={newCheckoutDate} onChange={setNewCheckoutDate} />
               <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowExtensionModal(false)} className="flex-1 font-black text-black uppercase text-[10px] tracking-widest">Cancel</button>
                  <button onClick={handleExtendStay} className="flex-1 bg-blue-900 text-white font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest shadow-xl">Apply Extension</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {showAddCharge && <ActionModal title="Charge" type="CHARGE" onClose={() => setShowAddCharge(false)} onSubmit={(data: any) => onUpdate({...finalBooking, charges: [...(finalBooking.charges || []), {id: Date.now().toString(), date: new Date().toISOString().split('T')[0], ...data}]})} />}
      {showAddPayment && <ActionModal title="Payment" type="PAYMENT" onClose={() => setShowAddPayment(false)} onSubmit={(data: any) => onAddPayment({id: Date.now().toString(), date: new Date().toISOString().split('T')[0], ...data})} />}
      {isCameraOpen && <CameraCapture onCapture={(img) => { handleDocumentUpload('photo', img); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};

const InvoiceView = ({ booking, guest, room, settings, totals, onClose, onFinalize, onWhatsApp }: any) => {
  return (
    <div className="fixed inset-0 z-[200] bg-[#f8fafc] flex flex-col p-4 md:p-8 overflow-y-auto custom-scrollbar no-print-backdrop text-black">
      <div className="max-w-[1100px] mx-auto w-full space-y-6">
        <div className="flex justify-between items-center no-print bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <button onClick={onClose} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Back to Folio</button>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-700">Print / Save PDF</button>
            <button onClick={onWhatsApp} className="bg-green-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700">Share on WhatsApp</button>
            <button onClick={onFinalize} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">Close Desk</button>
          </div>
        </div>

        <div className="bg-white p-12 shadow-2xl rounded-none md:rounded-3xl border border-slate-100 print:p-0 print:border-none invoice-sheet">
          <div className="flex justify-between items-start mb-10 border-b pb-10">
            <div className="flex gap-6 items-center">
              {settings.logo ? (
                <img src={settings.logo} className="w-24 h-24 object-contain" />
              ) : (
                <div className="w-20 h-20 bg-[#003d80] rounded-2xl flex items-center justify-center text-white font-black text-3xl">HS</div>
              )}
              <div className="max-w-md text-left">
                <h1 className="text-3xl font-black text-black uppercase tracking-tighter leading-none mb-2">{settings.name}</h1>
                <p className="text-[10px] font-bold text-black uppercase tracking-widest leading-relaxed">{settings.address}</p>
                {settings.gstNumber && <p className="text-[10px] font-black text-black mt-2 tracking-widest">GST NO: {settings.gstNumber}</p>}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black text-gray-200 uppercase tracking-widest mb-1">Tax Invoice</h2>
              <p className="text-[11px] font-black text-black uppercase tracking-[0.2em] mb-4">Ref: {booking.bookingNo}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 mb-10 text-[11px] border border-slate-100 rounded-[2.5rem] p-10 bg-slate-50/50">
            <div className="space-y-3">
              <Row label="Invoice Number" value={`HS-${new Date().getFullYear()}-${booking.id.slice(-5)}`} />
              <Row label="Guest Name" value={guest.name} />
              <Row label="Contact Detail" value={`${guest.phone}`} />
              <Row label="Origin State" value={`${guest.state}`} />
              <Row label="Arrival" value={`${booking.checkInDate} ${booking.checkInTime}`} />
            </div>
            <div className="text-right space-y-3">
              <Row label="Bill Date" value={new Date().toLocaleDateString('en-GB')} />
              <Row label="Room" value={room.number} />
              <Row label="Departure" value={`${booking.checkOutDate} ${booking.checkOutTime}`} />
              <Row label="Payment Status" value={totals.balance <= 0 ? "PAID" : "UNPAID"} />
            </div>
          </div>

          <table className="w-full text-[11px] mb-10 border-collapse print-break-inside-avoid">
            <thead className="bg-[#003d80] text-white font-black uppercase tracking-widest">
              <tr>
                <th className="p-5 text-left">Description</th>
                <th className="p-5 text-center">HSN</th>
                <th className="p-5 text-right">Taxable (₹)</th>
                <th className="p-5 text-right">GST %</th>
                <th className="p-5 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold uppercase text-black">
              <tr>
                <td className="p-5 font-black">ROOM TARIFF - {room.number}</td>
                <td className="p-5 text-center">{settings.hsnCode || '9963'}</td>
                <td className="p-5 text-right">{totals.rent.toFixed(2)}</td>
                <td className="p-5 text-right">{totals.taxRate}%</td>
                <td className="p-5 text-right font-black">{(totals.rent * (1 + totals.taxRate/100)).toFixed(2)}</td>
              </tr>
              {(booking.charges || []).map(c => (
                <tr key={c.id}>
                  <td className="p-5">{c.description}</td>
                  <td className="p-5 text-center">{settings.hsnCode || '9963'}</td>
                  <td className="p-5 text-right">{c.amount.toFixed(2)}</td>
                  <td className="p-5 text-right">{totals.taxRate}%</td>
                  <td className="p-5 text-right font-black">{(c.amount * (1 + totals.taxRate/100)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-black">
              <tr>
                <td colSpan={4} className="p-5 text-right uppercase tracking-widest text-black">Total Taxable Amount</td>
                <td className="p-5 text-right text-black">₹{totals.taxable.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="p-5 text-right uppercase tracking-widest text-black">CGST @ {totals.taxRate/2}%</td>
                <td className="p-5 text-right text-black">₹{totals.cgst.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="p-5 text-right uppercase tracking-widest text-black">SGST @ {totals.taxRate/2}%</td>
                <td className="p-5 text-right text-black">₹{totals.sgst.toFixed(2)}</td>
              </tr>
              <tr className="bg-slate-900 text-white">
                <td colSpan={4} className="p-5 text-right text-lg uppercase tracking-widest">Grand Total</td>
                <td className="p-5 text-right text-xl font-black">₹{totals.debit.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="grid grid-cols-2 gap-16 pt-20 border-t border-slate-100 print-break-inside-avoid">
             <div className="text-center">
                <div className="h-16 flex items-center justify-center mb-4">
                  {settings.signature && <img src={settings.signature} className="h-full object-contain" />}
                </div>
                <p className="text-[10px] font-black uppercase text-black border-t pt-2">Authorized Signature</p>
             </div>
             <div className="text-center">
                <div className="h-16 mb-4"></div>
                <p className="text-[10px] font-black uppercase text-black border-t pt-2">Guest Signature</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-4">
    <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
    <h3 className="text-xl font-black text-black uppercase tracking-tight">{title}</h3>
  </div>
);

const Row = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-baseline group">
    <span className="font-black text-black uppercase text-[9px] tracking-widest opacity-60">{label}</span>
    <span className="font-black text-black uppercase text-right ml-6">{value}</span>
  </div>
);

const TabBtn = ({ active, label, onClick }: any) => (
  <button onClick={onClick} className={`w-full p-5 text-left font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all ${active ? 'bg-[#003d80] text-white shadow-xl shadow-blue-100' : 'text-black hover:bg-slate-50'}`}>{label}</button>
);

const Inp = ({ label, value, onChange, disabled, type = "text" }: any) => (
  <div className="space-y-2 w-full text-left">
    <label className="text-[10px] font-black uppercase text-black ml-1 tracking-widest">{label}</label>
    <input 
      type={type}
      className={`w-full border-2 border-slate-100 rounded-[1.5rem] p-4 font-black text-black outline-none transition-all shadow-sm text-[12px] ${disabled ? 'bg-slate-100 cursor-not-allowed text-black' : 'bg-slate-50/50 focus:border-blue-500 focus:bg-white'}`} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      disabled={disabled}
    />
  </div>
);

const DocBox = ({ label, src, onUpload, isPhoto }: { label: string, src?: string, onUpload: (base64: string) => void, isPhoto?: boolean }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onUpload(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="aspect-video bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center overflow-hidden shadow-inner group transition-all hover:border-blue-200 relative">
      {src ? (
        <>
          <img src={src} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all no-print">
             <button onClick={() => fileInputRef.current?.click()} className="bg-white text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Replace</button>
          </div>
        </>
      ) : (
        <div className="text-center p-4 no-print">
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#003d80] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase mb-2">Upload {label}</button>
          <p className="text-[8px] font-black text-black uppercase tracking-widest">or drag & drop</p>
        </div>
      )}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
    </div>
  );
};

const ActionModal = ({ title, type, onClose, onSubmit }: any) => {
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [method, setMethod] = useState('Cash');

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-black no-print">
      <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        <div className={`p-10 text-white font-black uppercase text-xs tracking-widest text-center ${type === 'CHARGE' ? 'bg-[#003d80]' : 'bg-green-600'}`}>
          Post Ledger Entry: {title}
        </div>
        <div className="p-12 space-y-6">
          <Inp label="Narrative / Description" value={desc} onChange={setDesc} />
          <Inp label="Transactional Amount (₹)" value={amt} onChange={setAmt} type="number" />
          
          {type === 'PAYMENT' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-black ml-1 tracking-widest">Payment Mode</label>
              <select className="w-full border-2 p-4 rounded-2xl font-black text-black bg-gray-50 focus:bg-white transition-all outline-none text-xs" value={method} onChange={e => setMethod(e.target.value)}>
                <option value="Cash">Cash Settlement</option>
                <option value="UPI">UPI / QR Transfer</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Bank Transfer">NEFT / Bank Transfer</option>
              </select>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button onClick={onClose} className="flex-1 font-black text-black uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors">Discard</button>
            <button onClick={() => { if(desc && amt) { onSubmit({description: desc, amount: parseFloat(amt) || 0, method: method}); onClose(); } }} className={`flex-1 ${type === 'CHARGE' ? 'bg-[#003d80]' : 'bg-green-600'} text-white font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all`}>Confirm Entry</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StayManagement;
