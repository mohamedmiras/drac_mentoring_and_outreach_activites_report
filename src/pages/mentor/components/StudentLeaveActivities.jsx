import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, X, CalendarDays, CheckCircle, Percent, AlertCircle, Trash2, Edit2, FileText, ArrowLeft, Heart, BookOpen, Star, Activity } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const ACTIVITY_OPTIONS = [
  "Jamath Participation",
  "Haddad Recitation",
  "Sunnah Practices",
  "Engagement in Social Activities",
  "Family Visiting",
  "Helping Parents",
  "Other"
];

const PERCENTAGE_OPTIONS = [100, 90, 75, 60, 50, 40, 25, 10];

const StudentLeaveActivities = ({ student, onBack, readOnly = false }) => {
  const { userData } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Form State
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedActivities, setSelectedActivities] = useState({});
  const [otherText, setOtherText] = useState('');
  const [notes, setNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (student?.id) {
      fetchLeaves();
    }
  }, [student?.id]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'leave_records'),
        where('studentId', '==', student.id)
      );
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      
      // Sort by fromDate descending
      data.sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
      
      setLeaves(data);
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics Calculation
  const totalLeaves = leaves.length;
  const overallAvg = totalLeaves > 0 ? Math.round(leaves.reduce((acc, l) => acc + (l.overallEngagement || 0), 0) / totalLeaves) : 0;
  
  let highestLeave = null;
  let lowestLeave = null;
  let highestScore = 0;
  if (totalLeaves > 0) {
    highestLeave = leaves.reduce((prev, current) => (prev.overallEngagement > current.overallEngagement) ? prev : current);
    lowestLeave = leaves.reduce((prev, current) => (prev.overallEngagement < current.overallEngagement) ? prev : current);
    highestScore = highestLeave.overallEngagement || 0;
  }

  const openAddModal = () => {
    setEditingRecord(null);
    setFromDate('');
    setToDate('');
    setSelectedActivities({});
    setOtherText('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (leave) => {
    setEditingRecord(leave);
    setFromDate(leave.fromDate);
    setToDate(leave.toDate);
    
    const activitiesMap = {};
    leave.activities.forEach(a => {
      activitiesMap[a.type] = a.percentage;
    });
    setSelectedActivities(activitiesMap);
    setOtherText(leave.otherActivityName || '');
    setNotes(leave.notes || '');
    setIsModalOpen(true);
  };

  const handleToggleActivity = (activityType) => {
    setSelectedActivities(prev => {
      const newMap = { ...prev };
      if (newMap[activityType] !== undefined) {
        delete newMap[activityType]; // Remove if exists
        if (activityType === 'Other') setOtherText('');
      } else {
        newMap[activityType] = 100; // Default to 100% when selected
      }
      return newMap;
    });
  };

  const handlePercentageChange = (activityType, value) => {
    setSelectedActivities(prev => {
      const newMap = { ...prev };
      if (newMap[activityType] === Number(value)) {
        delete newMap[activityType]; // Deselect if clicking the same
        if (activityType === 'Other') setOtherText('');
      } else {
        newMap[activityType] = Number(value);
      }
      return newMap;
    });
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    return diffDays;
  };

  const calculateEngagement = () => {
    const keys = Object.keys(selectedActivities);
    if (keys.length === 0) return 0;
    
    // There are 6 core expected activities. Unselected ones count as 0%.
    // If 'Other' is selected, the total expected activities becomes 7.
    let divisor = 6;
    if (selectedActivities['Other'] !== undefined) {
      divisor = 7;
    }
    
    const total = keys.reduce((acc, key) => acc + selectedActivities[key], 0);
    return Math.min(Math.round(total / divisor), 100); // Cap at 100% just in case
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromDate || !toDate) return alert("Please select dates.");
    if (Object.keys(selectedActivities).length === 0) return alert("Please select at least one engagement activity.");
    
    if (selectedActivities['Other'] && !otherText.trim()) {
      return alert("Please specify the 'Other' activity.");
    }



    setFormLoading(true);
    
    const activitiesArray = Object.keys(selectedActivities).map(key => ({
      type: key,
      percentage: selectedActivities[key]
    }));

    const engagement = calculateEngagement();
    const days = calculateDays(fromDate, toDate);

    const payload = {
      studentId: student.id,
      mentorId: userData.mentorId || userData.uid || 'unknown',
      fromDate,
      toDate,
      totalDays: days,
      activities: activitiesArray,
      otherActivityName: selectedActivities['Other'] ? otherText : null,
      overallEngagement: engagement,
      notes: notes,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingRecord) {
        await updateDoc(doc(db, 'leave_records', editingRecord.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'leave_records'), payload);
      }
      
      setIsModalOpen(false);
      fetchLeaves();
    } catch (error) {
      console.error("Error saving leave:", error);
      alert("Failed to save leave record.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this leave record?")) {
      try {
        await deleteDoc(doc(db, 'leave_records', id));
        fetchLeaves();
      } catch (err) {
        console.error("Failed to delete", err);
      }
    }
  };

  const totalDaysTaken = leaves.reduce((acc, l) => acc + (l.totalDays || 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      
      {!readOnly && (
        <div className="flex items-center gap-4 mb-8">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-brand-blue hover:bg-blue-50 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Leave Engagement Tracker</h2>
            <p className="text-[11px] sm:text-sm font-medium text-gray-500 mt-0.5">Tracking productive activities during {student?.fullName}'s leaves.</p>
          </motion.div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Leaves Used', value: `${totalLeaves}`, max: '', icon: CalendarDays, color: 'text-brand-blue', bg: 'from-blue-50/50' },
          { label: 'Avg Engagement', value: `${overallAvg}`, max: '%', icon: Activity, color: 'text-emerald-500', bg: 'from-emerald-50/50' },
          { label: 'Highest Score', value: `${highestScore}`, max: '%', icon: Star, color: 'text-amber-500', bg: 'from-amber-50/50' },
          { label: 'Total Days Off', value: `${totalDaysTaken}`, max: '', icon: Calendar, color: 'text-orange-500', bg: 'from-orange-50/50' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + (i * 0.05) }}
            className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            <stat.icon className={`w-5 h-5 ${stat.color} mb-1.5 relative z-10`} />
            <span className="text-xl sm:text-2xl font-bold text-gray-900 leading-none relative z-10">
              {stat.value}<span className="text-xs text-gray-400 font-semibold">{stat.max}</span>
            </span>
            <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider mt-1.5 relative z-10">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/30">
          <div>
            <h3 className="text-base font-bold text-gray-900">Leave History</h3>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5">Detailed breakdown of leave engagement.</p>
          </div>
          
          {!readOnly && (
            <button 
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Log New Leave
            </button>
          )}
        </div>

        <div className="p-4 md:p-6">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl"></div>)}
            </div>
          ) : leaves.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <CalendarDays className="w-12 h-12 mb-3 text-gray-200" />
              <p className="text-base font-semibold text-gray-500">No leaves logged yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {leaves.map((leave, idx) => (
                <div key={leave.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-100 hover:shadow-sm transition-all group flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center font-bold text-sm">
                        {totalLeaves - idx}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 text-xs sm:text-sm">
                            {new Date(leave.fromDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(leave.toDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </h4>
                          <span className="text-[9px] font-medium bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-100">{leave.totalDays}d</span>
                        </div>
                        {leave.notes && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{leave.notes}</p>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="block text-xl font-bold text-brand-blue leading-none">{leave.overallEngagement}%</span>
                        <span className="text-[8px] font-medium text-gray-400 uppercase tracking-widest">Score</span>
                      </div>
                      
                      {!readOnly && (
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(leave)} className="p-1 text-gray-400 hover:text-blue-600 rounded-md"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDelete(leave.id)} className="p-1 text-gray-400 hover:text-red-600 rounded-md"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-gray-50 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {leave.activities.map((act, i) => {
                      const MOBILE_NAMES = {
                        "Jamath Participation": "Jamath",
                        "Haddad Recitation": "Haddad",
                        "Sunnah Practices": "Sunnah",
                        "Engagement in Social Activities": "Social activities",
                        "Family Visiting": "Family Visit",
                        "Helping Parents": "Parent help"
                      };
                      const displayName = act.type === 'Other' ? leave.otherActivityName || 'Other' : act.type;
                      const mobileName = MOBILE_NAMES[act.type] || displayName;

                      return (
                        <div key={i} className="flex items-center justify-between bg-gray-50/50 px-2 py-1 rounded-lg border border-gray-50">
                          <span className="font-medium text-gray-600 truncate mr-1 text-[9px] sm:text-xs" title={displayName}>
                            <span className="sm:hidden">{mobileName}</span>
                            <span className="hidden sm:inline">{displayName}</span>
                          </span>
                          <span className={cn(
                            "text-[9px] font-bold px-1 py-0.5 rounded",
                            act.percentage >= 75 ? "bg-emerald-50 text-emerald-600" :
                            act.percentage >= 50 ? "bg-amber-50 text-amber-600" :
                            "bg-rose-50 text-rose-600"
                          )}>
                            {act.percentage}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-brand-blue flex items-center justify-center">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">{editingRecord ? 'Edit Leave Record' : 'Log New Leave'}</h3>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">Track engagement during leave periods</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <form id="leaveForm" onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">From Date</label>
                      <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">To Date</label>
                      <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all" />
                    </div>
                  </div>
                  
                  {fromDate && toDate && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-blue-800">Calculated Duration:</span>
                      <span className="text-sm font-black text-brand-blue">{calculateDays(fromDate, toDate)} Days</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Engagement Activities</label>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">Select & Rate</span>
                    </div>
                    
                    <div className="space-y-3">
                      {ACTIVITY_OPTIONS.map(activity => {
                        const isSelected = selectedActivities[activity] !== undefined;
                        return (
                          <div key={activity} className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-3", isSelected ? "bg-blue-50/40 border-blue-200 shadow-sm" : "bg-white border-gray-100 hover:border-gray-200")}>
                            <div className="flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className={cn("w-2.5 h-2.5 rounded-full transition-colors", isSelected ? "bg-brand-blue shadow-[0_0_8px_rgba(37,99,235,0.4)]" : "bg-gray-200")} />
                                <span className={cn("text-sm font-bold transition-colors", isSelected ? "text-brand-blue" : "text-gray-600")}>{activity}</span>
                                {activity === 'Other' && isSelected && (
                                  <input 
                                    type="text" 
                                    placeholder="Specify..." 
                                    value={otherText} 
                                    onChange={e => setOtherText(e.target.value)} 
                                    className="w-32 px-3 py-1.5 text-xs font-medium border border-blue-200 rounded-lg outline-none focus:border-brand-blue bg-white ml-2"
                                  />
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-1.5 pl-5 xl:pl-0">
                                {PERCENTAGE_OPTIONS.map(opt => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handlePercentageChange(activity, opt)}
                                    className={cn(
                                      "px-2.5 py-1.5 text-[11px] font-black rounded-lg transition-all border",
                                      selectedActivities[activity] === opt 
                                        ? "bg-brand-blue text-white border-brand-blue shadow-sm" 
                                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-brand-blue/40 hover:text-brand-blue hover:bg-blue-50"
                                    )}
                                  >
                                    {opt}%
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Optional Notes</label>
                    <textarea 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      rows="2" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all resize-none"
                      placeholder="Add any observations or comments..."
                    />
                  </div>

                </form>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                <div className="text-xs font-bold text-gray-500">
                  Calculated Engagement: <span className="text-brand-blue text-sm ml-1">{calculateEngagement()}%</span>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" form="leaveForm" disabled={formLoading} className="px-6 py-2.5 bg-brand-blue text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Save Record
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StudentLeaveActivities;
