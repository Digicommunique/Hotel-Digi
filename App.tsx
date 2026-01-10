
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Room, RoomStatus, Guest, Booking, HostelSettings, Transaction, RoomShiftLog, CleaningLog, Quotation, GroupProfile, UserRole, Payment, Supervisor } from './types.ts';
import { INITIAL_ROOMS, STATUS_COLORS } from './constants.tsx';
import { db, importDatabase, exportDatabase } from './services/db.ts';
import { pushToCloud, supabase } from './services/supabase.ts';
import GuestCheckin from './components/GuestCheckin.tsx';
import StayManagement from './components/StayManagement.tsx';
import Reports from './components/Reports.tsx';
import Accounting from './components/Accounting.tsx';
import Settings from './components/Settings.tsx';
import ReservationEntry from './components/ReservationEntry.tsx';
import GroupModule from './components/GroupModule.tsx';
import RoomActionModal from './components/RoomActionModal.tsx';
import Login from './components/Login.tsx';
import SuperAdminPanel from './components/SuperAdminPanel.tsx';
import InvoiceView from './components/InvoiceView.tsx';

const GUEST_THEMES = [
  { border: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-900', status: 'text-rose-600 border-rose-600', name: 'text-rose-600' },
  { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-900', status: 'text-emerald-600 border-emerald-600', name: 'text-emerald-600' },
  { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-900', status: 'text-amber-600 border-amber-600', name: 'text-amber-600' },
  { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-900', status: 'text-indigo-600 border-indigo-600', name: 'text-indigo-600' },
  { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-900', status: 'text-orange-600 border-orange-600', name: 'text-orange-600' },
  { border: 'border-fuchsia-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-900', status: 'text-fuchsia-600 border-fuchsia-600', name: 'text-fuchsia-600' },
  { border: 'border-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-900', status: 'text-cyan-600 border-cyan-600', name: 'text-cyan-600' },
  { border: 'border-lime-500', bg: 'bg-lime-50', text: 'text-lime-900', status: 'text-lime-600 border-lime-600', name: 'text-lime-600' },
  { border: 'border-violet-500', bg: 'bg-violet-50', text: 'text-violet-900', status: 'text-violet-600 border-violet-600', name: 'text-violet-600' },
  { border: 'border-teal-500', bg: 'bg-teal-50', text: 'text-teal-900', status: 'text-teal-600 border-teal-600', name: 'text-teal-600' },
  { border: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-900', status: 'text-sky-600 border-sky-600', name: 'text-sky-600' },
  { border: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-900', status: 'text-pink-600 border-pink-600', name: 'text-pink-600' },
  { border: 'border-slate-500', bg: 'bg-slate-50', text: 'text-slate-900', status: 'text-slate-600 border-slate-600', name: 'text-slate-600' },
  { border: 'border-blue-600', bg: 'bg-blue-50', text: 'text-blue-900', status: 'text-blue-600 border-blue-600', name: 'text-blue-600' },
];

const getGuestTheme = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GUEST_THEMES[Math.abs(hash) % GUEST_THEMES.length];
};

const App: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<GroupProfile[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [shiftLogs, setShiftLogs] = useState<RoomShiftLog[]>([]);
  const [cleaningLogs, setCleaningLogs] = useState<CleaningLog[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [settings, setSettings] = useState<HostelSettings>({
    name: 'HotelSphere Pro',
    address: 'Suite 101, Enterprise Tower, Metro City',
    adminPassword: 'admin',
    receptionistPassword: 'admin',
    accountantPassword: 'admin',
    supervisorPassword: 'admin',
    upiId: 'hotel@upi',
    agents: [
      { name: 'Direct', commission: 0 },
      { name: 'Booking.com', commission: 15 },
      { name: 'Expedia', commission: 18 }
    ],
    roomTypes: ['DELUXE ROOM', 'BUDGET ROOM', 'STANDARD ROOM', 'AC FAMILY ROOM'],
    taxRate: 12
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('RECEPTIONIST');
  const [activeSupervisor, setActiveSupervisor] = useState<Supervisor | null>(null);
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showRoomActions, setShowRoomActions] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const [showBillHistory, setShowBillHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GROUP' | 'REPORTS' | 'ACCOUNTING' | 'SETTINGS'>('DASHBOARD');

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedRoomIdsForBulk, setSelectedRoomIdsForBulk] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        let [r, g, b, t, gr, sup, s, c, q, set] = await Promise.all([
          db.rooms.toArray(),
          db.guests.toArray(),
          db.bookings.toArray(),
          db.transactions.toArray(),
          db.groups.toArray(),
          db.supervisors.toArray(),
          db.shiftLogs.toArray(),
          db.cleaningLogs.toArray(),
          db.quotations.toArray(),
          db.settings.get('primary')
        ]);

        if (!r || r.length === 0) {
          try {
            const { data: cloudRooms } = await supabase.from('rooms').select('*');
            if (cloudRooms && cloudRooms.length > 0) {
              r = cloudRooms; await db.rooms.bulkPut(r);
              const { data: cg } = await supabase.from('guests').select('*'); if (cg) { g = cg; await db.guests.bulkPut(g); }
              const { data: cb } = await supabase.from('bookings').select('*'); if (cb) { b = cb; await db.bookings.bulkPut(b); }
              const { data: ct } = await supabase.from('transactions').select('*'); if (ct) { t = ct; await db.transactions.bulkPut(t); }
              const { data: cgr } = await supabase.from('groups').select('*'); if (cgr) { gr = cgr; await db.groups.bulkPut(gr); }
              const { data: csup } = await supabase.from('supervisors').select('*'); if (csup) { sup = csup; await db.supervisors.bulkPut(sup); }
              const { data: cs } = await supabase.from('settings').select('*').eq('id', 'primary').single(); if (cs) { set = cs; await db.settings.put(set); }
            }
          } catch (e) {
            console.warn("Cloud initial fetch failed, using defaults");
          }
        }

        if (r && r.length > 0) {
          setRooms(r);
        } else {
          await db.rooms.bulkPut(INITIAL_ROOMS);
          setRooms(INITIAL_ROOMS);
          pushToCloud('rooms', INITIAL_ROOMS).catch(console.error);
        }
        
        setGuests(g || []);
        setBookings(b || []);
        setTransactions(t || []);
        setGroups(gr || []);
        setSupervisors(sup || []);
        setShiftLogs(s || []);
        setCleaningLogs(c || []);
        setQuotations(q || []);
        
        if (set) {
          setSettings(set);
        } else {
          await db.settings.put({ ...settings, id: 'primary' });
          pushToCloud('settings', [{ ...settings, id: 'primary' }]).catch(console.error);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Critical error during data initialization:", error);
        setRooms(INITIAL_ROOMS);
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  const syncToDB = async (table: any, data: any, tableNameForCloud?: string) => {
    try {
      if (tableNameForCloud && tableNameForCloud !== 'settings' && Array.isArray(data)) {
        const uniqueData = Array.from(new Map(data.map(item => [item.id, item])).values());
        await (db as any).transaction('rw', table, async () => {
          await table.clear();
          await table.bulkAdd(uniqueData);
        });
      } else {
        const dataToSync = typeof data === 'object' && !Array.isArray(data) ? { ...data, id: 'primary' } : data;
        if (Array.isArray(dataToSync)) {
            await (db as any).transaction('rw', table, async () => {
              await table.clear();
              await table.bulkAdd(dataToSync);
            });
        } else {
            await table.put(dataToSync);
        }
      }
      
      if (tableNameForCloud) {
        const payload = Array.isArray(data) ? data : [data];
        return await pushToCloud(tableNameForCloud, payload);
      }
      return true;
    } catch (err) {
      console.error(`Sync error in ${tableNameForCloud || 'table'}:`, err);
      return false;
    }
  };

  const updateRooms = async (newRooms: Room[]) => { 
    setRooms([...newRooms]); 
    return await syncToDB(db.rooms, newRooms, 'rooms'); 
  };
  const updateGuests = async (newGuests: Guest[]) => { 
    setGuests([...newGuests]); 
    return await syncToDB(db.guests, newGuests, 'guests'); 
  };
  const updateBookings = async (newBookings: Booking[]) => { 
    setBookings([...newBookings]); 
    return await syncToDB(db.bookings, newBookings, 'bookings'); 
  };
  const updateTransactions = async (newTx: Transaction[]) => { 
    setTransactions([...newTx]); 
    return await syncToDB(db.transactions, newTx, 'transactions'); 
  };
  const updateGroups = async (newGroups: GroupProfile[]) => {
    setGroups([...newGroups]);
    return await syncToDB(db.groups, newGroups, 'groups');
  };
  const updateSettings = async (newSet: HostelSettings) => { 
    setSettings({...newSet}); 
    return await syncToDB(db.settings, newSet, 'settings'); 
  };

  const handleCheckinSave = async (data: { guest: Partial<Guest>, bookings: any[] }) => {
    const guestId = data.guest.id || Math.random().toString(36).substr(2, 9);
    const guestToSave = { ...data.guest, id: guestId } as Guest;
    const newGuests = [...guests];
    const existingIdx = guests.findIndex(g => g.id === guestId);
    if (existingIdx > -1) newGuests[existingIdx] = guestToSave;
    else newGuests.push(guestToSave);
    
    setGuests(newGuests);
    await syncToDB(db.guests, newGuests, 'guests');

    const newBookingsList: Booking[] = data.bookings.map(b => ({
      ...b,
      id: b.id || Math.random().toString(36).substr(2, 9),
      guestId: guestId,
    }));
    
    const combinedBookings = [...bookings, ...newBookingsList];
    setBookings(combinedBookings);
    await syncToDB(db.bookings, combinedBookings, 'bookings');

    const newTransactions: Transaction[] = [];
    newBookingsList.forEach(b => {
      if (b.payments && b.payments.length > 0) {
        b.payments.forEach(p => {
          newTransactions.push({
            id: `TX-ADV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            date: new Date().toISOString().split('T')[0],
            type: 'RECEIPT',
            accountGroup: 'Direct Income',
            ledger: p.method,
            amount: p.amount,
            entityName: guestToSave.name,
            description: `Advance for R${rooms.find(r => r.id === b.roomId)?.number}`,
            referenceId: b.id
          });
        });
      }
    });
    
    if (newTransactions.length > 0) {
      const updatedTx = [...transactions, ...newTransactions];
      setTransactions(updatedTx);
      await syncToDB(db.transactions, updatedTx, 'transactions');
    }

    const updatedRooms = rooms.map(r => {
      const bForRoom = newBookingsList.find(nb => nb.roomId === r.id);
      if (bForRoom && bForRoom.status === 'ACTIVE') return { ...r, status: RoomStatus.OCCUPIED, currentBookingId: bForRoom.id };
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

  const handleBookingUpdate = async (updatedBooking: Booking) => {
    const newBookingsList = bookings.map(x => x.id === updatedBooking.id ? updatedBooking : x);
    setBookings(newBookingsList);
    await syncToDB(db.bookings, newBookingsList, 'bookings');
    
    const updatedRooms = rooms.map(r => {
      if (r.id === updatedBooking.roomId) {
        if (updatedBooking.status === 'COMPLETED') return { ...r, status: RoomStatus.DIRTY, currentBookingId: undefined };
        if (updatedBooking.status === 'ACTIVE') return { ...r, status: RoomStatus.OCCUPIED, currentBookingId: updatedBooking.id };
      }
      return r;
    });
    setRooms(updatedRooms);
    await syncToDB(db.rooms, updatedRooms, 'rooms');
  };

  const handleAddPayment = async (bookingId: string, payment: any) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const guest = guests.find(g => g.id === booking.guestId);
    const updatedBooking = { ...booking, payments: [...(booking.payments || []), payment] };
    const newBookingsList = bookings.map(b => b.id === bookingId ? updatedBooking : b);
    
    setBookings(newBookingsList);
    await syncToDB(db.bookings, newBookingsList, 'bookings');

    const newTx: Transaction = {
      id: `TX-PAY-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'RECEIPT',
      accountGroup: 'Direct Income',
      ledger: payment.method || 'Cash Account',
      amount: payment.amount,
      entityName: guest?.name || 'Walk-in Guest',
      description: `Payment for R${rooms.find(r => r.id === booking.roomId)?.number}`,
      referenceId: bookingId
    };
    
    const updatedTransactions = [...transactions, newTx];
    setTransactions(updatedTransactions);
    await syncToDB(db.transactions, updatedTransactions, 'transactions');
  };

  const handleRoomShift = async (bookingId: string, newRoomId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const oldRoomId = booking.roomId;
    const updatedBookingsList = bookings.map(b => b.id === bookingId ? { ...b, roomId: newRoomId } : b);
    setBookings(updatedBookingsList);
    await syncToDB(db.bookings, updatedBookingsList, 'bookings');

    const updatedRooms = rooms.map(r => {
      if (r.id === oldRoomId) return { ...r, status: RoomStatus.DIRTY, currentBookingId: undefined };
      if (r.id === newRoomId) return { ...r, status: RoomStatus.OCCUPIED, currentBookingId: bookingId };
      return r;
    });
    setRooms(updatedRooms);
    await syncToDB(db.rooms, updatedRooms, 'rooms');

    const newShiftLog: RoomShiftLog = {
      id: Math.random().toString(36).substr(2, 9),
      bookingId,
      guestName: guests.find(g => g.id === booking.guestId)?.name || 'Guest',
      fromRoom: rooms.find(r => r.id === oldRoomId)?.number || '?',
      toRoom: rooms.find(r => r.id === newRoomId)?.number || '?',
      date: new Date().toISOString(),
      reason: 'Standard Room Shift'
    };
    setShiftLogs([...shiftLogs, newShiftLog]);
    db.shiftLogs.add(newShiftLog);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setActiveBookingId(null);
    setShowCheckinForm(false);
    setShowReservationForm(false);
    setShowRoomActions(false);
    setShowSuperAdmin(false);
    setSelectedRoom(null);
    setIsMultiSelectMode(false);
    setSelectedRoomIdsForBulk([]);
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const filteredRooms = currentUserRole === 'SUPERVISOR' && activeSupervisor 
      ? rooms.filter(r => activeSupervisor.assignedRoomIds.includes(r.id))
      : rooms;

    const roomStates = filteredRooms.map(room => {
      const currentB = bookings.find(b => b.roomId === room.id && b.status === 'ACTIVE');
      if (currentB) return RoomStatus.OCCUPIED;
      const reservedB = bookings.find(b => b.roomId === room.id && b.status === 'RESERVED' && b.checkInDate === today);
      if (reservedB) return RoomStatus.RESERVED;
      return room.status;
    });

    return {
      total: filteredRooms.length,
      vacant: roomStates.filter(s => s === RoomStatus.VACANT).length,
      occupied: roomStates.filter(s => s === RoomStatus.OCCUPIED).length,
      reserved: roomStates.filter(s => s === RoomStatus.RESERVED).length,
      dirty: roomStates.filter(s => s === RoomStatus.DIRTY).length,
      repair: roomStates.filter(s => s === RoomStatus.REPAIR).length,
    };
  }, [rooms, bookings, currentUserRole, activeSupervisor]);

  const roomsByFloor = useMemo(() => {
    const filteredRooms = currentUserRole === 'SUPERVISOR' && activeSupervisor 
      ? rooms.filter(r => activeSupervisor.assignedRoomIds.includes(r.id))
      : rooms;

    const grouped = filteredRooms.reduce((acc, room) => {
      acc[room.floor] = acc[room.floor] || [];
      if (!acc[room.floor].find(r => r.number === room.number)) acc[room.floor].push(room);
      return acc;
    }, {} as Record<number, Room[]>);

    Object.keys(grouped).forEach(floorKey => {
      grouped[Number(floorKey)].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    });
    return grouped;
  }, [rooms, currentUserRole, activeSupervisor]);

  const handleRoomClick = (room: Room) => {
    const today = new Date().toISOString().split('T')[0];
    const activeB = bookings.find(b => b.roomId === room.id && b.status === 'ACTIVE');
    const reservedToday = bookings.find(b => b.roomId === room.id && b.status === 'RESERVED' && b.checkInDate === today);

    if (isMultiSelectMode) {
      if (!activeB && !reservedToday && room.status === RoomStatus.VACANT) {
        setSelectedRoomIdsForBulk(prev => prev.includes(room.id) ? prev.filter(id => id !== room.id) : [...prev, room.id]);
      } else alert("Selection restricted to VACANT rooms.");
      return;
    }

    if (currentUserRole === 'SUPERVISOR' && room.status !== RoomStatus.DIRTY && room.status !== RoomStatus.REPAIR && room.status !== RoomStatus.VACANT) return;
    
    if (activeB && currentUserRole !== 'SUPERVISOR') setActiveBookingId(activeB.id);
    else if (reservedToday && currentUserRole !== 'SUPERVISOR') setActiveBookingId(reservedToday.id);
    else {
      setSelectedRoom(room);
      setShowRoomActions(true);
    }
  };

  const handleOldDataUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (confirm("Restore all records from this backup? Current local data will be replaced.")) {
        try {
          await importDatabase(file);
          window.location.reload();
        } catch (err) {
          alert("Failed to restore data. Invalid file format.");
        }
      }
    }
  };

  const handleRepairSync = () => {
    setActiveTab('SETTINGS');
    alert("System Repair Mode: Navigated to Settings. Please copy the alignment SQL to your cloud database editor.");
  };

  const renderContent = () => {
    if (activeBookingId) {
      const b = bookings.find(b => b.id === activeBookingId);
      const g = b ? guests.find(g => g.id === b.guestId) : null;
      const r = b ? rooms.find(r => r.id === b.roomId) : null;
      if (!b || !g || !r) return null;
      return <StayManagement booking={b} guest={g} room={r} allRooms={rooms} allBookings={bookings} settings={settings} onUpdate={handleBookingUpdate} onAddPayment={handleAddPayment} onUpdateGuest={(gu) => updateGuests(guests.map(x => x.id === gu.id ? gu : x))} onShiftRoom={(nr) => handleRoomShift(b.id, nr)} onClose={() => setActiveBookingId(null)} />;
    }

    if (showCheckinForm && selectedRoom) return <GuestCheckin room={selectedRoom} allRooms={rooms} existingGuests={guests} onClose={() => setShowCheckinForm(false)} onSave={handleCheckinSave} settings={settings} initialSelectedRoomIds={selectedRoomIdsForBulk} />;
    
    if (showReservationForm) return <ReservationEntry rooms={rooms} existingGuests={guests} onClose={() => setShowReservationForm(false)} onSave={(data) => {
        const bookingsData = data.roomIds.map(rid => ({
          bookingNo: data.bookingNo, roomId: rid, checkInDate: data.checkInDate, checkInTime: data.checkInTime, checkOutDate: data.checkOutDate, checkOutTime: data.checkOutTime,
          status: 'RESERVED' as const, basePrice: rooms.find(room => room.id === rid)?.price || 0, mealPlan: data.mealPlan, agent: data.agent, discount: data.discount,
          charges: [], payments: [], occupants: data.guest.adults ? Array(data.guest.adults).fill({name: ''}) : []
        }));
        handleCheckinSave({ guest: data.guest, bookings: bookingsData });
      }} settings={settings} />;

    switch (activeTab) {
      case 'GROUP': return <GroupModule groups={groups} setGroups={updateGroups} rooms={rooms} bookings={bookings} setBookings={updateBookings} guests={guests} setGuests={updateGuests} setRooms={updateRooms} onAddTransaction={(tx) => updateTransactions([...transactions, tx])} onGroupPayment={async (gid, amt, meth, rem) => {}} settings={settings} />;
      case 'REPORTS': return <Reports bookings={bookings} guests={guests} rooms={rooms} settings={settings} transactions={transactions} shiftLogs={shiftLogs} cleaningLogs={cleaningLogs} quotations={quotations} />;
      case 'ACCOUNTING': return <Accounting transactions={transactions} setTransactions={updateTransactions} guests={guests} bookings={bookings} quotations={quotations} setQuotations={setQuotations} settings={settings} />;
      case 'SETTINGS': return <Settings settings={settings} setSettings={updateSettings} rooms={rooms} setRooms={updateRooms} supervisors={supervisors} setSupervisors={setSupervisors} />;
      default:
        return (
          <div className="p-4 md:p-6 pb-40 text-black">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 no-print">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 w-full md:w-auto">
                <h1 className="text-xl md:text-2xl font-black text-black border-l-8 border-blue-600 pl-4 uppercase leading-none">{currentUserRole} Desk</h1>
                <button onClick={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedRoomIdsForBulk([]); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border-2 transition-all shadow-md ${isMultiSelectMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600'}`}>
                  {isMultiSelectMode ? 'Exit Selection' : 'Multi Check-in'}
                </button>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => setShowReservationForm(true)} className="flex-1 md:flex-none bg-orange-500 text-white px-4 md:px-6 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase shadow-xl hover:bg-orange-600 transition-all">+ New Booking</button>
              </div>
            </div>
            
            <div className="space-y-8 md:space-y-12">
              {(Object.entries(roomsByFloor) as [string, Room[]][]).sort((a,b) => Number(a[0]) - Number(b[0])).map(([floor, floorRooms]) => (
                <div key={floor} className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border overflow-hidden">
                  <div className="bg-blue-50 px-6 md:px-8 py-3 font-black text-black uppercase text-[10px] tracking-widest border-b">Level {floor}</div>
                  <div className="p-4 md:p-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 md:gap-4">
                    {floorRooms.map(room => {
                      const today = new Date().toISOString().split('T')[0];
                      const activeB = bookings.find(b => b.roomId === room.id && b.status === 'ACTIVE');
                      const reservedToday = bookings.find(b => b.roomId === room.id && b.status === 'RESERVED' && b.checkInDate === today);
                      const guestObj = activeB || reservedToday ? guests.find(g => g.id === (activeB || reservedToday)!.guestId) : null;
                      
                      let effectiveStatus = room.status;
                      if (activeB) effectiveStatus = RoomStatus.OCCUPIED;
                      else if (reservedToday) effectiveStatus = RoomStatus.RESERVED;

                      const isSelected = selectedRoomIdsForBulk.includes(room.id);
                      
                      const theme = guestObj ? getGuestTheme(guestObj.name) : null;
                      const baseClasses = STATUS_COLORS[effectiveStatus];
                      const finalClasses = guestObj && theme 
                        ? `${theme.bg} ${theme.border} ${theme.text}` 
                        : baseClasses;

                      return (
                        <button key={room.id} onClick={() => handleRoomClick(room)} className={`min-h-[140px] border-2 rounded-2xl md:rounded-3xl p-3 flex flex-col items-center justify-between transition-all shadow-sm ${finalClasses} ${isSelected ? 'ring-4 ring-blue-500 scale-105 z-10' : 'hover:scale-105'}`}>
                          <span className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">{room.number}</span>
                          <div className="text-center w-full">
                            <div className={`text-[8px] md:text-[9px] font-black uppercase mb-1 opacity-80 truncate px-1 ${guestObj ? theme?.name : 'text-gray-400'}`}>
                              {guestObj ? guestObj.name : room.type.replace(' ROOM', '')}
                            </div>
                            <div className={`text-[7px] md:text-[8px] font-bold uppercase py-0.5 px-2 md:px-3 rounded-full border border-current inline-block leading-none ${guestObj ? theme?.status : ''}`}>{effectiveStatus}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {isMultiSelectMode && (
              <div className="fixed bottom-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
                <div className="bg-slate-900/90 backdrop-blur-xl px-4 md:px-8 py-4 rounded-3xl md:rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col md:flex-row items-center gap-4 md:gap-12">
                   <div className="text-center md:text-left">
                     <p className="text-blue-400 font-black uppercase text-[9px] tracking-widest mb-0.5">Batch Mode</p>
                     <h4 className="text-white font-black uppercase text-xs tracking-tight">{selectedRoomIdsForBulk.length} Units Ready</h4>
                   </div>
                   <div className="flex gap-3 w-full md:w-auto">
                      <button onClick={() => setSelectedRoomIdsForBulk([])} className="flex-1 md:flex-none text-white/60 font-black uppercase text-[10px] hover:text-white transition-colors py-2">Reset</button>
                      <button disabled={selectedRoomIdsForBulk.length === 0} onClick={() => { setSelectedRoom(rooms.find(r => r.id === selectedRoomIdsForBulk[0])!); setShowCheckinForm(true); }} className={`flex-1 md:flex-none px-6 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg transition-all ${selectedRoomIdsForBulk.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-50' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}>Process Check-in</button>
                   </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#003d80] flex items-center justify-center text-white font-black uppercase tracking-widest">Loading...</div>;
  if (!isLoggedIn) return <Login onLogin={(role, sup) => { setCurrentUserRole(role); if (sup) setActiveSupervisor(sup); setIsLoggedIn(true); }} settings={settings} supervisors={supervisors} />;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-black">
      <nav className="bg-[#003d80] text-white px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl sticky top-0 z-50 no-print">
        <div className="flex items-center justify-between w-full md:w-auto gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleTabChange('DASHBOARD')}>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-900 text-lg font-black shadow-lg shrink-0">HS</div>
            <span className="text-lg md:text-xl font-black tracking-tighter uppercase truncate max-w-[150px] md:max-w-none">{settings.name}</span>
          </div>
          <div className="hidden md:flex gap-1 overflow-x-auto scrollbar-hide">
            <NavBtn label="Dashboard" active={activeTab === 'DASHBOARD'} onClick={() => handleTabChange('DASHBOARD')} />
            {['SUPERADMIN', 'ADMIN', 'RECEPTIONIST'].includes(currentUserRole) && <NavBtn label="Groups" active={activeTab === 'GROUP'} onClick={() => handleTabChange('GROUP')} />}
            {['SUPERADMIN', 'ADMIN', 'ACCOUNTANT'].includes(currentUserRole) && (
              <>
                <NavBtn label="Accounting" active={activeTab === 'ACCOUNTING'} onClick={() => handleTabChange('ACCOUNTING')} />
                <NavBtn label="Reports" active={activeTab === 'REPORTS'} onClick={() => handleTabChange('REPORTS')} />
              </>
            )}
            {['SUPERADMIN', 'ADMIN'].includes(currentUserRole) && <NavBtn label="Settings" active={activeTab === 'SETTINGS'} onClick={() => handleTabChange('SETTINGS')} />}
          </div>
          <button onClick={() => { setIsLoggedIn(false); setActiveSupervisor(null); }} className="md:hidden p-2 bg-white/10 rounded-xl">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto custom-scrollbar">{renderContent()}</main>

      <footer className="bg-white border-t px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-center fixed bottom-0 w-full z-40 shadow-xl no-print gap-4">
        <div className="flex gap-4 md:gap-6 items-center w-full md:w-auto overflow-x-auto scrollbar-hide py-1">
          <Stat label="Total" count={stats.total} color="text-black" />
          <Stat label="Vacant" count={stats.vacant} color="text-green-600" />
          <Stat label="Occupied" count={stats.occupied} color="text-blue-600" />
          <Stat label="Dirty" count={stats.dirty} color="text-red-600" />
          <Stat label="Repair" count={stats.repair} color="text-amber-800" />
          
          <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
          
          <div className="flex gap-2">
            <FooterBtn label="All Bills" onClick={() => setShowBillHistory(true)} icon="📄" />
            <FooterBtn label="Duplicate Bill" onClick={() => setShowBillHistory(true)} icon="📋" />
            <FooterBtn label="Download" onClick={exportDatabase} icon="💾" />
            <FooterBtn label="Upload" onClick={() => fileInputRef.current?.click()} icon="📤" />
            <FooterBtn label="Repair" onClick={handleRepairSync} icon={<img src="https://img.icons8.com/color/48/wrench.png" className="w-4 h-4" alt="repair" />} color="text-red-600 hover:bg-red-50" />
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleOldDataUpload} accept=".json" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 db-sync-pulse"></div>
          <span className="text-[10px] font-black uppercase text-slate-400">Live Connection</span>
        </div>
      </footer>

      {showBillHistory && (
        <BillHistoryModal 
          bookings={bookings} 
          guests={guests} 
          rooms={rooms} 
          settings={settings}
          onClose={() => setShowBillHistory(false)} 
        />
      )}

      {showRoomActions && selectedRoom && (
        <RoomActionModal room={selectedRoom} onClose={() => setShowRoomActions(false)} onCheckIn={() => { setShowRoomActions(false); setShowCheckinForm(true); }} onStatusUpdate={async (s) => { await updateRooms(rooms.map(r => r.id === selectedRoom.id ? { ...r, status: s } : r)); setShowRoomActions(false); }} />
      )}
      {showSuperAdmin && <SuperAdminPanel settings={settings} setSettings={updateSettings} rooms={rooms} setRooms={updateRooms} onClose={() => setShowSuperAdmin(false)} />}
    </div>
  );
};

const BillHistoryModal = ({ bookings, guests, rooms, settings, onClose }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const filteredBookings = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
    if (!searchTerm) return sorted.slice(0, 20);
    return sorted.filter(b => {
      const g = guests.find(gx => gx.id === b.guestId);
      return b.bookingNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
             g?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             g?.phone.includes(searchTerm);
    });
  }, [bookings, guests, searchTerm]);

  if (selectedBooking) {
    const g = guests.find(gx => gx.id === selectedBooking.guestId)!;
    const r = rooms.find(rx => rx.id === selectedBooking.roomId)!;
    return (
      <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col no-print-backdrop">
        <div className="bg-black p-4 flex justify-between items-center no-print border-b border-white/10 shrink-0">
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px]">Print Duplicate</button>
            <button onClick={() => setSelectedBooking(null)} className="bg-white/10 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px]">Back to List</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-500/20 p-4 md:p-8 custom-scrollbar">
          <InvoiceView 
            guest={g} 
            booking={selectedBooking}
            room={r} 
            settings={settings} 
            payments={selectedBooking.payments || []}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
       <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
          <div className="bg-[#003d80] p-8 text-white flex justify-between items-center">
             <div>
               <h2 className="text-2xl font-black uppercase tracking-tighter">Billing Registry</h2>
               <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Duplicate Bill & Archive Access</p>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
          </div>
          <div className="p-8 border-b bg-slate-50">
             <input 
               type="text" 
               className="w-full bg-white border-2 p-4 rounded-2xl font-black text-sm outline-none focus:border-blue-500 transition-all shadow-sm" 
               placeholder="Search by Bill No, Guest Name or Mobile..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
             <div className="space-y-3">
                {filteredBookings.map(b => {
                   const g = guests.find(gx => gx.id === b.guestId);
                   const r = rooms.find(rx => rx.id === b.roomId);
                   return (
                      <div key={b.id} className="flex items-center justify-between p-5 border-2 rounded-2xl hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group" onClick={() => setSelectedBooking(b)}>
                         <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                               {r?.number || '??'}
                            </div>
                            <div>
                               <h4 className="font-black text-blue-900 uppercase tracking-tight">{g?.name || 'Unknown Guest'}</h4>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bill No: {b.bookingNo} &bull; {b.checkInDate}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-600'}`}>{b.status}</span>
                            <div className="text-right">
                               <p className="text-[8px] font-black text-slate-400 uppercase">Paid Total</p>
                               <p className="font-black text-blue-900">₹{(b.payments || []).reduce((s, p) => s + p.amount, 0).toFixed(2)}</p>
                            </div>
                         </div>
                      </div>
                   );
                })}
                {filteredBookings.length === 0 && <div className="text-center py-20 text-slate-300 italic uppercase font-black">No records match your search</div>}
             </div>
          </div>
       </div>
    </div>
  );
};

const FooterBtn = ({ label, onClick, icon, color = "text-blue-900 hover:bg-blue-50" }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${color} whitespace-nowrap`}>
    <span className="flex items-center justify-center">{icon}</span>
    {label}
  </button>
);

const NavBtn: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-4 md:px-6 py-1.5 md:py-2 rounded-xl transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest shrink-0 ${active ? 'bg-white text-blue-900 shadow-lg scale-105' : 'text-white/70 hover:bg-white/10'}`}>{label}</button>
);

const Stat: React.FC<{ label: string, count: number, color: string }> = ({ label, count, color }) => (
  <div className="flex items-center gap-2 shrink-0">
    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-wider">{label}:</span>
    <span className={`text-base md:text-lg font-black ${color}`}>{count}</span>
  </div>
);

export default App;
