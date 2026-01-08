
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Guest, Booking, Quotation, AccountGroupName } from '../types';

interface AccountingProps {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  guests: Guest[];
  bookings: Booking[];
  quotations: Quotation[];
  setQuotations: (quotations: Quotation[]) => void;
  settings: any;
}

const Accounting: React.FC<AccountingProps> = ({ transactions, setTransactions, settings }) => {
  const [activeTab, setActiveTab] = useState<'ENTRY' | 'LEDGER' | 'CASHBOOK'>('ENTRY');
  const [type, setType] = useState<TransactionType>('RECEIPT');
  const [amount, setAmount] = useState('');
  const [ledger, setLedger] = useState('Cash Account');
  const [group, setGroup] = useState<AccountGroupName>('Operating');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [desc, setDesc] = useState('');
  const [targetGuest, setTargetGuest] = useState('');
  const [selectedLedger, setSelectedLedger] = useState('Cash Account');
  
  const [reportStart, setReportStart] = useState(new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]);
  const [reportEnd, setReportEnd] = useState(new Date().toISOString().split('T')[0]);

  const ACCOUNT_GROUPS: AccountGroupName[] = [
    'Capital', 'Fixed Asset', 'Current Asset', 'Direct Expense', 'Indirect Expense', 
    'Direct Income', 'Indirect Income', 'Current Liability', 'Operating'
  ];

  const ledgers = useMemo(() => Array.from(new Set(transactions.map(t => t.ledger))), [transactions]);

  const handleEntry = () => {
    if (!amount || !ledger) return alert("Please fill Amount and Ledger.");
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date,
      type, 
      amount: parseFloat(amount) || 0, 
      ledger, 
      description: desc,
      accountGroup: group,
      entityName: targetGuest || 'Cash/General'
    };
    setTransactions([...transactions, newTx]);
    setAmount(''); setDesc(''); setTargetGuest('');
    alert(`Financial entry posted successfully.`);
  };

  const ledgerTransactions = useMemo(() => transactions.filter(t => t.ledger === selectedLedger && t.date >= reportStart && t.date <= reportEnd), [transactions, selectedLedger, reportStart, reportEnd]);
  const cashbookTransactions = useMemo(() => transactions.filter(t => t.ledger.toLowerCase().includes('cash') && t.date >= reportStart && t.date <= reportEnd), [transactions, reportStart, reportEnd]);

  return (
    <div className="p-8 bg-[#f8fafc] h-full flex flex-col gap-8 text-black">
      <div className="flex gap-2 overflow-x-auto no-print scrollbar-hide pb-2">
        <Tab active={activeTab === 'ENTRY'} onClick={() => setActiveTab('ENTRY')}>New Voucher Entry</Tab>
        <Tab active={activeTab === 'LEDGER'} onClick={() => setActiveTab('LEDGER')}>Ledger Register</Tab>
        <Tab active={activeTab === 'CASHBOOK'} onClick={() => setActiveTab('CASHBOOK')}>Cashbook Register</Tab>
        <div className="ml-auto flex items-center px-4">
           <span className="text-[10px] font-black uppercase text-blue-900 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 italic">Advanced P&L and Balance Sheet moved to "Reports" Tab</span>
        </div>
      </div>

      {activeTab !== 'ENTRY' && (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border flex items-center gap-10 no-print">
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-black uppercase text-slate-400">From</label>
              <input type="date" className="bg-slate-100 border-none p-2.5 rounded-xl font-black text-[11px]" value={reportStart} onChange={e => setReportStart(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-black uppercase text-slate-400">To</label>
              <input type="date" className="bg-slate-100 border-none p-2.5 rounded-xl font-black text-[11px]" value={reportEnd} onChange={e => setReportEnd(e.target.value)} />
            </div>
        </div>
      )}

      <div className="flex-1 bg-white rounded-[3rem] shadow-2xl border p-12 overflow-y-auto custom-scrollbar">
        {activeTab === 'ENTRY' && (
          <div className="max-w-4xl space-y-12 animate-in fade-in duration-300">
             <div className="border-l-[10px] border-blue-900 pl-8">
               <h2 className="text-4xl font-black text-black uppercase tracking-tighter">Voucher Entry</h2>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Compliance Posting Portal</p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <Field label="Voucher Date">
                   <input type="date" className="w-full border-2 p-4 rounded-2xl font-black text-sm bg-slate-50 outline-none focus:border-blue-500 transition-all" value={date} onChange={e => setDate(e.target.value)} />
                </Field>
                <Field label="Voucher Type">
                   <select className="w-full border-2 p-4 rounded-2xl font-black text-sm bg-slate-50 outline-none focus:border-blue-500 transition-all" value={type} onChange={e => setType(e.target.value as any)}>
                      <option value="RECEIPT">RECEIPT (CR)</option>
                      <option value="PAYMENT">PAYMENT (DR)</option>
                      <option value="JOURNAL">JOURNAL (ADJ)</option>
                   </select>
                </Field>
                <Field label="Account Group">
                   <select className="w-full border-2 p-4 rounded-2xl font-black text-sm bg-slate-50 outline-none focus:border-blue-500 transition-all" value={group} onChange={e => setGroup(e.target.value as any)}>
                      {ACCOUNT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                </Field>
                <Field label="Entity Name">
                   <input className="w-full border-2 p-4 rounded-2xl font-black text-sm bg-slate-50 outline-none focus:border-blue-500 transition-all" value={targetGuest} onChange={e => setTargetGuest(e.target.value)} placeholder="Walk-in / Agent / Company" />
                </Field>
                <Field label="Ledger Account">
                   <input className="w-full border-2 p-4 rounded-2xl font-black text-sm bg-slate-50 outline-none focus:border-blue-500 transition-all" value={ledger} onChange={e => setLedger(e.target.value)} placeholder="Cash / Bank / Rental" />
                </Field>
                <Field label="Amount (₹)">
                   <input type="number" className="w-full border-2 p-4 rounded-2xl font-black text-lg bg-white border-blue-100 text-blue-900 outline-none focus:border-blue-600 transition-all shadow-inner" value={amount} onChange={e => setAmount(e.target.value)} />
                </Field>
                <div className="col-span-full">
                   <Field label="Audit Narration">
                      <textarea className="w-full border-2 p-5 rounded-[2rem] font-black text-sm bg-slate-50 h-32 text-black resize-none outline-none focus:border-blue-500 transition-all" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Entry explanation..."></textarea>
                   </Field>
                </div>
             </div>
             <button onClick={handleEntry} className="bg-blue-900 text-white font-black px-16 py-6 rounded-3xl text-sm uppercase shadow-2xl tracking-[0.3em]">Authorize Entry</button>
          </div>
        )}

        {activeTab === 'LEDGER' && (
          <div className="space-y-10 animate-in fade-in duration-300">
             <div className="flex justify-between items-end border-b-[8px] border-blue-900 pb-8">
                <div>
                   <h2 className="text-4xl font-black text-black uppercase tracking-tighter">Detailed Ledger</h2>
                   <div className="mt-4 no-print">
                      <select className="border-2 border-slate-200 p-3 rounded-2xl font-black text-[12px] uppercase bg-white outline-none focus:border-blue-500" value={selectedLedger} onChange={e => setSelectedLedger(e.target.value)}>
                        {ledgers.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                   </div>
                </div>
             </div>
             <div className="border-2 border-slate-50 rounded-[3rem] overflow-hidden shadow-2xl bg-white">
                <table className="w-full text-[12px] text-left">
                   <thead className="bg-slate-900 text-white uppercase font-black">
                      <tr><th className="p-6">Date</th><th className="p-6">Narration</th><th className="p-6 text-right">Debit (₹)</th><th className="p-6 text-right">Credit (₹)</th></tr>
                   </thead>
                   <tbody className="text-black font-bold uppercase">
                      {ledgerTransactions.map(t => (
                        <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                           <td className="p-6 text-slate-400">{t.date}</td>
                           <td className="p-6">{t.description} {t.entityName && <span className="text-blue-500 ml-2">[{t.entityName}]</span>}</td>
                           <td className="p-6 text-right text-red-600">{t.type === 'PAYMENT' ? `₹${t.amount.toFixed(2)}` : '-'}</td>
                           <td className="p-6 text-right text-green-700">{t.type === 'RECEIPT' ? `₹${t.amount.toFixed(2)}` : '-'}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'CASHBOOK' && (
          <div className="space-y-10 animate-in fade-in duration-300">
             <div className="flex justify-between items-end border-b-[8px] border-green-700 pb-8">
                <h2 className="text-4xl font-black text-black uppercase tracking-tighter">Cash Register</h2>
                <div className="flex gap-2">
                   <button onClick={() => window.print()} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg no-print">Print Record</button>
                </div>
             </div>
             <div className="border-2 border-slate-50 rounded-[3rem] overflow-hidden shadow-2xl bg-white">
                <table className="w-full text-[12px] text-left">
                   <thead className="bg-green-700 text-white uppercase font-black">
                      <tr><th className="p-6">Date</th><th className="p-6">Details</th><th className="p-6 text-right">Cash In (₹)</th><th className="p-6 text-right">Cash Out (₹)</th></tr>
                   </thead>
                   <tbody className="text-black font-bold uppercase">
                      {cashbookTransactions.map(t => (
                        <tr key={t.id} className="border-b border-slate-50 hover:bg-green-50/20 transition-colors">
                           <td className="p-6 text-slate-400">{t.date}</td>
                           <td className="p-6">{t.description}</td>
                           <td className="p-6 text-right text-green-700">{t.type === 'RECEIPT' ? `₹${t.amount.toFixed(2)}` : '-'}</td>
                           <td className="p-6 text-right text-red-600">{t.type === 'PAYMENT' ? `₹${t.amount.toFixed(2)}` : '-'}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Tab: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest border-2 transition-all shadow-xl shrink-0 ${active ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-black/40 border-white hover:border-blue-100'}`}>{children}</button>
);

const Field: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-2">
     <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">{label}</label>
     {children}
  </div>
);

export default Accounting;
