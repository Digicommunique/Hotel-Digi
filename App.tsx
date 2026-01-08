import React, { useState, useMemo, useEffect } from 'react';
import { Room, RoomStatus, Guest, Booking, HostelSettings, Transaction, RoomShiftLog, CleaningLog, Quotation, GroupProfile, UserRole, Payment, Supervisor } from './types.ts';
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
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GROUP' | 'REPORTS' | 'ACCOUNTING' | 'SETTINGS'>('DASHBOARD');

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedRoomIdsForBulk, setSelectedRoomIdsForBulk] = useState<string[]>([]);

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
      if (Array.isArray(data)) {
        // Ensure no duplicate IDs in the data array to prevent ConstraintError
        const uniqueData = Array.from(new Map(data.map(item => [item.id, item])).values());
        
        // Use a transaction to ensure clear and add are atomic
        // Fix: Cast db to any to avoid "transaction does not exist on HotelSphereDB" TS error
        await (db as any).transaction('rw', table, async () => {
          await table.clear();
          await table.bulkAdd(uniqueData);
        });
      } else {
        const dataToSync = { ...data, id: 'primary' };
        await table.put(dataToSync);
      }
      
      if (tableNameForCloud) {
        const payload = Array.isArray(data) ? data : [data];
        return pushToCloud(tableNameForCloud, payload);
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
  const updateQuotations = async (newQuotations: Quotation[]) => { 
    setQuotations([...newQuotations]); 
    return await syncToDB(db.quotations, newQuotations, 'quotations'); 
  };
  const updateSettings = async (newSet: HostelSettings) => { 
    setSettings({...newSet}); 
    return await syncToDB(db.settings, newSet, 'settings'); 
  };

  const handleAddPayment = async (bookingId: string, payment: any) => {
    // Re-fetch current state to ensure no race conditions
    const currentBookings = await db.bookings.toArray();
    const booking = currentBookings.find(b => b.id === bookingId);
    if (!booking) return;

    const guest = guests.find(g => g.id === booking.guestId);
    const updatedBooking = { ...booking, payments: [...(booking.payments || []), payment] };
    const newBookingsList = currentBookings.map(b => b.id === bookingId ? updatedBooking : b);
    
    // Update local state and DB
    setBookings(newBookingsList);
    await syncToDB(db.bookings, newBookingsList, 'bookings');

    const newTx: Transaction = {
      id: `TX-PAY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: new Date().toISOString().split('T')[0],
      type: 'RECEIPT',
      accountGroup: 'Direct Income',
      ledger: payment.method || 'Cash Account',
      amount: payment.amount,
      entityName: guest?.name || 'Walk-in Guest',
      description: `Payment for R${rooms.find(r => r.id === booking.roomId)?.number} - ${payment.remarks || 'Settlement'}`,
      referenceId: bookingId
    };
    
    const updatedTransactions = [...transactions, newTx];
    setTransactions(updatedTransactions);
    await syncToDB(db.transactions, updatedTransactions, 'transactions');
  };

  const handleGroupPayment = async (groupId: string, amount: number, method: string, remarks: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const currentBookings = await db.bookings.toArray();
    const groupBookings = currentBookings.filter(b => b.groupId === groupId && b.status !== 'CANCELLED' && b.status !== 'COMPLETED');
    let remainingAmount = amount;
    const distributionLogs: string[] = [];

    const updatedBookings = currentBookings.map(b => {
      if (b.groupId === groupId && b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && remainingAmount > 0) {
        const start = new Date(b.checkInDate);
        const end = new Date(b.checkOutDate);
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
        const totalCharges = (b.charges || []).reduce((s, c) => s + c.amount, 0);
        const totalPayments = (b.payments || []).reduce((s, p) => s + p.amount, 0);
        const roomTotal = (b.basePrice * nights) + totalCharges - (b.discount || 0);
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
          distributionLogs.push(`Room ${rooms.find(r => r.id === b.roomId)?.number}: ₹${allocation.toFixed(2)}`);
          return { ...b, payments: [...(b.payments || []), newPayment] };
        }
      }
      return b;
    });

    setBookings(updatedBookings);
    await syncToDB(db.bookings, updatedBookings, 'bookings');

    const newTx: Transaction = {
      id: `TX-GRP-MASTER-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'RECEIPT',
      accountGroup: 'Direct Income',
      ledger: method,
      amount: amount,
      entityName: group.groupName,
      description: `Group Settlement: ${remarks}`
    };
    
    const updatedTransactions = [...transactions, newTx];
    setTransactions(updatedTransactions);
    await syncToDB(db.transactions, updatedTransactions, 'transactions');
    
    alert(`Consolidated Payment Distributed:\n${distributionLogs.join('\n')}`);
  };

  const handleRoomShift = async (bookingId: string, newRoomId: string) => {
    const currentBookings = await db.bookings.toArray();
    const booking = currentBookings.find(b => b.id === bookingId);
    if (!booking) return;

    const oldRoomId = booking.roomId;
    const updatedBookingsList = currentBookings.map(b => b.id === bookingId ? { ...b, roomId: newRoomId } : b);
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
  }, [rooms, currentUserRole, activeSupervisor]);

  const handleRoomClick = (room: Room) => {
    const today = new Date().toISOString().split('T')[0];
    
    const activeB = bookings.find(b => b.roomId === room.id && b.status === 'ACTIVE');
    const reservedToday = bookings.find(b => b.roomId === room.id && b.status === 'RESERVED' && b.checkInDate === today);

    if (isMultiSelectMode) {
      if (!activeB && !reservedToday && room.status === RoomStatus.VACANT) {
        setSelectedRoomIdsForBulk(prev => 
          prev.includes(room.id) ? prev.filter(id => id !== room.id) : [...prev, room.id]
        );
      } else if (isMultiSelectMode) {
        alert("Selection restricted: Multi-checkin only allowed for VACANT/Available rooms.");
      }
      return;
    }

    if (currentUserRole === 'SUPERVISOR' && room.status !== RoomStatus.DIRTY && room.status !== RoomStatus.REPAIR && room.status !== RoomStatus.VACANT) return;
    
    if (activeB && currentUserRole !== 'SUPERVISOR') {
      setActiveBookingId(activeB.id);
    } else if (reservedToday && currentUserRole !== 'SUPERVISOR') {
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
    
    setGuests(newGuests);
    await syncToDB(db.guests, newGuests, 'guests');

    const newBookingsList: Booking[] = data.bookings.map(b => ({
      ...b,
      id: b.id || Math.random().toString(36).substr(2, 9),
      guestId: guestId,
    }));
    const updatedBookingsList = [...bookings, ...newBookingsList];
    setBookings(updatedBookingsList);
    await syncToDB(db.bookings, updatedBookingsList, 'bookings');

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
    // Directly use the re-fetched bookings from the database to avoid state stale issues
    const currentBookings = await db.bookings.toArray();
    const newBookingsList = currentBookings.map(x => x.id === updatedBooking.id ? updatedBooking : x);
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

  const handleHotelaImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (confirm("Import data from Hotela? This will sync all previous records.")) {
      await importDatabase(file);
      window.location.reload();
    }
  };

  const handleLogin = (role: UserRole, supervisor?: Supervisor) => {
    setCurrentUserRole(role);
    if (supervisor) setActiveSupervisor(supervisor);
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

  if (isLoading) return <div className="min-h-screen bg-[#003d80] flex items-center justify-center text-white font-black uppercase tracking-widest p-10 text-center">Initializing HotelSphere...</div>;
  if (!isLoggedIn) return <Login onLogin={handleLogin} settings={settings} supervisors={supervisors} />;

  const renderContent = () => {
    if (activeBookingId) {
      const b = bookings.find(b => b.id === activeBookingId);
      const g = b ? guests.find(g => g.id === b.guestId) : null;
      const r = b ? rooms.find(r => r.id === b.roomId) : null;
      if (!b || !g || !r) return null;
      return <StayManagement booking={b} guest={g} room={r} allRooms={rooms} allBookings={bookings} settings={settings} onUpdate={handleBookingUpdate} onAddPayment={handleAddPayment} onUpdateGuest={(gu) => updateGuests(guests.map(x => x.id === gu.id ? gu : x))} onShiftRoom={(nr) => handleRoomShift(b.id, nr)} onClose={() => setActiveBookingId(null)} />;
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
      case 'SETTINGS': return <Settings settings={settings} setSettings={updateSettings} rooms={rooms} setRooms={updateRooms} setBookings={updateBookings} setTransactions={updateTransactions} supervisors={supervisors} setSupervisors={setSupervisors} />;
      default:
        return (
          <div className="p-4 md:p-6 pb-40 text-black">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 no-print">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 w-full md:w-auto">
                <h1 className="text-xl md:text-2xl font-black text-black border-l-8 border-blue-600 pl-4 uppercase leading-none">
                  {currentUserRole === 'SUPERVISOR' && activeSupervisor ? `${activeSupervisor.name.split(' ')[0]}'s Zone` : `${currentUserRole} Desk`}
                </h1>
                {currentUserRole !== 'SUPERVISOR' && (
                  <button 
                    onClick={() => { 
                      setIsMultiSelectMode(!isMultiSelectMode); 
                      setSelectedRoomIdsForBulk([]); 
                    }} 
                    className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border-2 transition-all shadow-md w-full md:w-auto ${isMultiSelectMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'}`}
                  >
                    {isMultiSelectMode ? 'Exit Selection' : 'Multi Check-in'}
                  </button>
                )}
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                {currentUserRole !== 'SUPERVISOR' && <button onClick={() => setShowReservationForm(true)} className="flex-1 md:flex-none bg-orange-500 text-white px-4 md:px-6 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase shadow-xl hover:bg-orange-600 transition-all">+ New Booking</button>}
                {currentUserRole !== 'SUPERVISOR' && <button onClick={() => handleTabChange('GROUP')} className="flex-1 md:flex-none bg-blue-900 text-white px-4 md:px-6 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase shadow-xl hover:bg-black transition-all">Groups</button>}
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
                      const nextB = bookings.filter(b => b.roomId === room.id && b.status === 'RESERVED' && b.checkInDate > today).sort((a,b) => a.checkInDate.localeCompare(b.checkInDate))[0];

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
                          className={`min-h-[140px] md:min-h-[160px] border-2 rounded-2xl md:rounded-3xl p-3 md:p-4 flex flex-col items-center justify-between transition-all shadow-sm ${statusClasses} ${isSelected ? 'ring-4 ring-blue-500 scale-105 z-10' : 'hover:scale-105'} group relative`}
                        >
                          <span className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">{room.number}</span>
                          
                          <div className="text-center w-full">
                            <div className="text-[8px] md:text-[9px] font-black uppercase mb-1 opacity-80 truncate px-1">
                              {activeB ? guests.find(g => g.id === activeB.guestId)?.name : room.type.replace(' ROOM', '')}
                            </div>
                            <div className={`text-[7px] md:text-[8px] font-bold uppercase py-0.5 px-2 md:px-3 rounded-full border border-current inline-block leading-none`}>{effectiveStatus}</div>
                          </div>

                          {displayBooking && (
                            <div className="w-full mt-2 pt-2 border-t border-current/10 space-y-0.5">
                               <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-tighter opacity-70">
                                  <span>ARR:</span>
                                  <span>{displayBooking.checkInDate.slice(5)}</span>
                               </div>
                               <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-tighter opacity-70">
                                  <span>DEP:</span>
                                  <span>{displayBooking.checkOutDate.slice(5)}</span>
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

            {isMultiSelectMode && (
              <div className="fixed bottom-24 left-4 right-4 md:left-1/2 md:-translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
                <div className="bg-slate-900/90 backdrop-blur-xl px-4 md:px-8 py-4 rounded-3xl md:rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col md:flex-row items-center gap-4 md:gap-12">
                   <div className="text-center md:text-left">
                     <p className="text-blue-400 font-black uppercase text-[9px] tracking-widest mb-0.5">Batch Mode</p>
                     <h4 className="text-white font-black uppercase text-xs tracking-tight">{selectedRoomIdsForBulk.length} Units Ready</h4>
                   </div>
                   <div className="flex gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => setSelectedRoomIdsForBulk([])} 
                        className="flex-1 md:flex-none text-white/60 font-black uppercase text-[10px] hover:text-white transition-colors py-2"
                      >
                        Reset
                      </button>
                      <button 
                        disabled={selectedRoomIdsForBulk.length === 0}
                        onClick={handleStartBulkCheckin}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg transition-all ${selectedRoomIdsForBulk.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                      >
                        Process Check-in
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
          </div>
          <div className="md:hidden">
             <span className="text-[8px] font-black uppercase bg-white/10 px-2 py-1 rounded-full">{currentUserRole}</span>
          </div>
        </div>

        <div className="flex md:hidden w-full overflow-x-auto gap-1 scrollbar-hide border-t border-white/10 pt-4">
            <NavBtn label="Home" active={activeTab === 'DASHBOARD'} onClick={() => handleTabChange('DASHBOARD')} />
            {['SUPERADMIN', 'ADMIN', 'RECEPTIONIST'].includes(currentUserRole) && <NavBtn label="Groups" active={activeTab === 'GROUP'} onClick={() => handleTabChange('GROUP')} />}
            {['SUPERADMIN', 'ADMIN', 'ACCOUNTANT'].includes(currentUserRole) && (
              <>
                <NavBtn label="Finance" active={activeTab === 'ACCOUNTING'} onClick={() => handleTabChange('ACCOUNTING')} />
                <NavBtn label="Reports" active={activeTab === 'REPORTS'} onClick={() => handleTabChange('REPORTS')} />
              </>
            )}
            {['SUPERADMIN', 'ADMIN'].includes(currentUserRole) && <NavBtn label="Setup" active={activeTab === 'SETTINGS'} onClick={() => handleTabChange('SETTINGS')} />}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <span className="text-[10px] font-black uppercase bg-white/10 px-3 py-1 rounded-full">{currentUserRole}</span>
          {currentUserRole !== 'SUPERVISOR' && <button onClick={() => setShowHistory(true)} className="bg-white/10 p-2 px-3 rounded-xl text-white hover:bg-white/20 transition-all font-black uppercase text-[9px]">Bill History</button>}
          {currentUserRole === 'SUPERADMIN' && (
            <button onClick={() => setShowSuperAdmin(true)} className="px-5 py-2 bg-blue-600 rounded-xl font-black text-[9px] uppercase shadow-lg border border-white/20">Master Console</button>
          )}
          <button onClick={() => { setIsLoggedIn(false); setActiveSupervisor(null); }} className="text-[10px] font-black uppercase text-white/50 hover:text-white px-2">Logout</button>
          {['SUPERADMIN', 'ADMIN'].includes(currentUserRole) && <button onClick={() => handleTabChange('SETTINGS')} className="px-5 py-2 bg-white/10 rounded-xl font-black text-[9px] uppercase border border-white/20">Settings</button>}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto custom-scrollbar">{renderContent()}</main>

      <footer className="bg-white border-t px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-center fixed bottom-0 w-full z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] no-print gap-4">
        <div className="flex gap-4 md:gap-6 items-center w-full md:w-auto">
          <div className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar py-1 flex-1 md:flex-none">
            <Stat label="Total" count={stats.total} color="text-black" />
            <Stat label="Vacant" count={stats.vacant} color="text-green-600" />
            <Stat label="Occupied" count={stats.occupied} color="text-blue-600" />
            <Stat label="Dirty" count={stats.dirty} color="text-red-600" />
            <Stat label="Repair" count={stats.repair} color="text-amber-800" />
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200"></div>
          <div className="hidden lg:flex gap-2">
             <label className="bg-blue-50 text-blue-900 px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest cursor-pointer hover:bg-blue-100 transition-all">
                Sync History
                <input type="file" className="hidden" onChange={handleHotelaImport} />
             </label>
             <button onClick={() => setShowHistory(true)} className="bg-slate-900 text-white px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest">Duplicate Desk</button>
          </div>
        </div>
        <div className="flex items-center gap-2 md:ml-4 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-green-500 db-sync-pulse"></div>
          <span className="text-[10px] font-black uppercase text-black">Active Terminal Connection</span>
        </div>
      </footer>

      {showHistory && <HistoricalBillsModal bookings={bookings} guests={guests} rooms={rooms} settings={settings} onClose={() => setShowHistory(false)} />}
      {showRoomActions && selectedRoom && (
        <RoomActionModal room={selectedRoom} onClose={() => setShowRoomActions(false)} onCheckIn={() => { setShowRoomActions(false); setShowCheckinForm(true); }} onStatusUpdate={async (s) => { await updateRooms(rooms.map(r => r.id === selectedRoom.id ? { ...r, status: s } : r)); setShowRoomActions(false); }} />
      )}
      {showSuperAdmin && <SuperAdminPanel settings={settings} setSettings={updateSettings} rooms={rooms} setRooms={updateRooms} onClose={() => setShowSuperAdmin(false)} />}
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

  const handleWhatsAppShare = (b: Booking, g: Guest) => {
    const r = rooms.find((room: any) => room.id === b.roomId);
    const start = new Date(b.checkInDate);
    const end = new Date(b.checkOutDate);
    const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    const total = ((b.basePrice || 0) * nights) + (b.charges || []).reduce((acc: number, c: any) => acc + c.amount, 0) - (b.discount || 0);
    const tax = (total * (settings.taxRate || 12)) / 100;
    const paid = (b.payments || []).reduce((acc: number, p: any) => acc + p.amount, 0);

    const message = `*Invoice Summary: ${settings.name}*\nRef: ${b.bookingNo}\nGuest: *${g.name}*\nRoom: ${r?.number}\nTotal: ₹${(total + tax).toFixed(2)}\nPaid: ₹${paid.toFixed(2)}\nBalance: ₹${(total + tax - paid).toFixed(2)}`;
    const url = `https://wa.me/${g.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

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
      <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col overflow-hidden">
         <div className="bg-black p-4 flex justify-between items-center no-print">
            <p className="text-white font-black uppercase text-[10px]">Bill Vault</p>
            <div className="flex gap-2">
               <button onClick={() => g && handleWhatsAppShare(viewingBooking, g)} className="bg-green-600 text-white px-4 py-2 rounded-xl font-black uppercase text-[9px]">WhatsApp</button>
               <button onClick={() => setViewingBooking(null)} className="bg-white/10 text-white px-4 py-2 rounded-xl font-black uppercase text-[9px]">Back</button>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto bg-gray-500/20 p-4 md:p-8 custom-scrollbar">
            <InvoiceView guest={g!} booking={viewingBooking} room={r!} settings={settings} payments={viewingBooking.payments || []} />
         </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[180] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-2 md:p-8 no-print">
      <div className="bg-white w-full max-w-5xl h-full md:h-[85vh] rounded-3xl md:rounded-[4rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-blue-900 p-6 md:p-10 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter leading-none">Bill Archives</h2>
            <p className="text-[9px] md:text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1">Guest Registry & Duplicate Bills</p>
          </div>
          <button onClick={onClose} className="p-3 md:p-4 bg-white/10 rounded-2xl hover:bg-white/20">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-4 md:p-10 flex-1 flex flex-col gap-4 md:gap-6 overflow-hidden">
          <div className="flex flex-col md:flex-row gap-4">
             <input type="text" placeholder="Guest Name / Bill No..." className="flex-1 border-2 p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm bg-slate-50 outline-none focus:border-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             <input type="date" className="w-full md:w-48 border-2 p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm bg-slate-50" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div className="flex-1 overflow-x-auto border rounded-2xl md:rounded-[2.5rem] bg-white custom-scrollbar">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 border-b">
                  <th className="p-4 md:p-6">Bill No</th>
                  <th className="p-4 md:p-6">Guest</th>
                  <th className="p-4 md:p-6">Dates</th>
                  <th className="p-4 md:p-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-[11px] md:text-[12px] font-bold uppercase text-slate-800">
                {filteredBookings.map(b => {
                  const g = guests.find((guest: any) => guest.id === b.guestId);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 group">
                      <td className="p-4 md:p-6 font-black text-blue-900">{b.bookingNo.slice(-6)}</td>
                      <td className="p-4 md:p-6 truncate max-w-[150px]">{g?.name}</td>
                      <td className="p-4 md:p-6 text-[10px] text-slate-400">{b.checkInDate.slice(5)} to {b.checkOutDate.slice(5)}</td>
                      <td className="p-4 md:p-6 text-right">
                        <button onClick={() => setViewingBooking(b)} className="bg-blue-900 text-white px-3 md:px-5 py-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase shadow-lg">View</button>
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
  <button onClick={onClick} className={`px-4 md:px-6 py-1.5 md:py-2 rounded-xl transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest shrink-0 ${active ? 'bg-white text-blue-900 shadow-lg scale-105' : 'text-white/70 hover:bg-white/10'}`}>{label}</button>
);

const Stat: React.FC<{ label: string, count: number, color: string }> = ({ label, count, color }) => (
  <div className="flex items-center gap-2 shrink-0">
    <span className="text-[8px] md:text-[9px] font-black uppercase text-black tracking-wider">{label}:</span>
    <span className={`text-base md:text-lg font-black ${color}`}>{count}</span>
  </div>
);

export default App;