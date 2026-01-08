
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
    alert(`Financial entry posted for ${date}`);
  };

  const calculatePL = useMemo(() => {
    const filtered = transactions.filter(t => t.date >= reportStart && t.date <= reportEnd);
    const income = filtered.filter(t => t.accountGroup.includes('Income')).reduce((s,t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.accountGroup.includes('Expense')).reduce((s,t) => s + t.amount, 0);
    return { income, expense, profit: income - expense };
  }, [transactions, reportStart, reportEnd]);

  const calculateBS = useMemo(() => {
    const filtered = transactions.filter(t => t.date <= reportEnd);
    const assets = filtered.filter(t => t.accountGroup.includes('Asset')).reduce((s,t) => s + (t.type === 'RECEIPT' ? t.amount : -t.amount), 0);
    const liabilities = filtered.filter(t => t.accountGroup === 'Capital' || t.accountGroup === 'Current Liability').reduce((s,t) => s + t.amount, 0);
    return { assets, liabilities };
  }, [transactions, reportEnd]);

  const ledgerTransactions = useMemo(() => transactions.filter(t => t.ledger === selectedLedger && t.date >= reportStart && t.date <= reportEnd), [transactions, selectedLedger, reportStart, reportEnd]);
  const cashbookTransactions = useMemo(() => transactions.filter(t => t.ledger.toLowerCase().includes('cash') && t.date >= reportStart && t.date <= reportEnd), [transactions, reportStart, reportEnd]);

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

  const handleExportCSV = () => {
    let filename = `Accounting_${activeTab}_${reportStart}_to_${reportEnd}.csv`;
    let content = "";
    
    if (activeTab === 'LEDGER') {
      content = "Date,Registry Narrative,Debit Out,Credit In\n";
      ledgerTransactions.forEach(t => {
        content += `${t.date},"${t.description} ${t.entityName ? '['+t.entityName+']' : ''}",${t.type === 'PAYMENT' ? t.amount : 0},${t.type === 'RECEIPT' ? t.amount : 0}\n`;
      });
    } else if (activeTab === 'CASHBOOK') {
      content = "Date,Daily Narrative,Cash Inflow,Cash Outflow\n";
      cashbookTransactions.forEach(t => {
        content += `${t.date},"${t.description}",${t.type === 'RECEIPT' ? t.amount : 0},${t.type === 'PAYMENT' ? t.amount : 0}\n`;
      });
    } else if (activeTab === 'PL') {
      content = "Type,Ledger,Date,Amount\n";
      content += "REVENUE\n";
      transactions.filter(t => t.date >= reportStart && t.date <= reportEnd && t.accountGroup.includes('Income')).forEach(t => {
        content += `Income,"${t.ledger}",${t.date},${t.amount}\n`;
      });
      content += `TOTAL REVENUE,,,${calculatePL.income}\n\nEXPENDITURE\n`;
      transactions.filter(t => t.date >= reportStart && t.date <= reportEnd && t.accountGroup.includes('Expense')).forEach(t => {
        content += `Expense,"${t.ledger}",${t.date},${t.amount}\n`;
      });
      content += `TOTAL EXPENDITURE,,,${calculatePL.expense}\n`;
      content += `NET ${calculatePL.profit >= 0 ? 'SURPLUS' : 'DEFICIT'},,,${Math.abs(calculatePL.profit)}\n`;
    } else if (activeTab === 'BS') {
      content = "Classification,Ledger,Amount\nLIABILITIES\n";
      transactions.filter(t => t.date <= reportEnd && (t.accountGroup === 'Capital' || t.accountGroup === 'Current Liability')).forEach(t => {
        content += `Liability,"${t.ledger}",${t.amount}\n`;
      });
      content += `TOTAL LIABILITIES,,${calculateBS.liabilities}\n\nASSETS\n`;
      transactions.filter(t => t.date <= reportEnd && t.accountGroup.includes('Asset')).forEach(t => {
        content += `Asset,"${t.ledger}",${t.amount}\n`;
      });
      content += `TOTAL ASSETS,,${calculateBS.assets}\n`;
    }

    downloadCSV(filename, content);
  };

  const handleWhatsAppCashbook = () => {
    const ins = cashbookTransactions.filter(t => t.type === 'RECEIPT').reduce((s,t)=>s+t.amount,0);
    const outs = cashbookTransactions.filter(t => t.type === 'PAYMENT').reduce((s,t)=>s+t.amount,0);
    const message = `*Cashbook Registry Summary*\nPeriod: ${reportStart} to ${reportEnd}\nTotal In: ₹${ins.toFixed(2)}\nTotal Out: ₹${outs.toFixed(2)}\nNet: ₹${(ins-outs).toFixed(2)}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-8 bg-[#f8fafc] h-full flex flex-col gap-8 text-black">
      <div className="flex gap-2 overflow-x-auto no-print scrollbar-hide pb-2">
        <Tab active={activeTab === 'ENTRY'} onClick={() => setActiveTab('ENTRY')}>New Voucher</Tab>
        <Tab active={activeTab === 'LEDGER'} onClick={() => setActiveTab('LEDGER')}>Ledger Register</Tab>
        <Tab active={activeTab === 'CASHBOOK'} onClick={() => setActiveTab('CASHBOOK')}>Cashbook</Tab>
        <Tab active={activeTab === 'BS'} onClick={() => setActiveTab('BS')}>Balance Sheet</Tab>
        <Tab active={activeTab === 'PL'} onClick={() => setActiveTab('PL')}>Profit & Loss</Tab>
      </div>

      {activeTab !== 'ENTRY' && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border flex items-center gap-12 no-print">
            <div className="flex items-center gap-3">
              <label className="text-[11px] font-black uppercase text-blue-900 tracking-tighter">Period Start</label>
              <input type="date" className="bg-slate-800 text-white border-none p-2.5 rounded-xl font-black text-[11px]" value={reportStart} onChange={e => setReportStart(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[11px] font-black uppercase text-blue-900 tracking-tighter">Period End</label>
              <input type="date" className="bg-slate-800 text-white border-none p-2.5 rounded-xl font-black text-[11px]" value={reportEnd} onChange={e => setReportEnd(e.target.value)} />
            </div>
            <div className="flex-1 text-right flex justify-end gap-3">
               <button onClick={handleExportCSV} className="bg-slate-900 text-white px-8 py-2 rounded-xl font-black uppercase text-[10px] shadow-xl">Excel Export</button>
               <button onClick={() => window.print()} className="bg-blue-900 text-white px-8 py-2 rounded-xl font-black uppercase text-[10px] shadow-xl">Print Report</button>
            </div>
        </div>
      )}

      <div className="flex-1 bg-white rounded-[3rem] shadow-2xl border p-12 overflow-y-auto custom-scrollbar relative">
        {activeTab === 'ENTRY' && (
          <div className="max-w-4xl space-y-12 animate-in fade-in duration-300">
             <div className="border-l-[10px] border-blue-900 pl-8">
               <h2 className="text-4xl font-black text-black uppercase tracking-tighter">Voucher Entry Console</h2>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Legal Ledger Authorization Portal</p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <Field label="Voucher Date *">
                   <input type="date" className="w-full border-2 p-4 rounded-2xl font-black text-sm bg-slate-50 text-black outline-none focus:border-blue-500 transition-all" value={date} onChange={e => setDate(e.target.value)} />
                </Field>
                <Field label="Voucher Classification">
                   <select className="w-full border-2 p-4 rounded-2xl font-black text-sm bg-slate-50 text-black outline-none focus:border-blue-500 transition-all" value={type} onChange={e => setType(e.target.value as any)}>
                      <option value="RECEIPT">RECEIPT (Cash Credit)</option>
                      <option value="PAYMENT">PAYMENT (Cash Debit)</option>
                      <option value="JOURNAL">JOURNAL (Audit Adj.)</option>
                   </select>
                </Field>
                <Field label="Account Group">
                   <select className="w-full border-2 p-4 rounded-2xl font-black text-sm bg-slate-50 text-black outline-none focus:border-blue-500 transition-all" value={group} onChange={e => setGroup(e.target.value as any)}>
                      {ACCOUNT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                </Field>
                <Field label="Entity Name (Guest/Company)">
                   <input className="w-full border-2 p-4 rounded-2xl font-black text-sm bg-slate-50 text-black outline-none focus:border-blue-500 transition-all" value={targetGuest} onChange={e => setTargetGuest(e.target.value)} placeholder="e.g. John Doe / Amazon" />
                </Field>
                <Field label="Ledger Account">
                   <input className="w-full border-2 p-4 rounded-2xl font-black text-sm bg-slate-50 text-black outline-none focus:border-blue-500 transition-all" value={ledger} onChange={e => setLedger(e.target.value)} placeholder="e.g. Bank Account / Petty Cash" />
                </Field>
                <Field label="Transaction Amount (₹) *">
                   <input type="number" className="w-full border-2 p-4 rounded-2xl font-black text-lg bg-white border-blue-100 text-blue-900 outline-none focus:border-blue-600 transition-all shadow-inner" value={amount} onChange={e => setAmount(e.target.value)} />
                </Field>
                <div className="col-span-full">
                   <Field label="Audit Narration / Remarks">
                      <textarea className="w-full border-2 p-5 rounded-[2rem] font-black text-sm bg-slate-50 h-32 text-black resize-none outline-none focus:border-blue-500 transition-all" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Detailed explanation for compliance..."></textarea>
                   </Field>
                </div>
             </div>
             <button onClick={handleEntry} className="bg-blue-900 text-white font-black px-16 py-6 rounded-3xl text-sm uppercase shadow-2xl hover:bg-black hover:-translate-y-1 transition-all tracking-[0.3em]">Authorize & Post Entry</button>
          </div>
        )}

        {activeTab === 'LEDGER' && (
          <div className="space-y-10 animate-in fade-in duration-300">
             <div className="flex justify-between items-end border-b-[8px] border-blue-900 pb-8">
                <div>
                   <h2 className="text-4xl font-black text-black uppercase tracking-tighter leading-none">Ledger Analysis</h2>
                   <div className="mt-4 flex gap-3 no-print">
                      <select className="border-2 border-slate-200 p-3 rounded-2xl font-black text-[12px] uppercase bg-white outline-none focus:border-blue-500 transition-all" value={selectedLedger} onChange={e => setSelectedLedger(e.target.value)}>
                        {ledgers.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                   </div>
                </div>
             </div>
             <div className="border-2 border-slate-50 rounded-[3rem] overflow-hidden shadow-2xl bg-white">
                <table className="w-full text-[12px] text-left">
                   <thead className="bg-slate-900 text-white uppercase font-black">
                      <tr><th className="p-6">Transaction Date</th><th className="p-6">Registry Narrative</th><th className="p-6 text-right">Debit Out (₹)</th><th className="p-6 text-right">Credit In (₹)</th></tr>
                   </thead>
                   <tbody className="text-black font-bold uppercase">
                      {ledgerTransactions.map(t => (
                        <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                           <td className="p-6 text-slate-400">{t.date}</td>
                           <td className="p-6">{t.description} {t.entityName && <span className="text-blue-500 ml-2">[{t.entityName}]</span>}</td>
                           <td className="p-6 text-right text-red-600 font-black">{t.type === 'PAYMENT' ? `₹${t.amount.toFixed(2)}` : '-'}</td>
                           <td className="p-6 text-right text-green-700 font-black">{t.type === 'RECEIPT' ? `₹${t.amount.toFixed(2)}` : '-'}</td>
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
                <h2 className="text-4xl font-black text-black uppercase tracking-tighter leading-none">Cashbook Registry</h2>
                <button onClick={handleWhatsAppCashbook} className="bg-green-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-2xl no-print">WhatsApp Share</button>
             </div>
             <div className="border-2 border-slate-50 rounded-[3rem] overflow-hidden shadow-2xl bg-white">
                <table className="w-full text-[12px] text-left">
                   <thead className="bg-green-700 text-white uppercase font-black">
                      <tr><th className="p-6">Date</th><th className="p-6">Daily Narrative</th><th className="p-6 text-right">Cash Inflow (₹)</th><th className="p-6 text-right">Cash Outflow (₹)</th></tr>
                   </thead>
                   <tbody className="text-black font-bold uppercase">
                      {cashbookTransactions.map(t => (
                        <tr key={t.id} className="border-b border-slate-50 hover:bg-green-50/20 transition-colors">
                           <td className="p-6 text-slate-400">{t.date}</td>
                           <td className="p-6">{t.description}</td>
                           <td className="p-6 text-right text-green-700 font-black">{t.type === 'RECEIPT' ? `₹${t.amount.toFixed(2)}` : '-'}</td>
                           <td className="p-6 text-right text-red-600 font-black">{t.type === 'PAYMENT' ? `₹${t.amount.toFixed(2)}` : '-'}</td>
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
  <button onClick={onClick} className={`px-10 py-4 rounded-[1.5rem] font-black text-[12px] uppercase tracking-widest border-2 transition-all shadow-xl shrink-0 ${active ? 'bg-blue-900 text-white border-blue-900 -translate-y-1' : 'bg-white text-black opacity-30 border-white hover:border-blue-200'}`}>{children}</button>
);

const Field: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-2">
     <label className="text-[11px] font-black uppercase text-slate-400 ml-2 tracking-widest">{label}</label>
     {children}
  </div>
);

export default Accounting;
