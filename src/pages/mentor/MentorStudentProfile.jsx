import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, increment } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { getAchievementMarks } from '../../lib/scoring';
import { ArrowLeft, User, Award, Plus, Calendar, Trash2, Camera, Star, Trophy, PieChart, Eye, EyeOff, Pencil, Languages, Activity, Target, Globe } from 'lucide-react';
import { processAndUploadImage } from '../../lib/imageOptimization';
import { useSettings } from '../../contexts/SettingsContext';
import AddAchievementModal from '../admin/components/AddAchievementModal';
import EditStudentModal from '../admin/components/EditStudentModal';
import StudentLeaveActivities from './components/StudentLeaveActivities';
import confetti from 'canvas-confetti';
import { useAuth } from '../../contexts/AuthContext';

const MentorStudentProfile = () => {
  const { studentId } = useParams();
  const { userData, logout } = useAuth();
  const { missionName, missionTarget, loadingSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [student, setStudent] = useState(location.state?.student || null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(!location.state?.student);
  const [analytics, setAnalytics] = useState({ classRank: 0, classTotal: 0, globalPercentile: 0, chartData: [] });
  const [cachedStudents, setCachedStudents] = useState(null);
  const [recordFilter, setRecordFilter] = useState('Total Achievements');

  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState(null);
  const [achLoading, setAchLoading] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchStudentAndAchievements();
  }, [studentId]);

  useEffect(() => {
    if (recordFilter === 'Mission 100' && missionName !== 'Mission 100') {
      setRecordFilter(missionName);
    }
  }, [missionName, recordFilter]);

  const filteredAchievements = React.useMemo(() => {
    return achievements.filter(ach => 
      recordFilter === 'Total Achievements' || 
      (recordFilter === 'Outreach Activities' && ach.isOutreach) || 
      (recordFilter === missionName && ach.isMission100)
    );
  }, [achievements, recordFilter, missionName]);

  const getShortClassName = (className) => {
    if (!className) return 'N/A';
    const name = className.toLowerCase();
    if (name.includes('secondary final year')) return 'S5';
    if (name.includes('senior secondary first year')) return 'SS1';
    if (name.includes('senior secondary final year')) return 'SS2';
    if (name.includes('degree first year')) return 'D1';
    return className;
  };

  const fetchStudentAndAchievements = async (silent = false) => {
    if (!silent && !student) setLoading(true);
    else setAchLoading(true);
    try {
      const docRef = doc(db, 'students', studentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setStudent({ id: docSnap.id, ...docSnap.data() });
      } else {
        alert("Student not found");
        navigate('/mentor');
      }

      const q = query(collection(db, 'achievements'), where('studentId', '==', studentId));
      const querySnapshot = await getDocs(q);
      const achData = [];
      querySnapshot.forEach((d) => achData.push({ id: d.id, ...d.data() }));
      
      const processedAchData = achData.map(ach => ({
        ...ach,
        totalMarks: getAchievementMarks(ach)
      }));

      processedAchData.sort((a, b) => {
        const dateA = a.date || a.createdAt;
        const dateB = b.date || b.createdAt;
        return new Date(dateB) - new Date(dateA);
      });
      
      setAchievements(processedAchData);

      let studentsList = cachedStudents;
      if (!studentsList) {
        const allStudentsSnap = await getDocs(collection(db, 'students'));
        studentsList = [];
        allStudentsSnap.forEach(doc => studentsList.push({ id: doc.id, ...doc.data() }));
        setCachedStudents(studentsList);
      }

      let totalGlobalScore = 0;
      let classMates = [];
      
      const currentAchievementTotal = Number(processedAchData.reduce((acc, curr) => acc + (curr.totalMarks || 0), 0).toFixed(2));
      const currentTotalStars = processedAchData.reduce((acc, curr) => acc + (Number(curr.stars) || 0), 0);
      const currentNetScore = Number(Math.max(0, currentAchievementTotal - (docSnap.data().minusPoints || 0)).toFixed(2));

      if (docSnap.data().netScore !== currentNetScore || docSnap.data().totalStars !== currentTotalStars || docSnap.data().plusPoints !== currentAchievementTotal) {
        await updateDoc(docRef, {
          plusPoints: currentAchievementTotal,
          netScore: currentNetScore,
          totalStars: currentTotalStars
        });
        setStudent(prev => ({...prev, netScore: currentNetScore, totalStars: currentTotalStars, plusPoints: currentAchievementTotal}));
      }
      
      studentsList.forEach(s => {
        const score = s.id === studentId ? currentNetScore : (s.netScore || 0);
        if (score > 0) totalGlobalScore += score; 
        if (s.classId === docSnap.data().classId) {
          classMates.push({ id: s.id, score, fullName: s.fullName || '' });
        }
      });

      classMates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.fullName.localeCompare(b.fullName);
      });
      const myRank = classMates.findIndex(s => s.id === studentId) + 1;
      
      let globalPercentile = 0;
      if (totalGlobalScore > 0 && currentNetScore > 0) {
        globalPercentile = Math.round((currentNetScore / totalGlobalScore) * 100);
      }

      const distribution = {};
      achData.forEach(ach => {
        if (ach.type) distribution[ach.type] = (distribution[ach.type] || 0) + 1;
      });
      
      const chartData = Object.keys(distribution).map(type => ({
          type,
          count: distribution[type],
          percentage: Math.round((distribution[type] / achData.length) * 100)
      })).sort((a,b) => b.count - a.count);

      setAnalytics({ classRank: myRank, classTotal: classMates.length, globalPercentile, chartData });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setAchLoading(false);
    }
  };

  const handleSaveAchievement = async (payload) => {
    try {
      if (editingAchievement) {
        const achRef = doc(db, 'achievements', editingAchievement.id);
        await updateDoc(achRef, payload);

        const oldMarks = Number(getAchievementMarks(editingAchievement)) || 0;
        const newMarks = Number(payload.totalMarks) || 0;
        const markDiff = newMarks - oldMarks;
        
        const oldStars = Number(editingAchievement.stars) || 0;
        const newStars = Number(payload.stars) || 0;
        const starDiff = newStars - oldStars;

        if (markDiff !== 0 || starDiff !== 0) {
          await updateDoc(doc(db, 'students', studentId), {
            plusPoints: increment(markDiff),
            netScore: increment(markDiff),
            totalStars: increment(starDiff)
          });
        }
      } else {
        await addDoc(collection(db, 'achievements'), {
          ...payload,
          studentId,
          className: student.className,
          classId: student.classId,
          mentorName: student.mentorName || 'Unknown Mentor'
        });

        const safeMarks = Number(payload.totalMarks) || 0;
        const safeStars = Number(payload.stars) || 0;

        await updateDoc(doc(db, 'students', studentId), {
          plusPoints: increment(safeMarks),
          netScore: increment(safeMarks),
          totalStars: increment(safeStars)
        });

        const duration = 2500;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({
            particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1']
          });
          confetti({
            particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1']
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      }

      setIsAchievementModalOpen(false);
      setEditingAchievement(null);
      fetchStudentAndAchievements(true);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to process achievement');
    }
  };

  const handleSaveStudent = async (payload) => {
    setIsSavingStudent(true);
    try {
      await updateDoc(doc(db, 'students', studentId), payload);
      setStudent(prev => ({ ...prev, ...payload }));
      setIsEditStudentModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to update student profile");
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleUpdateProfilePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUpdatingPhoto(true);
    try {
      const photoURL = await processAndUploadImage(file, 'profile');
      await updateDoc(doc(db, 'students', studentId), { photoURL });
      setStudent(prev => ({ ...prev, photoURL }));
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to update profile photo");
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const handleDeleteAchievement = async (ach) => {
    if (confirm("Are you sure you want to delete this achievement? Points and Stars will be deducted.")) {
      await deleteDoc(doc(db, 'achievements', ach.id));
      if (ach.marks || ach.stars || ach.totalMarks) {
        const marksToDeduct = Number(getAchievementMarks(ach)) || 0;
        const starsToDeduct = Number(ach.stars) || 0;
        await updateDoc(doc(db, 'students', studentId), {
          plusPoints: increment(-marksToDeduct),
          netScore: increment(-marksToDeduct),
          totalStars: increment(-starsToDeduct)
        });
      }
      fetchStudentAndAchievements(true);
    }
  };

  if (loading && !student) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  if (!student) return null;

  const outreachCount = achievements.filter(ach => ach.isOutreach).length;
  const mission100Count = achievements.filter(ach => ach.isMission100).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">
      <header className="bg-amber-50 border-b border-amber-100 sticky top-0 z-20 px-4 sm:px-8 h-16 flex items-center shadow-sm">
        <button 
          onClick={() => navigate('/mentor/dashboard', { state: { activeTab: 'mentees' } })} 
          className="flex items-center text-sm font-bold text-black hover:text-gray-700 transition group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mr-3 group-hover:bg-amber-200 transition-all text-amber-600">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to Dashboard
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-center p-6 relative">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-brand-blue to-blue-700 shadow-inner" />
              <div className="relative mx-auto w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 mb-4 mt-8 group">
                {updatingPhoto && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
                {student.photoURL ? (
                  <img src={student.photoURL} alt={student.fullName} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                    <User className="w-16 h-16" />
                  </div>
                )}
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer z-10">
                  <Camera className="w-8 h-8 text-white" />
                  <input type="file" className="sr-only" accept="image/jpeg, image/png, image/webp" onChange={handleUpdateProfilePhoto} disabled={updatingPhoto} />
                </label>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{student.fullName}</h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <p className="text-gray-500">Adm: {student.admissionNumber}</p>
                <button 
                  onClick={() => setIsEditStudentModalOpen(true)}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-left border-t border-gray-100 pt-4 mt-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Class</p>
                  <p className="font-bold text-brand-blue text-sm">{getShortClassName(student.className)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Mentor</p>
                  <p className="font-medium text-gray-800 text-sm leading-tight">{student.mentorName || 'None'}</p>
                </div>
                <div className="col-span-2 pt-2">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Password</p>
                  <div className="flex items-center">
                    <p className="font-mono text-gray-800 text-sm bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                      {showPassword ? (student.password || 'Not Set') : '••••••••'}
                    </p>
                    <button onClick={() => setShowPassword(!showPassword)} className="ml-2 text-gray-400 hover:text-brand-blue transition">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-6 relative overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 mt-6"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-orange-100/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <h3 className="text-gray-500 font-medium mb-1">{loadingSettings ? 'Loading...' : missionName}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-gray-900 tracking-tight">{mission100Count}</span>
                    <span className="text-lg font-bold text-gray-400">/ {missionTarget}</span>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-inner">
                  <Target className="w-8 h-8 text-orange-500" />
                </div>
              </div>
              
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between text-xs font-bold text-gray-600 uppercase tracking-widest">
                  <span>Progress</span>
                  <span className="text-orange-500">{Math.min(Math.round((mission100Count / (missionTarget || 100)) * 100), 100)}%</span>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((mission100Count / (missionTarget || 100)) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full shadow-md"
                  ></motion.div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 overflow-hidden flex flex-col h-full">
                  <div className="bg-gradient-to-br from-blue-100/40 via-blue-50/20 to-white p-6 border-b border-blue-100">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand-blue font-black text-2xl border border-gray-100 overflow-hidden shrink-0">
                        {student.photoURL ? (
                          <img src={student.photoURL} alt={student.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="opacity-40">{student.fullName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-2xl font-black text-gray-900 leading-tight truncate">{student.fullName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest bg-brand-blue/5 px-2 py-0.5 rounded-md border border-brand-blue/10">
                            Class: {student.className}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 lg:p-8 flex-1">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-10 border-b border-gray-100 pb-6 gap-4">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <Award className="w-5 h-5 text-amber-500" />
                        </div>
                        Records
                      </h3>
                      <div className="flex items-center gap-3">
                        <select 
                          className="bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl px-4 py-2 outline-none cursor-pointer hover:bg-gray-100 transition"
                          value={recordFilter}
                          onChange={(e) => setRecordFilter(e.target.value)}
                        >
                          <option value="Total Achievements">Total Achievements</option>
                          <option value="Outreach Activities">Outreach Activities</option>
                          <option value={missionName}>{missionName}</option>
                        </select>
                        <button
                          onClick={() => { setEditingAchievement(null); setIsAchievementModalOpen(true); }}
                          className="flex items-center px-4 py-2 bg-brand-blue text-white rounded-xl hover:bg-brand-lightBlue transition shadow-lg shadow-brand-blue/20 font-bold text-sm"
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add
                        </button>
                      </div>
                    </div>
                    
                    {achLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mb-4"></div>
                        <p className="text-sm font-medium">Updating records...</p>
                      </div>
                    ) : filteredAchievements.length === 0 ? (
                      <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                        <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium text-gray-500">No records found.</p>
                      </div>
                    ) : (
                    <div className="flex flex-col space-y-6 sm:space-y-8">
                      {filteredAchievements.map((ach) => (
                        <div key={ach.id} className="relative flex items-start group w-full shrink-0">
                          <div className="w-full p-5 sm:p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-gradient-to-br from-brand-blue/5 to-brand-green/5 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="flex justify-between items-start mb-0.5 relative z-10">
                              <h4 className="text-lg font-black text-gray-900 leading-tight pr-8 flex items-center gap-2">
                                {ach.type}
                                {ach.isMission100 && <img src="/mission100-logo.png" alt={missionName} className="w-5 h-5 object-contain" title={missionName} />}
                                {ach.isOutreach && <Globe className="w-4 h-4 text-brand-blue" title="Outreach Activity" />}
                              </h4>
                              <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingAchievement(ach); setIsAchievementModalOpen(true); }} className="p-2 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition" title="Edit">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteAchievement(ach)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-4 bg-blue-50 inline-block px-2 py-0.5 rounded border border-blue-100 relative z-10">{ach.category}</p>
                            
                            {ach.type === 'Workshop / Seminar Attendance' && ach.title && (
                              <p className="text-[15px] font-bold text-gray-800 mb-1 relative z-10">
                                {ach.title}
                              </p>
                            )}
                            
                            {ach.specificType && (
                              <p className="text-[13px] font-bold text-gray-600 mb-0.5 relative z-10">
                                {ach.specificType.charAt(0).toUpperCase() + ach.specificType.slice(1).toLowerCase()}
                              </p>
                            )}
                            
                            {(ach.conductedInstitution || ach.websiteName || ach.venue) && (
                              <p className="text-[11px] font-bold text-brand-blue mb-0.5 relative z-10 uppercase tracking-wider">
                                {[ach.conductedInstitution || ach.websiteName, ach.venue].filter(Boolean).join(' • ')}
                              </p>
                            )}

                            {ach.language && (
                              <div className="flex items-center gap-1.5 mb-2 relative z-10">
                                <Languages className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{ach.language}</span>
                              </div>
                            )}
                            
                            <p className="text-gray-500 text-sm mb-5 line-clamp-3 relative z-10">{ach.note || 'No description provided.'}</p>
                            
                            {ach.photoURL && (
                              <div className="mb-5 rounded-xl overflow-hidden border border-gray-100 w-full aspect-video bg-gray-50 relative z-10">
                                 <img src={ach.photoURL} alt={ach.title} loading="lazy" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-50 relative z-10">
                              {ach.grade && (
                                <span className="px-2.5 py-1 bg-brand-blue/5 text-brand-blue font-black text-[10px] uppercase tracking-widest rounded-md border border-brand-blue/10">
                                  {ach.grade}
                                </span>
                              )}
                              {ach.stars > 0 && (
                                <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                                  {Array.from({ length: ach.stars }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                                </div>
                              )}
                              {ach.totalMarks > 0 && (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest rounded-md border border-emerald-100">
                                  +{ach.totalMarks} Pts
                                </span>
                              )}
                              {ach.date && (
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-auto flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {(() => {
                                    const parts = ach.date.split('-');
                                    if (parts.length === 2) {
                                      const d = new Date(parts[0], parseInt(parts[1]) - 1);
                                      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                                    } else {
                                      const d = new Date(ach.date);
                                      if (isNaN(d.getTime())) return ach.date;
                                      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                    }
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 p-6 lg:p-8">
               <StudentLeaveActivities student={student} />
            </div>

          </div>
        </div>
      </main>

      <AddAchievementModal 
        isOpen={isAchievementModalOpen} 
        onClose={() => { setIsAchievementModalOpen(false); setEditingAchievement(null); }} 
        onSave={handleSaveAchievement} 
        initialData={editingAchievement}
      />

      <EditStudentModal
        isOpen={isEditStudentModalOpen}
        onClose={() => setIsEditStudentModalOpen(false)}
        onSave={handleSaveStudent}
        studentData={student}
        isSaving={isSavingStudent}
      />
    </div>
  );
};

export default MentorStudentProfile;
