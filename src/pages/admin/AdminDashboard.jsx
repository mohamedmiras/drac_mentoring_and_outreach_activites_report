import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { BookOpen, Users, Award, TrendingUp, ChevronRight, Target } from 'lucide-react';

const CLASSES = [
  { id: 'sec-final', name: 'Secondary Final Year', color: 'bg-blue-500' },
  { id: 'ss-first', name: 'Senior Secondary First Year', color: 'bg-green-500' },
  { id: 'ss-final', name: 'Senior Secondary Final Year', color: 'bg-purple-500' },
  { id: 'degree-first', name: 'Degree First Year', color: 'bg-orange-500' },
];

const StatCard = ({ title, value, icon: Icon, colorClass, loading }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
    <div className={`p-4 rounded-lg ${colorClass} bg-opacity-10 mr-4`}>
      <Icon className={`w-8 h-8 ${colorClass.replace('bg-', 'text-').replace('-500', '-600')}`} />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {loading ? (
        <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
      ) : (
        <p className={`${String(value).length > 6 ? 'text-lg' : 'text-xl'} font-black text-gray-900 leading-tight mt-0.5`}>{value}</p>
      )}
    </div>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ students: 0, achievements: 0, totalPoints: 0, mission100Count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const studentSnap = await getDocs(collection(db, 'students'));
        let totalNetScore = 0;
        studentSnap.forEach(doc => {
          totalNetScore += (doc.data().netScore || 0);
        });

        const achSnap = await getDocs(collection(db, 'achievements'));
        let m100 = 0;
        achSnap.forEach(doc => {
          if (doc.data().isMission100) m100++;
        });

        setStats({
          students: studentSnap.size,
          achievements: achSnap.size,
          totalPoints: Number(totalNetScore.toFixed(2)),
          mission100Count: m100
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Manage classes and monitor student performance.</p>
      </div>

      {/* Mission 100 Dashboard Feature */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-200 mb-8 relative overflow-hidden group">
        {/* Background Progress Fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((stats.mission100Count / 100) * 100, 100)}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-orange-400/20 to-amber-300/20 z-0"
        />
        
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none transition-transform duration-700 group-hover:scale-150 z-0"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 p-6">
          <div className="flex-1">
            <h2 className="text-xl font-black text-orange-600 mb-1 flex items-center gap-2">
              <Target className="w-6 h-6 text-orange-500" /> Mission 100 Progress
            </h2>
            <p className="text-sm text-gray-700 font-medium">Tracking verified achievements contributing to Mission 100 goals.</p>
          </div>
          <div className="flex-none flex items-center">
            <div className="flex items-center gap-4">
              <span className="text-4xl font-black text-orange-600 tracking-tight">
                {loading ? '-' : stats.mission100Count} <span className="text-xl text-orange-400/70 font-bold">/ 100</span>
              </span>
              {!loading && stats.mission100Count >= 100 && (
                <motion.span 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-md shadow-orange-500/20"
                >
                  Accomplished!
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Students" value={stats.students} icon={Users} colorClass="bg-blue-500" loading={loading} />
        <StatCard title="Active Classes" value={CLASSES.length} icon={BookOpen} colorClass="bg-green-500" loading={false} />
        <StatCard title="Total Achievements" value={stats.achievements} icon={Award} colorClass="bg-yellow-500" loading={loading} />
        <StatCard title="Global Net Points" value={stats.totalPoints} icon={TrendingUp} colorClass="bg-purple-500" loading={loading} />
      </div>

      <h2 className="text-xl font-semibold text-gray-800 mb-4">Classes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {CLASSES.map((cls, idx) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            onClick={() => navigate(`/admin/class/${cls.id}`)}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between cursor-pointer group hover:shadow-xl hover:-translate-y-1 hover:border-brand-blue/30 transition-all duration-300 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-blue/5 to-brand-green/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-brand-blue transition mb-1 relative z-10">{cls.name}</h3>
              <p className="text-sm text-gray-500 font-medium relative z-10">Manage student profiles & achievements</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl group-hover:bg-brand-blue/10 transition relative z-10">
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-brand-blue" />
            </div>
          </motion.div>
        ))}
      </div>

    </AdminLayout>
  );
};

export default AdminDashboard;
