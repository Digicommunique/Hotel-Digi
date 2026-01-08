
import React, { useState, useMemo, useEffect } from 'react';
import { Room, RoomStatus, Guest, Booking, HostelSettings, Transaction, RoomShiftLog, CleaningLog, Quotation, GroupProfile, UserRole, Payment } from './types.ts';
import { INITIAL_ROOMS, STATUS_COLORS } from './constants.tsx';
import { db, importDatabase } from './services/db.ts';
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
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showRoomActions, setShowRoomActions] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GROUP' | 'REPORTS' | 'ACCOUNTING' | 'SETTINGS'>('DASHBOARD');

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedRoomIdsForBulk, setSelectedRoomIdsForBulk] = useState<string[]>([]);

  useEffect(() => {
    const initData = async () => {
      try {
        let [r, g, b, t, gr, s, c, q, set] = await Promise.all([
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

        if (!r || r.length === 0) {
          try {
            const { data: cloudRooms } = await supabase.from('rooms').select('*');
            if (cloudRooms && cloudRooms.length > 0) {
              r = cloudRooms; await db.rooms.bulkAdd(r);
              const { data: cg } = await supabase.from('guests').select('*'); if (cg) { g = cg; await db.guests.bulkAdd(g); }
              const { data: cb } = await supabase.from('bookings').select('*'); if (cb) { b = cb; await db.bookings.bulkAdd(b); }
              const { data: ct } = await supabase.from('transactions').select('*'); if (ct) { t = ct; await db.transactions.bulkAdd(t); }
              const { data: cgr } = await supabase.from('groups').select('*'); if (cgr) { gr = cgr; await db.groups.bulkAdd(gr); }
              const { data: cs } = await supabase.from('settings').select('*').eq('id', 'primary').single(); if (cs) { set = cs; await db.settings.put(set); }
            }
          } catch (e) {
            console.warn("Cloud initial fetch failed, using defaults");
          }
        }

        if (r && r.length > 0) {
          setRooms(r);
        } else {
          await db.rooms.bulkAdd(INITIAL_ROOMS);
          setRooms(INITIAL_ROOMS);
          pushToCloud('rooms', INITIAL_ROOMS).catch(console.error);
        }
        
        setGuests(g || []);
        setBookings(b || []);
        setTransactions(t || []);
        setGroups(gr || []);
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
        return pushToCloud(tableNameForCloud, payload);
      }
      return true;
    } catch (err) {
      console.error(`Sync error:`, err);
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
  const updateQuotations = async (newQuotations: Quotation[]) => { 
    setQuotations([...newQuotations]); 
    return await syncToDB(db.quotations, newQuotations, 'quotations'); 
  };
  const updateSettings = async (newSet: HostelSettings) => { 
    setSettings({...newSet}); 
    return await syncToDB(db.settings, newSet, 'settings'); 
  };

  const handleAddPayment = async (bookingId: string, payment: any) => {
    const booking = bookings.find(b => b.id === bookingId);
    const guest = guests.find(g => g.id === booking?.guestId);
    if (!booking) return;

    const updatedBooking = { ...booking, payments: [...(booking.payments || []), payment] };
    await updateBookings(bookings.map(b => b.id === bookingId ? updatedBooking : b));

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
    await updateTransactions([...transactions, newTx]);
  };

  const handleGroupPayment = async (groupId: string, amount: number, method: string, remarks: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const groupBookings = bookings.filter(b => b.groupId === groupId && b.status !== 'CANCELLED' && b.status !== 'COMPLETED');
    let remainingAmount = amount;
    const distributionLogs: string[] = [];

    const updatedBookings = bookings.map(b => {
      if (b.groupId === groupId && b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && remainingAmount > 0) {
        const totalCharges = (b.charges || []).reduce((s, c) => s + c.amount, 0);
        const totalPayments = (b.payments || []).reduce((s, p) => s + p.amount, 0);
        const roomTotal = b.basePrice + totalCharges - (b.discount || 0);
        const tax = (roomTotal * (settings.taxRate || 0)) / 100;
        const grandTotal = roomTotal + tax;
        const balance = grandTotal - totalPayments;

        if (balance > 0) {
          const allocation = Math.min(remainingAmount, balance);
          const newPayment: Payment = {
            id: `GRP-PAY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            amount: allocation,
            date: new Date().toISOString(),
            method: `${method} (Group Dist)`,
            remarks: `Distributed from Group Master: ${remarks}`
          };
          remainingAmount -= allocation;
          distributionLogs.push(`Room ${rooms.find(r => r.id === b.roomId)?.number}: Allocated ₹${allocation.toFixed(2)}`);
          return { ...b, payments: [...(b.payments || []), newPayment] };
        }
      }
      return b;
    });

    await updateBookings(updatedBookings);

    const newTx: Transaction = {
      id: `TX-GRP-MASTER-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'RECEIPT',
      accountGroup: 'Direct Income',
      ledger: method,
      amount: amount,
      entityName: group.groupName,
      description: `Group Master Payment: ${remarks}. Distribution: ${distributionLogs.join(', ')}`
    };
    await updateTransactions([...transactions, newTx]);
    alert(`Successfully distributed ₹${amount} across group rooms.\n\n${distributionLogs.join('\n')}`);
  };

  const handleRoomShift = async (bookingId: string, newRoomId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const oldRoomId = booking.roomId;
    const updatedBookingsList = bookings.map(b => b.id === bookingId ? { ...b, roomId: newRoomId } : b);
    await updateBookings(updatedBookingsList);

    const updatedRooms = rooms.map(r => {
      if (r.id === oldRoomId) return { ...r, status: RoomStatus.DIRTY, currentBookingId: undefined };
      if (r.id === newRoomId) return { ...r, status: RoomStatus.OCCUPIED, currentBookingId: bookingId };
      return r;
    });
    await updateRooms(updatedRooms);

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
    alert(`Room shifted successfully to ${newShiftLog.toRoom}`);
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
    const roomStates = rooms.map(room => {
      const currentB = bookings.find(b => b.roomId === room.id && b.status === 'ACTIVE');
      if (currentB) return RoomStatus.OCCUPIED;
      
      const reservedB = bookings.find(b => b.roomId === room.id && b.status === 'RESERVED' && b.checkInDate === today);
      if (reservedB) return RoomStatus.RESERVED;
      
      return room.status;
    });

    return {
      total: rooms.length,
      vacant: roomStates.filter(s => s === RoomStatus.VACANT).length,
      occupied: roomStates.filter(s => s === RoomStatus.OCCUPIED).length,
      reserved: roomStates.filter(s => s === RoomStatus.RESERVED).length,
      dirty: roomStates.filter(s => s === RoomStatus.DIRTY).length,
      repair: roomStates.filter(s => s === RoomStatus.REPAIR).length,
    };
  }, [rooms, bookings]);

  const roomsByFloor = useMemo(() => {
    const grouped = rooms.reduce((acc, room) => {
      acc[room.floor] = acc[room.floor] || [];
      if (!acc[room.floor].find(r => r.number === room.number)) {
        acc[room.floor].push(room);
      }
      return acc;
    }, {} as Record<number, Room[]>);

    Object.keys(grouped).forEach(floorKey => {
      grouped[Number(floorKey)].sort((a, b) => {
        return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' });
      });
    });

    return grouped;
  }, [rooms]);

  const handleRoomClick = (room: Room) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if room has an ACTIVE check-in
    const activeB = bookings.find(b => b.roomId === room.id && b.status === 'ACTIVE');
    // Check if room has a RESERVED booking for TODAY
    const reservedToday = bookings.find(b => b.roomId === room.id && b.status === 'RESERVED' && b.checkInDate === today);

    if (isMultiSelectMode) {
      // Multi-select only allowed for VACANT rooms that don't have a reservation starting today
      if (!activeB && !reservedToday && room.status === RoomStatus.VACANT) {
        setSelectedRoomIdsForBulk(prev => 
          prev.includes(room.id) ? prev.filter(id => id !== room.id) : [...prev, room.id]
        );
      } else if (isMultiSelectMode) {
        alert("Selection restricted: Multi-checkin only allowed for VACANT/Available rooms.");
      }
      return;
    }

    if (currentUserRole === 'SUPERVISOR' && room.status !== RoomStatus.DIRTY && room.status !== RoomStatus.REPAIR) return;
    
    if (activeB) {
      setActiveBookingId(activeB.id);
    } else if (reservedToday) {
      setActiveBookingId(reservedToday.id);
    } else {
      setSelectedRoom(room);
      setShowRoomActions(true);
    }
  };

  const handleCheckinSave = async (data: { guest: Partial<Guest>, bookings: any[] }) => {
    const guestId = data.guest.id || Math.random().toString(36).substr(2, 9);
    const guestToSave = { ...data.guest, id: guestId } as Guest;
    const existingIdx = guests.findIndex(g => g.id === guestId);
    let newGuests = [...guests];
    if (existingIdx > -1) newGuests[existingIdx] = { ...newGuests[existingIdx], ...data.guest } as Guest;
    else newGuests.push(guestToSave);
    
    await updateGuests(newGuests);

    const newBookingsList: Booking[] = data.bookings.map(b => ({
      ...b,
      id: b.id || Math.random().toString(36).substr(2, 9),
      guestId: guestId,
    }));
    const updatedBookingsList = [...bookings, ...newBookingsList];
    await updateBookings(updatedBookingsList);

    // Create Transactions for advance payments
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
            description: `Advance Payment for Room ${rooms.find(r => r.id === b.roomId)?.number} during Booking`,
            referenceId: b.id
          });
        });
      }
    });
    if (newTransactions.length > 0) {
      await updateTransactions([...transactions, ...newTransactions]);
    }

    // IMPORTANT: Only mark room as occupied if status is ACTIVE (checked in)
    const updatedRooms = rooms.map(r => {
      const bForRoom = newBookingsList.find(nb => nb.roomId === r.id);
      if (bForRoom && bForRoom.status === 'ACTIVE') return { ...r, status: RoomStatus.OCCUPIED, currentBookingId: bForRoom.id };
      // If RESERVED, we don't change the room status field yet, we rely on the dynamic check in App
      return r;
    });
    await updateRooms(updatedRooms);
    
    setShowCheckinForm(false); 
    setShowReservationForm(false); 
    setShowRoomActions(false);
    setIsMultiSelectMode(false);
    setSelectedRoomIdsForBulk([]);
  };

  const handleBookingUpdate = async (updatedBooking: Booking) => {
    await updateBookings(bookings.map(x => x.id === updatedBooking.id ? updatedBooking : x));
    await updateRooms(rooms.map(r => {
      if (r.id === updatedBooking.roomId) {
        if (updatedBooking.status === 'COMPLETED') return { ...r, status: RoomStatus.DIRTY, currentBookingId: undefined };
        if (updatedBooking.status === 'ACTIVE') return { ...r, status: RoomStatus.OCCUPIED, currentBookingId: updatedBooking.id };
      }
      return r;
    }));
  };

  const handleHotelaImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (confirm("Import data from Hotela? This will sync all previous records.")) {
      await importDatabase(file);
      window.location.reload();
    }
  };

  const handleLogin = (role: UserRole) => {
    setCurrentUserRole(role);
    setIsLoggedIn(true);
  };

  const handleStartBulkCheckin = () => {
    if (selectedRoomIdsForBulk.length === 0) return;
    const anchorRoom = rooms.find(r => r.id === selectedRoomIdsForBulk[0]);
    if (anchorRoom) {
      setSelectedRoom(anchorRoom);
      setShowCheckinForm(true);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#003d80] flex items-center justify-center text-white font-black uppercase tracking-widest">Initializing HotelSphere...</div>;
  if (!isLoggedIn) return <Login onLogin={handleLogin} settings={settings} />;

  const renderContent = () => {
    if (activeBookingId) {
      const b = bookings.find(b => b.id === activeBookingId);
      const g = b ? guests.find(g => g.id === b.guestId) : null;
      const r = b ? rooms.find(r => r.id === b.roomId) : null;
      if (!b || !g || !r) return null;
      return <StayManagement booking={b} guest={g} room={r} allRooms={rooms} allBookings={bookings} settings={settings} onUpdate={handleBookingUpdate} onAddPayment={(p) => handleAddPayment(b.id, p)} onUpdateGuest={(gu) => updateGuests(guests.map(x => x.id === gu.id ? gu : x))} onShiftRoom={(nr) => handleRoomShift(b.id, nr)} onClose={() => setActiveBookingId(null)} />;
    }

    if (showCheckinForm && selectedRoom) return <GuestCheckin room={selectedRoom} allRooms={rooms as any} existingGuests={guests} onClose={() => setShowCheckinForm(false)} onSave={handleCheckinSave} settings={settings} onSwitchToReservation={() => { setShowCheckinForm(false); setShowReservationForm(true); }} initialSelectedRoomIds={selectedRoomIdsForBulk} />;
    if (showReservationForm) return <ReservationEntry rooms={rooms} existingGuests={guests} onClose={() => setShowReservationForm(false)} onSave={(data) => {
        const initialPayments: Payment[] = data.advanceAmount > 0 ? [{
          id: 'ADV-' + Date.now(),
          amount: data.advanceAmount,
          date: new Date().toISOString(),
          method: data.advanceMethod,
          remarks: 'Advance for Reservation'
        }] : [];

        const bookingsData = data.roomIds.map(rid => ({
          bookingNo: data.bookingNo, roomId: rid, checkInDate: data.checkInDate, checkInTime: data.checkInTime, checkOutDate: data.checkOutDate, checkOutTime: data.checkOutTime,
          status: 'RESERVED' as const, basePrice: rooms.find(room => room.id === rid)?.price || 0, mealPlan: data.mealPlan, agent: data.agent, discount: data.discount,
          charges: [], payments: initialPayments, purpose: data.purpose, secondaryGuest: data.secondaryGuest
        }));
        handleCheckinSave({ guest: data.guest, bookings: bookingsData });
      }} settings={settings} />;

    switch (activeTab) {
      case 'GROUP': return <GroupModule groups={groups} setGroups={updateGroups} rooms={rooms} bookings={bookings} setBookings={updateBookings} guests={guests} setGuests={updateGuests} setRooms={updateRooms} onAddTransaction={(tx) => updateTransactions([...transactions, tx])} onGroupPayment={handleGroupPayment} settings={settings} />;
      case 'REPORTS': return <Reports bookings={bookings} guests={guests} rooms={rooms} settings={settings} transactions={transactions} shiftLogs={shiftLogs} cleaningLogs={cleaningLogs} quotations={quotations} />;
      case 'ACCOUNTING': return <Accounting transactions={transactions} setTransactions={updateTransactions} guests={guests} bookings={bookings} quotations={quotations} setQuotations={updateQuotations} settings={settings} />;
      case 'SETTINGS': return <Settings settings={settings} setSettings={updateSettings} rooms={rooms} setRooms={updateRooms} />;
      default:
        return (
          <div className="p-6 pb-32 text-black">
            <div className="flex justify-between items-center mb-8 no-print">
              <div className="flex items-center gap-6">
                <h1 className="text-2xl font-black text-black border-l-8 border-blue-600 pl-4 uppercase">{currentUserRole} Front Desk</h1>
                <button 
                  onClick={() => { 
                    setIsMultiSelectMode(!isMultiSelectMode); 
                    setSelectedRoomIdsForBulk([]); 
                  }} 
                  className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase border-2 transition-all shadow-md ${isMultiSelectMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'}`}
                >
                  {isMultiSelectMode ? 'Cancel Selection' : 'Multiple Check-in'}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowReservationForm(true)} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-orange-600 transition-all">+ New Reservation</button>
                <button onClick={() => handleTabChange('GROUP')} className="bg-blue-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-black">Group Bookings</button>
              </div>
            </div>
            
            <div className="space-y-10">
              {(Object.entries(roomsByFloor) as [string, Room[]][]).sort((a,b) => Number(a[0]) - Number(b[0])).map(([floor, floorRooms]) => (
                <div key={floor} className="bg-white rounded-[2rem] shadow-sm border overflow-hidden">
                  <div className="bg-blue-50 px-8 py-3 font-black text-black uppercase text-[10px] tracking-widest border-b">Floor Level {floor}</div>
                  <div className="p-8 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                    {floorRooms.map(room => {
                      const today = new Date().toISOString().split('T')[0];
                      
                      // DYNAMIC STATUS CHECK
                      const activeB = bookings.find(b => b.roomId === room.id && b.status === 'ACTIVE');
                      const reservedToday = bookings.find(b => b.roomId === room.id && b.status === 'RESERVED' && b.checkInDate === today);
                      const nextB = bookings
                        .filter(b => b.roomId === room.id && b.status === 'RESERVED' && b.checkInDate > today)
                        .sort((a,b) => a.checkInDate.localeCompare(b.checkInDate))[0];

                      let effectiveStatus = room.status;
                      let displayBooking = activeB || reservedToday || nextB;

                      if (activeB) effectiveStatus = RoomStatus.OCCUPIED;
                      else if (reservedToday) effectiveStatus = RoomStatus.RESERVED;

                      const isSelected = selectedRoomIdsForBulk.includes(room.id);
                      const statusClasses = activeB || reservedToday ? getBookingColorClasses(activeB || reservedToday) : STATUS_COLORS[effectiveStatus];

                      return (
                        <button 
                          key={room.id} 
                          onClick={() => handleRoomClick(room)} 
                          className={`min-h-[160px] border-2 rounded-2xl p-4 flex flex-col items-center justify-between transition-all shadow-sm ${statusClasses} ${isSelected ? 'ring-4 ring-blue-500 scale-105 z-10' : 'hover:scale-105 active:scale-95'} group relative`}
                        >
                          <span className="text-2xl font-black tracking-tighter uppercase">ROOM {room.number}</span>
                          
                          <div className="text-center w-full">
                            <div className="text-[9px] font-black uppercase mb-1 opacity-80 line-clamp-1">
                              {activeB ? guests.find(g => g.id === activeB.guestId)?.name : room.type}
                            </div>
                            <div className={`text-[8px] font-bold uppercase py-0.5 px-3 rounded-full border border-current inline-block`}>{effectiveStatus}</div>
                          </div>

                          {displayBooking && (
                            <div className="w-full mt-2 pt-2 border-t border-current/10 space-y-0.5">
                               <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-tighter">
                                  <span>ARR:</span>
                                  <span>{displayBooking.checkInDate}</span>
                               </div>
                               <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-tighter">
                                  <span>DEP:</span>
                                  <span>{displayBooking.checkOutDate}</span>
                               </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bulk Action Floating Bar */}
            {isMultiSelectMode && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
                <div className="bg-slate-900/90 backdrop-blur-xl px-8 py-5 rounded-[2.5rem] shadow-2xl border border-white/10 flex items-center gap-12">
                   <div>
                     <p className="text-blue-400 font-black uppercase text-[10px] tracking-widest mb-1">Batch Operation</p>
                     <h4 className="text-white font-black uppercase text-xs tracking-tight">{selectedRoomIdsForBulk.length} Units Selected</h4>
                   </div>
                   <div className="flex gap-4">
                      <button 
                        onClick={() => setSelectedRoomIdsForBulk([])} 
                        className="text-white/60 font-black uppercase text-[10px] hover:text-white transition-colors"
                      >
                        Reset
                      </button>
                      <button 
                        disabled={selectedRoomIdsForBulk.length === 0}
                        onClick={handleStartBulkCheckin}
                        className={`px-8 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg transition-all ${selectedRoomIdsForBulk.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                      >
                        Proceed to Check-in
                      </button>
                   </div>
                </div>
              </div>
            )}
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
            {['SUPERADMIN', 'ADMIN', 'RECEPTIONIST'].includes(currentUserRole) && <NavBtn label="Groups" active={activeTab === 'GROUP'} onClick={() => handleTabChange('GROUP')} />}
            {['SUPERADMIN', 'ADMIN', 'ACCOUNTANT'].includes(currentUserRole) && (
              <>
                <NavBtn label="Accounting" active={activeTab === 'ACCOUNTING'} onClick={() => handleTabChange('ACCOUNTING')} />
                <NavBtn label="Reports" active={activeTab === 'REPORTS'} onClick={() => handleTabChange('REPORTS')} />
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black uppercase bg-white/10 px-3 py-1 rounded-full">{currentUserRole}</span>
          <button onClick={() => setShowHistory(true)} className="bg-white/10 p-2 rounded-xl text-white hover:bg-white/20 transition-all font-black uppercase text-[9px]">Bill History</button>
          {currentUserRole === 'SUPERADMIN' && (
            <button onClick={() => setShowSuperAdmin(true)} className="px-6 py-2 bg-blue-600 rounded-xl font-black text-[10px] uppercase shadow-lg border border-white/20">Command Center</button>
          )}
          <button onClick={() => setIsLoggedIn(false)} className="text-[10px] font-black uppercase text-white/50 hover:text-white">Logout</button>
          {['SUPERADMIN', 'ADMIN'].includes(currentUserRole) && <button onClick={() => handleTabChange('SETTINGS')} className="px-6 py-2 bg-white/10 rounded-xl font-black text-[10px] uppercase border border-white/20">Settings</button>}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto custom-scrollbar">{renderContent()}</main>

      <footer className="bg-white border-t px-8 py-3 flex justify-between items-center fixed bottom-0 w-full z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] no-print">
        <div className="flex gap-6 items-center">
          <div className="flex gap-8 overflow-x-auto no-scrollbar py-1">
            <Stat label="Total" count={stats.total} color="text-black" />
            <Stat label="Vacant" count={stats.vacant} color="text-green-600" />
            <Stat label="Occupied" count={stats.occupied} color="text-blue-600" />
            <Stat label="Dirty" count={stats.dirty} color="text-red-600" />
            <Stat label="Repair" count={stats.repair} color="text-amber-800" />
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="flex gap-2">
             <label className="bg-blue-50 text-blue-900 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest cursor-pointer hover:bg-blue-100 transition-all">
                Migrate Hotela Data
                <input type="file" className="hidden" onChange={handleHotelaImport} />
             </label>
             <button onClick={() => setShowHistory(true)} className="bg-slate-900 text-white px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest">Duplicate Bills</button>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-green-500 db-sync-pulse"></div>
          <span className="text-[10px] font-black uppercase text-black">Cloud Active</span>
        </div>
      </footer>

      {showHistory && (
        <HistoricalBillsModal 
          bookings={bookings} 
          guests={guests} 
          rooms={rooms} 
          settings={settings} 
          onClose={() => setShowHistory(false)} 
        />
      )}

      {showRoomActions && selectedRoom && (
        <RoomActionModal room={selectedRoom} onClose={() => setShowRoomActions(false)} onCheckIn={() => { setShowRoomActions(false); setShowCheckinForm(true); }} onStatusUpdate={async (s) => { await updateRooms(rooms.map(r => r.id === selectedRoom.id ? { ...r, status: s } : r)); setShowRoomActions(false); }} />
      )}
      {showSuperAdmin && (
        <SuperAdminPanel 
          settings={settings} 
          setSettings={updateSettings} 
          rooms={rooms} 
          setRooms={updateRooms} 
          onClose={() => setShowSuperAdmin(false)} 
        />
      )}
    </div>
  );
};

const getBookingColorClasses = (booking?: Booking) => {
  if (!booking) return '';
  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') return '';
  const palettes = [
    'bg-blue-50 border-blue-600 text-blue-900',
    'bg-indigo-50 border-indigo-600 text-indigo-900',
    'bg-purple-50 border-purple-600 text-purple-900',
    'bg-amber-50 border-amber-600 text-indigo-900',
    'bg-teal-50 border-teal-600 text-teal-900',
  ];
  let hash = 0;
  const hashKey = booking.groupId || booking.bookingNo || booking.id;
  for (let i = 0; i < hashKey.length; i++) hash = hashKey.charCodeAt(i) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
};

const HistoricalBillsModal = ({ bookings, guests, rooms, settings, onClose }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const g = guests.find((guest: any) => guest.id === b.guestId);
      const matchesSearch = !searchTerm || (g?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || b.bookingNo.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDate = !filterDate || b.checkInDate === filterDate;
      return matchesSearch && matchesDate;
    }).sort((a: any, b: any) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime());
  }, [bookings, guests, searchTerm, filterDate]);

  if (viewingBooking) {
    const g = guests.find((guest: any) => guest.id === viewingBooking.guestId);
    const r = rooms.find((room: any) => room.id === viewingBooking.roomId);
    return (
      <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col no-print-backdrop overflow-hidden">
         <div className="bg-black p-4 flex justify-between items-center no-print border-b border-white/10">
            <p className="text-white font-black uppercase text-xs">Duplicate Bill Archives</p>
            <div className="flex gap-2">
               <button onClick={() => window.print()} className="bg-green-600 text-white px-8 py-2 rounded-xl font-black uppercase text-xs">Download / Print</button>
               <button onClick={() => setViewingBooking(null)} className="bg-white/10 text-white px-8 py-2 rounded-xl font-black uppercase text-xs border border-white/20">Back to Search</button>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto bg-gray-500/20 p-8 custom-scrollbar">
            <InvoiceView guest={g!} booking={viewingBooking} room={r!} settings={settings} payments={viewingBooking.payments || []} />
         </div>
         <div className="bg-black p-4 flex justify-center no-print">
             <button onClick={onClose} className="bg-orange-600 text-white px-12 py-3 rounded-2xl font-black uppercase text-xs shadow-xl">Close Archives</button>
         </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[180] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-8 no-print">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-blue-900 p-10 text-white flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Billing Archives</h2>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1">Previous Customer Registry & Duplicate Bills</p>
          </div>
          <button onClick={onClose} className="p-4 bg-white/10 rounded-2xl hover:bg-white/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-10 flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex gap-4">
             <input type="text" placeholder="Search by Name or Bill No..." className="flex-1 border-2 p-4 rounded-2xl font-black text-sm bg-slate-50 outline-none focus:border-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             <input type="date" className="w-48 border-2 p-4 rounded-2xl font-black text-sm bg-slate-50" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto border rounded-[2.5rem] bg-white custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-[10px] font-black uppercase text-slate-400 border-b">
                  <th className="p-6">Bill No</th>
                  <th className="p-6">Guest</th>
                  <th className="p-6">Check-in</th>
                  <th className="p-6">Check-out</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-[12px] font-bold uppercase text-slate-800">
                {filteredBookings.map(b => {
                  const g = guests.find((guest: any) => guest.id === b.guestId);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 group">
                      <td className="p-6 font-black text-blue-900">{b.bookingNo}</td>
                      <td className="p-6">
                         <div className="font-black">{g?.name}</div>
                         <div className="text-[9px] text-slate-400">{g?.phone}</div>
                      </td>
                      <td className="p-6 text-slate-400">{b.checkInDate}</td>
                      <td className="p-6 text-slate-400">{b.checkOutDate}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => setViewingBooking(b)} className="bg-blue-900 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg group-hover:scale-105 transition-all">Duplicate Bill</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
