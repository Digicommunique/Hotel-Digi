
import React from 'react';
import { Guest, Booking, Room, HostelSettings, Payment } from '../types';

interface InvoiceViewProps {
  guest: Guest;
  booking: Booking;
  room: Room;
  settings: HostelSettings;
  payments: Payment[];
}

const InvoiceView: React.FC<InvoiceViewProps> = ({ guest, booking, room, settings, payments }) => {
  const taxRate = settings.taxRate || 12;
  const subTotal = booking.basePrice - (booking.discount || 0);
  const taxAmount = (subTotal * taxRate) / 100;
  const netTotal = subTotal + taxAmount;
  
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const balance = netTotal - totalPaid;

  const start = new Date(booking.checkInDate);
  const end = new Date(booking.checkOutDate);
  const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

  const totalPax = (booking.adults || 0) + (booking.children || 0) + (booking.kids || 0) + (booking.others || 0);
  const paxBreakdown = [];
  if (booking.adults) paxBreakdown.push(`${booking.adults}A`);
  if (booking.children) paxBreakdown.push(`${booking.children}C`);
  if (booking.kids) paxBreakdown.push(`${booking.kids}K`);
  if (booking.others) paxBreakdown.push(`${booking.others}E`);

  // UPI QR Construction
  const upiUrl = `upi://pay?pa=${settings.upiId || ''}&pn=${encodeURIComponent(settings.name)}&am=${balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Bill ' + booking.bookingNo)}`;
  const upiQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;

  // Bill Summary QR
  const billSummary = `PROPERTY: ${settings.name}\nINV: ${booking.bookingNo}\nGuest: ${guest.name}\nUnit: ${room.number}\nTotal: ₹${netTotal.toFixed(2)}\nBalance: ₹${balance.toFixed(2)}`;
  const billQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(billSummary)}`;

  return (
    <div className="bg-white p-10 w-[210mm] min-h-[297mm] mx-auto text-[11px] text-gray-800 font-sans leading-tight border border-gray-200 shadow-2xl print:border-none print:shadow-none print:m-0 print:p-6 invoice-sheet">
      
      {/* Premium Header */}
      <div className="flex justify-between items-start mb-8 border-b-4 border-blue-900 pb-6">
        <div className="flex items-center gap-6">
          {settings.logo ? (
             <div className="w-24 h-24 bg-white border rounded-2xl p-2 flex items-center justify-center shadow-sm">
                <img src={settings.logo} className="max-h-full max-w-full object-contain" alt="Logo" />
             </div>
          ) : (
             <div className="w-20 h-20 bg-blue-900 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg">
                {settings.name?.charAt(0) || 'H'}
             </div>
          )}
          
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter leading-none">{settings.name}</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase max-w-xs leading-relaxed">{settings.address}</p>
            <div className="flex gap-4 pt-1">
               <p className="text-[10px] font-black text-blue-800 uppercase">GSTIN: {settings.gstNumber || 'N/A'}</p>
               {settings.hsnCode && <p className="text-[10px] font-black text-gray-400 uppercase">HSN: {settings.hsnCode}</p>}
            </div>
          </div>
        </div>
        
        <div className="text-right flex flex-col justify-between h-24">
          <div className="bg-blue-900 text-white px-6 py-2 rounded-xl inline-block shadow-lg">
             <p className="text-[10px] font-black uppercase tracking-widest">Tax Invoice</p>
          </div>
          <div className="space-y-0.5">
             <p className="text-[9px] font-black text-gray-400 uppercase">Invoice Number</p>
             <p className="text-lg font-black text-blue-900 uppercase tracking-tight">{booking.bookingNo}</p>
          </div>
        </div>
      </div>

      {/* Guest & Stay Details Grid */}
      <div className="grid grid-cols-2 gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
        <div className="bg-white p-5 space-y-3">
          <InfoItem label="Guest Details" value={guest.name} subValue={`${guest.phone} | ${guest.email}`} isPrimary />
          <InfoItem label="Permanent Address" value={guest.address} />
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
             <InfoItem label="Nationality" value={guest.nationality} />
             <InfoItem label="State" value={guest.state} />
          </div>
        </div>
        <div className="bg-white p-5 space-y-3">
          <div className="grid grid-cols-2 gap-4">
             <InfoItem label="Stay Period" value={`${nights} Night(s)`} />
             <InfoItem label="Unit Number" value={`Room ${room.number}`} subValue={room.type} isPrimary />
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-2">
             <InfoItem label="Arrival" value={booking.checkInDate} subValue={booking.checkInTime} />
             <InfoItem label="Departure" value={booking.checkOutDate} subValue={booking.checkOutTime} />
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-2">
             <InfoItem label="Occupancy" value={`${totalPax} Person(s)`} subValue={paxBreakdown.join(', ')} />
             <InfoItem label="Meal Plan" value={booking.mealPlan || 'EP'} />
          </div>
        </div>
      </div>

      {/* Charge Ledger */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-blue-50/50 border-b border-gray-200 font-black uppercase text-blue-900 text-[9px]">
            <tr>
              <th className="p-4 w-12 text-center">#</th>
              <th className="p-4">Description of Service</th>
              <th className="p-4 text-right">Qty</th>
              <th className="p-4 text-right">Rate</th>
              <th className="p-4 text-right">Taxable Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-bold">
            <tr className="bg-white">
              <td className="p-4 text-center text-gray-400">01</td>
              <td className="p-4">
                 <p className="uppercase text-blue-900">Room Tariff - {room.type}</p>
                 <p className="text-[8px] text-gray-400 font-medium">Standard stay allocation for the period specified above</p>
              </td>
              <td className="p-4 text-right">{nights}</td>
              <td className="p-4 text-right">₹{(booking.basePrice / nights).toFixed(2)}</td>
              <td className="p-4 text-right">₹{booking.basePrice.toFixed(2)}</td>
            </tr>
            {booking.charges.map((c, i) => (
              <tr key={c.id} className="bg-white">
                <td className="p-4 text-center text-gray-400">{String(i + 2).padStart(2, '0')}</td>
                <td className="p-4 uppercase">{c.description}</td>
                <td className="p-4 text-right">1</td>
                <td className="p-4 text-right">₹{c.amount.toFixed(2)}</td>
                <td className="p-4 text-right">₹{c.amount.toFixed(2)}</td>
              </tr>
            ))}
            {booking.discount > 0 && (
              <tr className="bg-red-50/20 text-red-600 italic">
                <td className="p-4"></td>
                <td className="p-4">LESS: APPLIED DISCOUNT / OFFER</td>
                <td colSpan={2}></td>
                <td className="p-4 text-right">-₹{booking.discount.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tax & Totals Section */}
      <div className="grid grid-cols-2 gap-10 mb-8">
        <div className="space-y-4">
           <div className="bg-gray-50 border p-4 rounded-2xl">
              <p className="text-[9px] font-black uppercase text-gray-400 mb-2 border-b pb-2">Settlement Summary</p>
              <table className="w-full text-[9px] font-bold">
                 <tbody>
                    {payments.map(p => (
                       <tr key={p.id} className="border-b border-gray-100 last:border-0 h-8">
                          <td className="text-gray-500 uppercase">{p.method}</td>
                          <td className="text-right text-green-700">₹{p.amount.toFixed(2)}</td>
                       </tr>
                    ))}
                    {payments.length === 0 && <tr><td colSpan={2} className="py-2 text-gray-300 italic">No receipts recorded</td></tr>}
                 </tbody>
              </table>
           </div>
        </div>
        
        <div className="bg-blue-900 rounded-[2rem] p-8 text-white space-y-4 shadow-xl">
           <div className="flex justify-between items-center text-xs opacity-70 font-black uppercase">
              <span>Taxable Subtotal</span>
              <span>₹{subTotal.toFixed(2)}</span>
           </div>
           <div className="flex justify-between items-center text-xs opacity-70 font-black uppercase">
              <span>GST @ {taxRate}%</span>
              <span>₹{taxAmount.toFixed(2)}</span>
           </div>
           <div className="h-px bg-white/20 my-2"></div>
           <div className="flex justify-between items-end">
              <div>
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Total Bill Value</p>
                 <p className="text-3xl font-black tracking-tighter">₹{netTotal.toFixed(2)}</p>
              </div>
              <div className="text-right">
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Balance Due</p>
                 <p className="text-xl font-black text-red-400 tracking-tighter">₹{balance.toFixed(2)}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Interactive QR Settlement Area */}
      <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 mb-10 no-print">
        <div className="flex items-center gap-6">
           <div className="w-24 h-24 bg-white p-2 rounded-2xl shadow-md border flex items-center justify-center">
              <img src={upiQrSrc} className="w-full h-full" alt="Pay QR" />
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest leading-none">Instant UPI Payment</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed">Scan to pay outstanding balance<br/>UPI: {settings.upiId || 'Not Configured'}</p>
           </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="w-24 h-24 bg-white p-2 rounded-2xl shadow-md border flex items-center justify-center">
              <img src={billQrSrc} className="w-full h-full" alt="Bill QR" />
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest leading-none">Digital Invoice Copy</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed">Scan to verify bill records or<br/>download digital PDF copy</p>
           </div>
        </div>
      </div>

      {/* Signature & Authentication */}
      <div className="grid grid-cols-3 gap-12 text-center pt-12">
        <div className="space-y-4">
           <div className="h-16 flex items-end justify-center border-b border-gray-200"></div>
           <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Guest Signature</p>
        </div>
        <div className="space-y-4">
           <div className="h-16 flex items-end justify-center border-b border-gray-200 overflow-hidden">
              {settings.signature ? (
                <img src={settings.signature} className="h-full object-contain mix-blend-multiply" alt="Signature" />
              ) : null}
           </div>
           <p className="text-[9px] font-black uppercase text-blue-900 tracking-widest">Authorized Signatory</p>
        </div>
        <div className="space-y-4">
           <div className="h-16 flex items-end justify-center border-b border-gray-200"></div>
           <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">For {settings.name}</p>
        </div>
      </div>

      <div className="mt-12 text-center space-y-2">
         <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em]">Thank You for choosing {settings.name}</p>
         <div className="flex justify-center gap-4 text-[7px] font-bold text-gray-300 uppercase">
            <span>Corporate Bill</span>
            <span>•</span>
            <span>Property Registry Copy</span>
            <span>•</span>
            <span>Digital Original</span>
         </div>
      </div>

    </div>
  );
};

const InfoItem = ({ label, value, subValue, isPrimary = false }: { label: string, value?: string, subValue?: string, isPrimary?: boolean }) => (
  <div className="space-y-1">
    <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">{label}</p>
    <p className={`uppercase tracking-tight leading-none ${isPrimary ? 'text-sm font-black text-blue-900' : 'text-[10px] font-bold text-gray-700'}`}>
       {value || '—'}
    </p>
    {subValue && <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">{subValue}</p>}
  </div>
);

export default InvoiceView;
