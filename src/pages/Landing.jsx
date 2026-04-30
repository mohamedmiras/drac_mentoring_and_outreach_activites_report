import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, UserCircle, School } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0a1128]"
    >
      <div 
        className="absolute inset-0 z-0 opacity-40 bg-cover bg-center mix-blend-overlay"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}
      />
      
      {/* Professional subtle gradient overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0a1128] via-brand-blue/80 to-[#0a1128]/90" />

      <div className="relative z-10 container mx-auto px-4 py-20 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 w-full max-w-4xl mx-auto"
        >
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl inline-block mb-6 shadow-xl border border-white/20">
            <GraduationCap className="w-10 h-10 text-blue-50" />
          </div>
          
          <h3 className="text-blue-300 font-semibold tracking-[0.2em] uppercase text-sm md:text-base mb-3">
            Welcome to
          </h3>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-white tracking-tight mb-2 drop-shadow-md">
            Daru Rahma <br className="hidden md:block"/> Arabic College
          </h1>
          <p className="text-lg md:text-xl text-blue-200 font-medium tracking-widest uppercase mb-6">
            Kodakkal, Kuttiady
          </p>

          <div className="flex flex-col items-center mb-8">
            <div className="inline-block border border-white/30 bg-gradient-to-r from-white/15 to-white/5 rounded-xl px-10 py-1.5 backdrop-blur-md shadow-xl shadow-white/5">
               <span className="text-white font-bold tracking-[0.2em] uppercase text-[11px] md:text-xs">Outreach & Mentoring Activities</span>
            </div>
            <span className="text-[9px] md:text-[10px] font-medium text-blue-300/60 tracking-[0.4em] uppercase mt-2">REPORT</span>
          </div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-base md:text-lg lg:text-xl text-blue-50/80 max-w-3xl mx-auto leading-relaxed md:leading-loose font-medium drop-shadow-sm text-center"
          >
            The portal gives a clear view of student progress by bringing together academic, spiritual, and co-curricular activities in one place. It also highlights mentor involvement and outreach efforts, helping track growth, identify improvements, and recognize achievements easily.
          </motion.p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl justify-center drop-shadow-lg z-20 mt-8">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            onClick={() => navigate('/admin-login')}
            className="group relative flex-1 flex flex-col items-center p-8 bg-white rounded-[2rem] hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-blue/30 transition-all duration-300 overflow-hidden border border-transparent"
          >
            <div className="bg-brand-blue/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
              <School className="w-10 h-10 text-brand-blue" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Admin Portal</h2>
            <p className="text-gray-600 text-sm text-center font-medium">Manage students, achievements, and performances.</p>
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/0 via-transparent to-brand-blue/5 opacity-0 group-hover:opacity-100 transition duration-300"></div>
          </motion.button>

          <motion.button
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.8 }}
            onClick={() => navigate('/student')}
            className="group relative flex-1 flex flex-col items-center p-8 bg-white rounded-[2rem] hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-green/30 transition-all duration-300 overflow-hidden border border-transparent"
          >
            <div className="bg-brand-green/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
              <GraduationCap className="w-10 h-10 text-brand-green" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Student Portal</h2>
            <p className="text-gray-600 text-sm text-center font-medium">View your profile, marks, and progress.</p>
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-green/0 via-transparent to-brand-green/5 opacity-0 group-hover:opacity-100 transition duration-300"></div>
          </motion.button>

          <motion.button
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.9 }}
            onClick={() => navigate('/mentor')}
            className="group relative flex-1 flex flex-col items-center p-8 bg-white rounded-[2rem] hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300 overflow-hidden border border-transparent"
          >
            <div className="bg-indigo-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
              <UserCircle className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Mentor Hub</h2>
            <p className="text-gray-600 text-sm text-center font-medium">Guide mentees and track achievements.</p>
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/0 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition duration-300"></div>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
