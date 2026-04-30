import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Target, Activity, Star, ChevronRight, Award } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SpiritualInsights = ({ mentees }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgZuha: 0,
    avgTahajjud: 0,
    avgDikr: 0,
    avgQirath: 0,
    avgHabits: 0,
    avgOverall: 0,
    distribution: {
      excellent: 0,
      good: 0,
      satisfactory: 0,
      improving: 0,
      needsFocus: 0
    },
    topMentees: []
  });

  useEffect(() => {
    fetchGlobalInsights();
  }, [mentees]);

  const fetchGlobalInsights = async () => {
    if (!mentees || mentees.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const menteeIds = mentees.map(m => m.id);
      // Firestore doesn't support 'in' with more than 30 IDs easily, but we can assume < 30 mentees for now
      // Or we can fetch all records for the mentor
      const q = query(collection(db, 'spiritual_records'));
      const snap = await getDocs(q);
      
      const records = [];
      snap.forEach(d => {
        const data = d.data();
        if (menteeIds.includes(data.studentId)) {
          records.push(data);
        }
      });

      if (records.length === 0) {
        setStats({
          avgZuha: 0, avgTahajjud: 0, avgDikr: 0, avgQirath: 0, avgHabits: 0, avgOverall: 0,
          distribution: { excellent: 0, good: 0, satisfactory: 0, improving: 0, needsFocus: 0 },
          topMentees: []
        });
        setLoading(false);
        return;
      }

      // Group records by student to get their AVERAGE score across all entries
      const studentAverages = {};
      records.forEach(rec => {
        if (!studentAverages[rec.studentId]) {
          studentAverages[rec.studentId] = {
            count: 0,
            zuha: 0,
            tahajjud: 0,
            dikr: 0,
            qirath: 0,
            goodHabits: 0,
            overallScore: 0
          };
        }
        studentAverages[rec.studentId].count += 1;
        studentAverages[rec.studentId].zuha += Number(rec.zuha) || 0;
        studentAverages[rec.studentId].tahajjud += Number(rec.tahajjud) || 0;
        studentAverages[rec.studentId].dikr += Number(rec.dikr) || 0;
        studentAverages[rec.studentId].qirath += Number(rec.qirath) || 0;
        studentAverages[rec.studentId].goodHabits += Number(rec.goodHabits) || 0;
        studentAverages[rec.studentId].overallScore += Number(rec.overallScore) || 0;
      });

      const scores = Object.keys(studentAverages).map(studentId => {
        const data = studentAverages[studentId];
        return {
          studentId,
          zuha: data.zuha / data.count,
          tahajjud: data.tahajjud / data.count,
          dikr: data.dikr / data.count,
          qirath: data.qirath / data.count,
          goodHabits: data.goodHabits / data.count,
          overallScore: Math.round(data.overallScore / data.count)
        };
      });

      const count = scores.length;

      const sum = (key) => scores.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
      
      const distribution = { excellent: 0, good: 0, satisfactory: 0, improving: 0, needsFocus: 0 };
      const rankedStudents = [];

      scores.forEach(s => {
        if (s.overallScore >= 90) distribution.excellent++;
        else if (s.overallScore >= 75) distribution.good++;
        else if (s.overallScore >= 60) distribution.satisfactory++;
        else if (s.overallScore >= 50) distribution.improving++;
        else distribution.needsFocus++;

        const mentee = mentees.find(m => m.id === s.studentId);
        if (mentee) {
          rankedStudents.push({
            name: mentee.fullName,
            score: s.overallScore,
            photoURL: mentee.photoURL
          });
        }
      });

      rankedStudents.sort((a, b) => b.score - a.score);

      setStats({
        avgZuha: Math.round(sum('zuha') / count),
        avgTahajjud: Math.round(sum('tahajjud') / count),
        avgDikr: Math.round(sum('dikr') / count),
        avgQirath: Math.round(sum('qirath') / count),
        avgHabits: Math.round(sum('goodHabits') / count),
        avgOverall: Math.round(sum('overallScore') / count),
        distribution,
        topMentees: rankedStudents.slice(0, 5)
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mb-4"></div>
        <p className="text-sm font-medium">Analyzing spiritual data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Global Vitality</p>
              <h4 className="text-sm font-black text-gray-900 leading-tight">Spiritual Average</h4>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-black text-emerald-600">{stats.avgOverall}%</h4>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.avgOverall}%` }}
                className="bg-emerald-500 h-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">High Achievers</p>
              <h4 className="text-sm font-black text-gray-900 leading-tight">90%+ Excellence</h4>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-black text-amber-600">{stats.distribution.excellent}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 opacity-80">Students qualifying</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px] sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Needs Attention</p>
              <h4 className="text-sm font-black text-gray-900 leading-tight">Below 50% Vitality</h4>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-black text-red-500">{stats.distribution.needsFocus}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 opacity-80">Action Required</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Activity Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20">
          <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-blue" />
            Category-wise Group Average
          </h3>
          <div className="space-y-6">
            {[
              { label: 'أداء الضحى', val: stats.avgZuha, color: 'bg-amber-400' },
              { label: 'المواظبة على التهجد', val: stats.avgTahajjud, color: 'bg-indigo-400' },
              { label: 'المواظبة على الأذكار', val: stats.avgDikr, color: 'bg-emerald-400' },
              { label: 'مستوى القراءة', val: stats.avgQirath, color: 'bg-cyan-400' },
              { label: 'تطور الأخلاق الحسنة', val: stats.avgHabits, color: 'bg-purple-400' },
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="text-gray-900">{item.val}%</span>
                </div>
                <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden border border-gray-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.val}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={cn("h-full rounded-full", item.color)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20">
          <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Top Spiritual Performers
          </h3>
          <div className="space-y-4">
            {stats.topMentees.length > 0 ? stats.topMentees.map((mentee, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:border-amber-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-200">
                    {mentee.photoURL ? (
                      <img src={mentee.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs uppercase">
                        {mentee.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 group-hover:text-amber-600 transition-colors">{mentee.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Mentee</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-emerald-600">{mentee.score}%</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-gray-400 font-medium italic">
                Insufficient data for ranking
              </div>
            )}
          </div>
        </div>

      </div>



    </div>
  );
};

export default SpiritualInsights;
