
import React, { useState, useMemo } from 'react';
import { Booking, Guest, Room, Transaction, RoomShiftLog, CleaningLog, Quotation } from '../types.ts';

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

type ReportType = 'SUMMARY' | 'OCCUPANCY_CHART' | 'GUEST_REGISTER' | 'DETAILED_OCCUPANCY' | 'COLLECTION' | 'DAYBOOK' | 'CHECK_IN_REPORT' | 'CHECK_OUT_REPORT';

const Reports: React.FC<ReportsProps> = ({ bookings, guests, rooms, transactions, settings }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('OCCUPANCY_CHART');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<{booking: Booking, guest: Guest} | null>(null);

  const dateRange = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  const filteredRooms = useMemo(() => {
    if (selectedCategory === 'All') return rooms;
    return rooms.filter(r => r.type === selectedCategory);
  }, [rooms, selectedCategory]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayColl = transactions.filter(t => t.type === 'RECEIPT' && t.date === today).reduce((s, t) => s + t.amount, 0);
    const todayCheckin = bookings.filter(b => b.checkInDate === today).length;
    const todayCheckout = bookings.filter(b => b.checkOutDate === today && b.status === 'COMPLETED').length;
    return { todayColl, todayCheckin, todayCheckout };
  }, [transactions, bookings]);

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

  const exportToExcel = () => {
    let content = "";
    let filename = `${activeReport}_${startDate}_to_${endDate}.csv`;

    switch (activeReport) {
      case 'OCCUPANCY_CHART':
        content = "Room No,Category," + dateRange.map(d => d.toLocaleDateString('en-GB')).join(",") + "\n";
        filteredRooms.forEach(room => {
          content += `${room.number},${room.type}`;
          dateRange.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const booking = bookings.find(b => 
              b.roomId === room.id && b.status !== 'CANCELLED' && dateStr >= b.checkInDate && dateStr < b.checkOutDate
            );
            const guest = booking ? guests.find(g => g.id === booking.guestId) : null;
            content += `,${booking ? (guest?.name || 'Blocked') : 'Available'}`;
          });
          content += "\n";
        });
        break;

      case 'GUEST_REGISTER':
        content = "SL.No,Guest Name,Room Number,Address,State,Contact Number,Email Id,Company,Bill No.,Checkin Date,Checkout Date,Agent\n";
        bookings.filter(b => b.checkInDate >= startDate && b.checkInDate <= endDate).forEach((b, i) => {
          const g = guests.find(guest => guest.id === b.guestId);
          const r = rooms.find(room => room.id === b.roomId);
          content += `${i+1},"${g?.name || ''}","${r?.number || ''}","${g?.address?.replace(/"/g, '""') || ''}","${g?.state || ''}","${g?.phone || ''}","${g?.email || ''}","${b.company || ''}","${b.bookingNo}","${b.checkInDate}","${b.checkOutDate}","${b.agent || 'Direct'}"\n`;
        });
        break;

      case 'COLLECTION':
        content = "Date,Entity/Source,Account,Amount\n";
        transactions.filter(t => t.type === 'RECEIPT' && t.date >= startDate && t.date <= endDate).forEach(t => {
          content += `${t.date},"${t.entityName || ''}","${t.ledger}",${t.amount}\n`;
        });
        break;

      case 'CHECK_IN_REPORT':
        content = "Date,Time,Guest Name,Room Number,Bill No,Agent\n";
        bookings.filter(b => b.checkInDate >= startDate && b.checkInDate <= endDate).forEach(b => {
          const g = guests.find(guest => guest.id === b.guestId);
          const r = rooms.find(room => room.id === b.roomId);
          content += `${b.checkInDate},${b.checkInTime},"${g?.name || ''}","${r?.number || ''}","${b.bookingNo}","${b.agent || 'Direct'}"\n`;
        });
        break;

      case 'CHECK_OUT_REPORT':
        content = "Date,Time,Guest Name,Room Number,Bill No,Status\n";
        bookings.filter(b => b.checkOutDate >= startDate && b.checkOutDate <= endDate).forEach(b => {
          const g = guests.find(guest => guest.id === b.guestId);
          const r = rooms.find(room => room.id === b.roomId);
          content += `${b.checkOutDate},${b.checkOutTime},"${g?.name || ''}","${r?.number || ''}","${b.bookingNo}","${b.status}"\n`;
        });
        break;

      case 'DETAILED_OCCUPANCY':
        content = "Room,Guest Name,Phone,Check-in Date,Check-in Time,Estimated Check-out\n";
        bookings.filter(b => b.status === 'ACTIVE').forEach(b => {
          const g = guests.find(guest => guest.id === b.guestId);
          const r = rooms.find(room => room.id === b.roomId);
          content += `"${r?.number}","${g?.name}","${g?.phone}","${b.checkInDate}","${b.checkInTime}","${b.checkOutDate}"\n`;
        });
        break;

      case 'SUMMARY':
        const collection = transactions.filter(t => t.type === 'RECEIPT' && t.date >= startDate && t.date <= endDate).reduce((s,t)=>s+t.amount,0);
        const checkins = bookings.filter(b => b.checkInDate >= startDate && b.checkInDate <= endDate).length;
        const checkouts = bookings.filter(b => b.checkOutDate >= startDate && b.checkOutDate <= endDate && b.status === 'COMPLETED').length;
        content = "Metric,Value\n";
        content += `Total Collection,${collection}\n`;
        content += `Total Check-ins,${checkins}\n`;
        content += `Total Check-outs,${checkouts}\n`;
        break;

      default:
        alert("Export for this report type is currently under maintenance.");
        return;
    }
    downloadCSV(filename, content);
  };

  const handleWhatsAppShare = () => {
    let summaryText = `*${settings.name} - ${activeReport.replace(/_/g, ' ')} Report*\n`;
    summaryText += `Period: ${startDate} to ${endDate}\n`;
    summaryText += `--------------------------\n`;
    
    if (activeReport === 'SUMMARY') {
      const collection = transactions.filter(t => t.type === 'RECEIPT' && t.date >= startDate && t.date <= endDate).reduce((s,t)=>s+t.amount,0);
      summaryText += `💰 Total Collection: ₹${collection.toFixed(2)}\n`;
      summaryText += `🏨 Total Check-ins: ${bookings.filter(b => b.checkInDate >= startDate && b.checkInDate <= endDate).length}\n`;
      summaryText += `🚶 Total Check-outs: ${bookings.filter(b => b.checkOutDate >= startDate && b.checkOutDate <= endDate && b.status === 'COMPLETED').length}\n`;
    } else if (activeReport === 'COLLECTION') {
      const total = transactions.filter(t => t.type === 'RECEIPT' && t.date >= startDate && t.date <= endDate).reduce((s,t)=>s+t.amount,0);
      summaryText += `Total Receipts for the selected period: ₹${total.toFixed(2)}\n`;
    } else {
      summaryText += `Generated dynamic report with ${filteredRooms.length} room identifiers.\n`;
    }
    
    summaryText += `--------------------------\n`;
    summaryText += `Generated via HotelSphere Pro`;

    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    window.open(url, '_blank');
  };

  const renderHeader = (title: string) => (
    <div className="flex justify-between items-end border-b-[6px] border-blue-900 pb-4 mb-8 no-print">
      <div>
        <h2 className="text-4xl font-black text-blue-900 uppercase tracking-tighter leading-none">{title}</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">{settings.name} Property Registry</p>
      </div>
      <div className="flex gap-3">
        <div className="text-right mr-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Report Range</p>
          <p className="text-[11px] font-black text-blue-900">{startDate} — {endDate}</p>
        </div>
        <button onClick={exportToExcel} className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">Excel Export</button>
        <button onClick={handleWhatsAppShare} className="bg-green-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-green-700 transition-all">WhatsApp</button>
        <button onClick={() => window.print()} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">Print</button>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-white min-h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex gap-1 mb-8 overflow-x-auto pb-2 no-print scrollbar-hide">
        {(['OCCUPANCY_CHART', 'CHECK_IN_REPORT', 'CHECK_OUT_REPORT', 'GUEST_REGISTER', 'DETAILED_OCCUPANCY', 'SUMMARY', 'COLLECTION'] as ReportType[]).map(r => (
           <Tab key={r} active={activeReport === r} label={r.replace(/_/g, ' ')} onClick={() => setActiveReport(r)} />
        ))}
      </div>

      <div className="mb-10 p-10 bg-white rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.05)] flex flex-wrap items-center gap-12 no-print border">
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-black uppercase text-blue-900 tracking-tighter">Start Date</label>
            <input type="date" className="bg-slate-800 text-white border-none p-3 rounded-xl font-black text-[12px]" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-black uppercase text-blue-900 tracking-tighter">End Date</label>
            <input type="date" className="bg-slate-800 text-white border-none p-3 rounded-xl font-black text-[12px]" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-black uppercase text-blue-900 tracking-tighter">Room Category</label>
            <select className="border-2 border-slate-200 p-3 rounded-xl font-black text-[12px] bg-white outline-none min-w-[150px]" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
               <option value="All">__All__</option>
               {settings.roomTypes.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black text-[11px] uppercase shadow-xl hover:bg-blue-700 transition-all">Search</button>
      </div>

      <div className="report-content flex-1 overflow-hidden">
        {activeReport === 'OCCUPANCY_CHART' && (
          <div className="h-full flex flex-col space-y-4">
            {renderHeader("Occupancy Chart")}
            <div className="flex-1 border-2 border-slate-100 rounded-[3rem] overflow-auto custom-scrollbar shadow-inner bg-white">
               <table className="w-full border-collapse table-fixed min-w-[1500px]">
                  <thead className="sticky top-0 z-20">
                     <tr className="bg-blue-900 text-white text-[10px] font-black uppercase">
                        <th className="p-6 w-40 bg-blue-900 sticky left-0 z-30 border-r border-blue-800 shadow-xl">ROOM Number</th>
                        {dateRange.map((date, idx) => {
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                          return (
                            <th key={idx} className={`p-4 text-center border-r border-blue-800 ${isWeekend ? 'bg-red-700' : 'bg-blue-900'}`}>
                               <div className="tracking-tighter">{date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</div>
                               <div className="opacity-50 text-[8px] mt-1">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            </th>
                          );
                        })}
                     </tr>
                  </thead>
                  <tbody className="text-[11px] font-bold text-gray-700 uppercase">
                     {filteredRooms.map(room => (
                        <tr key={room.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors h-20">
                           <td className="p-4 bg-slate-50 sticky left-0 z-10 border-r shadow-sm font-black text-center leading-tight">
                              <div className="text-blue-900 text-sm tracking-tighter">{room.number}</div>
                              <div className="text-[8px] opacity-40 mt-1">({room.type})</div>
                           </td>
                           {dateRange.map((date, idx) => {
                             const dateStr = date.toISOString().split('T')[0];
                             const booking = bookings.find(b => 
                                b.roomId === room.id && 
                                b.status !== 'CANCELLED' &&
                                dateStr >= b.checkInDate && 
                                dateStr < b.checkOutDate
                             );
                             const guest = booking ? guests.find(g => g.id === booking.guestId) : null;
                             
                             return (
                               <td key={idx} className="border-r border-slate-50 p-0 relative group">
                                  {booking ? (
                                    <div onClick={() => guest && setSelectedBookingDetail({booking, guest})} className={`absolute inset-0 m-1.5 p-2 rounded-xl border-l-[6px] overflow-hidden flex items-center justify-center text-center cursor-pointer transition-all hover:scale-105 hover:z-50 shadow-sm ${booking.status === 'RESERVED' ? 'bg-orange-50 border-orange-500 text-orange-900' : 'bg-green-50 border-green-500 text-green-900'}`}>
                                       <span className="text-[9px] font-black leading-tight tracking-tighter">
                                          {booking.status === 'RESERVED' && !guest ? 'BLOCK ROOM' : guest?.name}
                                       </span>
                                    </div>
                                  ) : null}
                               </td>
                             );
                           })}
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {activeReport === 'CHECK_IN_REPORT' && (
          <div className="h-full flex flex-col space-y-4">
             {renderHeader("Daily Check-In Report")}
             <div className="flex-1 border rounded-[2rem] overflow-auto bg-white shadow-sm">
                <table className="w-full text-[11px] text-left border-collapse">
                   <thead className="bg-slate-100 font-black uppercase text-blue-900 sticky top-0">
                      <tr>
                        <th className="p-5 border-r">Date</th>
                        <th className="p-5 border-r">Time In</th>
                        <th className="p-5 border-r">Guest Name</th>
                        <th className="p-5 border-r">Room Number</th>
                        <th className="p-5 border-r">Bill No.</th>
                        <th className="p-5">Agent</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y font-bold uppercase text-gray-700">
                      {bookings.filter(b => b.checkInDate >= startDate && b.checkInDate <= endDate).map((b) => {
                         const g = guests.find(guest => guest.id === b.guestId);
                         const r = rooms.find(room => room.id === b.roomId);
                         return (
                            <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                               <td className="p-5 border-r">{b.checkInDate}</td>
                               <td className="p-5 border-r">{b.checkInTime}</td>
                               <td className="p-5 border-r font-black text-blue-900">{g?.name}</td>
                               <td className="p-5 border-r">{r?.number}</td>
                               <td className="p-5 border-r">{b.bookingNo}</td>
                               <td className="p-5">{b.agent || 'Direct'}</td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeReport === 'CHECK_OUT_REPORT' && (
          <div className="h-full flex flex-col space-y-4">
             {renderHeader("Daily Check-Out Report")}
             <div className="flex-1 border rounded-[2rem] overflow-auto bg-white shadow-sm">
                <table className="w-full text-[11px] text-left border-collapse">
                   <thead className="bg-slate-100 font-black uppercase text-blue-900 sticky top-0">
                      <tr>
                        <th className="p-5 border-r">Date</th>
                        <th className="p-5 border-r">Time Out</th>
                        <th className="p-5 border-r">Guest Name</th>
                        <th className="p-5 border-r">Room Number</th>
                        <th className="p-5 border-r">Bill No.</th>
                        <th className="p-5">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y font-bold uppercase text-gray-700">
                      {bookings.filter(b => b.checkOutDate >= startDate && b.checkOutDate <= endDate).map((b) => {
                         const g = guests.find(guest => guest.id === b.guestId);
                         const r = rooms.find(room => room.id === b.roomId);
                         return (
                            <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                               <td className="p-5 border-r">{b.checkOutDate}</td>
                               <td className="p-5 border-r">{b.checkOutTime}</td>
                               <td className="p-5 border-r font-black text-blue-900">{g?.name}</td>
                               <td className="p-5 border-r">{r?.number}</td>
                               <td className="p-5 border-r">{b.bookingNo}</td>
                               <td className="p-5"><span className={`px-3 py-1 rounded-full text-[9px] ${b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{b.status}</span></td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeReport === 'GUEST_REGISTER' && (
          <div className="h-full flex flex-col space-y-4">
             {renderHeader("Guest History Register")}
             <div className="flex-1 border rounded-[2rem] overflow-auto bg-white shadow-sm">
                <table className="w-full text-[10px] text-left border-collapse min-w-[1200px]">
                   <thead className="bg-slate-100 font-black uppercase text-blue-900 sticky top-0">
                      <tr>
                        <th className="p-4 border-r">SL.No</th>
                        <th className="p-4 border-r">Guest Name</th>
                        <th className="p-4 border-r">Room Number</th>
                        <th className="p-4 border-r">Address</th>
                        <th className="p-4 border-r">State</th>
                        <th className="p-4 border-r">Contact Number</th>
                        <th className="p-4 border-r">Email Id</th>
                        <th className="p-4 border-r">Company</th>
                        <th className="p-4 border-r">Bill No.</th>
                        <th className="p-4 border-r">Checkin Date</th>
                        <th className="p-4 border-r">Checkout Date</th>
                        <th className="p-4">Agent</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y font-bold uppercase text-gray-700">
                      {bookings.filter(b => b.checkInDate >= startDate && b.checkInDate <= endDate).map((b, i) => {
                         const g = guests.find(guest => guest.id === b.guestId);
                         const r = rooms.find(room => room.id === b.roomId);
                         return (
                            <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                               <td className="p-4 border-r">{i+1}</td>
                               <td className="p-4 border-r font-black text-blue-900">{g?.name}</td>
                               <td className="p-4 border-r">{r?.number}</td>
                               <td className="p-4 border-r max-w-xs truncate">{g?.address}</td>
                               <td className="p-4 border-r">{g?.state}</td>
                               <td className="p-4 border-r">{g?.phone}</td>
                               <td className="p-4 border-r">{g?.email}</td>
                               <td className="p-4 border-r">{b.company || '-'}</td>
                               <td className="p-4 border-r">{b.bookingNo}</td>
                               <td className="p-4 border-r">{b.checkInDate}</td>
                               <td className="p-4 border-r">{b.checkOutDate}</td>
                               <td className="p-4">{b.agent || 'Direct'}</td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeReport === 'DETAILED_OCCUPANCY' && (
          <div className="space-y-6">
             {renderHeader("Detailed Occupancy Register")}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {bookings.filter(b => b.status === 'ACTIVE').map(b => {
                   const g = guests.find(guest => guest.id === b.guestId);
                   const r = rooms.find(room => room.id === b.roomId);
                   if (!g || !r) return null;
                   return (
                      <div key={b.id} className="bg-slate-50 p-8 rounded-[3rem] border-2 border-white shadow-xl space-y-6 hover:shadow-2xl transition-all cursor-pointer group hover:-translate-y-2" onClick={() => setSelectedBookingDetail({booking: b, guest: g})}>
                         <div className="flex justify-between items-start">
                            <div>
                               <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter leading-none">{g.name}</h3>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">{g.nationality} • {g.phone}</p>
                            </div>
                            <span className="bg-blue-600 text-white px-5 py-2 rounded-2xl text-[11px] font-black uppercase shadow-lg">ROOM {r.number}</span>
                         </div>
                         <div className="space-y-2 text-[11px] font-bold uppercase text-slate-600 bg-white/50 p-4 rounded-2xl">
                            <p><span className="text-slate-400 font-black tracking-widest text-[9px]">Check-In:</span> {b.checkInDate} {b.checkInTime}</p>
                            <p><span className="text-slate-400 font-black tracking-widest text-[9px]">ID Card:</span> {g.idNumber || 'NOT RECORDED'}</p>
                            <p className="line-clamp-1"><span className="text-slate-400 font-black tracking-widest text-[9px]">Address:</span> {g.address}</p>
                         </div>
                         <div className="flex gap-3 pt-2">
                            {['photo', 'aadharFront', 'passportFront'].map(doc => (
                               g.documents && (g.documents as any)[doc] ? (
                                  <div key={doc} className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white bg-white shadow-md ring-4 ring-slate-100">
                                     <img src={(g.documents as any)[doc]} className="w-full h-full object-cover" />
                                  </div>
                               ) : null
                            ))}
                         </div>
                      </div>
                   );
                })}
             </div>
          </div>
        )}

        {activeReport === 'COLLECTION' && (
          <div className="space-y-6">
            {renderHeader(`Collection Register`)}
            <div className="border-2 border-slate-100 rounded-[3rem] overflow-hidden shadow-2xl bg-white">
              <table className="w-full text-[11px] border-collapse">
                <thead className="bg-green-700 text-white uppercase font-black tracking-widest">
                  <tr><th className="p-6 text-left">Posting Date</th><th className="p-6 text-left">Entity / Source</th><th className="p-6 text-left">Account</th><th className="p-6 text-right">Credit Amount (₹)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-black uppercase font-bold">
                  {transactions.filter(t => t.type === 'RECEIPT' && t.date >= startDate && t.date <= endDate).map(t => (
                    <tr key={t.id} className="hover:bg-green-50/30 transition-colors">
                      <td className="p-6 text-slate-400">{t.date}</td>
                      <td className="p-6 text-slate-900">{t.entityName || 'General Reception'}</td>
                      <td className="p-6 text-blue-900"><span className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{t.ledger}</span></td>
                      <td className="p-6 text-right font-black text-green-700 text-base">₹{t.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'SUMMARY' && (
          <div className="space-y-12">
            {renderHeader(`Performance Summary`)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <SummaryCard label="Total Collection (Period)" value={`₹${transactions.filter(t => t.type === 'RECEIPT' && t.date >= startDate && t.date <= endDate).reduce((s,t)=>s+t.amount,0).toFixed(2)}`} color="bg-green-600" />
              <SummaryCard label="Check-Ins (Period)" value={bookings.filter(b => b.checkInDate >= startDate && b.checkInDate <= endDate).length} color="bg-blue-600" />
              <SummaryCard label="Check-Outs (Period)" value={bookings.filter(b => b.checkOutDate >= startDate && b.checkOutDate <= endDate && b.status === 'COMPLETED').length} color="bg-orange-500" />
            </div>
          </div>
        )}
      </div>

      {selectedBookingDetail && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto no-print">
           <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in duration-500">
              <div className="bg-blue-900 p-10 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Guest Registry Folio</h2>
                    <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.3em] mt-2">Active Record Analysis & KYC Vault</p>
                 </div>
                 <button onClick={() => setSelectedBookingDetail(null)} className="p-5 hover:bg-white/10 rounded-3xl transition-all border border-white/10">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                 </button>
              </div>
              <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-16">
                 <div className="space-y-10">
                    <section className="space-y-6">
                       <h4 className="font-black text-blue-900 uppercase text-xs tracking-[0.2em] border-b-4 border-blue-50 pb-4">Personal Identifiers</h4>
                       <div className="space-y-4 text-[13px] font-bold uppercase text-slate-800">
                          <p className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 font-black text-[10px] tracking-widest">Full Name</span> {selectedBookingDetail.guest.name}</p>
                          <p className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 font-black text-[10px] tracking-widest">Mobile</span> {selectedBookingDetail.guest.phone}</p>
                          <p className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 font-black text-[10px] tracking-widest">ID Reference</span> {selectedBookingDetail.guest.idNumber || 'N/A'}</p>
                          <p className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 font-black text-[10px] tracking-widest">Nationality</span> {selectedBookingDetail.guest.nationality}</p>
                          <div className="pt-2">
                             <span className="text-slate-400 font-black text-[10px] tracking-widest block mb-2">Residential Address</span>
                             <p className="bg-slate-50 p-4 rounded-2xl text-[11px] leading-relaxed italic text-slate-500">{selectedBookingDetail.guest.address}</p>
                          </div>
                       </div>
                    </section>
                    <section className="space-y-6">
                       <h4 className="font-black text-blue-900 uppercase text-xs tracking-[0.2em] border-b-4 border-blue-50 pb-4">Stay Logistics</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-6 rounded-3xl text-center">
                             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Assigned Unit</p>
                             <p className="text-2xl font-black text-blue-900 uppercase">{rooms.find(r=>r.id===selectedBookingDetail.booking.roomId)?.number}</p>
                          </div>
                          <div className="bg-slate-50 p-6 rounded-3xl text-center">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Folio Status</p>
                             <p className="text-2xl font-black text-slate-900 uppercase">{selectedBookingDetail.booking.status}</p>
                          </div>
                       </div>
                       <div className="space-y-4 text-[13px] font-bold uppercase text-slate-800">
                          <p className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 font-black text-[10px] tracking-widest">Check-In</span> {selectedBookingDetail.booking.checkInDate} {selectedBookingDetail.booking.checkInTime}</p>
                          <p className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 font-black text-[10px] tracking-widest">Est. Checkout</span> {selectedBookingDetail.booking.checkOutDate} {selectedBookingDetail.booking.checkOutTime}</p>
                       </div>
                    </section>
                 </div>
                 <div className="space-y-8">
                    <h4 className="font-black text-blue-900 uppercase text-xs tracking-[0.2em] border-b-4 border-blue-50 pb-4">Legal Document Vault</h4>
                    <div className="grid grid-cols-2 gap-8">
                       {Object.entries(selectedBookingDetail.guest.documents || {}).map(([key, src]) => (
                          src ? (
                             <div key={key} className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</p>
                                <div className="aspect-[4/5] bg-slate-50 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl group relative ring-8 ring-slate-100 hover:ring-blue-100 transition-all">
                                   <img src={src as string} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                   <button onClick={() => window.open(src as string, '_blank')} className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-black uppercase transition-all tracking-widest backdrop-blur-sm">Full Screen</button>
                                </div>
                             </div>
                          ) : null
                       ))}
                    </div>
                 </div>
              </div>
              <div className="p-10 bg-slate-50 border-t flex justify-center gap-4">
                 <button onClick={() => setSelectedBookingDetail(null)} className="bg-blue-900 text-white px-20 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-black transition-all">Dismiss Folio View</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const Tab: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest border-2 transition-all shadow-lg shrink-0 ${active ? 'bg-blue-900 text-white border-blue-900 -translate-y-1' : 'bg-white text-slate-400 border-white hover:border-blue-200'}`}>{label}</button>
);

const SummaryCard = ({ label, value, color }: any) => (
  <div className={`${color} p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group`}>
    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
       <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
    </div>
    <p className="text-[11px] font-black uppercase opacity-60 tracking-[0.3em] mb-4">{label}</p>
    <p className="text-4xl font-black tracking-tighter">{value}</p>
  </div>
);

export default Reports;
