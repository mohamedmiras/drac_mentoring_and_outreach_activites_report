import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Hash, ArrowLeft, BarChart3, Calendar, LogIn } from 'lucide-react';
import { InsightsContent } from '../admin/GlobalInsights';
import StudentOpportunitiesTab from './StudentOpportunities';

const StudentPortal = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'insights';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { loginStudent, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!authLoading && userData?.role === 'student') {
      navigate('/student/dashboard');
    }
  }, [userData, authLoading, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await loginStudent(admissionNumber, password);
      navigate('/student/dashboard');
    } catch (err) {
      setError('Failed to login. Please check your admission number and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col relative overflow-x-hidden">
      {/* Top Header */}
      <header className="bg-brand-blue text-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => navigate('/')} className="flex items-center text-white/80 hover:text-white transition-colors font-medium text-sm">
              <ArrowLeft className="w-5 h-5 mr-1.5" />
              <span className="hidden sm:inline">Home</span>
            </button>
            <div className="h-6 w-px bg-white/20"></div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center">
              Student Portal
            </h1>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-8 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center py-4 px-3 sm:px-4 border-b-2 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${activeTab === 'insights' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Insights
            </button>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`flex items-center py-4 px-3 sm:px-4 border-b-2 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${activeTab === 'opportunities' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Opportunities
            </button>
            <button
              onClick={() => setActiveTab('login')}
              className={`flex items-center py-4 px-3 sm:px-4 border-b-2 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${activeTab === 'login' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}
            >
              <LogIn className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Student Login
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {activeTab === 'insights' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <InsightsContent isAdmin={false} />
          </motion.div>
        )}
        
        {activeTab === 'opportunities' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
             <StudentOpportunitiesTab isPublic={true} />
          </motion.div>
        )}

        {activeTab === 'login' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-[420px] mx-auto mt-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-lightBlue shadow-lg shadow-brand-blue/30 mb-6 relative overflow-hidden">
                 <div className="absolute inset-0 bg-white/20 blur-md transform -skew-x-12 -translate-x-full transition-transform hover:translate-x-full duration-1000"></div>
                <Hash className="w-8 h-8 text-white relative z-10" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
              <p className="mt-2 text-sm text-slate-500 font-medium tracking-wide">Sign in to access your personal dashboard</p>
            </div>
            
            <div className="bg-white py-10 px-6 sm:px-10 shadow-xl shadow-slate-200/50 border border-gray-100 rounded-[2rem]">
              <form className="space-y-6" onSubmit={handleLoginSubmit} autoComplete="off">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm text-center font-medium border border-red-100">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Admission Number</label>
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*" required
                    autoComplete="off"
                    name="st_adm_num_portal"
                    className="block w-full sm:text-base border border-slate-200 rounded-xl h-14 bg-white outline-none px-4 transition-all focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 placeholder:text-slate-400 font-medium"
                    placeholder="e.g. 1001"
                    value={admissionNumber}
                    onChange={(e) => {
                       const val = e.target.value;
                       if (val === '' || /^[0-9\b]+$/.test(val)) setAdmissionNumber(val);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                  <input
                    type="password" required
                    autoComplete="new-password"
                    name="st_sec_code_portal"
                    className="block w-full sm:text-base border border-slate-200 rounded-xl h-14 bg-white outline-none px-4 transition-all focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 placeholder:text-slate-400 font-medium"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-md shadow-brand-blue/20 text-base font-bold text-white bg-brand-blue hover:bg-brand-lightBlue focus:outline-none focus:ring-4 focus:ring-brand-lightBlue/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-8 relative overflow-hidden group"
                >
                  <span className="relative z-10">{loading ? 'Authenticating...' : 'Sign In'}</span>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default StudentPortal;
