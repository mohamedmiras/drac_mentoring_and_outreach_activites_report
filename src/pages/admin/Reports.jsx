import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FileText, Filter, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '../../contexts/SettingsContext';
import { getAchievementMarks } from '../../lib/scoring';

const Reports = () => {
  const { missionName, loadingSettings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [studentsMap, setStudentsMap] = useState({});
  const [classList, setClassList] = useState([]);
  
  // Main Filters
  const [reportType, setReportType] = useState('Monthly');
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  const [semesterName, setSemesterName] = useState('Semester 1');
  const [semesterStart, setSemesterStart] = useState('');
  const [semesterEnd, setSemesterEnd] = useState('');
  
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Optional Filters
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedActivityFilter, setSelectedActivityFilter] = useState('All');

  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const achievementTypes = [
    'Publication', 'Presentation', 'Workshop / Seminar Attendance', 
    'Contest', 'Poster', 'Public Speech', 'Web Development', 'Drawing', 'Other'
  ];

  const classPriority = {
    'secondary final year': 1,
    'senior secondary first year': 2,
    'senior secondary final year': 3,
    'degree first year': 4
  };

  const months = [
    { v: '01', l: 'January' }, { v: '02', l: 'February' }, { v: '03', l: 'March' },
    { v: '04', l: 'April' }, { v: '05', l: 'May' }, { v: '06', l: 'June' },
    { v: '07', l: 'July' }, { v: '08', l: 'August' }, { v: '09', l: 'September' },
    { v: '10', l: 'October' }, { v: '11', l: 'November' }, { v: '12', l: 'December' }
  ];

  // Generate Year list
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Array(5), (val, index) => currentYear - index);

  useEffect(() => {
    // Fetch students once to map IDs to Names and get Class list
    const fetchStudents = async () => {
      try {
        const snap = await getDocs(collection(db, 'students'));
        const map = {};
        const classes = new Set();
        snap.forEach(doc => {
          const data = doc.data();
          map[doc.id] = { 
            name: data.fullName, 
            className: data.className,
            admissionNumber: parseInt(data.admissionNumber) || 99999
          };
          if (data.className) classes.add(data.className);
        });
        setStudentsMap(map);
        setClassList(Array.from(classes).sort());
      } catch (err) {
        console.error("Failed to load students", err);
      }
    };
    fetchStudents();
  }, []);

  const getQueryDateBounds = () => {
    let start, end;
    if (reportType === 'Monthly') {
      start = new Date(`${year}-${month}-01T00:00:00.000Z`);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (reportType === 'Yearly') {
      start = new Date(`${year}-01-01T00:00:00.000Z`);
      end = new Date(`${year}-12-31T23:59:59.999Z`);
    } else if (reportType === 'Semester') {
      if (!semesterStart || !semesterEnd) throw new Error("Please select semester start and end dates.");
      start = new Date(`${semesterStart}T00:00:00.000Z`);
      end = new Date(`${semesterEnd}T23:59:59.999Z`);
    } else if (reportType === 'Custom Period') {
      if (!customStart || !customEnd) throw new Error("Please select custom start and end dates.");
      start = new Date(`${customStart}T00:00:00.000Z`);
      end = new Date(`${customEnd}T23:59:59.999Z`);
    } else if (reportType === 'Total Record') {
      start = new Date(0); // Beginning of time
      end = new Date(); // Right now
    }
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const getReportTitle = () => {
    if (reportType === 'Monthly') return `${months.find(m => m.v === month)?.l} ${year}`;
    if (reportType === 'Yearly') return `Year ${year}`;
    if (reportType === 'Semester') return semesterName;
    if (reportType === 'Custom Period') return `${customStart} to ${customEnd}`;
    if (reportType === 'Total Record') return 'All-Time Records';
    return 'Selected Period';
  };

  const handleGenerate = async () => {
    setLoading(true);
    setHasSearched(false);
    try {
      const { start, end } = getQueryDateBounds();
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();
      
      // Fetch all achievements to ensure we catch backdated events
      const achRef = collection(db, 'achievements');
      const snap = await getDocs(achRef);
      let fetched = [];
      
      snap.forEach(doc => {
        const data = doc.data();
        // Priority: Event Date -> Created Date
        const effectiveDateStr = data.date || data.createdAt;
        if (!effectiveDateStr) return;
        
        const effectiveDate = new Date(effectiveDateStr).getTime();
        
        if (effectiveDate >= startTime && effectiveDate <= endTime) {
          fetched.push({ id: doc.id, ...data, parsedDate: effectiveDateStr });
        }
      });

      // Local Filtering (High-efficiency, zero-config indexing)
      if (selectedStudent) fetched = fetched.filter(a => a.studentId === selectedStudent);
      if (selectedType) fetched = fetched.filter(a => a.type === selectedType);
      if (selectedClass) {
        fetched = fetched.filter(a => {
          const s = studentsMap[a.studentId];
          return s && s.className === selectedClass;
        });
      }
      if (selectedActivityFilter === 'Outreach Activities') {
        fetched = fetched.filter(a => a.isOutreach);
      }
      if (selectedActivityFilter === missionName || selectedActivityFilter === 'Mission 100') {
        fetched = fetched.filter(a => a.isMission100);
      }

      // Sort locally: 
      // 1. Class Priority (S5 -> SS1 -> SS2 -> D1)
      // 2. Admission Number (Ascending)
      // 3. Date (Descending)
      fetched.sort((a, b) => {
        const sA = studentsMap[a.studentId];
        const sB = studentsMap[b.studentId];
        
        if (!sA || !sB) return 0;
        
        const pA = classPriority[(sA.className || '').toLowerCase()] || 99;
        const pB = classPriority[(sB.className || '').toLowerCase()] || 99;
        
        if (pA !== pB) return pA - pB;
        if (sA.admissionNumber !== sB.admissionNumber) return sA.admissionNumber - sB.admissionNumber;
        
        return new Date(b.parsedDate) - new Date(a.parsedDate);
      });
      
      setResults(fetched);
      setHasSearched(true);
    } catch (err) {
      alert(err.message || 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const exportToWord = () => {
    setGenerating(true);
    
    // Group results by student for the report layout, preserving the sorted order
    const groupedList = [];
    const studentIndexMap = {};

    results.forEach(curr => {
      if (studentIndexMap[curr.studentId] === undefined) {
        studentIndexMap[curr.studentId] = groupedList.length;
        groupedList.push({ 
          studentId: curr.studentId, 
          student: studentsMap[curr.studentId],
          achievements: [] 
        });
      }
      groupedList[studentIndexMap[curr.studentId]].achievements.push(curr);
    });

    let htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Campus Achievement Report</title>
        <style>
          body { font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; }
          h1 { color: #1e3a8a; text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 5px; }
          .period { text-align: center; font-size: 14px; color: #666; margin-bottom: 30px; }
          h2 { color: #10b981; margin-top: 30px; margin-bottom: 2px; }
          .class-name { font-size: 14px; font-style: italic; color: #666; margin-bottom: 15px; }
          .achievement { margin-bottom: 20px; padding-left: 5px; }
          .bullet { color: #000000; font-weight: bold; margin-right: 5px; font-size: 18px; }
          .type { font-weight: bold; font-size: 16px; margin: 0 0 2px 0; }
          .subtype { font-style: italic; color: #4b5563; font-size: 13px; margin: 5px 0 5px 20px; }
          .date { font-size: 12px; color: #888; margin: 0 0 5px 20px; }
          .desc { margin: 0 0 0 20px; }
        </style>
      </head>
      <body>
        <h1>Campus Achievement Report</h1>
        <div class="period">${getReportTitle()}</div>
    `;

    groupedList.forEach(group => {
      const { student, achievements } = group;
      if (!student) return;
      
      htmlContent += `
        <h2>${student.name}</h2>
        <div class="class-name">Class: ${student.className || 'N/A'} (ADM: ${student.admissionNumber})</div>
      `;

      achievements.forEach(ach => {
        const displayDate = new Date(ach.parsedDate).toLocaleDateString('en-GB');
        htmlContent += `
          <div class="achievement">
            <p class="type"><span class="bullet">&bull;</span> ${ach.type}</p>
            ${ach.specificType ? `<p class="subtype">${ach.specificType}</p>` : ''}
            <p class="date">Date: ${displayDate}</p>
            <p class="desc">${ach.note || 'No description provided.'}</p>
          </div>
        `;
      });
    });

    htmlContent += `</body></html>`;

    // Create Blob and Download
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Achievement_Report_${getReportTitle().replace(/ /g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setGenerating(false);
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-blue" />
          Achievement Reports
        </h1>
        <p className="text-gray-500 mt-1">Generate and export customizable achievement records.</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Filters Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-4 mb-4">
              <Filter className="w-5 h-5 text-gray-400" />
              Report Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Report Type</label>
                <select 
                  value={reportType} 
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue/30 outline-none bg-slate-50 hover:bg-white transition-all shadow-sm font-bold text-slate-700"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Semester">Semester</option>
                  <option value="Custom Period">Custom Period</option>
                  <option value="Total Record">Total Record</option>
                </select>
              </div>

              {/* Dynamic Period Inputs */}
              {reportType === 'Monthly' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Month</label>
                    <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue/30 outline-none bg-slate-50">
                      {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Year</label>
                    <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue/30 outline-none bg-slate-50">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {reportType === 'Yearly' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Year</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}

              {reportType === 'Semester' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Semester Name</label>
                    <input type="text" placeholder="e.g. Semester 1" value={semesterName} onChange={(e) => setSemesterName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
                      <input type="date" value={semesterStart} onChange={(e) => setSemesterStart(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
                      <input type="date" value={semesterEnd} onChange={(e) => setSemesterEnd(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {reportType === 'Custom Period' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">From</label>
                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">To</label>
                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>
              )}

              <hr className="border-gray-100 my-4" />

              {/* Optional Filters */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Class (Optional)</label>
                <select 
                  value={selectedClass} 
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedStudent(''); // Reset student when class changes
                  }} 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">All Classes</option>
                  {classList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Student (Optional)</label>
                <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                  <option value="">All Students</option>
                  {Object.entries(studentsMap)
                    .filter(([id, s]) => selectedClass === '' || s.className === selectedClass)
                    .map(([id, s]) => (
                    <option key={id} value={id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Achievement Type (Optional)</label>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue/30 outline-none bg-slate-50 hover:bg-white transition-all shadow-sm">
                  <option value="">All Types</option>
                  {achievementTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Activity Category (Optional)</label>
                <select value={selectedActivityFilter} onChange={(e) => setSelectedActivityFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-blue/30 outline-none bg-slate-50 hover:bg-white transition-all shadow-sm font-bold text-slate-700">
                  <option value="All">All Activities</option>
                  <option value="Outreach Activities">Outreach Activities</option>
                  <option value={missionName}>{missionName}</option>
                </select>
              </div>

            </div>

            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="mt-6 w-full py-3.5 bg-gradient-to-r from-brand-blue to-[#2563eb] text-white rounded-xl font-black tracking-wide hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Generating...' : 'Generate Preview'}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full min-h-[500px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">Report Preview</h2>
                  {hasSearched && (
                    <span className="text-[10px] font-extrabold text-brand-blue uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                      {results.length} Records
                    </span>
                  )}
                </div>
              </div>

              {hasSearched && results.length > 0 && (
                <button 
                  onClick={exportToWord}
                  disabled={generating}
                  className="flex items-center justify-center gap-3 px-8 py-3 bg-[#2b5797] text-white rounded-xl font-bold hover:bg-[#1e3e6d] transition-all shadow-lg shadow-blue-100/50 disabled:opacity-50 min-w-[200px]"
                >
                  <FileText className="w-5 h-5" />
                  <span className="whitespace-nowrap">{generating ? 'Processing...' : 'Export to Word'}</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {!hasSearched ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                  <FileText className="w-12 h-12 opacity-20" />
                  <p>Select filters and click Generate Preview</p>
                </div>
              ) : results.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <p>No achievements found for the selected criteria.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 border-b-2 border-brand-blue inline-block pb-2 mb-2">Campus Achievement Report</h1>
                    <p className="text-gray-500 text-sm">{getReportTitle()}</p>
                  </div>

                  {/* Grouped rendering for Preview */}
                  {(() => {
                    const groupedList = [];
                    const studentIndexMap = {};
                    
                    results.forEach(curr => {
                      if (studentIndexMap[curr.studentId] === undefined) {
                        studentIndexMap[curr.studentId] = groupedList.length;
                        groupedList.push({ 
                          studentId: curr.studentId, 
                          student: studentsMap[curr.studentId],
                          achievements: [] 
                        });
                      }
                      groupedList[studentIndexMap[curr.studentId]].achievements.push(curr);
                    });
                    
                    return groupedList.map(group => {
                      const { studentId, student, achievements } = group;
                      if (!student) return null;
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={studentId} 
                          className="mb-8 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
                        >
                          {/* Highlighted Student Info Header */}
                          <div className="bg-gradient-to-br from-blue-100/40 via-blue-50/20 to-white px-6 py-5 border-b border-blue-100 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-blue font-black text-lg border border-gray-100 flex-shrink-0 overflow-hidden">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h2 className="text-lg font-black text-gray-900 leading-tight truncate">{student.name}</h2>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest bg-brand-blue/5 px-2 py-0.5 rounded-md border border-brand-blue/10">
                                  Class: {student.className || 'N/A'}
                                </p>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                  ADM: {student.admissionNumber}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Achievements Timeline */}
                          <div className="p-6">
                            <div className="space-y-6">
                              {achievements.map(ach => (
                                <div key={ach.id} className="relative pl-6 flex gap-3">
                                  {/* Bullet Dot */}
                                  <span className="w-2.5 h-2.5 mt-2 rounded-full bg-black shrink-0 shadow-sm shadow-black/20"></span>
                                  
                                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-brand-blue/30 hover:shadow-md transition-all flex-1">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                      <h3 className="font-bold text-gray-900 text-base">
                                        {ach.type} {ach.specificType ? <span className="text-gray-500 font-medium">- {ach.specificType}</span> : ''}
                                      </h3>
                                      <span className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded-md tracking-wide" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {new Date(ach.parsedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </span>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed">{ach.note || 'No description provided.'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default Reports;
