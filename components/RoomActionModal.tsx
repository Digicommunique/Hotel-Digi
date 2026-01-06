
import React from 'react';
import { Room, RoomStatus } from '../types';
import { STATUS_COLORS } from '../constants';

interface RoomActionModalProps {
  room: Room;
  onClose: () => void;
  onCheckIn: () => void;
  onStatusUpdate: (status: RoomStatus) => void;
}

const RoomActionModal: React.FC<RoomActionModalProps> = ({ room, onClose, onCheckIn, onStatusUpdate }) => {
  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className={`p-8 text-white flex justify-between items-center ${STATUS_COLORS[room.status].split(' ')[0]}`}>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Room {room.number}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{room.type} • {room.status}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-8 space-y-3">
          {room.status === RoomStatus.VACANT && (
            <button 
              onClick={onCheckIn} 
              className="w-full bg-[#003d80] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all"
            >
              Express Check-in
            </button>
          )}

          <div className="grid grid-cols-1 gap-2">
            <p className="text-[10px] font-black uppercase text-slate-400 text-center mb-1 tracking-[0.2em]">Change Service Status</p>
            
            {room.status !== RoomStatus.VACANT && (
              <StatusBtn color="bg-green-600" label="Mark as Clean/Vacant" onClick={() => onStatusUpdate(RoomStatus.VACANT)} />
            )}
            
            {room.status !== RoomStatus.DIRTY && (
              <StatusBtn color="bg-red-600" label="Mark as Dirty" onClick={() => onStatusUpdate(RoomStatus.DIRTY)} />
            )}
            
            {room.status !== RoomStatus.REPAIR && (
              <StatusBtn color="bg-[#5c2d0a]" label="Maintenance / Repair" onClick={() => onStatusUpdate(RoomStatus.REPAIR)} />
            )}
          </div>
          
          <button onClick={onClose} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] hover:text-slate-900 transition-all">Cancel</button>
        </div>
      </div>
    </div>
  );
};

const StatusBtn = ({ color, label, onClick }: { color: string, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick} 
    className={`w-full ${color} text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:brightness-110 transition-all`}
  >
    {label}
  </button>
);

export default RoomActionModal;
