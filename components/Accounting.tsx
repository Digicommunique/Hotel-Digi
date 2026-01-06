
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

const Accounting: React.FC<AccountingProps> = ({ transactions, setTransactions, guests, bookings, quotations, setQuotations, settings }) => {
  const [activeTab, setActiveTab] = useState<'ENTRY' | 'LEDGER' | 'CASHBOOK' | 'BS' | 'PL'>('ENTRY');
  const [type, setType] = useState<TransactionType>('RECEIPT');
  const [amount, setAmount] = useState('');
  const [ledger, setLedger] = useState('Cash Account');
  const [group, setGroup] = useState<AccountGroupName>('Operating');
  const [desc, setDesc] = useState('');
  const [targetGuest, setTargetGuest] = useState('');
  const [selectedLedger, setSelectedLedger] = useState('Cash Account');
  
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);

  const ACCOUNT_GROUPS: AccountGroupName[] = [
    'Capital', 'Fixed Asset', 'Current Asset', 'Direct Expense', 'Indirect Expense', 
    'Direct Income', 'Indirect Income', 'Current Liability', 'Operating'
  ];

  const ledgers = useMemo(() => Array.from(new Set(transactions.map(t => t.ledger))), [transactions]);

  const handleEntry = () => {
    if (!amount || !ledger) return alert("Please fill Amount and Ledger.");
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      type, 
      amount: parseFloat(amount) || 0, 
      ledger, 
      description: desc,
      accountGroup: group,
      entityName: targetGuest || 'Cash/General'
    };
    setTransactions([...transactions, newTx]);
    setAmount(''); setDesc(''); setTargetGuest('');
    alert(`Entry posted successfully.`);
  };

  const calculatePL = useMemo(() => {
    const income = transactions.filter(t => t.accountGroup.includes('Income')).reduce((s,t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.accountGroup.includes('Expense')).reduce((s,t) => s + t.amount, 0);
    return { income, expense, profit: income - expense };
  }, [transactions]);

  const calculateBS = useMemo(() => {
    const assets = transactions.filter(t => t.accountGroup.includes('Asset')).reduce((s,t) => s + (t.type === 'RECEIPT' ? t.amount : -t.amount), 0);
    const liabilities = transactions.filter(t => t.accountGroup === 'Capital' || t.accountGroup === 'Current Liability').reduce((s,t) => s + t.amount, 0);
    return { assets, liabilities };
  }, [transactions]);

  const ledgerTransactions = useMemo(() => transactions.filter(t => t.ledger === selectedLedger), [transactions, selectedLedger]);
  const cashbookTransactions = useMemo(() => transactions.filter(t => t.ledger.toLowerCase().includes('cash')), [transactions]);

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

  const handleDownloadLedger = () => {
    const headers = "Date,Description,Entity,Debit,Credit\n";
    const rows = ledgerTransactions.map(t => 
      `${t.date},${t.description.replace(/,/g, ' ')},${t.entityName || ''},${t.type === 'PAYMENT' ? t.amount : 0},${t.type === 'RECEIPT' ? t.amount : 0}`
    ).join('\n');
    downloadCSV(`Ledger_${selectedLedger}_${new Date().toISOString().split('T')[0]}.csv`, headers + rows);
  };

  const handleDownloadCashbook = () => {
    const headers = "Date,Description,In,Out\n";
    const rows = cashbookTransactions.map(t => 
      `${t.date},${t.description.replace(/,/g, ' ')},${t.type === 'RECEIPT' ? t.amount : 0},${t.type === 'PAYMENT' ? t.amount : 0}`
    ).join('\n');
    downloadCSV(`Cashbook_${new Date().toISOString().split('T')[0]}.csv`, headers + rows);
  };

  const handleWhatsAppCashbook = () => {
    const today = new Date().toISOString().split('T')[0];
    const ins = cashbookTransactions.filter(t => t.type === 'RECEIPT').reduce((s,t)=>s+t.amount,0);
    const outs = cashbookTransactions.filter(t => t.type === 'PAYMENT').reduce((s,t)=>s+t.amount,0);
    const message = `Cashbook Registry Summary - ${today}\nTotal In: ₹${ins.toFixed(2)}\nTotal Out: ₹${outs.toFixed(2)}\nNet: ₹${(ins-outs).toFixed(2)}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-6 bg-[#f8fafc] h-full flex flex-col gap-6 text-black">
      <div className="flex gap-4 border-b pb-4 overflow-x-auto no-print scrollbar-hide">
        <Tab active={activeTab === 'ENTRY'} onClick={() => setActiveTab('ENTRY')}>New Voucher</Tab>
        <Tab active={activeTab === 'LEDGER'} onClick={() => setActiveTab('LEDGER')}>Ledger Register</Tab>
        <Tab active={activeTab === 'CASHBOOK'} onClick={() => setActiveTab('CASHBOOK')}>Cashbook</Tab>
        <Tab active={activeTab === 'BS'} onClick={() => setActiveTab('BS')}>Balance Sheet</Tab>
        <Tab active={activeTab === 'PL'} onClick={() => setActiveTab('PL')}>Profit & Loss</Tab>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border p-12 overflow-y-auto custom-scrollbar">
        {activeTab === 'ENTRY' && (
          <div className="max-w-3xl space-y-8 animate-in fade-in duration-300">
             <div className="border-l-8 border-blue-900 pl-6">
               <h2 className="text-3xl font-black text-black uppercase tracking-tighter">Finance Entry Console</h2>
               <p className="text-[10px] font-bold text-black uppercase tracking-widest mt-1">Audit-Ready Ledger Posting</p>
             </div>
             
             <div className="grid grid-cols-2 gap-8">
                <Field label="Voucher Type">
                   <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 text-black" value={type} onChange={e => setType(e.target.value as any)}>
                      <option value="RECEIPT">RECEIPT (Cash In)</option>
                      <option value="PAYMENT">PAYMENT (Cash Out)</option>
                      <option value="JOURNAL">JOURNAL (Adjustment)</option>
                   </select>
                </Field>
                <Field label="Account Group">
                   <select className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 text-black" value={group} onChange={e => setGroup(e.target.value as any)}>
                      {ACCOUNT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                </Field>
                <Field label="Entity / Guest Name">
                   <input className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 text-black" value={targetGuest} onChange={e => setTargetGuest(e.target.value)} placeholder="e.g. Rahul Kumar" />
                </Field>
                <Field label="Ledger Name">
                   <input className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 text-black" value={ledger} onChange={e => setLedger(e.target.value)} placeholder="e.g. Cash Account" />
                </Field>
                <Field label="Amount (₹)">
                   <input type="number" className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 text-black" value={amount} onChange={e => setAmount(e.target.value)} />
                </Field>
                <div className="col-span-2">
                   <Field label="Voucher Narration">
                      <textarea className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 h-24 text-black resize-none" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Entry details..."></textarea>
                   </Field>
                </div>
             </div>
             <button onClick={handleEntry} className="bg-blue-900 text-white font-black px-12 py-5 rounded-2xl text-xs uppercase shadow-2xl hover:bg-black transition-all tracking-widest">Post Financial Record</button>
          </div>
        )}

        {activeTab === 'LEDGER' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="flex justify-between items-center border-b-8 border-blue-900 pb-6">
                <div>
                   <h2 className="text-3xl font-black text-black uppercase tracking-tighter">Ledger Analysis</h2>
                   <div className="mt-2 flex gap-2">
                      <select className="border-2 p-2 rounded-xl font-black text-[10px] uppercase bg-gray-50" value={selectedLedger} onChange={e => setSelectedLedger(e.target.value)}>
                        {ledgers.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                   </div>
                </div>
                <div className="flex gap-2 no-print">
                   <button onClick={handleDownloadLedger} className="bg-slate-100 text-blue-900 px-6 py-3 rounded-xl font-black text-[10px] uppercase border hover:bg-slate-200">Download CSV</button>
                   <button onClick={() => window.print()} className="bg-blue-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">Print Ledger</button>
                </div>
             </div>
             <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-[11px] text-left">
                   <thead className="bg-gray-900 text-white uppercase font-black">
                      <tr><th className="p-6">Date</th><th className="p-6">Description</th><th className="p-6 text-right">Debit (₹)</th><th className="p-6 text-right">Credit (₹)</th></tr>
                   </thead>
                   <tbody className="text-black font-bold uppercase">
                      {ledgerTransactions.map(t => (
                        <tr key={t.id} className="border-b hover:bg-gray-50">
                           <td className="p-6">{t.date}</td>
                           <td className="p-6">{t.description} {t.entityName && `(From: ${t.entityName})`}</td>
                           <td className="p-6 text-right">{t.type === 'PAYMENT' ? t.amount.toFixed(2) : '-'}</td>
                           <td className="p-6 text-right">{t.type === 'RECEIPT' ? t.amount.toFixed(2) : '-'}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'CASHBOOK' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="flex justify-between items-center border-b-8 border-green-700 pb-6">
                <h2 className="text-3xl font-black text-black uppercase tracking-tighter">Cashbook Registry</h2>
                <div className="flex gap-2 no-print">
                   <button onClick={handleDownloadCashbook} className="bg-slate-100 text-green-700 px-6 py-3 rounded-xl font-black text-[10px] uppercase border hover:bg-slate-200">Download CSV</button>
                   <button onClick={handleWhatsAppCashbook} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 transition-all tracking-widest">WhatsApp Share</button>
                   <button onClick={() => window.print()} className="bg-green-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">Print Cashbook</button>
                </div>
             </div>
             <div className="border rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-[11px] text-left">
                   <thead className="bg-green-700 text-white uppercase font-black">
                      <tr><th className="p-6">Date</th><th className="p-6">Narrative</th><th className="p-6 text-right">In (₹)</th><th className="p-6 text-right">Out (₹)</th></tr>
                   </thead>
                   <tbody className="text-black font-bold uppercase">
                      {cashbookTransactions.map(t => (
                        <tr key={t.id} className="border-b hover:bg-green-50/20">
                           <td className="p-6">{t.date}</td>
                           <td className="p-6">{t.description}</td>
                           <td className="p-6 text-right text-green-700">{t.type === 'RECEIPT' ? t.amount.toFixed(2) : '-'}</td>
                           <td className="p-6 text-right text-red-600">{t.type === 'PAYMENT' ? t.amount.toFixed(2) : '-'}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'PL' && (
          <div className="space-y-12 animate-in fade-in duration-500">
             <div className="border-b-8 border-blue-900 pb-6">
                <h2 className="text-3xl font-black text-black uppercase tracking-tighter">Profit & Loss Statement</h2>
             </div>
             <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                   <h3 className="font-black text-green-700 uppercase text-xs tracking-widest border-b pb-2">Total Incomes</h3>
                   <div className="space-y-2">
                      {transactions.filter(t => t.accountGroup.includes('Income')).map(t => (
                        <div key={t.id} className="flex justify-between font-bold text-xs"><span>{t.ledger}</span><span>₹{t.amount.toFixed(2)}</span></div>
                      ))}
                   </div>
                   <div className="border-t-2 pt-4 flex justify-between font-black text-lg"><span>GROSS INCOME</span><span>₹{calculatePL.income.toFixed(2)}</span></div>
                </div>
                <div className="space-y-4">
                   <h3 className="font-black text-red-600 uppercase text-xs tracking-widest border-b pb-2">Total Expenses</h3>
                   <div className="space-y-2">
                      {transactions.filter(t => t.accountGroup.includes('Expense')).map(t => (
                        <div key={t.id} className="flex justify-between font-bold text-xs"><span>{t.ledger}</span><span>₹{t.amount.toFixed(2)}</span></div>
                      ))}
                   </div>
                   <div className="border-t-2 pt-4 flex justify-between font-black text-lg"><span>GROSS EXPENSE</span><span>₹{calculatePL.expense.toFixed(2)}</span></div>
                </div>
             </div>
             <div className={`p-10 rounded-[3rem] text-center border-4 ${calculatePL.profit >= 0 ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Net Financial Position</p>
                <p className="text-5xl font-black tracking-tighter">₹{Math.abs(calculatePL.profit).toFixed(2)} {calculatePL.profit >= 0 ? 'PROFIT' : 'LOSS'}</p>
             </div>
          </div>
        )}

        {activeTab === 'BS' && (
          <div className="space-y-12 animate-in fade-in duration-500">
             <div className="border-b-8 border-slate-900 pb-6">
                <h2 className="text-3xl font-black text-black uppercase tracking-tighter">Consolidated Balance Sheet</h2>
             </div>
             <div className="grid grid-cols-2 gap-12">
                <div className="space-y-6">
                   <h3 className="font-black text-black uppercase text-xs tracking-widest border-b-2 border-slate-100 pb-2">Liabilities & Capital</h3>
                   <div className="space-y-3">
                      {transactions.filter(t => t.accountGroup === 'Capital' || t.accountGroup === 'Current Liability').map(t => (
                        <div key={t.id} className="flex justify-between font-bold text-xs uppercase"><span>{t.ledger}</span><span>₹{t.amount.toFixed(2)}</span></div>
                      ))}
                   </div>
                </div>
                <div className="space-y-6">
                   <h3 className="font-black text-black uppercase text-xs tracking-widest border-b-2 border-slate-100 pb-2">Assets</h3>
                   <div className="space-y-3">
                      {transactions.filter(t => t.accountGroup.includes('Asset')).map(t => (
                        <div key={t.id} className="flex justify-between font-bold text-xs uppercase"><span>{t.ledger}</span><span>₹{t.amount.toFixed(2)}</span></div>
                      ))}
                   </div>
                </div>
             </div>
             <div className="bg-slate-900 text-white p-10 rounded-[3rem] grid grid-cols-2 gap-8 text-center uppercase font-black">
                <div><p className="text-[9px] opacity-40 mb-2">Total Liabilities</p><p className="text-2xl">₹{calculateBS.liabilities.toFixed(2)}</p></div>
                <div><p className="text-[9px] opacity-40 mb-2">Total Assets</p><p className="text-2xl">₹{calculateBS.assets.toFixed(2)}</p></div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Tab: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-widest border-2 transition-all shadow-sm ${active ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-black opacity-40 border-gray-100 hover:border-blue-200'}`}>{children}</button>
);

const Field: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
     <label className="text-[10px] font-black uppercase text-black opacity-40 ml-1">{label}</label>
     {children}
  </div>
);

export default Accounting;
