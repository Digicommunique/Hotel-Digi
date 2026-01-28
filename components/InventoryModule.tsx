
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { InventoryItem, Vendor, StockReceipt } from '../types';

const InventoryModule: React.FC<{ settings: any }> = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'VENDORS' | 'PURCHASE'>('STOCK');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);

  const [newVendor, setNewVendor] = useState<Partial<Vendor>>({ name: '', contact: '', gstin: '', category: 'General' });
  const [newReceipt, setNewReceipt] = useState<Partial<StockReceipt>>({
    date: new Date().toISOString().split('T')[0], itemId: '', vendorId: '', quantity: 0, unitPrice: 0, totalAmount: 0, paymentMade: 0, paymentMode: 'Cash', billNumber: ''
  });

  useEffect(() => {
    const init = async () => {
      setItems(await db.inventory.toArray());
      setVendors(await db.vendors.toArray());
      setReceipts(await db.stockReceipts.toArray());
    };
    init();
  }, []);

  const handleSaveVendor = async () => {
    if (!newVendor.name || !newVendor.contact) return;
    const v: Vendor = { ...newVendor, id: `VND-${Date.now()}` } as Vendor;
    await db.vendors.put(v);
    setVendors([...vendors, v]);
    setShowAddVendor(false);
    setNewVendor({ name: '', contact: '', gstin: '', category: 'General' });
  };

  const handleSaveReceipt = async () => {
    if (!newReceipt.itemId || !newReceipt.vendorId || !newReceipt.quantity) return;
    const r: StockReceipt = {
      ...newReceipt,
      id: `REC-${Date.now()}`,
      totalAmount: (newReceipt.quantity || 0) * (newReceipt.unitPrice || 0)
    } as StockReceipt;
    await db.stockReceipts.put(r);
    
    // Update inventory level
    const item = items.find(i => i.id === r.itemId);
    if (item) {
      const updatedItem = { ...item, currentStock: item.currentStock + r.quantity, lastPurchasePrice: r.unitPrice };
      await db.inventory.put(updatedItem);
      setItems(items.map(i => i.id === item.id ? updatedItem : i));
    }

    setReceipts([...receipts, r]);
    setShowReceiptForm(false);
    setNewReceipt({ date: new Date().toISOString().split('T')[0], itemId: '', vendorId: '', quantity: 0, unitPrice: 0, totalAmount: 0, paymentMade: 0, paymentMode: 'Cash', billNumber: '' });
  };

  return (
    <div className="p-8 h-full flex flex-col gap-8 bg-[#f8fafc]">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tighter">Centralized Inventory</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">F&B Raw Materials, Linen & Housekeeping Stores</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <SubTab active={activeTab === 'STOCK'} label="Stock Status" onClick={() => setActiveTab('STOCK')} />
          <SubTab active={activeTab === 'PURCHASE'} label="Receipt Registry" onClick={() => setActiveTab('PURCHASE')} />
          <SubTab active={activeTab === 'VENDORS'} label="Vendor Directory" onClick={() => setActiveTab('VENDORS')} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'STOCK' && (
          <div className="bg-white border-2 rounded-[3.5rem] shadow-sm overflow-hidden flex flex-col h-full">
             <div className="overflow-y-auto custom-scrollbar flex-1">
                <table className="w-full text-left text-xs border-collapse">
                   <thead className="bg-slate-900 text-white font-black uppercase sticky top-0 z-10">
                      <tr>
                        <th className="p-6">Item Description</th>
                        <th className="p-6">Group / Category</th>
                        <th className="p-6 text-center">Unit</th>
                        <th className="p-6 text-right">Qty in Stock</th>
                        <th className="p-6 text-right">Min Level</th>
                        <th className="p-6 text-center">Protocol</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 font-bold uppercase text-slate-700">
                      {items.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-6 text-lg font-black text-blue-900 tracking-tight">{item.name}</td>
                           <td className="p-6"><span className="bg-slate-100 px-4 py-1 rounded-xl text-[9px] font-black">{item.category}</span></td>
                           <td className="p-6 text-center opacity-40">{item.unit}</td>
                           <td className="p-6 text-right font-black text-xl">{item.currentStock}</td>
                           <td className="p-6 text-right opacity-30 italic">{item.minStockLevel}</td>
                           <td className="p-6 text-center">
                              {item.currentStock <= item.minStockLevel ? (
                                <span className="bg-red-50 text-red-600 px-6 py-2 rounded-full text-[10px] font-black shadow-inner animate-pulse border border-red-100">REORDER NOW</span>
                              ) : (
                                <span className="bg-green-50 text-green-600 px-6 py-2 rounded-full text-[10px] font-black border border-green-100">STOCK OPTIMAL</span>
                              )}
                           </td>
                        </tr>
                      ))}
                      {items.length === 0 && <tr><td colSpan={6} className="p-40 text-center text-slate-200 italic font-black uppercase tracking-widest">No inventory items recorded</td></tr>}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'VENDORS' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex justify-between items-end border-b-2 border-slate-100 pb-4">
                <h3 className="text-xl font-black text-blue-900 uppercase">Registered Suppliers</h3>
                <button onClick={() => setShowAddVendor(true)} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">+ Register Vendor</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {vendors.map(v => (
                  <div key={v.id} className="bg-white border-2 border-slate-50 rounded-[3rem] p-10 shadow-sm space-y-6 hover:shadow-xl transition-all group">
                     <div className="flex justify-between items-start">
                        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-4xl font-black text-blue-900 group-hover:scale-110 transition-transform">{v.name.charAt(0)}</div>
                        <span className="bg-slate-50 px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-slate-400 tracking-widest">{v.category}</span>
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">{v.name}</h3>
                        <p className="text-[12px] font-bold text-slate-400 uppercase mt-2 tracking-widest leading-none">{v.contact}</p>
                     </div>
                     <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                        <div>
                           <p className="text-[8px] font-black uppercase text-slate-300">GST Registration</p>
                           <p className="text-[11px] font-black text-blue-500 tracking-wider mt-1">{v.gstin || 'UNREGISTERED'}</p>
                        </div>
                        <button className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-900 transition-colors">History →</button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'PURCHASE' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex justify-between items-end border-b-2 border-slate-100 pb-4">
                <h3 className="text-xl font-black text-blue-900 uppercase">Purchase Logbook</h3>
                <button onClick={() => setShowReceiptForm(true)} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">+ New Receipt</button>
             </div>
             <div className="bg-white border-2 rounded-[3.5rem] shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                   <thead className="bg-slate-900 text-white font-black uppercase">
                      <tr>
                        <th className="p-6">Bill Date</th>
                        <th className="p-6">Bill No</th>
                        <th className="p-6">Supplier</th>
                        <th className="p-6">Item Detail</th>
                        <th className="p-6 text-right">Net Value</th>
                        <th className="p-6 text-right">Paid Amt</th>
                        <th className="p-6 text-center">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 font-bold uppercase text-slate-700">
                      {receipts.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                           <td className="p-6 text-slate-400">{r.date}</td>
                           <td className="p-6 font-black text-blue-900">#{r.billNumber}</td>
                           <td className="p-6">{vendors.find(v => v.id === r.vendorId)?.name}</td>
                           <td className="p-6">
                              <p>{items.find(i => i.id === r.itemId)?.name}</p>
                              <p className="text-[9px] opacity-40">Qty: {r.quantity} @ ₹{r.unitPrice}</p>
                           </td>
                           <td className="p-6 text-right font-black">₹{r.totalAmount.toFixed(2)}</td>
                           <td className="p-6 text-right text-green-600 font-black">₹{r.paymentMade.toFixed(2)}</td>
                           <td className="p-6 text-center">
                              {r.paymentMade < r.totalAmount ? (
                                <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[9px] font-black">PENDING ₹{(r.totalAmount-r.paymentMade).toFixed(0)}</span>
                              ) : (
                                <span className="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-[9px] font-black">PAID</span>
                              )}
                           </td>
                        </tr>
                      ))}
                      {receipts.length === 0 && <tr><td colSpan={7} className="p-40 text-center text-slate-200 italic font-black uppercase tracking-widest">No purchase records found</td></tr>}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      {showAddVendor && (
         <InventoryModal title="Vendor Registry" onClose={() => setShowAddVendor(false)}>
            <div className="grid grid-cols-1 gap-6">
               <Inp label="Vendor Full Name" value={newVendor.name} onChange={v => setNewVendor({...newVendor, name: v})} />
               <Inp label="GST Identification (GSTIN)" value={newVendor.gstin} onChange={v => setNewVendor({...newVendor, gstin: v})} />
               <Inp label="Primary Contact No" value={newVendor.contact} onChange={v => setNewVendor({...newVendor, contact: v})} />
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Trade Category</label>
                  <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50 outline-none" value={newVendor.category} onChange={e => setNewVendor({...newVendor, category: e.target.value})}>
                     <option value="Food & Bev">Food & Beverages</option>
                     <option value="Linen">Linen & Laundry</option>
                     <option value="Housekeeping">Housekeeping Supplies</option>
                     <option value="Maintenance">Maintenance & Engineering</option>
                  </select>
               </div>
               <button onClick={handleSaveVendor} className="w-full bg-blue-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-2xl">Authorize Vendor</button>
            </div>
         </InventoryModal>
      )}

      {showReceiptForm && (
         <InventoryModal title="New Stock Receipt" onClose={() => setShowReceiptForm(false)}>
            <div className="grid grid-cols-1 gap-6 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
               <Inp label="Receipt Date" type="date" value={newReceipt.date} onChange={v => setNewReceipt({...newReceipt, date: v})} />
               <Inp label="Supplier Bill/Inv No" value={newReceipt.billNumber} onChange={v => setNewReceipt({...newReceipt, billNumber: v})} />
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Assign Item</label>
                  <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50" value={newReceipt.itemId} onChange={e => setNewReceipt({...newReceipt, itemId: e.target.value})}>
                     <option value="">Select inventory unit...</option>
                     {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Supplier / Vendor</label>
                  <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-slate-50" value={newReceipt.vendorId} onChange={e => setNewReceipt({...newReceipt, vendorId: e.target.value})}>
                     <option value="">Choose vendor account...</option>
                     {vendors.map(v => <option key={v.id} value={v.id}>{v.name} [{v.gstin || 'No GST'}]</option>)}
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <Inp label="Quantity Received" type="number" value={newReceipt.quantity?.toString()} onChange={v => setNewReceipt({...newReceipt, quantity: parseFloat(v)})} />
                  <Inp label="Unit Cost (₹)" type="number" value={newReceipt.unitPrice?.toString()} onChange={v => setNewReceipt({...newReceipt, unitPrice: parseFloat(v)})} />
               </div>
               <Inp label="Payment Settle (₹)" type="number" value={newReceipt.paymentMade?.toString()} onChange={v => setNewReceipt({...newReceipt, paymentMade: parseFloat(v)})} />
               <button onClick={handleSaveReceipt} className="w-full bg-blue-900 text-white py-6 rounded-[2rem] font-black uppercase text-sm shadow-2xl hover:bg-black transition-all">Authorize Receipt</button>
            </div>
         </InventoryModal>
      )}
    </div>
  );
};

const SubTab: React.FC<{ active: boolean, label: string, onClick: () => void }> = ({ active, label, onClick }) => (
  <button onClick={onClick} className={`px-10 py-3.5 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest ${active ? 'bg-blue-900 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-white hover:text-blue-900'}`}>{label}</button>
);

const InventoryModal = ({ title, children, onClose }: any) => (
   <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
         <div className="bg-blue-900 p-8 text-white flex justify-between items-center">
            <h3 className="text-xl font-black uppercase tracking-tighter">{title}</h3>
            <button onClick={onClose} className="uppercase text-[10px] font-black opacity-60">Cancel</button>
         </div>
         <div className="p-10">{children}</div>
      </div>
   </div>
);

const Inp = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <input type={type} className="w-full border-2 p-4 rounded-2xl font-black text-[12px] bg-slate-50 outline-none focus:bg-white focus:border-blue-500 transition-all text-black" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

export default InventoryModule;
