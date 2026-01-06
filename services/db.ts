
import { Dexie, type Table } from 'dexie';
import { Room, Guest, Booking, Transaction, RoomShiftLog, CleaningLog, Quotation, HostelSettings, GroupProfile } from '../types';

export class HotelSphereDB extends Dexie {
  rooms!: Table<Room>;
  guests!: Table<Guest>;
  bookings!: Table<Booking>;
  transactions!: Table<Transaction>;
  shiftLogs!: Table<RoomShiftLog>;
  cleaningLogs!: Table<CleaningLog>;
  quotations!: Table<Quotation>;
  settings!: Table<HostelSettings & { id: string }>;
  groups!: Table<GroupProfile>;

  constructor() {
    super('HotelSphereDB');
    // Ensure Dexie versioning is configured on the instance
    // FIX: Using 'any' cast to bypass false-positive "Property 'version' does not exist" error
    (this as any).version(2).stores({
      rooms: 'id, number, status, type',
      guests: 'id, name, phone, email',
      bookings: 'id, bookingNo, roomId, guestId, status, checkInDate, checkOutDate, groupBookingId, groupId',
      transactions: 'id, date, type, ledger, accountGroup',
      shiftLogs: 'id, date, bookingId',
      cleaningLogs: 'id, date, roomId',
      quotations: 'id, date, guestName',
      settings: 'id',
      groups: 'id, groupName, headName, status'
    });
  }
}

export const db = new HotelSphereDB();

export async function exportDatabase() {
  const data = {
    rooms: await db.rooms.toArray(),
    guests: await db.guests.toArray(),
    bookings: await db.bookings.toArray(),
    transactions: await db.transactions.toArray(),
    shiftLogs: await db.shiftLogs.toArray(),
    cleaningLogs: await db.cleaningLogs.toArray(),
    quotations: await db.quotations.toArray(),
    settings: await db.settings.toArray(),
    groups: await db.groups.toArray()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hotelsphere_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

export async function importDatabase(jsonFile: File) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        // Correct usage of instance-level transaction management
        // FIX: Using 'any' cast to resolve "Property 'transaction' does not exist" error and avoid confusion with 'transactions' table property
        await (db as any).transaction('rw', [db.rooms, db.guests, db.bookings, db.transactions, db.shiftLogs, db.cleaningLogs, db.quotations, db.settings, db.groups], async () => {
          if (data.rooms) { await db.rooms.clear(); await db.rooms.bulkAdd(data.rooms); }
          if (data.guests) { await db.guests.clear(); await db.guests.bulkAdd(data.guests); }
          if (data.bookings) { await db.bookings.clear(); await db.bookings.bulkAdd(data.bookings); }
          if (data.transactions) { await db.transactions.clear(); await db.transactions.bulkAdd(data.transactions); }
          if (data.shiftLogs) { await db.shiftLogs.clear(); await db.shiftLogs.bulkAdd(data.shiftLogs); }
          if (data.cleaningLogs) { await db.cleaningLogs.clear(); await db.cleaningLogs.bulkAdd(data.cleaningLogs); }
          if (data.quotations) { await db.quotations.clear(); await db.quotations.bulkAdd(data.quotations); }
          if (data.settings) { await db.settings.clear(); await db.settings.bulkAdd(data.settings); }
          if (data.groups) { await db.groups.clear(); await db.groups.bulkAdd(data.groups); }
        });
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(jsonFile);
  });
}
