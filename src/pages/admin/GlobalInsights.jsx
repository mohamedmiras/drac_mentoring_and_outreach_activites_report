import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { getAchievementMarks } from '../../lib/scoring';
import { 
  Trophy, 
  Target, 
  Users, 
  Activity, 
  PieChart as PieIcon, 
  Award, 
  ChevronRight,
  TrendingUp,
  UserCheck,
  BarChart3,
  Crown,
  Download
} from 'lucide-react';

const TimelineChart = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">No timeline data available.</div>;
  }

  const chartData = data.length === 1 
    ? [{ date: 'Start', cumulative: 0, daily: 0 }, ...data] 
    : data;

  const maxVal = Math.max(...chartData.map(d => d.cumulative), 10);
  
  const width = 800;
  const height = 300; // Increased height for better clarity
  const paddingLeft = 50; // Increased for label space
  const paddingRight = 30;
  const paddingTop = 20;
  const paddingBottom = 40; // Space for X-axis labels if needed

  const getX = (index) => paddingLeft + (index / (chartData.length - 1)) * (width - paddingLeft - paddingRight);
  const getY = (val) => height - paddingBottom - (val / maxVal) * (height - paddingTop - paddingBottom);

  const d = `M ${getX(0)} ${getY(chartData[0].cumulative)} ` + 
            chartData.slice(1).map((point, i) => `L ${getX(i + 1)} ${getY(point.cumulative)}`).join(' ');

  const areaD = d + ` L ${getX(chartData.length - 1)} ${height - paddingBottom} L ${getX(0)} ${height - paddingBottom} Z`;

  return (
    <div className="relative w-full h-full min-h-[250px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="line-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Y-axis Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(tick => {
          const val = Math.round(maxVal * tick);
          const y = getY(maxVal * tick);
          return (
            <g key={tick}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <text x={paddingLeft - 12} y={y + 3} fontSize="11" fontWeight="600" fill="#94a3b8" textAnchor="end">{val}</text>
            </g>
          );
        })}

        <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#e2e8f0" strokeWidth="2" />

        <motion.path
          d={areaD}
          fill="url(#line-gradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        <motion.path
          d={d}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {chartData.map((point, i) => (
          <motion.circle
            key={i}
            cx={getX(i)}
            cy={getY(point.cumulative)}
            r={hoveredPoint === point ? 7 : 5}
            fill={hoveredPoint === point ? "#1d4ed8" : "#ffffff"}
            stroke="#3b82f6"
            strokeWidth="2.5"
            onMouseEnter={() => setHoveredPoint(point)}
            onMouseLeave={() => setHoveredPoint(null)}
            className="cursor-pointer transition-all duration-200"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 + (i / chartData.length) * 0.5 }}
          />
        ))}
      </svg>
      
      {hoveredPoint && (
        <div 
          className="absolute z-20 bg-slate-900 text-white p-2.5 rounded-xl shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full min-w-[120px] border border-slate-800"
          style={{ 
            left: `${(getX(chartData.indexOf(hoveredPoint)) / width) * 100}%`, 
            top: `${(getY(hoveredPoint.cumulative) / height) * 100}%`,
            marginTop: '-15px'
          }}
        >
          <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">{hoveredPoint.date}</div>
          <div className="text-sm font-black tabular-nums">{hoveredPoint.cumulative} pts</div>
          {hoveredPoint.daily > 0 && (
            <div className="text-[10px] text-green-400 font-bold mt-0.5">+{hoveredPoint.daily} added</div>
          )}
        </div>
      )}
    </div>
  );
};

const GlobalInsights = ({ isAdmin = true }) => {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState({ students: [], achievements: [] });
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const classChartRef = useRef(null);
  const eliteChartRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingElite, setIsDownloadingElite] = useState(false);

  const downloadClassChartPDF = async () => {
    if (!classChartRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const element = classChartRef.current;
      const dataUrl = await toPng(element, { 
        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        style: {
          height: 'auto',
          overflow: 'visible'
        },
        filter: (node) => {
          if (node.classList && node.classList.contains('download-exclude')) return false;
          return true;
        }
      });
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const margin = 15; // 15mm margins
      const pageWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
      const pageHeight = pdf.internal.pageSize.getHeight() - (margin * 2);
      
      // Calculate dimensions to fit A4 while maintaining aspect ratio
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * pageWidth) / imgProps.width;
      
      let finalWidth = pageWidth;
      let finalHeight = imgHeight;
      
      if (imgHeight > pageHeight) {
        finalHeight = pageHeight;
        finalWidth = (imgProps.width * pageHeight) / imgProps.height;
      }
      
      // Center the image within the margins
      const x = margin + (pageWidth - finalWidth) / 2;
      const y = margin + (pageHeight - finalHeight) / 2;
      
      pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
      pdf.save('Class-wise_Performance.pdf');
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('Failed to download PDF: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadElitePDF = async () => {
    if (!eliteChartRef.current || isDownloadingElite) return;
    setIsDownloadingElite(true);
    try {
      const element = eliteChartRef.current;
      const dataUrl = await toPng(element, { 
        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        style: {
          height: 'auto',
          overflow: 'visible'
        },
        filter: (node) => {
          if (node.classList && node.classList.contains('download-exclude')) return false;
          return true;
        }
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const margin = 15; // 15mm margins
      const pageWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
      const pageHeight = pdf.internal.pageSize.getHeight() - (margin * 2);
      
      // Calculate dimensions to fit A4 while maintaining aspect ratio
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgWidth = (imgProps.width * pageHeight) / imgProps.height;
      
      let finalWidth = imgWidth;
      let finalHeight = pageHeight;
      
      if (imgWidth > pageWidth) {
        finalWidth = pageWidth;
        finalHeight = (imgProps.height * pageWidth) / imgProps.width;
      }
      
      // Center the image within the margins
      const x = margin + (pageWidth - finalWidth) / 2;
      const y = margin + (pageHeight - finalHeight) / 2;
      
      pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
      pdf.save('Elite_Performers_Leaderboard.pdf');
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('Failed to download PDF: ' + err.message);
    } finally {
      setIsDownloadingElite(false);
    }
  };

  const getTimePeriodText = () => {
    if (selectedYear === 'All') return 'All Time';
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (selectedMonth === 'All') return `Year ${selectedYear}`;
    return `${monthNames[parseInt(selectedMonth)]} ${selectedYear}`;
  };
  const [classFilter, setClassFilter] = useState('All');
  const [hoveredLang, setHoveredLang] = useState(null);
  
  const [data, setData] = useState({
    totalStudents: 0,
    totalPoints: 0,
    totalAchievementsCount: 0,
    topStudents: [],
    classStats: [],
    categoryStats: [],
    languageStats: [],
    mentorStats: [],
    timelineStats: []
  });

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      const studentsSnap = await getDocs(collection(db, 'students'));
      const achievementsSnap = await getDocs(collection(db, 'achievements'));
      const students = [];
      const achievements = [];

      studentsSnap.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
      achievementsSnap.forEach(doc => achievements.push({ id: doc.id, ...doc.data() }));

      setRawData({ students, achievements });
      applyFilters(students, achievements, selectedMonth, selectedYear, classFilter);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (students, achievements, month, year, cFilter) => {
    let startDate = null;
    let endDate = null;

    if (year !== 'All') {
      if (month !== 'All') {
        startDate = new Date(parseInt(year), parseInt(month), 1);
        endDate = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59);
      } else {
        startDate = new Date(parseInt(year), 0, 1);
        endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      }
    }

    // Filter Students by Class
    const filteredStudents = cFilter === 'All' 
      ? students 
      : students.filter(s => s.className === cFilter);
    
    const validStudentIds = new Set(filteredStudents.map(s => s.id));

    const filteredAchievements = achievements.filter(ach => {
      // Must belong to a valid student in the current class filter
      if (!validStudentIds.has(ach.studentId)) return false;

      if (!startDate || !endDate) return true; // All Time (year is 'All')
      
      const achDateStr = ach.date || ach.createdAt;
      if (!achDateStr) return false; 
      
      const normalizedDateStr = (achDateStr.length === 7 && achDateStr.includes('-')) 
        ? `${achDateStr}-01` 
        : achDateStr;
        
      const achDate = new Date(normalizedDateStr);
      achDate.setHours(0, 0, 0, 0);

      return achDate >= startDate && achDate <= endDate;
    });

    const studentScores = {};
    const categoryMap = {};
    const languageMap = {};
    const timelineMap = {};
    const standardLangs = ['Arabic', 'English', 'Malayalam'];
    const urduHindi = ['Urdu', 'Hindi'];
    let achievementsWithLanguage = 0;

    filteredAchievements.forEach(ach => {
       const achMarks = getAchievementMarks(ach);
       
       // Score mapping
       if (ach.studentId) {
         studentScores[ach.studentId] = (studentScores[ach.studentId] || 0) + achMarks;
       }

       // Category stats
       const type = ach.type || 'Other';
       categoryMap[type] = (categoryMap[type] || 0) + 1;

       // Language stats
       if (ach.language) {
         achievementsWithLanguage++;
         let lang = 'Other';
         if (standardLangs.includes(ach.language)) {
           lang = ach.language;
         } else if (urduHindi.includes(ach.language)) {
           lang = 'Urdu / Hindi';
         }
         languageMap[lang] = (languageMap[lang] || 0) + 1;
       }

       // Timeline stats
       const achDateStr = ach.date || ach.createdAt;
       if (achDateStr) {
         const normalizedDateStr = (achDateStr.length === 7 && achDateStr.includes('-')) 
           ? `${achDateStr}-01` 
           : achDateStr;
         const dateKey = normalizedDateStr.substring(0, 10);
         timelineMap[dateKey] = (timelineMap[dateKey] || 0) + achMarks;
       }
    });

    let totalPts = 0;
    
    // Enforce class order and presence
    const orderedClasses = [
      'Secondary Final Year',
      'Senior Secondary First Year',
      'Senior Secondary Final Year',
      'Degree First Year'
    ];
    const classMap = {};
    orderedClasses.forEach(c => {
      classMap[c] = { name: c, totalMarks: 0, count: 0 };
    });
    
    const mentorMap = {};
    const processedStudents = [];

    filteredStudents.forEach(s => {
      const achievementTotal = studentScores[s.id] || 0;
      const score = Number(Math.max(0, achievementTotal - (s.minusPoints || 0)).toFixed(2));
      processedStudents.push({ ...s, tempScore: score });

      if (score > 0) totalPts += score;

      if (s.className) {
        if (!classMap[s.className]) classMap[s.className] = { name: s.className, totalMarks: 0, count: 0 };
        classMap[s.className].totalMarks = Number((classMap[s.className].totalMarks + score).toFixed(2));
        classMap[s.className].count += 1;
      }

      if (s.mentorName) {
        const mName = s.mentorName.trim();
        if (!mentorMap[mName]) mentorMap[mName] = { name: mName, totalMarks: 0, studentCount: 0 };
        mentorMap[mName].totalMarks += score;
        mentorMap[mName].studentCount += 1;
      }
    });

    const sortedDates = Object.keys(timelineMap).sort();
    let cumulative = 0;
    const timelineStats = sortedDates.map(date => {
      cumulative += timelineMap[date];
      return { date, cumulative, daily: timelineMap[date] };
    });

    const finalClassStats = orderedClasses.map(c => classMap[c]);
    Object.keys(classMap).forEach(k => {
      if (!orderedClasses.includes(k)) finalClassStats.push(classMap[k]);
    });

    setData({
      totalStudents: filteredStudents.length,
      totalPoints: Number(totalPts.toFixed(2)),
      totalAchievementsCount: filteredAchievements.length,
      topStudents: [...processedStudents]
        .filter(s => s.tempScore > 0)
        .sort((a,b) => b.tempScore - a.tempScore)
        .slice(0, 5),
      classStats: finalClassStats,
      categoryStats: Object.keys(categoryMap).map(type => ({
        type,
        count: categoryMap[type],
        percentage: filteredAchievements.length > 0 ? (categoryMap[type] / filteredAchievements.length) * 100 : 0
      })).sort((a,b) => b.count - a.count),
      languageStats: Object.keys(languageMap).map(lang => ({
        label: lang,
        count: languageMap[lang],
        percentage: achievementsWithLanguage > 0 ? (languageMap[lang] / achievementsWithLanguage) * 100 : 0
      })).sort((a,b) => b.count - a.count),
      mentorStats: Object.values(mentorMap).sort((a,b) => b.totalMarks - a.totalMarks).slice(0, 12),
      timelineStats,
      totalStudentsCount: filteredStudents.length
    });
  };

  useEffect(() => {
    if (rawData.students.length > 0) {
      applyFilters(rawData.students, rawData.achievements, selectedMonth, selectedYear, classFilter);
    }
  }, [selectedMonth, selectedYear, classFilter]);

  const getShortClassName = (fullName) => {
    if (!fullName) return '';
    const mapping = {
      'secondary final year': 'S5',
      'senior secondary first year': 'SS1',
      'senior secondary final year': 'SS2',
      'degree first year': 'D1'
    };
    return mapping[fullName.toLowerCase()] || fullName;
  };

  const chartColors = [
    '#3b82f6', // Bright Blue
    '#10b981', // Emerald Green
    '#f59e0b', // Amber/Orange
    '#8b5cf6', // Violet
    '#f43f5e', // Rose/Red
    '#06b6d4', // Cyan
    '#1e3a8a'  // Oxford Blue
  ];

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Campus Insights</h1>
        <p className="text-gray-500 mt-1">Holistic view of performance and work distribution.</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-8 max-w-7xl mx-auto items-center">
        {/* All Time Reset Button */}
        <button
          onClick={() => { setSelectedMonth('All'); setSelectedYear('All'); }}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
            selectedYear === 'All' 
              ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' 
              : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-100 hover:bg-gray-50 shadow-sm'
          }`}
        >
          All Time Record
        </button>

        {/* Month Dropdown */}
        <div className="bg-white px-2 py-1 rounded-xl border border-gray-100 shadow-sm">
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-4 py-2 text-sm font-bold text-gray-700 bg-transparent outline-none cursor-pointer"
          >
            <option value="All">All Months</option>
            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>
        </div>

        {/* Year Dropdown */}
        <div className="bg-white px-2 py-1 rounded-xl border border-gray-100 shadow-sm">
          <select 
            value={selectedYear} 
            onChange={e => setSelectedYear(e.target.value)}
            className="px-4 py-2 text-sm font-bold text-gray-700 bg-transparent outline-none cursor-pointer"
          >
            <option value="All">All Years</option>
            {["2025", "2026", "2027", "2028"].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-4 items-center ml-auto">
          <div className="bg-white px-2 py-1 rounded-xl border border-gray-100 shadow-sm self-start">
            <select 
              value={classFilter} 
              onChange={e => setClassFilter(e.target.value)}
              className="px-4 py-2 text-sm font-bold text-gray-700 bg-transparent outline-none cursor-pointer"
            >
              <option value="All">All Classes</option>
              <option value="Secondary Final Year">Secondary Final Year (S5)</option>
              <option value="Senior Secondary First Year">Senior Secondary First Year (SS1)</option>
              <option value="Senior Secondary Final Year">Senior Secondary Final Year (SS2)</option>
              <option value="Degree First Year">Degree First Year (D1)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 max-w-7xl mx-auto">
        {/* Elite Leaderboard */}
        <div className="lg:col-span-2 relative group">
          <div ref={eliteChartRef} className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 overflow-hidden h-full flex flex-col relative">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-brand-blue/10 via-brand-green/10 to-yellow-500/10 pointer-events-none"></div>
            

            
            <div className="p-6 md:p-8 border-b border-gray-100/50 flex items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-sm" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Elite 5 Performers</h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Global Top Rankings</p>
                </div>
              </div>

              {/* Download Button - Integrated */}
              <button 
                onClick={downloadElitePDF}
                disabled={isDownloadingElite}
                className={`download-exclude p-2 rounded-xl transition-all ${isDownloadingElite ? 'opacity-50' : 'text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10'}`}
                title="Download Leaderboard PDF"
              >
                {isDownloadingElite ? (
                  <div className="w-5 h-5 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
                ) : (
                  <Download className="w-6 h-6" />
                )}
              </button>
            </div>

            <div className="p-6 md:p-8 flex-1 bg-gray-50/30 overflow-y-auto relative z-10">
              <div className="space-y-3">
                {data.topStudents.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 font-medium">No students ranked yet.</div>
                ) : (
                  data.topStudents.map((student, i) => {
                    const isTop3 = i < 3;
                    const rankColors = [
                      'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-lg shadow-yellow-500/30 border border-yellow-200',
                      'bg-gradient-to-br from-gray-200 to-gray-400 text-white shadow-lg shadow-gray-400/30 border border-gray-200',
                      'bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-lg shadow-orange-500/30 border border-orange-200'
                    ];
                    const bgColors = [
                      'bg-yellow-50/60 border-yellow-100/50',
                      'bg-gray-50 border-gray-200/50',
                      'bg-orange-50/40 border-orange-100/50'
                    ];
                    
                    return (
                      <motion.div 
                        key={student.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, ease: "easeOut" }}
                        className={`flex items-center justify-between p-4 md:p-5 rounded-2xl border transition-all duration-300 group hover:-translate-y-[2px] hover:shadow-lg ${isTop3 ? bgColors[i] : 'bg-white border-gray-100 hover:border-brand-blue/30'}`}
                      >
                        <div className="flex items-center gap-4 md:gap-5">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg transition-colors duration-300 ${isTop3 ? rankColors[i] : 'bg-gray-100 text-gray-400 border border-gray-200 group-hover:bg-brand-blue group-hover:text-white group-hover:border-brand-blue'}`}>
                            {i + 1}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-gray-900 text-lg leading-tight mb-1">{student.fullName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-100 uppercase tracking-widest shadow-sm">
                                {getShortClassName(student.className)}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                ADM: {student.admissionNumber}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end justify-center">
                          <span className="text-[8px] font-black text-gray-400 tracking-widest mb-0.5">net pts</span>
                          <span className={`text-2xl font-black tabular-nums tracking-tight ${i === 0 ? 'text-yellow-600' : i === 1 ? 'text-gray-600' : i === 2 ? 'text-orange-600' : 'text-brand-blue'}`}>
                            {student.tempScore || 0}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Work & Language Distribution Column */}
        <div className="lg:col-span-1 flex flex-col gap-6 h-full min-h-0">
          
          {/* Categorical Distribution Bar Graph */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-blue" />
              Work Distribution
            </h3>
            
            <div className="space-y-5 flex-1 overflow-y-auto pr-2">
               {data.categoryStats.map((stat, i) => (
                 <div key={i} className="group space-y-1.5">
                   <div className="flex justify-between text-[11px] items-end">
                     <span 
                       className="font-bold truncate transition-colors" 
                       style={{ color: chartColors[i % chartColors.length] }}
                     >
                       {stat.type}
                     </span>
                     <span className="font-bold text-gray-900">{stat.count}</span>
                   </div>
                   <div className="bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner border border-gray-50">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.percentage}%` }}
                        transition={{ duration: 1, delay: i * 0.05 }}
                        className="h-full rounded-full shadow-sm"
                        style={{ backgroundColor: chartColors[i % chartColors.length] }}
                      />
                   </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Language Distribution Pie Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 shrink-0 flex flex-col">
            <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-brand-blue" />
              Linguistic Contribution
            </h3>

            {data.languageStats.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-6">
                <p className="text-xs font-medium">No language data</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* SVG Donut Chart - Responsive Size */}
                <div className="relative w-36 h-36 md:w-32 md:h-32 mx-auto">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 overflow-visible">
                    {(() => {
                      let accumulatedPercentage = 0;
                      const radius = 35;
                      const circumference = 2 * Math.PI * radius;
                      
                      return data.languageStats.map((stat, i) => {
                        const dashArray = `${(stat.percentage / 100) * circumference} ${circumference}`;
                        const startOffset = -(accumulatedPercentage / 100) * circumference;
                        accumulatedPercentage += stat.percentage;
                        const color = chartColors[i % chartColors.length];
                        
                        return (
                          <motion.circle
                            key={i}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke={color}
                            strokeWidth={hoveredLang?.label === stat.label ? "22" : "18"}
                            strokeDasharray={dashArray}
                            strokeDashoffset={startOffset}
                            initial={{ strokeDasharray: `0 ${circumference}` }}
                            animate={{ 
                              strokeDasharray: dashArray,
                              strokeWidth: hoveredLang?.label === stat.label ? 22 : 18
                            }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            onMouseEnter={() => setHoveredLang(stat)}
                            onMouseLeave={() => setHoveredLang(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setHoveredLang(hoveredLang?.label === stat.label ? null : stat);
                            }}
                            strokeLinecap="butt"
                            className="cursor-pointer transition-all touch-manipulation"
                          />
                        );
                      });
                    })()}
                  </svg>
                  
                  {/* Minimal Floating Tooltip */}
                  {hoveredLang && (
                    <div 
                      className="absolute z-10 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded-md shadow-lg pointer-events-none flex items-center gap-1.5 whitespace-nowrap"
                      style={(() => {
                        // Find index of hovered lang to get its exact accumulated position
                        const stats = data.languageStats;
                        const idx = stats.findIndex(s => s.label === hoveredLang.label);
                        if (idx === -1) return { display: 'none' };

                        let accBefore = 0;
                        for (let j = 0; j < idx; j++) accBefore += stats[j].percentage;
                        
                        // Center angle of this slice (SVG is rotated -90deg, so 0% is at the top)
                        const centerAngle = (accBefore + (hoveredLang.percentage / 2)) * 3.6 - 90;
                        const rad = (centerAngle * Math.PI) / 180;
                        const dist = window.innerWidth < 768 ? 62 : 58; // Adjust distance for mobile
                        
                        return {
                          left: `${50 + dist * Math.cos(rad)}%`,
                          top: `${50 + dist * Math.sin(rad)}%`,
                          transform: 'translate(-50%, -50%)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        };
                      })()}
                    >
                      <span className="font-medium text-[10px]">{Math.round(hoveredLang.percentage)}%</span>
                    </div>
                  )}

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[20px] font-black text-gray-900 leading-none">
                      {data.languageStats.reduce((acc, curr) => acc + curr.count, 0)}
                    </span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">Total</span>
                  </div>
                </div>

                {/* Legend - More compact */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {data.languageStats.map((stat, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between group min-w-0 cursor-pointer transition-all ${hoveredLang?.label === stat.label ? 'scale-105' : 'opacity-70 hover:opacity-100'}`}
                      onMouseEnter={() => setHoveredLang(stat)}
                      onMouseLeave={() => setHoveredLang(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHoveredLang(hoveredLang?.label === stat.label ? null : stat);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: chartColors[i % chartColors.length] }}
                        />
                        <span className="text-[11px] font-medium text-gray-500 truncate">{stat.label}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-700 ml-1">{stat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Class-wise Performance - Highlighted Full Width */}
      <div className="mb-8 max-w-7xl mx-auto relative group">
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-brand-blue/5 to-transparent rounded-bl-full pointer-events-none"></div>
          
          <div ref={classChartRef} className="p-8 md:p-10 bg-white relative z-10">


            <div className="mb-10 md:mb-12 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className="p-1.5 bg-brand-blue/10 rounded-lg shrink-0">
                   <BarChart3 className="w-5 h-5 text-brand-blue" />
                 </div>
                 <div>
                   <h3 className="text-xl md:text-2xl font-black text-gray-900">Class-wise Performance</h3>
                   <p className="text-sm font-bold text-gray-400 mt-2 tracking-wide uppercase ml-1">
                      Time Period: {getTimePeriodText()}
                   </p>
                 </div>
              </div>

              {/* Download Button - Integrated */}
              <button 
                onClick={downloadClassChartPDF}
                disabled={isDownloading}
                className={`download-exclude p-2 rounded-xl transition-all ${isDownloading ? 'opacity-50' : 'text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10'}`}
                title="Download PDF"
              >
                {isDownloading ? (
                  <div className="w-5 h-5 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
                ) : (
                  <Download className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Vertical Column Chart */}
            <div className="flex items-end justify-around gap-2 md:gap-4 h-64 md:h-72 px-2 md:px-4 mb-6">
              {data.classStats.map((stat, i) => {
                const maxVal = Math.max(...data.classStats.map(s => s.totalMarks), 1);
                const heightPct = Math.max(5, (stat.totalMarks / maxVal) * 100);
                const colColors = [
                  'from-blue-500 to-blue-400 shadow-blue-500/40', 
                  'from-emerald-500 to-emerald-400 shadow-emerald-500/40', 
                  'from-amber-500 to-amber-400 shadow-amber-500/40', 
                  'from-violet-500 to-violet-400 shadow-violet-500/40'
                ];
                const textColors = ['text-blue-600', 'text-emerald-600', 'text-amber-600', 'text-violet-600'];
                
                return (
                  <div key={i} className="flex flex-col items-center justify-end flex-1 h-full group/col">
                    {/* Point value on top */}
                    <span className={`text-sm md:text-xl font-black mb-2 md:mb-3 transition-all duration-300 transform group-hover/col:-translate-y-1 ${textColors[i % textColors.length]}`}>
                      {stat.totalMarks}
                    </span>
                    
                    {/* The pillar wrapper */}
                    <div className="w-full max-w-[45px] sm:max-w-[80px] md:max-w-[140px] bg-gray-50 rounded-t-2xl md:rounded-t-3xl rounded-b-lg md:rounded-b-xl p-1 md:p-2 h-full relative flex items-end border border-gray-100 shadow-inner">
                      <motion.div
                        className={`w-full rounded-t-xl md:rounded-t-2xl rounded-b-md md:rounded-b-lg bg-gradient-to-t shadow-lg ${colColors[i % colColors.length]}`}
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 1.2, delay: i * 0.1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-around gap-2 md:gap-4 px-2 md:px-4 border-t border-gray-100 pt-6">
              {data.classStats.map((stat, i) => {
                const textColors = ['text-blue-600', 'text-emerald-600', 'text-amber-600', 'text-violet-600'];
                return (
                  <div key={i} className="flex-1 text-center">
                    <span className={`text-[10px] sm:text-sm md:text-lg font-black uppercase tracking-widest ${textColors[i % textColors.length]}`}>
                      {getShortClassName(stat.name)}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {data.classStats.length === 0 && (
              <div className="text-center py-12 text-gray-400 font-medium">No class performance data available for this period.</div>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-8 max-w-7xl mx-auto">
          {/* Mentor Performance Bar Graph */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
             <h3 className="text-lg font-bold text-gray-900 mb-8 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-500" />
                Mentor Performance Index
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {data.mentorStats.length === 0 ? (
                  <p className="text-center py-10 text-gray-400 text-sm md:col-span-2">No mentor data yet.</p>
                ) : (
                  data.mentorStats.map((stat, i) => (
                    <div key={i} className="space-y-2">
                       <div className="flex justify-between text-sm items-end pb-1">
                          <span className="font-bold text-gray-700">{stat.name}</span>
                          <span className="font-bold text-gray-400 text-xs">{stat.totalMarks} pts</span>
                       </div>
                       <div className="bg-gray-100 rounded-full h-3.5 overflow-hidden shadow-inner border border-gray-50">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(stat.totalMarks / (data.mentorStats[0]?.totalMarks || 1)) * 100}%` }}
                            transition={{ duration: 1.2, delay: i * 0.05 }}
                            className="h-full bg-gradient-to-r from-brand-blue to-brand-lightBlue rounded-full shadow-sm"
                          />
                       </div>
                    </div>
                  ))
                )}
             </div>
             <p className="mt-8 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center border-t border-gray-50 pt-6">Visual comparison of mentorship group contributions</p>
          </div>
        </div>
      )}

      {/* Cumulative Timeline Chart */}
      <div className="mb-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
           <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-blue" />
              Cumulative Date-wise Progress
           </h3>
           <p className="text-xs text-gray-500 mb-8 ml-7">Monitor institutional growth trajectory and point accumulation trends over time.</p>
           
           <div className="h-64 w-full pt-4">
              <TimelineChart data={data.timelineStats} />
           </div>
        </div>
      </div>
    </div>
  );
};

const GlobalInsightsWrapper = () => (
  <AdminLayout>
    <GlobalInsights />
  </AdminLayout>
);

export default GlobalInsightsWrapper;
export { GlobalInsights as InsightsContent };
