
import React, { useState } from 'react';
import { UserRole, HostelSettings } from '../types.ts';

interface LoginProps {
  onLogin: (role: UserRole) => void;
  settings: HostelSettings;
}

const Login: React.FC<LoginProps> = ({ onLogin, settings }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('RECEPTIONIST');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    let correctPassword = settings.adminPassword || 'admin';
    if (selectedRole === 'RECEPTIONIST') correctPassword = settings.receptionistPassword || settings.adminPassword || 'admin';
    if (selectedRole === 'ACCOUNTANT') correctPassword = settings.accountantPassword || settings.adminPassword || 'admin';
    if (selectedRole === 'SUPERVISOR') correctPassword = settings.supervisorPassword || settings.adminPassword || 'admin';

    if (password === correctPassword) {
      onLogin(selectedRole);
    } else {
      setError('Invalid role password');
    }
  };

  return (
    <div className="min-h-screen bg-[#003d80] flex flex-col items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-12 space-y-8 animate-in zoom-in duration-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-6 shadow-xl">HS</div>
          <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tighter">System Access</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">HotelSphere Pro Console</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Select User Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT', 'SUPERVISOR'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`p-3 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${selectedRole === role ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Panel Password</label>
            <input
              type="password"
              className="w-full border-2 p-4 rounded-2xl font-black text-xs bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {error && <p className="text-[10px] font-black text-red-500 uppercase ml-1">{error}</p>}
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black hover:-translate-y-1 transition-all">Authenticate Entry</button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-[11px] font-black text-blue-900 uppercase">
            Hotel Sphere Pro by 
            <a href="https://digitalcommunique.in/" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:underline">
              Digital Comunique Pvt Ltd
            </a>
          </p>
          <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">Secure Protocol v3.4.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
