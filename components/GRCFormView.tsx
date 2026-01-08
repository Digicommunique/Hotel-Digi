
import React from 'react';
import { Guest, Booking, Room, HostelSettings } from '../types';

interface GRCFormViewProps {
  guest: Partial<Guest>;
  booking: Partial<Booking>;
  room: Partial<Room>;
  settings: HostelSettings;
}

const GRCFormView: React.FC<GRCFormViewProps> = ({ guest, booking, room, settings }) => {
  return (
    <div className="bg-white p-8 w-[210mm] min-h-[297mm] mx-auto text-[10px] text-gray-800 font-sans leading-tight print:p-4 print:m-0">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-blue-900 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-blue-900 uppercase tracking-tighter">{settings.name}</h1>
          <p className="text-[8px] uppercase font-bold text-gray-500">{settings.address}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-blue-900">Guest Registration Card (GRC)</p>
          <p className="text-[8px] font-bold uppercase text-gray-400 mt-1">Property Management Registry</p>
        </div>
      </div>

      {/* Main Grid - 3 Columns like the image */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Column 1 */}
        <div className="space-y-3">
          <Field label="Room Number" value={room.number} />
          <Field label="Sur Name" value={guest.surName} />
          <Field label="Given Name" value={guest.givenName || guest.name} />
          <div className="space-y-1">
            <p className="text-[7px] font-bold uppercase text-gray-400">Gender</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-1"><input type="radio" checked={guest.gender === 'Male'} readOnly /> Male</label>
              <label className="flex items-center gap-1"><input type="radio" checked={guest.gender === 'Female'} readOnly /> Female</label>
            </div>
          </div>
          <Field label="DOB" value={guest.dob} />
          <Field label="Country" value={guest.country} />
          <Field label="Nationality" value={guest.nationality} />
          <Field label="State/Province" value={guest.state} />
          <Field label="Arrival From" value={guest.arrivalFrom} />
          <Field label="Next Destination" value={guest.nextDestination} />
          <Field label="Arrival in India" value={guest.arrivalInIndiaDate} />
          <Field label="Hotel Arrival in India" value={`${booking.checkInDate} ${booking.checkInTime}`} />
          <Field label="Hotel Departure in India" value={`${booking.checkOutDate} ${booking.checkOutTime}`} />
        </div>

        {/* Column 2 */}
        <div className="space-y-3">
          <Field label="Embassy Country Name" value={guest.embassyCountry} />
          <Field label="Passport Number" value={guest.passportNo || guest.idNumber} />
          <Field label="Passport Place Of Issue" value={guest.passportPlaceOfIssue} />
          <Field label="Passport Date Of Issue" value={guest.passportDateOfIssue} />
          <Field label="Passport Date Of Expiry" value={guest.passportDateOfExpiry} />
          <Field label="Visa Number" value={guest.visaNo} />
          <Field label="Visa Place Of Issue" value={guest.visaPlaceOfIssue} />
          <Field label="Visa Date Of Issue" value={guest.visaDateOfIssue} />
          <Field label="Visa Date Of Expiry" value={guest.visaDateOfExpiry} />
          <Field label="Visa Type" value={guest.visaType} />
          <div className="space-y-1">
            <p className="text-[7px] font-bold uppercase text-gray-400">Residential Address</p>
            <div className="border border-blue-900/20 p-2 min-h-[40px] rounded text-[9px]">{guest.address}</div>
          </div>
          <div className="space-y-1">
            <p className="text-[7px] font-bold uppercase text-gray-400">Address in India</p>
            <div className="border border-blue-900/20 p-2 min-h-[40px] rounded text-[9px]">{guest.addressInIndia || 'SAME AS ABOVE'}</div>
          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-3">
          <Field label="Number Of Days Stayed In India" value={guest.stayDurationIndia} />
          <div className="space-y-1">
            <p className="text-[7px] font-bold uppercase text-gray-400">Purpose Of Visit</p>
            <div className="border border-blue-900/20 p-2 min-h-[40px] rounded text-[9px] uppercase">{guest.purposeOfVisit || 'TOUR'}</div>
          </div>
          <div className="space-y-2">
            <p className="text-[7px] font-bold uppercase text-gray-400">Photo</p>
            <div className="w-20 h-24 border border-blue-900/20 rounded bg-gray-50 flex items-center justify-center overflow-hidden">
              {guest.documents?.photo ? <img src={guest.documents.photo} className="w-full h-full object-cover" /> : <div className="text-[6px] text-gray-300">PHOTO</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 py-1">
            <p className="text-[7px] font-bold uppercase text-gray-400">Employ In India ?</p>
            <input type="checkbox" checked={guest.employedInIndia} readOnly />
          </div>
          <Field label="Contact Number In India" value={guest.contactInIndia || guest.phone} />
          <Field label="Cell Number In India" value={guest.cellInIndia} />
          <Field label="Contact Number In Residing Country" value={guest.residingCountryContact} />
          <div className="space-y-1">
            <p className="text-[7px] font-bold uppercase text-gray-400">Remarks</p>
            <div className="border border-blue-900/20 p-2 min-h-[40px] rounded text-[9px]">{guest.remarks}</div>
          </div>
          <Field label="Application ID" value={guest.applicationId} />
        </div>
      </div>

      {/* Footer / Signatures */}
      <div className="mt-12 grid grid-cols-2 gap-20 pt-8 border-t border-dashed">
        <div className="text-center">
          <div className="border-b border-gray-400 h-12 mb-2"></div>
          <p className="text-[8px] font-bold uppercase">Guest Signature</p>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-400 h-12 mb-2"></div>
          <p className="text-[8px] font-bold uppercase">Receptionist Signature</p>
        </div>
      </div>
      
      <p className="mt-8 text-[6px] text-gray-400 uppercase text-center tracking-widest">Legal Document generated via HotelSphere Pro Management System</p>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value?: string | number }) => (
  <div className="space-y-1">
    <p className="text-[7px] font-bold uppercase text-gray-400">{label}</p>
    <div className="border-b border-blue-900/30 pb-1 font-bold text-[9px] h-[18px] uppercase overflow-hidden whitespace-nowrap">
      {value || '_'}
    </div>
  </div>
);

export default GRCFormView;
