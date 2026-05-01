import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, LayoutDashboard, List, Search, Filter, CheckCircle, Clock, Trash2, 
  Pencil, ChevronDown, User, Calendar, BookOpen, Activity, FileText, Download, Printer, BarChart, Trophy, FileSpreadsheet,
  Target, Info
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getAchievementMarks } from '../../lib/scoring';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const OutreachRecords = () => {
  const [activeTab, setActiveTab] = useState('status'); // 'status', 'records', 'reports'
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Advanced Global Filters
  const [recordType, setRecordType] = useState('Both'); // 'Outreach', 'Mission 100', 'Both'
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  
  const [reportType, setReportType] = useState('All Time'); // 'Monthly', 'Yearly', 'Custom Period', 'All Time'
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Modal
  const [editingRecord, setEditingRecord] = useState(null);
  const [studentFilter, setStudentFilter] = useState('All');

  // Reset student filter when class filter changes
  useEffect(() => {
    setStudentFilter('All');
  }, [classFilter]);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showAllActivities, setShowAllActivities] = useState(false);

  const months = [
    { v: '01', l: 'January' }, { v: '02', l: 'February' }, { v: '03', l: 'March' },
    { v: '04', l: 'April' }, { v: '05', l: 'May' }, { v: '06', l: 'June' },
    { v: '07', l: 'July' }, { v: '08', l: 'August' }, { v: '09', l: 'September' },
    { v: '10', l: 'October' }, { v: '11', l: 'November' }, { v: '12', l: 'December' }
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Array(5), (_, index) => (currentYear - index).toString());

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Fetch all students to map their details
      const studentSnap = await getDocs(collection(db, 'students'));
      const studentMapById = {};
      const studentMapByAdm = {};
      
      studentSnap.forEach(d => {
        const sData = d.data();
        const id = d.id;
        studentMapById[id] = { id, ...sData };
        if (sData.admissionNumber) {
          studentMapByAdm[sData.admissionNumber] = { id, ...sData };
        }
      });

      const snap = await getDocs(collection(db, 'achievements'));
      const data = [];
      snap.forEach(d => {
        const docData = d.data();
        if (docData.isOutreach || docData.isMission100) {
          // Robust student lookup
          const student = studentMapById[docData.studentId] || 
                          studentMapByAdm[docData.admissionNumber] || 
                          studentMapByAdm[docData.studentId] || // just in case ID is admission number
                          {};
          
          data.push({ 
            id: d.id, 
            ...docData, 
            studentName: student.fullName || docData.studentName || 'Student',
            photoURL: student.photoURL || docData.photoURL || docData.studentPhoto || null,
             studentPlace: student.place || '',
             parsedDate: docData.date || docData.createdAt 
          });
        }
      });
      data.sort((a, b) => new Date(b.parsedDate) - new Date(a.parsedDate));
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this record? This will completely remove the achievement.")) {
      const originalRecords = [...records];
      setRecords(prev => prev.filter(r => r.id !== id));
      try {
        await deleteDoc(doc(db, 'achievements', id));
      } catch (err) {
        console.error("Failed to delete", err);
        setRecords(originalRecords);
      }
    }
  };

  const openEditModal = (rec) => {
    setEditingRecord(rec);
    setEditStatus(rec.outreachStatus || 'Pending');
    setEditNotes(rec.note || '');
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    const originalRecords = [...records];
    
    const isAccepted = editStatus === 'Accepted';
    const mission100Update = isAccepted ? { isMission100: true } : {};

    setRecords(prev => prev.map(r => r.id === editingRecord.id ? { 
      ...r, 
      outreachStatus: editStatus, 
      note: editNotes,
      ...mission100Update
    } : r));
    setEditingRecord(null);
    try {
      await updateDoc(doc(db, 'achievements', editingRecord.id), {
        outreachStatus: editStatus,
        note: editNotes,
        ...mission100Update
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update record.");
      setRecords(originalRecords);
    }
  };

  const handleQuickAccept = async (id) => {
    const originalRecords = [...records];
    setRecords(prev => prev.map(r => r.id === id ? { ...r, outreachStatus: 'Accepted', isMission100: true } : r));
    try {
      await updateDoc(doc(db, 'achievements', id), {
        outreachStatus: 'Accepted',
        isMission100: true
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
      setRecords(originalRecords);
    }
  };

  const getQueryDateBounds = () => {
    let start = new Date(0);
    let end = new Date();
    
    if (reportType === 'Monthly') {
      start = new Date(`${year}-${month}-01T00:00:00.000Z`);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (reportType === 'Yearly') {
      start = new Date(`${year}-01-01T00:00:00.000Z`);
      end = new Date(`${year}-12-31T23:59:59.999Z`);
    } else if (reportType === 'Custom Period') {
      if (customStart && customEnd) {
        start = new Date(`${customStart}T00:00:00.000Z`);
        end = new Date(`${customEnd}T23:59:59.999Z`);
      }
    }
    return { startTime: start.getTime(), endTime: end.getTime() };
  };

  const { startTime, endTime } = getQueryDateBounds();

  // Primary Filtered Records
  const filteredRecords = records.filter(r => {
    // Record Type
    const isOut = r.isOutreach === true;
    const isM100 = r.isMission100 === true;
    let matchType = false;
    if (recordType === 'Both') matchType = true;
    else if (recordType === 'Outreach') matchType = isOut;
    else if (recordType === 'Mission 100') matchType = isM100;
    if (!matchType) return false;

    // Search
    const sTerm = searchTerm.toLowerCase();
    const matchSearch = (r.studentName || '').toLowerCase().includes(sTerm) || 
                        (r.title || '').toLowerCase().includes(sTerm) ||
                        (r.className || '').toLowerCase().includes(sTerm);
    if (!matchSearch) return false;

    // Class
    if (classFilter !== 'All' && r.className !== classFilter) return false;

    // Student
    if (studentFilter !== 'All' && r.studentName !== studentFilter) return false;

    // Date
    if (reportType !== 'All Time') {
      const dTime = new Date(r.parsedDate).getTime();
      if (isNaN(dTime) || dTime < startTime || dTime > endTime) return false;
    }

    return true;
  });

  const uniqueClasses = Array.from(new Set(records.map(r => r.className))).filter(Boolean).sort();
  
  // Dynamic student list based on class filter
  const uniqueStudents = Array.from(new Set(
    records
      .filter(r => classFilter === 'All' || r.className === classFilter)
      .map(r => r.studentName)
  )).filter(Boolean).sort();

  // Status Tab Stats
  const totalRecords = filteredRecords.length;
  const accepted = filteredRecords.filter(r => r.outreachStatus === 'Accepted').length;
  const pending = filteredRecords.filter(r => r.outreachStatus !== 'Accepted').length;
  const recentActivities = showAllActivities ? filteredRecords : filteredRecords.slice(0, 5);

  // Records Tab (Accepted Only Analytics & Grid)
  const acceptedFilteredRecords = filteredRecords.filter(r => r.outreachStatus === 'Accepted');
  const totalAcceptedFiltered = acceptedFilteredRecords.length;
  const activeStudentsCount = new Set(acceptedFilteredRecords.map(r => r.studentName)).size;

  const getShortClass = (cls) => {
    if (!cls) return '';
    const mapping = {
      'secondary final year': 'S5',
      'senior secondary first year': 'SS1',
      'senior secondary final year': 'SS2',
      'degree first year': 'D1'
    };
    return mapping[cls.toLowerCase()] || cls;
  };

  const classDataMap = {};
  acceptedFilteredRecords.forEach(r => {
    if (r.className) {
      const scoreValue = getAchievementMarks(r);
      const shortName = getShortClass(r.className);
      classDataMap[shortName] = (classDataMap[shortName] || 0) + scoreValue;
    }
  });
  const classChartData = Object.entries(classDataMap)
    .map(([name, count]) => ({name, count: Number(count.toFixed(2))}))
    .sort((a, b) => b.count - a.count);
  const topClass = classChartData.length > 0 ? classChartData[0].name : 'N/A';

  const studentDataMap = {};
  acceptedFilteredRecords.forEach(r => {
    if (r.studentName) {
      if (!studentDataMap[r.studentName]) {
        studentDataMap[r.studentName] = { 
          score: 0, 
          className: r.className,
          photoURL: r.photoURL 
        };
      }
      // Using standardized scoring utility for accuracy
      const scoreValue = getAchievementMarks(r);
      studentDataMap[r.studentName].score += scoreValue;
    }
  });
  const topStudents = Object.entries(studentDataMap)
    .map(([name, data]) => ({ name, score: Number(data.score.toFixed(2)), className: data.className, photoURL: data.photoURL }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Show top 5 performers

  const getReportTitle = () => {
    if (reportType === 'Monthly') return `${months.find(m => m.v === month)?.l} ${year}`;
    if (reportType === 'Yearly') return `Year ${year}`;
    if (reportType === 'Custom Period') return `${customStart} to ${customEnd}`;
    return 'All-Time Records';
  };

  const handlePrint = () => {
    window.print();
  };

  // Common Filters Component
  const FiltersPanel = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6 w-full lg:w-[300px] shrink-0 h-fit">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-4">
        <Filter className="w-5 h-5 text-gray-400" />
        Configuration
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Record Type</label>
          <select value={recordType} onChange={e => setRecordType(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue/30 outline-none bg-slate-50 font-bold text-slate-700">
            <option value="Outreach">Outreach Activities</option>
            <option value="Mission 100">Mission 100</option>
            <option value="Both">Both</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Time Period</label>
          <select 
            value={reportType === 'All Time' ? 'All Time' : 'Custom'} 
            onChange={e => {
              if (e.target.value === 'All Time') setReportType('All Time');
              else setReportType('Monthly');
            }} 
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue/30 outline-none bg-slate-50 font-bold text-slate-700"
          >
            <option value="All Time">Total Period</option>
            <option value="Custom">Custom Data</option>
          </select>
        </div>

        {reportType !== 'All Time' && (
          <div className="pt-4 border-t border-gray-50 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Custom Filter Type</label>
              <select 
                value={reportType} 
                onChange={e => setReportType(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-bold text-slate-600"
              >
                <option value="Monthly">Monthly View</option>
                <option value="Yearly">Yearly View</option>
                <option value="Custom Period">Certain Period (Range)</option>
              </select>
            </div>

            {reportType === 'Monthly' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Month</label>
                  <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg outline-none bg-white text-sm">
                    {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Year</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg outline-none bg-white text-sm">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            )}

            {reportType === 'Yearly' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Year</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}

            {reportType === 'Custom Period' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">From</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">To</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white" />
                </div>
              </div>
            )}
          </div>
        )}

        <hr className="border-gray-100 my-4" />

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Class Filter</label>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 font-medium">
            <option value="All">All Classes</option>
            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Student Filter</label>
          <select value={studentFilter} onChange={e => setStudentFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 font-medium">
            <option value="All">All Students</option>
            {uniqueStudents.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Student, Title..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-brand-blue" />
            Special Activities
          </h1>
          <p className="text-gray-500 mt-1">Outreach and Mentoring Activities Report</p>
        </div>
        
        {/* Top Tabs */}
        <div className="flex bg-gray-100/80 p-1 rounded-xl w-full md:w-auto">
          <button onClick={() => setActiveTab('status')} className={cn("flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'status' ? "bg-white text-brand-blue shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50")}>
            <LayoutDashboard className="w-4 h-4" /> Status
          </button>
          <button onClick={() => setActiveTab('records')} className={cn("flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all", activeTab === 'records' ? "bg-white text-brand-blue shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50")}>
            <List className="w-4 h-4" /> Records
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
          </motion.div>
        ) : activeTab === 'status' ? (
          <motion.div 
            key="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-8"
          >
            {/* Top Row: Configuration & Status Distribution */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Configuration Panel */}
              <div className="w-full lg:w-[320px] shrink-0">
                <FiltersPanel />
              </div>

              {/* Status Distribution & Quick Stats */}
              <div className="flex-1 flex flex-col gap-6">
                <div className="bg-white p-5 lg:p-6 rounded-3xl border border-gray-100 shadow-sm flex-1 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Activity className="w-4 h-4 text-brand-blue" /> 
                      Performance Overview
                    </h3>
                    <div className="px-3 py-1 bg-blue-50 text-brand-blue text-[10px] font-medium rounded-full border border-blue-100 shadow-sm">
                      {totalRecords} Total Submissions
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1">
                    {/* Pending Stat Card */}
                    <div className="bg-gradient-to-br from-amber-50/80 to-white border border-amber-100/50 rounded-2xl p-5 relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                      <div className="absolute -top-2 -right-2 p-2 opacity-5 group-hover:opacity-10 transition-opacity group-hover:scale-110 duration-500 pointer-events-none">
                        <Clock className="w-24 h-24 text-amber-500" />
                      </div>
                      
                      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm shrink-0">
                              <Clock className="w-4 h-4" />
                            </div>
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-tight">Pending Verification</p>
                          </div>
                          <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-4xl font-black text-gray-900 tracking-tight">{pending}</p>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Submissions</span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                            <span>Distribution Share</span>
                            <span className="text-amber-600">{totalRecords > 0 ? Math.round((pending/totalRecords)*100) : 0}%</span>
                          </div>
                          <div className="w-full bg-amber-100/50 rounded-full h-1 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${totalRecords > 0 ? (pending/totalRecords)*100 : 0}%` }} 
                              className="bg-amber-400 h-full rounded-full" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Accepted Stat Card */}
                    <div className="bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100/50 rounded-2xl p-5 relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                      <div className="absolute -top-2 -right-2 p-2 opacity-5 group-hover:opacity-10 transition-opacity group-hover:scale-110 duration-500 pointer-events-none">
                        <CheckCircle className="w-24 h-24 text-emerald-500" />
                      </div>
                      
                      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest leading-tight">Successfully Accepted</p>
                          </div>
                          <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-4xl font-black text-gray-900 tracking-tight">{accepted}</p>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Records</span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                            <span>Distribution Share</span>
                            <span className="text-emerald-600">{totalRecords > 0 ? Math.round((accepted/totalRecords)*100) : 0}%</span>
                          </div>
                          <div className="w-full bg-emerald-100/50 rounded-full h-1 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${totalRecords > 0 ? (accepted/totalRecords)*100 : 0}%` }} 
                              className="bg-emerald-500 h-full rounded-full" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>


                </div>
              </div>
            </div>

            {/* Bottom Section: Recent Activity - Full Width */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 lg:p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-blue" /> 
                  Recent Activity Stream
                </h3>
                <span className="text-[9px] font-medium text-gray-400 uppercase tracking-widest bg-gray-100/50 px-3 py-1 rounded-full border border-gray-100/50">All {recentActivities.length} Updates</span>
              </div>
              
              <div className="overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {recentActivities.map(act => {
                    const [mainTitle, ...subtitleParts] = (act.title || '').split(' - ');
                    const subtitle = subtitleParts.join(' - ');

                    return (
                      <div key={act.id} className="p-4 sm:p-6 hover:bg-gray-50/80 transition-all group flex items-center gap-3 sm:gap-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 border border-slate-100 overflow-hidden bg-slate-50">
                          {act.photoURL ? (
                            <img src={act.photoURL} alt={act.studentName} className="w-full h-full object-cover" />
                          ) : (
                            <div className={cn(
                              "w-full h-full flex items-center justify-center font-black text-base sm:text-lg",
                              act.outreachStatus === 'Accepted' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                            )}>
                              {act.studentName?.charAt(0).toUpperCase() || 'S'}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                          {/* Student Info */}
                          <div className="flex flex-col min-w-0 sm:w-44 shrink-0">
                            <span className="font-medium text-gray-600 text-[13px] sm:text-sm truncate leading-tight">{act.studentName}</span>
                            <div className="flex flex-col mt-0.5">
                              <span className="text-[10px] font-black text-brand-blue uppercase tracking-tighter sm:tracking-widest">
                                {getShortClass(act.className)}
                              </span>
                              {act.studentPlace && (
                                <span className="text-[10px] font-bold text-gray-500 capitalize truncate mt-0.5">
                                  {act.studentPlace}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Program Info (Centered on Desktop) */}
                          <div className="min-w-0 flex-1 sm:text-center">
                            <p className="font-bold text-gray-800 text-xs sm:text-sm truncate" title={act.title}>
                              {mainTitle}
                            </p>
                            {subtitle && (
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5">{subtitle}</p>
                            )}
                          </div>

                          {/* Date Info */}
                          <div className="shrink-0 flex flex-col sm:items-end">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100/50">
                              {new Date(act.parsedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {act.outreachStatus !== 'Accepted' && (
                            <button 
                              onClick={() => handleQuickAccept(act.id)}
                              className="w-8 h-8 sm:w-auto sm:px-4 sm:py-2 bg-emerald-500 text-white rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs hover:bg-emerald-600 shadow-sm transition-all flex items-center justify-center sm:gap-2"
                              title="Accept"
                            >
                              <CheckCircle className="w-4 h-4" /> 
                              <span className="hidden sm:inline">Accept</span>
                            </button>
                          )}
                          <button onClick={() => openEditModal(act)} className="p-1.5 sm:p-2 text-gray-400 hover:text-brand-blue hover:bg-white rounded-lg sm:rounded-xl border border-transparent hover:border-gray-100 transition-all">
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {!showAllActivities && filteredRecords.length > 5 && (
                  <div className="p-4 border-t border-gray-50 bg-gray-50/30 flex justify-center">
                    <button 
                      onClick={() => setShowAllActivities(true)}
                      className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-brand-blue/30 hover:text-brand-blue transition-all shadow-sm group"
                    >
                      Show All Records
                      <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                )}

                <div className="divide-y divide-gray-50">
                {recentActivities.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                    <Activity className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No activity records found matching your filters.</p>
                  </div>
                )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="records"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-8"
          >
            {/* Top Row: Configuration & Analytics */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Configuration Panel */}
              <div className="w-full lg:w-[320px] shrink-0">
                <FiltersPanel />
              </div>

              {/* Analytics Section */}
              <div className="flex-1">
                <div className="bg-white p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm h-full flex flex-col">
                  <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2 uppercase tracking-tight"><BarChart className="w-5 h-5 text-brand-blue" /> Class Performance</h3>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><BookOpen className="w-3 h-3" /> Cumulative Net Score</h4>
                  
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 flex flex-col justify-center">
                      {classChartData.length > 0 ? (
                        <div className="flex items-end gap-3 h-64 mt-4 pt-4 border-b border-gray-100">
                          {classChartData.map((cls, idx) => {
                            const maxCount = Math.max(...classChartData.map(c => c.count));
                            const height = Math.max((cls.count / maxCount) * 100, 5);
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative">
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  Score: {cls.count}
                                </div>
                                 <span className={cn("text-xs font-bold mb-1", 
                                   cls.name === 'S5' ? 'text-emerald-600' :
                                   cls.name === 'SS1' ? 'text-amber-600' :
                                   cls.name === 'SS2' ? 'text-indigo-600' :
                                   cls.name === 'D1' ? 'text-rose-600' : 'text-brand-blue'
                                 )}>{cls.count}</span>
                                <motion.div 
                                  initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: 1, ease: "easeOut" }} 
                                  className={cn(
                                    "w-full max-w-[44px] bg-gradient-to-t rounded-t-xl shadow-lg group-hover:brightness-110 transition-all cursor-pointer",
                                    cls.name === 'S5' ? 'from-emerald-500 via-emerald-400 to-emerald-300' :
                                    cls.name === 'SS1' ? 'from-amber-500 via-amber-400 to-amber-300' :
                                    cls.name === 'SS2' ? 'from-indigo-600 via-indigo-500 to-indigo-400' :
                                    cls.name === 'D1' ? 'from-rose-600 via-rose-500 to-rose-400' : 
                                    'from-brand-blue via-[#4f80ff] to-[#7ba0ff]'
                                  )}
                                />
                                <span className="text-[11px] font-black text-gray-600 uppercase tracking-tighter mt-1">
                                  {cls.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-sm text-gray-400 font-medium">No activity data available for the selected period.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Elite Top Performers - List Model */}
            <div className="bg-gradient-to-br from-orange-100/40 via-white to-white rounded-3xl border border-orange-200/40 shadow-xl shadow-orange-200/20 overflow-hidden flex flex-col">
              <div className="p-6 lg:p-8 border-b border-orange-200/30 flex items-center justify-between bg-gradient-to-r from-orange-100/80 to-orange-50/40">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-orange-600" /> 
                    ELITE TOP PERFORMERS
                  </h3>
                  <p className="text-[8px] font-medium text-gray-500 mt-0.5">Based on net score (outreach & mission 100 only)</p>
                </div>
                <span className="text-[9px] font-bold text-orange-700 uppercase tracking-widest bg-white/80 px-3 py-1 rounded-full border border-orange-200/50 shadow-sm">Top 5 Rankings</span>
              </div>
              
              <div className="divide-y divide-gray-50">
                {topStudents.map((st, idx) => {
                    const getShortClass = (cls) => {
                      if (!cls) return '';
                      const mapping = {
                        'secondary final year': 'S5',
                        'senior secondary first year': 'SS1',
                        'senior secondary final year': 'SS2',
                        'degree first year': 'D1'
                      };
                      return mapping[cls.toLowerCase()] || cls;
                    };

                    return (
                      <div key={idx} className="p-3 lg:px-8 hover:bg-white/80 transition-all duration-300 flex items-center gap-4 group relative hover:shadow-lg hover:shadow-orange-100/10 hover:-translate-y-0.5 z-0 hover:z-10">
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-full border-2 border-slate-100 overflow-hidden bg-slate-50 shadow-sm transition-transform group-hover:scale-105">
                            {st.photoURL ? (
                              <img src={st.photoURL} alt={st.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-blue-50 text-brand-blue font-black text-lg uppercase">
                                {st.name?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white font-black text-[11px] shadow-md",
                            idx === 0 ? "bg-amber-400 text-white shadow-amber-200" : 
                            idx === 1 ? "bg-slate-300 text-slate-700 shadow-slate-200" :
                            idx === 2 ? "bg-orange-300 text-orange-900 shadow-orange-200" :
                            "bg-blue-100 text-blue-600 shadow-blue-100"
                          )}>
                            {idx + 1}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 ml-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 text-[13px] sm:text-base truncate leading-tight group-hover:text-brand-blue transition-colors">{st.name}</p>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight shrink-0">
                              {getShortClass(st.className)}
                            </span>
                          </div>
                        </div>

                    <div className="text-right shrink-0 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-2xl border border-blue-200/50 shadow-md shadow-blue-100/40 transition-transform group-hover:scale-105">
                      <p className="text-base font-medium text-brand-blue leading-none">{st.score}</p>
                      <p className="text-[7px] font-medium text-brand-blue/50 tracking-widest mt-1 uppercase">net pts</p>
                    </div>
                        </div>
                      );
                })}
                {topStudents.length === 0 && (
                  <div className="w-full py-12 text-center">
                    <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No ranking data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Accepted Records List - Full Width */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 lg:p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <List className="w-5 h-5 text-brand-blue" /> 
                  Accepted List
                </h3>
                <span className="text-[9px] font-medium text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">{acceptedFilteredRecords.length} Records Found</span>
              </div>
              
              <div className="overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {acceptedFilteredRecords.length > 0 ? acceptedFilteredRecords.map(rec => {
                    const [mainTitle, ...subtitleParts] = (rec.title || '').split(' - ');
                    const subtitle = subtitleParts.join(' - ');
                    
                    const getShortClass = (cls) => {
                      if (!cls) return '';
                      const mapping = {
                        'secondary final year': 'S5',
                        'senior secondary first year': 'SS1',
                        'senior secondary final year': 'SS2',
                        'degree first year': 'D1'
                      };
                      return mapping[cls.toLowerCase()] || cls;
                    };

                    return (
                      <motion.div key={rec.id} layout className="p-3 sm:p-4 hover:bg-gray-50/80 transition-all group flex items-center gap-3 sm:gap-5">
                        
                        {/* Student & Class Info */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden bg-slate-50 shadow-sm transition-transform group-hover:scale-105">
                             {rec.photoURL ? (
                               <img src={rec.photoURL} alt={rec.studentName} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center bg-blue-50 text-brand-blue font-black text-sm sm:text-base">
                                 {rec.studentName?.charAt(0).toUpperCase() || 'S'}
                                </div>
                             )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5 min-w-0">
                              <p className="font-medium text-gray-600 truncate text-[12px] lg:text-sm leading-tight group-hover:text-brand-blue transition-colors">{rec.studentName}</p>
                              <span className="text-[10px] font-black text-brand-blue uppercase tracking-tighter bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">
                                {getShortClass(rec.className)}
                              </span>
                              {rec.studentPlace && (
                                <span className="text-[10px] font-bold text-gray-500 capitalize truncate hidden sm:inline">
                                  • {rec.studentPlace}
                                </span>
                              )}
                            </div>
                            {/* Achievement Type (Mobile Only - redundant on desktop) */}
                            <div className="flex items-center gap-2 lg:hidden">
                              <div className="w-5 h-5 rounded bg-gray-50 text-gray-400 flex items-center justify-center shrink-0 shadow-inner">
                                {rec.isMission100 ? <img src="/mission100-logo.png" alt="Mission 100" className="w-3.5 h-3.5 object-contain" /> : <Globe className="w-3 h-3" />}
                              </div>
                              <p className="font-bold text-gray-800 text-[11px] truncate">{mainTitle}</p>
                            </div>
                          </div>
                        </div>

                        {/* Title & Details (Desktop Only) */}
                        <div className="hidden lg:flex flex-1 min-w-0 border-l border-gray-100 pl-5 items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center shrink-0 shadow-inner group-hover:rotate-6 transition-transform">
                            {rec.isMission100 ? <img src="/mission100-logo.png" alt="Mission 100" className="w-5 h-5 object-contain" /> : <Globe className="w-4.5 h-4.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 text-sm truncate">{mainTitle}</p>
                            {subtitle && <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide truncate">{subtitle}</p>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0 sm:border-l sm:border-gray-100 sm:pl-5">
                          <button onClick={() => openEditModal(rec)} className="p-1.5 sm:p-2.5 text-gray-400 hover:text-brand-blue hover:bg-white rounded-lg sm:rounded-xl border border-transparent hover:border-gray-100 transition-all shadow-sm">
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button onClick={() => handleDelete(rec.id)} className="p-1.5 sm:p-2.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg sm:rounded-xl border border-transparent hover:border-gray-100 transition-all shadow-sm">
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  }) : (
                    <div className="text-center py-20 bg-gray-50/30">
                      <Globe className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No accepted records found for the current filter.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">Edit Record</h3>
                <button onClick={() => setEditingRecord(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition">
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Notes</label>
                  <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition resize-none" placeholder="Add notes..." />
                </div>
                <button onClick={handleSaveEdit} className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-lightBlue transition shadow-md hover:shadow-lg hover:-translate-y-0.5">Save Changes</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

const X = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default OutreachRecords;
