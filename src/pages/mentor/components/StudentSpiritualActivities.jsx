import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Activity, Calendar, FileText, CheckCircle2, TrendingUp, X } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../../../contexts/AuthContext';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const StudentSpiritualActivities = ({ student, readOnly = false }) => {
  const { userData } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fromDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    period: 'Weekly',
    zuha: '',
    tahajjud: '',
    dikr: '',
    qirath: '',
    goodHabits: '',
    notes: ''
  });

  useEffect(() => {
    fetchRecords();
  }, [student.id]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'spiritual_records'), where('studentId', '==', student.id));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverall = (data) => {
    const categories = ['zuha', 'tahajjud', 'dikr', 'qirath', 'goodHabits'];
    let total = 0;
    let count = 0;
    categories.forEach(cat => {
      if (data[cat] !== '' && data[cat] !== null && data[cat] !== undefined) {
        total += Number(data[cat]);
        count++;
      }
    });
    return count === 0 ? 0 : Math.round(total / count);
  };

  const handlePeriodChange = (e) => {
    const period = e.target.value;
    const toDateObj = new Date(formData.toDate || new Date());
    const fromDateObj = new Date(toDateObj);
    
    if (period === 'Weekly') fromDateObj.setDate(toDateObj.getDate() - 7);
    else if (period === 'Bi-Weekly') fromDateObj.setDate(toDateObj.getDate() - 14);
    else if (period === 'Monthly') fromDateObj.setMonth(toDateObj.getMonth() - 1);

    setFormData({
      ...formData,
      period,
      fromDate: fromDateObj.toISOString().split('T')[0],
      toDate: toDateObj.toISOString().split('T')[0]
    });
  };

  const handleToDateChange = (e) => {
    const newTo = e.target.value;
    const toDateObj = new Date(newTo);
    const fromDateObj = new Date(toDateObj);
    const period = formData.period;

    if (period === 'Weekly') fromDateObj.setDate(toDateObj.getDate() - 7);
    else if (period === 'Bi-Weekly') fromDateObj.setDate(toDateObj.getDate() - 14);
    else if (period === 'Monthly') fromDateObj.setMonth(toDateObj.getMonth() - 1);

    setFormData({
      ...formData,
      toDate: newTo,
      fromDate: fromDateObj.toISOString().split('T')[0]
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        date: formData.toDate, // For backwards compatibility
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        studentId: student.id,
        mentorUsername: userData?.username || '',
        overallScore: calculateOverall(formData),
        zuha: Number(formData.zuha) || 0,
        tahajjud: Number(formData.tahajjud) || 0,
        dikr: Number(formData.dikr) || 0,
        qirath: Number(formData.qirath) || 0,
        goodHabits: Number(formData.goodHabits) || 0,
        updatedAt: new Date().toISOString()
      };

      if (editingRecord) {
        await updateDoc(doc(db, 'spiritual_records', editingRecord.id), payload);
      } else {
        payload.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'spiritual_records'), payload);
      }

      setShowAddForm(false);
      setEditingRecord(null);
      resetForm();
      fetchRecords();
    } catch (err) {
      console.error(err);
      alert("Failed to save record.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm("Delete this spiritual record?")) return;
    try {
      await deleteDoc(doc(db, 'spiritual_records', recordId));
      fetchRecords();
    } catch (err) {
      console.error(err);
      alert("Failed to delete record.");
    }
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      fromDate: record.fromDate || record.date,
      toDate: record.toDate || record.date,
      period: record.period,
      zuha: record.zuha,
      tahajjud: record.tahajjud,
      dikr: record.dikr,
      qirath: record.qirath,
      goodHabits: record.goodHabits,
      notes: record.notes || ''
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 7);
    
    setFormData({
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      period: 'Weekly',
      zuha: '',
      tahajjud: '',
      dikr: '',
      qirath: '',
      goodHabits: '',
      notes: ''
    });
  };

  // Analytics logic
  const reversedRecords = [...records].reverse(); // oldest to newest for charts
  
  const currentOverall = records.length > 0 
    ? Math.round(records.reduce((acc, curr) => acc + curr.overallScore, 0) / records.length) 
    : 0;
  const getScoreLabel = (score) => {
    if (score >= 95) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (score >= 85) return { label: 'Very Good', color: 'text-emerald-500', bg: 'bg-emerald-50/50', border: 'border-emerald-100' };
    if (score >= 70) return { label: 'Good', color: 'text-brand-blue', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (score >= 60) return { label: 'Satisfactory', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' };
    if (score >= 50) return { label: 'Average', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { label: 'Needs Focus', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };
  const currentLabel = getScoreLabel(currentOverall);



  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Summary Section */}
      <div className={cn("rounded-3xl p-6 sm:p-8 border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6", currentLabel.bg, currentLabel.border)}>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/50" />
              <motion.circle 
                cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                strokeLinecap="round"
                className={currentLabel.color}
                strokeDasharray={`${2 * Math.PI * 45}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - currentOverall / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-2xl sm:text-3xl font-black", currentLabel.color)}>{currentOverall}%</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1">Spiritual Vitality</h2>
            <p className={cn("text-lg font-bold", currentLabel.color)}>{currentLabel.label}</p>
            <p className="text-sm text-gray-600 mt-1">Based on {records.length} recent evaluations</p>
          </div>
        </div>
        
        {!showAddForm && !readOnly && (
          <button 
            onClick={() => setShowAddForm(true)}
            className={cn("px-6 py-3 rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2", 
              "bg-white", currentLabel.color)}
          >
            <Plus className="w-5 h-5" /> New Entry
          </button>
        )}
      </div>



      {/* Entry Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-blue/20 shadow-lg shadow-brand-blue/5 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-blue" />
                  {editingRecord ? 'Edit Spiritual Record' : 'Log New Spiritual Record'}
                </h3>
                <button onClick={() => { setShowAddForm(false); setEditingRecord(null); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Recording Period</label>
                    <select required value={formData.period} onChange={handlePeriodChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold text-gray-800">
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">From Date</label>
                    <input type="date" required value={formData.fromDate} onChange={e => setFormData({...formData, fromDate: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">To Date</label>
                    <input type="date" required value={formData.toDate} onChange={handleToDateChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold text-gray-800" />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <h4 className="text-sm font-bold text-gray-800 mb-4">Activity Ratings</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { key: 'zuha', label: 'الضحى' },
                      { key: 'tahajjud', label: 'تهجد' },
                      { key: 'dikr', label: 'المواظبة على الأذكار' },
                      { key: 'qirath', label: 'القراءة' },
                      { key: 'goodHabits', label: 'الأخلاق الحسنة' }
                    ].map(item => (
                      <div key={item.key}>
                        <label className="block text-[13px] font-bold text-gray-500 mb-2">{item.label}</label>
                        <select 
                          required
                          value={formData[item.key]} 
                          onChange={e => setFormData({...formData, [item.key]: e.target.value})} 
                          className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 outline-none font-semibold text-gray-800 text-sm"
                        >
                          <option value="" disabled>Select</option>
                          <option value="100">Excellent (100%)</option>
                          <option value="90">Very Good (90%)</option>
                          <option value="75">Good (75%)</option>
                          <option value="60">Satisfactory (60%)</option>
                          <option value="50">Average (50%)</option>
                          <option value="25">Needs Focus (25%)</option>
                          <option value="0">None (0%)</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Notes / Observation</label>
                  <textarea rows={3} placeholder="Observations about the student's progress..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none font-medium text-gray-800 resize-none" />
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={isSaving} className="px-8 py-3 bg-brand-blue text-white rounded-xl font-bold shadow-lg shadow-brand-blue/30 hover:bg-brand-lightBlue transition-all disabled:opacity-70">
                    {isSaving ? 'Saving...' : 'Save Record'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">History Records</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin h-6 w-6 border-b-2 border-brand-blue mx-auto"></div></div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium">No spiritual records found for this student.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4 pl-6">Date Range</th>
                  <th className="p-4">Period</th>
                  <th className="p-4 text-center">الضحى</th>
                  <th className="p-4 text-center">تهجد</th>
                  <th className="p-4 text-center">الأذكار</th>
                  <th className="p-4 text-center">القراءة</th>
                  <th className="p-4 text-center">الأخلاق</th>
                  <th className="p-4 text-center">Overall</th>
                  {!readOnly && <th className="p-4 pr-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4 pl-6 font-semibold text-gray-800 whitespace-nowrap">
                      {rec.fromDate ? `${new Date(rec.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ` : ''}
                      {new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-gray-600 font-medium">{rec.period}</td>
                    <td className="p-4 text-center text-gray-600 font-semibold">{rec.zuha}%</td>
                    <td className="p-4 text-center text-gray-600 font-semibold">{rec.tahajjud}%</td>
                    <td className="p-4 text-center text-gray-600 font-semibold">{rec.dikr}%</td>
                    <td className="p-4 text-center text-gray-600 font-semibold">{rec.qirath}%</td>
                    <td className="p-4 text-center text-gray-600 font-semibold">{rec.goodHabits}%</td>
                    <td className="p-4 text-center">
                      <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold", getScoreLabel(rec.overallScore).bg, getScoreLabel(rec.overallScore).color)}>
                        {rec.overallScore}%
                      </span>
                    </td>
                    {!readOnly && (
                    <td className="p-4 pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(rec)} className="p-1.5 text-gray-400 hover:text-brand-blue bg-white hover:bg-blue-50 rounded-md transition" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(rec.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-md transition" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default StudentSpiritualActivities;
