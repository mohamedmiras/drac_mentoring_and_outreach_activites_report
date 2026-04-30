import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { BookOpen, Target, CheckCircle2, TrendingUp, Users, ChevronRight } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AcademicInsights = ({ mentees }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgCompletion: 0,
    totalTasks: 0,
    totalRecords: 0,
    distribution: {
      excellent: 0,
      good: 0,
      needsFocus: 0
    },
    topMentees: []
  });

  useEffect(() => {
    fetchAcademicInsights();
  }, [mentees]);

  const fetchAcademicInsights = async () => {
    if (!mentees || mentees.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const menteeIds = mentees.map(m => m.id);
      
      const tasksSnap = await getDocs(collection(db, 'academic_tasks'));
      const recordsSnap = await getDocs(collection(db, 'academic_records'));
      
      const tasks = [];
      tasksSnap.forEach(d => {
        const data = d.data();
        if (menteeIds.includes(data.studentId)) {
          tasks.push({ id: d.id, ...data });
        }
      });

      const records = [];
      recordsSnap.forEach(d => {
        const data = d.data();
        if (menteeIds.includes(data.studentId)) {
          records.push({ id: d.id, ...data });
        }
      });

      if (tasks.length === 0) {
        setStats({
          avgCompletion: 0, totalTasks: 0, totalRecords: 0,
          distribution: { excellent: 0, good: 0, needsFocus: 0 },
          topMentees: []
        });
        setLoading(false);
        return;
      }

      // Calculate completion per task
      const studentScores = {};
      
      tasks.forEach(task => {
        const taskRecords = records.filter(r => r.taskId === task.id);
        if (taskRecords.length === 0) return;

        let totalCompleted = 0;
        let expectedTotal = taskRecords.length * task.targetCount;
        
        taskRecords.forEach(r => totalCompleted += r.completedCount);
        
        let completionPercent = expectedTotal > 0 ? Math.min(100, Math.round((totalCompleted / expectedTotal) * 100)) : 0;
        
        if (!studentScores[task.studentId]) {
          studentScores[task.studentId] = { totalPercent: 0, count: 0 };
        }
        studentScores[task.studentId].totalPercent += completionPercent;
        studentScores[task.studentId].count += 1;
      });

      let totalGlobalPercent = 0;
      let studentCountWithTasks = 0;
      
      const distribution = { excellent: 0, good: 0, needsFocus: 0 };
      const rankedStudents = [];

      Object.keys(studentScores).forEach(studentId => {
        const s = studentScores[studentId];
        const overallScore = Math.round(s.totalPercent / s.count);
        
        totalGlobalPercent += overallScore;
        studentCountWithTasks++;

        if (overallScore >= 80) distribution.excellent++;
        else if (overallScore >= 50) distribution.good++;
        else distribution.needsFocus++;

        const mentee = mentees.find(m => m.id === studentId);
        if (mentee) {
          rankedStudents.push({
            name: mentee.fullName,
            score: overallScore,
            photoURL: mentee.photoURL
          });
        }
      });

      rankedStudents.sort((a, b) => b.score - a.score);

      setStats({
        avgCompletion: studentCountWithTasks > 0 ? Math.round(totalGlobalPercent / studentCountWithTasks) : 0,
        totalTasks: tasks.length,
        totalRecords: records.length,
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
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg shadow-indigo-500/20 flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-indigo-100 font-bold uppercase tracking-widest text-[9px]">Global Average</p>
              <h2 className="text-sm font-black text-white leading-tight">Completion Rate</h2>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tracking-tighter">{stats.avgCompletion}%</span>
            </div>
            <p className="text-indigo-200 text-[10px] mt-1 font-bold uppercase tracking-wider opacity-80">Based on {stats.totalTasks} active tasks</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">High Achievers</p>
              <h4 className="text-sm font-black text-gray-900 leading-tight">Mentees with 80%+</h4>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-black text-emerald-600">{stats.distribution.excellent}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 opacity-80">Total Active Mentees</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px] sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Needs Attention</p>
              <h4 className="text-sm font-black text-gray-900 leading-tight">Below 50% Completion</h4>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-black text-red-500">{stats.distribution.needsFocus}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 opacity-80">Requires Review</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Top Performers */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20">
          <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Top Academic Performers
          </h3>
          <div className="space-y-4">
            {stats.topMentees.length > 0 ? stats.topMentees.map((mentee, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:border-indigo-200 transition-all">
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
                    <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{mentee.name}</p>
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

        {/* Info Card */}
        <div className="bg-gradient-to-b from-gray-50 to-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
             <Users className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">Tracking Engagement</h3>
          <p className="text-gray-500 mb-8 leading-relaxed">
            The completion rate measures how consistently your mentees are meeting the specific target counts set for their academic tasks over the recorded period.
          </p>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Tasks</p>
                <p className="text-2xl font-black text-gray-900">{stats.totalTasks}</p>
             </div>
             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Logs</p>
                <p className="text-2xl font-black text-gray-900">{stats.totalRecords}</p>
             </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AcademicInsights;
