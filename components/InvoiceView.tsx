
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

  // UPI QR Construction: pa (UPI ID), pn (Name), am (Amount), cu (Currency), tn (Note)
  const upiUrl = `upi://pay?pa=${settings.upiId || ''}&pn=${encodeURIComponent(settings.name)}&am=${balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Bill ' + booking.bookingNo)}`;
  const upiQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;

  // Bill Summary QR (Digital Copy Mock)
  const billSummary = `INV: ${booking.bookingNo}\nGuest: ${guest.name}\nUnit: ${room.number}\nNet Total: INR ${netTotal.toFixed(2)}\nBalance: INR ${balance.toFixed(2)}`;
  const billQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(billSummary)}`;

  return (
    <div className="bg-white p-4 w-[210mm] min-h-[297mm] mx-auto text-[10px] text-gray-800 font-sans leading-tight border border-gray-200 shadow-lg print:border-none print:shadow-none print:m-0 print:p-2">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-4">
          {settings.logo ? (
             <img src={settings.logo} className="h-12 w-auto object-contain" alt="Property Logo" />
          ) : null}
          
          <div className="flex flex-col">
            {settings.name && <h1 className="text-lg font-black text-blue-900 uppercase leading-none">{settings.name}</h1>}
            {settings.address && <p className="text-[8px] font-bold text-gray-500 uppercase mt-1">{settings.address}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-gray-600 uppercase">GST No.: {settings.gstNumber || 'N/A'}</p>
          <p className="text-[8px] font-bold uppercase text-gray-400 mt-1">Date: {new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </div>

      <div className="bg-gray-100 border border-gray-300 py-1 text-center font-bold uppercase mb-0 shadow-sm text-blue-900">
        Tax Invoice
      </div>

      <div className="grid grid-cols-2 border-x border-b border-gray-300">
        <div className="border-r border-gray-300 divide-y divide-gray-300">
          <InfoRow label="Bill No" value={booking.bookingNo} />
          <InfoRow label="Guest Name" value={guest.name} />
          <InfoRow label="Address & Mobile" value={`${guest.address}, ${guest.phone}`} />
          <InfoRow label="Checkin Date" value={`${booking.checkInDate} ${booking.checkInTime}`} />
        </div>
        <div className="divide-y divide-gray-300">
          <InfoRow label="Unit / Room" value={`Unit ${room.number} (${room.type})`} />
          <InfoRow label="Occupants" value={`${totalPax} Person(s) (${paxBreakdown.join(', ')})`} />
          <InfoRow label="Meal Plan" value={booking.mealPlan || 'EP (Room Only)'} />
          <InfoRow label="Checkout Date" value={`${booking.checkOutDate} ${booking.checkOutTime}`} />
        </div>
      </div>

      <div className="mt-4 border border-gray-300 overflow-hidden">
        <table className="w-full text-center border-collapse">
          <thead className="bg-gray-100 border-b border-gray-300 font-bold uppercase">
            <tr className="text-[8px]">
              <th className="p-2 border-r border-gray-300 text-left">Description</th>
              <th className="p-2 border-r border-gray-300 w-20 text-right">Base Value</th>
              <th className="p-2 border-r border-gray-300 w-16 text-right">Tax (%)</th>
              <th className="p-2 text-right w-24">Net Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="text-[9px]">
              <td className="p-2 border-r border-gray-300 text-left">ROOM TARIFF ({nights} NIGHTS STAY)</td>
              <td className="p-2 border-r border-gray-300 text-right">₹{subTotal.toFixed(2)}</td>
              <td className="p-2 border-r border-gray-300 text-right">{taxRate}%</td>
              <td className="p-2 text-right">₹{netTotal.toFixed(2)}</td>
            </tr>
            {booking.charges.map(c => (
              <tr key={c.id} className="text-[9px]">
                <td className="p-2 border-r border-gray-300 text-left">{c.description}</td>
                <td className="p-2 border-r border-gray-300 text-right">₹{c.amount.toFixed(2)}</td>
                <td className="p-2 border-r border-gray-300 text-right">0%</td>
                <td className="p-2 text-right">₹{c.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-gray-300 font-black bg-gray-50 text-[10px]">
            <tr>
              <td colSpan={3} className="p-2 text-right border-r border-gray-300">Grand Total</td>
              <td className="p-2 text-right">₹{netTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="border border-gray-300">
          <div className="bg-gray-100 p-1 text-center font-bold uppercase text-[8px] border-b">Payment Ledger</div>
          <table className="w-full text-[8px]">
            <thead className="border-b"><tr><th className="p-1 text-left">Date</th><th className="p-1 text-left">Mode</th><th className="p-1 text-right">Amount</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-1">{p.date.split('T')[0]}</td>
                  <td className="p-1">{p.method}</td>
                  <td className="p-1 text-right">₹{p.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-100 flex flex-col justify-center items-center text-center">
           <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Balance Due</p>
           <p className="text-2xl font-black text-blue-900">₹{balance.toFixed(2)}</p>
        </div>
      </div>

      {/* QR Codes Section */}
      <div className="mt-6 grid grid-cols-2 gap-4 border-t-2 border-slate-100 pt-6">
        <div className="flex items-center gap-4 border border-slate-200 p-3 rounded-2xl bg-slate-50">
           <div className="w-20 h-20 bg-white p-1 rounded-lg border flex items-center justify-center">
              <img src={upiQrSrc} className="w-full h-full" alt="Pay QR" />
           </div>
           <div>
              <p className="text-[8px] font-black text-blue-900 uppercase tracking-widest leading-none mb-1">Scan to Pay</p>
              <p className="text-[7px] font-bold text-slate-500 leading-tight">Instant Digital Settlement via UPI<br/>UPI ID: {settings.upiId || 'N/A'}</p>
           </div>
        </div>
        <div className="flex items-center gap-4 border border-slate-200 p-3 rounded-2xl bg-slate-50">
           <div className="w-20 h-20 bg-white p-1 rounded-lg border flex items-center justify-center">
              <img src={billQrSrc} className="w-full h-full" alt="Bill QR" />
           </div>
           <div>
              <p className="text-[8px] font-black text-blue-900 uppercase tracking-widest leading-none mb-1">Digital Bill Access</p>
              <p className="text-[7px] font-bold text-slate-500 leading-tight">Scan to verify bill details or<br/>download a digital PDF version</p>
           </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-10 text-[8px] font-bold uppercase text-center">
         <div className="pt-8 border-t border-gray-300">Guest Signature</div>
         <div className="flex flex-col items-center">
            <div className="h-10 w-full flex items-end justify-center mb-1">
              {settings.signature ? (
                <img src={settings.signature} className="h-full w-auto object-contain" alt="Auth Signature" />
              ) : null}
            </div>
            <div className="w-full pt-1 border-t border-gray-300">Authorized Signatory</div>
         </div>
         <div className="pt-8 border-t border-gray-300">Accounts Desk</div>
      </div>
      
      <div className="mt-4 p-2 bg-slate-50 text-[6px] text-gray-400 uppercase text-center tracking-widest">
        This is a computer generated invoice and does not require a physical signature unless otherwise specified.
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-[100px_1fr] p-1.5 items-center">
    <span className="text-[7px] font-bold uppercase text-gray-500">{label}</span>
    <span className="text-[9px] font-black uppercase text-gray-800 truncate">{value || '-'}</span>
  </div>
);

export default InvoiceView;
