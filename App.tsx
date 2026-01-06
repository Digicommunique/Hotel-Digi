
import React, { useState, useMemo, useEffect } from 'react';
import { Room, RoomStatus, Guest, Booking, HostelSettings, Transaction, RoomShiftLog, CleaningLog, Quotation, GroupProfile } from './types';
import { INITIAL_ROOMS, STATUS_COLORS } from './constants';
import { db } from './services/db';
import { pushToCloud } from './services/supabase';
import GuestCheckin from './components/GuestCheckin';
import StayManagement from './components/StayManagement';
import Reports from './components/Reports';
import Accounting from './components/Accounting';
import Settings from './components/Settings';
import ReservationEntry from './components/ReservationEntry';
import GroupModule from './components/GroupModule';
import RoomActionModal from './components/RoomActionModal';

const App: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<GroupProfile[]>([]);
  const [shiftLogs, setShiftLogs] = useState<RoomShiftLog[]>([]);
  const [cleaningLogs, setCleaningLogs] = useState<CleaningLog[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [settings, setSettings] = useState<HostelSettings>({
    name: 'HotelSphere Pro',
    address: 'Suite 101, Enterprise Tower, Metro City',
    agents: [
      { name: 'Direct', commission: 0 },
      { name: 'Booking.com', commission: 15 },
      { name: 'Expedia', commission: 18 }
    ],
    roomTypes: ['DELUXE ROOM', 'BUDGET ROOM', 'STANDARD ROOM', 'AC FAMILY ROOM']
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showRoomActions, setShowRoomActions] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GROUP' | 'REPORTS' | 'ACCOUNTING' | 'SETTINGS'>('DASHBOARD');

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedRoomIdsForBulk, setSelectedRoomIdsForBulk] = useState<string[]>([]);

  useEffect(() => {
    const initData = async () => {
      try {
        const [r, g, b, t, gr, s, c, q, set] = await Promise.all([
          db.rooms.toArray(),
          db.guests.toArray(),
          db.bookings.toArray(),
          db.transactions.toArray(),
          db.groups.toArray(),
          db.shiftLogs.toArray(),
          db.cleaningLogs.toArray(),
          db.quotations.toArray(),
          db.settings.get('primary')
        ]);

        if (r.length > 0) setRooms(r); else {
          await db.rooms.bulkAdd(INITIAL_ROOMS);
          setRooms(INITIAL_ROOMS);
        }
        
        setGuests(g);
        setBookings(b);
        setTransactions(t);
        setGroups(gr);
        setShiftLogs(s);
        setCleaningLogs(c);
        setQuotations(q);
        if (set) setSettings(set);
        else await db.settings.add({ ...settings, id: 'primary' });
        
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load data:", error);
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  const syncToDB = async (table: any, data: any, tableNameForCloud?: string) => {
    try {
      let dataToSync = data;
      if (Array.isArray(data)) {
        await table.clear();
        await table.bulkAdd(data);
      } else {
        dataToSync = { ...data, id: 'primary' };
        await table.put(dataToSync);
      }
      if (tableNameForCloud) {
        const payload = Array.isArray(dataToSync) ? dataToSync : [dataToSync];
        return await pushToCloud(tableNameForCloud, payload);
      }
      return true;
    } catch (err) {
      console.error(`Sync error:`, err);
      return false;
    }
  };

  const updateRooms = (newRooms: Room[]) => { setRooms(newRooms); syncToDB(db.rooms, newRooms, 'rooms'); };
  const updateGuests = (newGuests: Guest[]) => { setGuests(newGuests); syncToDB(db.guests, newGuests, 'guests'); };
  const updateBookings = (newBookings: Booking[]) => { setBookings(newBookings); syncToDB(db.bookings, newBookings, 'bookings'); };
  const updateTransactions = (newTx: Transaction[]) => { setTransactions(newTx); syncToDB(db.transactions, newTx, 'transactions'); };
  const updateGroups = (newGroups: GroupProfile[]) => { setGroups(newGroups); syncToDB(db.groups, newGroups, 'groups'); };
  const updateSettings = (newSet: HostelSettings) => { setSettings(newSet); syncToDB(db.settings, newSet, 'settings'); };
  const updateQuotations = (newQuotations: Quotation[]) => { setQuotations(newQuotations); syncToDB(db.quotations, newQuotations, 'quotations'); };

  const handleAddPayment = (bookingId: string, payment: any) => {
    const booking = bookings.find(b => b.id === bookingId);
    const guest = guests.find(g => g.id === booking?.guestId);
    if (!booking) return;

    const updatedBooking = { ...booking, payments: [...(booking.payments || []), payment] };
    updateBookings(bookings.map(b => b.id === bookingId ? updatedBooking : b));

    const newTx: Transaction = {
      id: `TX-PAY-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'RECEIPT',
      accountGroup: 'Direct Income',
      ledger: payment.method || 'Cash Account',
      amount: payment.amount,
      entityName: guest?.name || 'Walk-in Guest',
      description: `Payment from ${guest?.name} (Room ${rooms.find(r => r.id === booking.roomId)?.number}) - ${payment.remarks || 'Folio Settlement'}`,
      referenceId: bookingId
    };
    updateTransactions([...transactions, newTx]);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setActiveBookingId(null);
    setShowCheckinForm(false);
    setShowReservationForm(false);
    setShowRoomActions(false);
    setSelectedRoom(null);
    setIsMultiSelectMode(false);
    setSelectedRoomIdsForBulk([]);
  };

  const getBookingColorClasses = (booking?: Booking) => {
    if (!booking) return '';
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') return '';
    
    const hashKey = booking.groupId || booking.bookingNo || booking.id;
    
    const palettes = [
      'bg-blue-50 border-blue-600 text-blue-900',
      'bg-indigo-50 border-indigo-600 text-indigo-900',
      'bg-purple-50 border-purple-600 text-purple-900',
      'bg-fuchsia-50 border-fuchsia-600 text-fuchsia-900',
      'bg-rose-50 border-rose-600 text-rose-900',
      'bg-amber-50 border-amber-600 text-amber-900',
      'bg-teal-50 border-teal-600 text-teal-900',
      'bg-cyan-50 border-cyan-600 text-cyan-900',
      'bg-violet-50 border-violet-600 text-violet-900',
      'bg-emerald-50 border-emerald-600 text-emerald-900',
    ];

    let hash = 0;
    for (let i = 0; i < hashKey.length; i++) {
      hash = hashKey.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  };

  const stats = useMemo(() => {
    return {
      total: rooms.length,
      vacant: rooms.filter(r => r.status === RoomStatus.VACANT).length,
      occupied: rooms.filter(r => r.status === RoomStatus.OCCUPIED).length,
      reserved: rooms.filter(r => r.status === RoomStatus.RESERVED).length,
      dirty: rooms.filter(r => r.status === RoomStatus.DIRTY).length,
      repair: rooms.filter(r => r.status === RoomStatus.REPAIR).length,
    };
  }, [rooms]);

  const roomsByFloor = useMemo(() => {
    return rooms.reduce((acc, room) => {
      acc[room.floor] = acc[room.floor] || [];
      acc[room.floor].push(room);
      return acc;
    }, {} as Record<number, Room[]>);
  }, [rooms]);

  const handleRoomClick = (room: Room) => {
    if (isMultiSelectMode) {
      setSelectedRoomIdsForBulk(prev => 
        prev.includes(room.id) ? prev.filter(id => id !== room.id) : [...prev, room.id]
      );
      return;
    }
    setSelectedRoom(room);
    const activeB = bookings.find(b => (b.roomId === room.id || b.id === room.currentBookingId) && (b.status === 'ACTIVE' || b.status === 'RESERVED'));
    if (activeB) {
      setActiveBookingId(activeB.id);
    } else {
      setShowRoomActions(true);
    }
  };

  const handleCheckinSave = async (data: { guest: Partial<Guest>, bookings: any[] }) => {
    const guestId = data.guest.id || Math.random().toString(36).substr(2, 9);
    const guestToSave = { ...data.guest, id: guestId } as Guest;
    
    const existingIdx = guests.findIndex(g => g.id === guestId);
    let newGuests = [...guests];
    if (existingIdx > -1) {
      newGuests[existingIdx] = { ...newGuests[existingIdx], ...data.guest } as Guest;
    } else {
      newGuests.push(guestToSave);
    }
    setGuests(newGuests);
    await syncToDB(db.guests, newGuests, 'guests');

    const newBookingsList: Booking[] = data.bookings.map(b => ({
      ...b,
      id: b.id || Math.random().toString(36).substr(2, 9),
      guestId: guestId,
    }));
    const updatedBookings = [...bookings, ...newBookingsList];
    setBookings(updatedBookings);
    await syncToDB(db.bookings, updatedBookings, 'bookings');

    const updatedRooms = rooms.map(r => {
      const bForRoom = newBookingsList.find(nb => nb.roomId === r.id);
      if (bForRoom) return { ...r, status: bForRoom.status === 'ACTIVE' ? RoomStatus.OCCUPIED : RoomStatus.RESERVED, currentBookingId: bForRoom.id };
      return r;
    });
    setRooms(updatedRooms);
    await syncToDB(db.rooms, updatedRooms, 'rooms');
    
    setShowCheckinForm(false);
    setShowReservationForm(false);
    setShowRoomActions(false);
    setIsMultiSelectMode(false);
    setSelectedRoomIdsForBulk([]);
  };

  const handleBookingUpdate = (updatedBooking: Booking) => {
    updateBookings(bookings.map(x => x.id === updatedBooking.id ? updatedBooking : x));
    updateRooms(rooms.map(r => {
      if (r.id === updatedBooking.roomId) {
        if (updatedBooking.status === 'COMPLETED') return { ...r, status: RoomStatus.DIRTY, currentBookingId: undefined };
        if (updatedBooking.status === 'ACTIVE') return { ...r, status: RoomStatus.OCCUPIED, currentBookingId: updatedBooking.id };
        if (updatedBooking.status === 'RESERVED') return { ...r, status: RoomStatus.RESERVED, currentBookingId: updatedBooking.id };
      }
      return r;
    }));
  };

  const handleRoomStatusUpdate = (roomId: string, newStatus: RoomStatus) => {
    const updatedRooms = rooms.map(r => r.id === roomId ? { ...r, status: newStatus } : r);
    updateRooms(updatedRooms);
    setShowRoomActions(false);
  };

  const handleGuestSave = (guest: Guest) => {
    updateGuests(guests.map(g => g.id === guest.id ? guest : g));
  };

  const handleBulkCheckIn = () => {
    if (selectedRoomIdsForBulk.length === 0) return;
    const baseRoom = rooms.find(r => r.id === selectedRoomIdsForBulk[0]);
    if (baseRoom) {
      setSelectedRoom(baseRoom);
      setShowCheckinForm(true);
    }
  };

  const handleBulkStatusUpdate = (status: RoomStatus) => {
    const updatedRooms = rooms.map(r => selectedRoomIdsForBulk.includes(r.id) ? { ...r, status } : r);
    updateRooms(updatedRooms);
    setSelectedRoomIdsForBulk([]);
    setIsMultiSelectMode(false);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#003d80] flex items-center justify-center text-white font-black uppercase tracking-widest">Initializing HotelSphere...</div>;
  }

  const renderContent = () => {
    if (activeBookingId) {
      const b = bookings.find(b => b.id === activeBookingId);
      const g = b ? guests.find(g => g.id === b.guestId) : null;
      const r = b ? rooms.find(r => r.id === b.roomId) : null;
      if (!b || !g || !r) return null;
      return <StayManagement booking={b} guest={g} room={r} allRooms={rooms} allBookings={bookings} settings={settings} onUpdate={handleBookingUpdate} onAddPayment={(p) => handleAddPayment(b.id, p)} onUpdateGuest={handleGuestSave} onShiftRoom={() => {}} onClose={() => setActiveBookingId(null)} />;
    }

    if (showCheckinForm && selectedRoom) {
      return (
        <GuestCheckin 
          room={selectedRoom} 
          allRooms={rooms} 
          existingGuests={guests} 
          onClose={() => setShowCheckinForm(false)} 
          onSave={handleCheckinSave} 
          settings={settings}
          initialSelectedRoomIds={selectedRoomIdsForBulk.length > 0 ? selectedRoomIdsForBulk : [selectedRoom.id]}
          onSwitchToReservation={() => {
            setShowCheckinForm(false);
            setShowReservationForm(true);
          }}
        />
      );
    }

    if (showReservationForm) {
      return <ReservationEntry rooms={rooms} existingGuests={guests} onClose={() => setShowReservationForm(false)} onSave={(data) => {
        const bookingsData = data.roomIds.map(rid => ({
          bookingNo: data.bookingNo,
          roomId: rid,
          checkInDate: data.checkInDate,
          checkInTime: data.checkInTime,
          checkOutDate: data.checkOutDate,
          checkOutTime: data.checkOutTime,
          status: 'RESERVED',
          basePrice: rooms.find(room => room.id === rid)?.price || 0,
          mealPlan: data.mealPlan,
          agent: data.agent,
          discount: data.discount,
          charges: [],
          payments: [],
          purpose: data.purpose
        }));
        handleCheckinSave({ guest: data.guest, bookings: bookingsData });
      }} settings={settings} />;
    }

    switch (activeTab) {
      case 'GROUP': return <GroupModule groups={groups} setGroups={updateGroups} rooms={rooms} bookings={bookings} setBookings={updateBookings} guests={guests} setGuests={updateGuests} setRooms={updateRooms} onAddTransaction={(tx) => updateTransactions([...transactions, tx])} />;
      case 'REPORTS': return <Reports bookings={bookings} guests={guests} rooms={rooms} settings={settings} transactions={transactions} shiftLogs={shiftLogs} cleaningLogs={cleaningLogs} quotations={quotations} />;
      case 'ACCOUNTING': return <Accounting transactions={transactions} setTransactions={updateTransactions} guests={guests} bookings={bookings} quotations={quotations} setQuotations={updateQuotations} settings={settings} />;
      case 'SETTINGS': return <Settings settings={settings} setSettings={updateSettings} rooms={rooms} setRooms={updateRooms} />;
      case 'DASHBOARD':
      default:
        return (
          <div className="p-6 pb-24 text-black">
            <div className="flex justify-between items-center mb-8 no-print">
              <div className="flex items-center gap-6">
                <h1 className="text-2xl font-black text-black border-l-8 border-blue-600 pl-4 uppercase">Front Desk Console</h1>
                <button 
                  onClick={() => {
                    setIsMultiSelectMode(!isMultiSelectMode);
                    setSelectedRoomIdsForBulk([]);
                  }}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${isMultiSelectMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600'}`}
                >
                  {isMultiSelectMode ? 'Exit Selection Mode' : 'Multiple Check-in Mode'}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowReservationForm(true)} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-orange-600 transition-all">+ New Reservation</button>
                <button onClick={() => handleTabChange('GROUP')} className="bg-blue-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all">Group Bookings</button>
              </div>
            </div>
            
            {isMultiSelectMode && selectedRoomIdsForBulk.length > 0 && (
              <div className="mb-6 bg-white p-6 rounded-[2rem] border-2 border-blue-600 shadow-xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300 no-print">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-black">
                    {selectedRoomIdsForBulk.length}
                  </div>
                  <span className="font-black uppercase text-xs tracking-widest">Rooms Selected</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleBulkCheckIn} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Bulk Check-in</button>
                  <button onClick={() => handleBulkStatusUpdate(RoomStatus.VACANT)} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Set Vacant</button>
                  <button onClick={() => handleBulkStatusUpdate(RoomStatus.DIRTY)} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Set Dirty</button>
                  <button onClick={() => setSelectedRoomIdsForBulk([])} className="bg-gray-100 text-gray-500 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest">Clear</button>
                </div>
              </div>
            )}

            <div className="space-y-10">
              {Object.entries(roomsByFloor).sort().map(([floor, floorRooms]) => (
                <div key={floor} className="bg-white rounded-[2rem] shadow-sm border overflow-hidden">
                  <div className="bg-blue-50 px-8 py-3 font-black text-black uppercase text-[10px] tracking-widest border-b">Floor Level {floor}</div>
                  <div className="p-8 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                    {floorRooms.map(room => {
                      const activeB = bookings.find(b => (b.roomId === room.id || b.id === room.currentBookingId) && (b.status === 'ACTIVE' || b.status === 'RESERVED'));
                      
                      const isBooked = room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.RESERVED;
                      const bookingClasses = (isBooked && activeB) ? getBookingColorClasses(activeB) : STATUS_COLORS[room.status];
                      const isSelected = selectedRoomIdsForBulk.includes(room.id);

                      return (
                        <button 
                          key={room.id} 
                          onClick={() => handleRoomClick(room)} 
                          className={`min-h-[140px] border-2 rounded-2xl p-4 flex flex-col items-center justify-between transition-all shadow-sm group relative ${bookingClasses} ${isSelected ? 'ring-4 ring-blue-600 ring-offset-2 scale-105 z-10' : 'hover:scale-105 active:scale-95'}`}
                        >
                          {isSelected && (
                            <div className="absolute -top-3 -right-3 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                          )}
                          <span className="text-2xl font-black tracking-tighter uppercase">ROOM {room.number}</span>
                          <div className="text-center w-full">
                            <div className="text-[9px] font-black uppercase mb-1 opacity-80">{room.type}</div>
                            <div className={`text-[8px] font-bold uppercase py-0.5 px-3 rounded-full border border-current inline-block`}>
                              {room.status}
                            </div>
                            {activeB && (
                              <div className="text-[8px] font-black bg-white/60 p-1.5 rounded-lg mt-2 uppercase border border-current/20 shadow-sm truncate">
                                {activeB.bookingNo}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-black">
      <nav className="bg-[#003d80] text-white px-8 py-4 flex items-center justify-between shadow-2xl sticky top-0 z-50 no-print">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleTabChange('DASHBOARD')}>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-900 text-lg font-black shadow-lg">HS</div>
            <span className="text-xl font-black tracking-tighter uppercase">{settings.name}</span>
          </div>
          <div className="flex gap-1">
            <NavBtn label="Dashboard" active={activeTab === 'DASHBOARD'} onClick={() => handleTabChange('DASHBOARD')} />
            <NavBtn label="Groups" active={activeTab === 'GROUP'} onClick={() => handleTabChange('GROUP')} />
            <NavBtn label="Accounting" active={activeTab === 'ACCOUNTING'} onClick={() => handleTabChange('ACCOUNTING')} />
            <NavBtn label="Reports" active={activeTab === 'REPORTS'} onClick={() => handleTabChange('REPORTS')} />
          </div>
        </div>
        <button onClick={() => handleTabChange('SETTINGS')} className="px-6 py-2 bg-white/10 rounded-xl font-black text-[10px] uppercase hover:bg-white/20 transition-all border border-white/20">System Settings</button>
      </nav>

      <main className="flex-1 overflow-y-auto custom-scrollbar">{renderContent()}</main>

      <footer className="bg-white border-t px-8 py-3 flex justify-between items-center fixed bottom-0 w-full z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] no-print">
        <div className="flex gap-8 overflow-x-auto no-scrollbar py-1">
          <Stat label="Total" count={stats.total} color="text-black" />
          <Stat label="Vacant" count={stats.vacant} color="text-black" />
          <Stat label="Occupied" count={stats.occupied} color="text-black" />
          <Stat label="Reserved" count={stats.reserved} color="text-black" />
          <Stat label="Dirty" count={stats.dirty} color="text-black" />
          <Stat label="Repair" count={stats.repair} color="text-black" />
        </div>
        <div className="flex items-center gap-2 ml-4 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-green-500 db-sync-pulse"></div>
          <span className="text-[10px] font-black uppercase text-black">Sync Active</span>
        </div>
      </footer>
      {showRoomActions && selectedRoom && (
        <RoomActionModal 
          room={selectedRoom} 
          onClose={() => setShowRoomActions(false)} 
          onCheckIn={() => { setShowRoomActions(false); setShowCheckinForm(true); }}
          onStatusUpdate={(s) => handleRoomStatusUpdate(selectedRoom.id, s)}
        />
      )}
    </div>
  );
};

const NavBtn: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-6 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${active ? 'bg-white text-blue-900 shadow-lg' : 'text-white/70 hover:bg-white/10'}`}>{label}</button>
);

const Stat: React.FC<{ label: string, count: number, color: string }> = ({ label, count, color }) => (
  <div className="flex items-center gap-2 shrink-0">
    <span className="text-[9px] font-black uppercase text-black tracking-wider">{label}:</span>
    <span className={`text-lg font-black ${color}`}>{count}</span>
  </div>
);

export default App;
