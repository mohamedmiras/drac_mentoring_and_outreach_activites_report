import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowLeft } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { loginAdmin, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!authLoading && userData?.role === 'admin') {
      navigate('/admin');
    }
  }, [userData, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await loginAdmin(email, password);
      navigate('/admin');
    } catch (err) {
      setError('Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Absolute Header with subtle Back link */}
      <div className="absolute top-8 left-8 z-20">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-sm text-slate-500 hover:text-brand-blue transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </button>
      </div>

      {/* Abstract background blobs for smooth aesthetic (static to prevent lag) */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-lightBlue/10 rounded-full blur-[100px] transform origin-top-right -z-10 translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-green/10 rounded-full blur-[100px] transform origin-bottom-left -z-10 -translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-[420px] mx-auto relative z-10">
        <motion.div
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
           className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-lightBlue shadow-lg shadow-brand-blue/30 mb-6 relative overflow-hidden">
             <div className="absolute inset-0 bg-white/20 blur-md transform -skew-x-12 -translate-x-full transition-transform hover:translate-x-full duration-1000"></div>
            <Lock className="w-8 h-8 text-white relative z-10" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Admin Portal
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium tracking-wide">
            Secure Administrator Login
          </p>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        className="w-full max-w-[420px] mx-auto relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl py-10 px-6 sm:px-10 shadow-xl shadow-slate-200/50 border border-white rounded-[2rem]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm text-center font-medium border border-red-100">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address (Username)</label>
              <div className="relative shadow-sm rounded-xl">
                <input
                  type="email"
                  required
                  className="block w-full sm:text-base border border-slate-200 rounded-xl h-14 bg-white outline-none px-4 transition-all focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 placeholder:text-slate-400 font-medium"
                  placeholder="admin@darurahma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative shadow-sm rounded-xl">
                <input
                  type="password"
                  required
                  className="block w-full sm:text-base border border-slate-200 rounded-xl h-14 bg-white outline-none px-4 transition-all focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 placeholder:text-slate-400 font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-md shadow-brand-blue/20 text-base font-bold text-white bg-brand-blue hover:bg-brand-lightBlue focus:outline-none focus:ring-4 focus:ring-brand-lightBlue/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-8 relative overflow-hidden group"
            >
              <span className="relative z-10">{loading ? 'Authenticating...' : 'Sign In'}</span>
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
