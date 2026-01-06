
import React, { useState, useMemo } from 'react';
import { Booking, Guest, Room, RoomStatus, Transaction, RoomShiftLog, CleaningLog, Quotation } from '../types';

interface ReportsProps {
  bookings: Booking[];
  guests: Guest[];
  rooms: Room[];
  transactions: Transaction[];
  shiftLogs: RoomShiftLog[];
  cleaningLogs: CleaningLog[];
  quotations: Quotation[];
  settings: any;
}

type ReportType = 'POLICE' | 'CHECKOUT_REG' | 'COLLECTION' | 'OCCUPANCY' | 'DAYBOOK' | 'SUMMARY';

const Reports: React.FC<ReportsProps> = ({ bookings, guests, rooms, transactions, shiftLogs, cleaningLogs, quotations, settings }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('SUMMARY');
  const [filterDate, setFilterDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 20);
    return d.toLocaleDateString('en-CA');
  });

  const filteredData = useMemo(() => {
    if (activeReport === 'DAYBOOK') return transactions.filter(t => t.date === filterDate);
    if (activeReport === 'CHECKOUT_REG') return bookings.filter(b => b.status === 'COMPLETED' && b.checkOutDate === filterDate);
    if (activeReport === 'COLLECTION') return transactions.filter(t => t.type === 'RECEIPT' && t.date === filterDate);
    if (activeReport === 'POLICE') return bookings.filter(b => b.checkInDate <= filterDate && (b.status === 'ACTIVE' || (b.status === 'RESERVED' && b.checkOutDate >= filterDate)));
    return [];
  }, [bookings, transactions, activeReport, filterDate]);

  const stats = useMemo(() => {
    const todayColl = transactions.filter(t => t.type === 'RECEIPT' && t.date === filterDate).reduce((s, t) => s + t.amount, 0);
    const todayCheckin = bookings.filter(b => b.checkInDate === filterDate).length;
    const todayCheckout = bookings.filter(b => b.checkOutDate === filterDate && b.status === 'COMPLETED').length;
    const totalPayments = transactions.filter(t => t.type === 'PAYMENT' && t.date === filterDate).reduce((s, t) => s + t.amount, 0);
    return { todayColl, todayCheckin, todayCheckout, totalPayments };
  }, [transactions, bookings, filterDate]);

  const occupancyDays = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [startDate, endDate]);

  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = () => {
    let headers = "";
    let rows = "";
    const filename = `${activeReport}_${filterDate}.csv`;

    switch (activeReport) {
      case 'DAYBOOK':
        headers = "Date,Type,Ledger,Entity,Debit,Credit\n";
        rows = (filteredData as Transaction[]).map(t => 
          `${t.date},${t.type},${t.ledger},${t.entityName || ''},${t.type === 'PAYMENT' ? t.amount : 0},${t.type === 'RECEIPT' ? t.amount : 0}`
        ).join('\n');
        break;
      case 'CHECKOUT_REG':
        headers = "Room,Guest,Check-in,Check-out Time,Settled Amt\n";
        rows = (filteredData as Booking[]).map(b => {
          const room = rooms.find(r => r.id === b.roomId);
          const guest = guests.find(g => g.id === b.guestId);
          const settled = (b.payments || []).reduce((s, p) => s + p.amount, 0);
          return `${room?.number},${guest?.name},${b.checkInDate},${b.checkOutTime},${settled}`;
        }).join('\n');
        break;
      case 'COLLECTION':
        headers = "Entity,Account,Remarks,Amount\n";
        rows = (filteredData as Transaction[]).map(t => 
          `${t.entityName || 'General'},${t.ledger},${t.description.replace(/,/g, ' ')},${t.amount}`
        ).join('\n');
        break;
      case 'POLICE':
        headers = "Room,Guest Name,Phone,Origin State,Arrival\n";
        rows = (filteredData as Booking[]).map(b => {
          const room = rooms.find(r => r.id === b.roomId);
          const guest = guests.find(g => g.id === b.guestId);
          return `${room?.number},${guest?.name},${guest?.phone},${guest?.state},${b.checkInDate}`;
        }).join('\n');
        break;
    }
    downloadCSV(filename, headers + rows);
  };

  const shareWhatsAppSummary = () => {
    let summaryText = "";
    if (activeReport === 'COLLECTION') {
      const total = (filteredData as Transaction[]).reduce((s,t) => s + t.amount, 0);
      summaryText = `Collection Register Summary for ${filterDate}\nTotal Collection: ₹${total.toFixed(2)}\n\nEntries:\n`;
      (filteredData as Transaction[]).forEach(t => {
        summaryText += `- ${t.ledger}: ₹${t.amount.toFixed(2)} (${t.entityName || 'General'})\n`;
      });
    } else if (activeReport === 'SUMMARY') {
      summaryText = `Performance Summary - ${filterDate}\nTotal Collection: ₹${stats.todayColl.toFixed(2)}\nArrivals: ${stats.todayCheckin}\nDepartures: ${stats.todayCheckout}\nExpenses: ₹${stats.totalPayments.toFixed(2)}`;
    } else {
      summaryText = `${activeReport} Report generated for ${filterDate}. Records: ${filteredData.length}`;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    window.open(url, '_blank');
  };

  const renderHeader = (title: string, showDownload: boolean = true) => (
    <div className="flex justify-between items-center border-b-8 border-[#003d80] pb-6 mb-8 print:border-b-4">
      <div>
        <h2 className="text-4xl font-black text-[#003d80] uppercase tracking-tighter leading-none">{title}</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{settings.name} &bull; Property Management System</p>
      </div>
      <div className="flex gap-2 no-print">
        {showDownload && (
          <button onClick={handleDownload} className="bg-slate-100 text-[#003d80] px-8 py-3 rounded-2xl font-black text-[11px] uppercase border hover:bg-slate-200 transition-all">Download CSV</button>
        )}
        <button onClick={shareWhatsAppSummary} className="bg-green-600 text-white px-8 py-3 rounded-2xl font-black text-[11px] uppercase shadow-xl hover:bg-green-700 transition-all">WhatsApp Share</button>
        <button onClick={() => window.print()} className="bg-[#003d80] text-white px-8 py-3 rounded-2xl font-black text-[11px] uppercase shadow-xl hover:bg-black transition-all">Print Report</button>
      </div>
    </div>
  );

  return (
    <div className="p-10 bg-white min-h-full scroll-smooth flex flex-col animate-in fade-in duration-500 text-black">
      <div className="flex gap-2 mb-8 overflow-x-auto pb-4 no-print border-b scrollbar-hide">
        <Tab active={activeReport === 'SUMMARY'} label="Executive Summary" onClick={() => setActiveReport('SUMMARY')} />
        <Tab active={activeReport === 'OCCUPANCY'} label="Occupancy Chart" onClick={() => setActiveReport('OCCUPANCY')} />
        <Tab active={activeReport === 'POLICE'} label="Police Report" onClick={() => setActiveReport('POLICE')} />
        <Tab active={activeReport === 'CHECKOUT_REG'} label="Checkout Reg" onClick={() => setActiveReport('CHECKOUT_REG')} />
        <Tab active={activeReport === 'COLLECTION'} label="Collection Reg" onClick={() => setActiveReport('COLLECTION')} />
        <Tab active={activeReport === 'DAYBOOK'} label="Day Book" onClick={() => setActiveReport('DAYBOOK')} />
      </div>

      <div className="mb-10 p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 flex flex-wrap items-center gap-12 no-print">
        {activeReport === 'OCCUPANCY' ? (
          <>
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Start Date</label>
              <input type="date" className="border-2 p-3 rounded-2xl font-black text-xs text-slate-900 bg-white shadow-sm outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">End Date</label>
              <input type="date" className="border-2 p-3 rounded-2xl font-black text-xs text-slate-900 bg-white shadow-sm outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Target Date</label>
            <input type="date" className="border-2 p-3 rounded-2xl font-black text-xs text-slate-900 bg-white shadow-sm outline-none" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
        )}
      </div>

      <div className="report-content flex-1">
        {activeReport === 'SUMMARY' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            {renderHeader(`Daily Performance Summary - ${filterDate}`, false)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <SummaryCard label="Daily Collection" value={`₹${stats.todayColl.toFixed(2)}`} color="bg-green-600" />
              <SummaryCard label="Arrivals (Today)" value={stats.todayCheckin} color="bg-blue-600" />
              <SummaryCard label="Departures (Today)" value={stats.todayCheckout} color="bg-orange-500" />
            </div>
          </div>
        )}

        {activeReport === 'OCCUPANCY' && (
          <div className="overflow-x-auto custom-scrollbar border rounded-[2rem] shadow-xl">
            {renderHeader("Visual Occupancy Chart", false)}
            <table className="w-full text-[9px] border-collapse min-w-[1500px]">
              <thead className="bg-[#003d80] text-white uppercase font-black">
                <tr>
                  <th className="p-4 border border-blue-900 sticky left-0 bg-[#003d80] z-20 w-32">Room #</th>
                  {occupancyDays.map(day => (
                    <th key={day.toISOString()} className={`p-4 border border-blue-900 min-w-[80px] ${day.getDay() === 0 ? 'bg-red-800' : ''}`}>
                      {day.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}<br/>
                      {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {rooms.map(room => (
                  <tr key={room.id} className="hover:bg-slate-50">
                    <td className="p-4 border border-slate-100 font-black text-black sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] uppercase">
                      {room.number}
                    </td>
                    {occupancyDays.map(day => {
                      const dayStr = day.toISOString().split('T')[0];
                      const b = bookings.find(b => b.roomId === room.id && dayStr >= b.checkInDate && dayStr <= b.checkOutDate && b.status !== 'CANCELLED');
                      return (
                        <td key={dayStr} className={`p-2 border border-slate-100 text-center relative h-16 ${b ? 'bg-green-100' : ''}`}>
                          {b && <div className="font-black text-[8px] uppercase text-green-900 leading-tight">OCCUPIED</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'DAYBOOK' && (
          <div>
            {renderHeader(`Day Book Registry - ${filterDate}`)}
            <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-slate-900 text-white uppercase font-black tracking-widest">
                  <tr><th className="p-5 text-left">Type</th><th className="p-5 text-left">Account</th><th className="p-5 text-left">Entity</th><th className="p-5 text-right">Debit (₹)</th><th className="p-5 text-right">Credit (₹)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-black uppercase font-bold">
                  {(filteredData as Transaction[]).map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-5">{t.type}</td>
                      <td className="p-5">{t.ledger}</td>
                      <td className="p-5">{t.entityName || '-'}</td>
                      <td className="p-5 text-right">{t.type === 'PAYMENT' ? t.amount.toFixed(2) : '-'}</td>
                      <td className="p-5 text-right">{t.type === 'RECEIPT' ? t.amount.toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && <tr><td colSpan={5} className="p-20 text-center opacity-30 font-black">No Transactions for this Date</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'CHECKOUT_REG' && (
          <div>
            {renderHeader(`Checkout Register - ${filterDate}`)}
            <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-orange-600 text-white uppercase font-black tracking-widest">
                  <tr><th className="p-5 text-left">Room</th><th className="p-5 text-left">Guest Name</th><th className="p-5 text-left">Check-in</th><th className="p-5 text-left">Check-out Time</th><th className="p-5 text-right">Settled Amt</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-black uppercase font-bold">
                  {(filteredData as Booking[]).map(b => {
                    const g = guests.find(guest => guest.id === b.guestId);
                    const settled = (b.payments || []).reduce((s,p)=>s+p.amount,0);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-5 font-black">{rooms.find(r=>r.id===b.roomId)?.number}</td>
                        <td className="p-5">{g?.name}</td>
                        <td className="p-5">{b.checkInDate}</td>
                        <td className="p-5">{b.checkOutTime}</td>
                        <td className="p-5 text-right font-black">₹{settled.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && <tr><td colSpan={5} className="p-20 text-center opacity-30 font-black">No Checkouts Recorded</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'POLICE' && (
          <div>
            {renderHeader(`In-House Guests - ${filterDate}`)}
            <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-slate-900 text-white uppercase font-black tracking-widest">
                  <tr><th className="p-5 text-left">Room</th><th className="p-5 text-left">Guest Name</th><th className="p-5 text-left">Phone</th><th className="p-5 text-left">Origin State</th><th className="p-5 text-left">Arrival</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-black uppercase font-bold">
                  {filteredData.map((b: any) => {
                    const g = guests.find(guest => guest.id === b.guestId);
                    return (<tr key={b.id} className="hover:bg-slate-50"><td className="p-5 font-black text-black">{rooms.find(r => r.id === b.roomId)?.number}</td><td className="p-5">{g?.name}</td><td className="p-5">{g?.phone}</td><td className="p-5">{g?.state}</td><td className="p-5">{b.checkInDate}</td></tr>);
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'COLLECTION' && (
          <div>
            <div className="flex justify-between items-center mb-6 no-print">
               <h3 className="font-black text-green-800 uppercase text-sm border-l-8 border-green-600 pl-6 tracking-widest">Collection Register (Cashbook)</h3>
               <div className="flex gap-2">
                 <button onClick={handleDownload} className="bg-slate-100 text-green-800 px-6 py-3 rounded-xl font-black text-[10px] uppercase border hover:bg-slate-200">Download CSV</button>
                 <button onClick={shareWhatsAppSummary} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 transition-all tracking-widest">WhatsApp Share</button>
                 <button onClick={() => window.print()} className="bg-green-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">Print Cashbook</button>
               </div>
            </div>
            <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-[10px] border-collapse">
                 <thead className="bg-green-700 text-white uppercase font-black tracking-widest">
                    <tr><th className="p-5 text-left">Entity</th><th className="p-5 text-left">Account</th><th className="p-5 text-left">Remarks</th><th className="p-5 text-right">Amount (₹)</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-black uppercase font-bold">
                    {(filteredData as Transaction[]).map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                         <td className="p-5">{t.entityName || 'General'}</td>
                         <td className="p-5">{t.ledger}</td>
                         <td className="p-5 italic text-black opacity-60">{t.description}</td>
                         <td className="p-5 text-right font-black text-green-900">₹{t.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                 </tbody>
                 <tfoot className="bg-green-50 font-black border-t-2">
                   <tr><td colSpan={3} className="p-5 text-right uppercase opacity-40">Net Daily Collection</td><td className="p-5 text-right text-xl text-green-900">₹{(filteredData as Transaction[]).reduce((s,t)=>s+t.amount,0).toFixed(2)}</td></tr>
                 </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Tab: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all whitespace-nowrap shadow-sm ${active ? 'bg-[#003d80] text-white border-[#003d80]' : 'bg-white text-black border-slate-50 hover:border-blue-200'}`}>{label}</button>
);

const SummaryCard = ({ label, value, color }: any) => (
  <div className={`${color} p-10 rounded-[3rem] text-white shadow-2xl animate-in zoom-in duration-300`}>
    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-2">{label}</p>
    <p className="text-4xl font-black tracking-tighter">{value}</p>
  </div>
);

export default Reports;
