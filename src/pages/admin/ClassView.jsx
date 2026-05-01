import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Search, Plus, User, ArrowLeft, Calendar, Upload, Star, UserCheck, Trash2, Edit2 } from 'lucide-react';
import { processAndUploadImage } from '../../lib/imageOptimization';
import EditStudentModal from './components/EditStudentModal';

const CLASS_NAMES = {
  'sec-final': 'Secondary Final Year',
  'ss-first': 'Senior Secondary First Year',
  'ss-final': 'Senior Secondary Final Year',
  'degree-first': 'Degree First Year',
};

const ClassView = () => {
  const { className } = useParams();
  const navigate = useNavigate();
  const actualClassName = CLASS_NAMES[className] || 'Unknown Class';

  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const MENTORS = [
    "Usthad Abu Shammas Rafeeq Faisy",
    "Usthad Thoyyib Hudawi",
    "Usthad Yasir Hudawi",
    "Usthad Salman Hudawi",
    "Usthad Zakariya Hudawi",
    "Usthad Numan Hudawi",
    "Usthad Muhsin MC Hudawi",
    "Usthad Rafi Hudawi",
    "Usthad Anver Sadiq Hudawi"
  ];

  const [newStudent, setNewStudent] = useState({
    fullName: '',
    admissionNumber: '',
    password: '',
    mentorName: '',
    classId: className,
    dob: '',
    place: '',
    email: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [adding, setAdding] = useState(false);

  const getShortClassName = (className) => {
    if (!className) return 'N/A';
    const name = className.toLowerCase();
    if (name.includes('secondary final year')) return 'S5';
    if (name.includes('senior secondary first year')) return 'SS1';
    if (name.includes('senior secondary final year')) return 'SS2';
    if (name.includes('degree first year')) return 'D1';
    return className;
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'students'), where('classId', '==', className));
      const querySnapshot = await getDocs(q);
      const studentData = [];
      querySnapshot.forEach((doc) => {
        studentData.push({ id: doc.id, ...doc.data() });
      });
      setStudents(studentData);
    } catch (error) {
      console.error("Error fetching students: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [className]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      let photoURL = '';
      if (photoFile) {
         photoURL = await processAndUploadImage(photoFile, 'profile');
      }

      const selectedClassNameName = CLASS_NAMES[newStudent.classId] || 'Unknown Class';

      await addDoc(collection(db, 'students'), {
        fullName: newStudent.fullName,
        admissionNumber: newStudent.admissionNumber,
        password: newStudent.password,
        mentorName: newStudent.mentorName,
        classId: newStudent.classId,
        className: selectedClassNameName,
        dob: newStudent.dob,
        place: newStudent.place || '',
        email: newStudent.email || '',
        photoURL,
        plusPoints: 0,
        minusPoints: 0,
        netScore: 0,
        createdAt: new Date()
      });

      setIsModalOpen(false);
      setNewStudent({ fullName: '', admissionNumber: '', password: '', mentorName: '', classId: className, dob: '', place: '', email: '' });
      setPhotoFile(null);
      fetchStudents(); // Refresh list
    } catch (error) {
      console.error("Error adding student: ", error);
      alert(error.message || "Failed to add student");
    } finally {
      setAdding(false);
    }
  };

  const deleteStudent = async (studentId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this student? This action cannot be undone and will permanently delete all their achievements.")) return;
    
    try {
      // 1. Delete all achievements for this student to prevent orphaned data
      const achQuery = query(collection(db, 'achievements'), where('studentId', '==', studentId));
      const achSnapshot = await getDocs(achQuery);
      const deletePromises = [];
      achSnapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, 'achievements', document.id)));
      });
      await Promise.all(deletePromises);

      // 2. Delete the student profile
      await deleteDoc(doc(db, 'students', studentId));
      
      fetchStudents();
    } catch (error) {
      console.error("Error deleting student: ", error);
      alert("Failed to delete student");
    }
  };

  const handleEditSave = async (updatedData) => {
    if (!editingStudent) return;
    setIsSavingEdit(true);
    try {
      await updateDoc(doc(db, 'students', editingStudent.id), {
        fullName: updatedData.fullName,
        admissionNumber: updatedData.admissionNumber,
        className: updatedData.className,
        mentorName: updatedData.mentorName || '',
        mentorUsername: updatedData.mentorUsername || '',
        dob: updatedData.dob || '',
        password: updatedData.password || '',
        place: updatedData.place || '',
        email: updatedData.email || '',
      });
      setEditingStudent(null);
      fetchStudents(); // Refresh data
    } catch (error) {
      console.error("Failed to update student:", error);
      alert("Failed to update student. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getStudentColor = (name) => {
    const themes = [
      {
        card: 'from-blue-50/80 to-white border-blue-200/60 hover:border-blue-400 shadow-blue-500/10',
        top: 'bg-gradient-to-br from-blue-100/50 to-blue-50/30 border-b border-blue-200/40',
        metric: 'bg-gradient-to-br from-blue-50/50 to-white/80 border-blue-200/40 hover:from-blue-100/50 hover:to-white'
      },
      {
        card: 'from-emerald-50/80 to-white border-emerald-200/60 hover:border-emerald-400 shadow-emerald-500/10',
        top: 'bg-gradient-to-br from-emerald-100/50 to-emerald-50/30 border-b border-emerald-200/40',
        metric: 'bg-gradient-to-br from-emerald-50/50 to-white/80 border-emerald-200/40 hover:from-emerald-100/50 hover:to-white'
      },
      {
        card: 'from-purple-50/80 to-white border-purple-200/60 hover:border-purple-400 shadow-purple-500/10',
        top: 'bg-gradient-to-br from-purple-100/50 to-purple-50/30 border-b border-purple-200/40',
        metric: 'bg-gradient-to-br from-purple-50/50 to-white/80 border-purple-200/40 hover:from-purple-100/50 hover:to-white'
      },
      {
        card: 'from-orange-50/80 to-white border-orange-200/60 hover:border-orange-400 shadow-orange-500/10',
        top: 'bg-gradient-to-br from-orange-100/50 to-orange-50/30 border-b border-orange-200/40',
        metric: 'bg-gradient-to-br from-orange-50/50 to-white/80 border-orange-200/40 hover:from-orange-100/50 hover:to-white'
      },
      {
        card: 'from-rose-50/80 to-white border-rose-200/60 hover:border-rose-400 shadow-rose-500/10',
        top: 'bg-gradient-to-br from-rose-100/50 to-rose-50/30 border-b border-rose-200/40',
        metric: 'bg-gradient-to-br from-rose-50/50 to-white/80 border-rose-200/40 hover:from-rose-100/50 hover:to-white'
      }
    ];
    let hash = 0;
    const studentName = name || 'Student';
    for (let i = 0; i < studentName.length; i++) {
      hash = studentName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return themes[Math.abs(hash) % themes.length];
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.admissionNumber.includes(searchTerm)
  );

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="flex items-center text-sm text-gray-500 hover:text-brand-blue mb-2 transition">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{actualClassName}</h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-lightBlue transition shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Student
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or admission number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue bg-gray-50"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map((student, idx) => {
            const theme = getStudentColor(student.fullName);
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                onClick={() => navigate(`/admin/student/${student.id}`)}
                className={`rounded-3xl shadow-sm border overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group bg-gradient-to-br ${theme.card}`}
              >
                <div className={`p-4 flex items-center gap-3 relative overflow-hidden ${theme.top}`}>
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/30 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  
                  <div className="absolute top-2 right-2 flex gap-1 z-20">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingStudent(student); }}
                      className="p-1.5 text-gray-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Student"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => deleteStudent(student.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Student"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="w-12 h-12 rounded-xl bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center text-brand-blue font-bold text-lg relative overflow-hidden flex-shrink-0 border border-white/60">
                    {student.photoURL ? (
                      <img src={student.photoURL} alt={student.fullName} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 opacity-40 text-brand-blue" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 z-10">
                    <h3 className="font-bold text-gray-800 group-hover:text-brand-blue transition-colors leading-tight truncate text-base">{student.fullName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black bg-white/80 backdrop-blur-sm text-brand-blue px-2 py-0.5 rounded-md border border-white/60 uppercase tracking-tighter shadow-sm">
                        {getShortClassName(actualClassName)}
                      </span>
                      <span className="text-[9px] font-bold text-gray-500/80 uppercase tracking-widest">
                        #{student.admissionNumber}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-3 relative z-10">
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-2.5 rounded-2xl border flex flex-col items-center shadow-sm transition-colors ${theme.metric}`}>
                      <span className="text-[7px] font-black text-emerald-700/80 uppercase tracking-widest mb-0.5">Points</span>
                      <span className="text-lg font-black text-emerald-700 tracking-tight">{Number(student.netScore || 0).toFixed(2)}</span>
                    </div>
                    <div className={`p-2.5 rounded-2xl border flex flex-col items-center shadow-sm transition-colors ${theme.metric}`}>
                      <span className="text-[7px] font-black text-amber-600/80 uppercase tracking-widest mb-0.5">Stars</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 drop-shadow-sm" />
                        <span className="text-lg font-black text-amber-700 tracking-tight">{student.totalStars || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors shadow-sm ${theme.metric}`}>
                    <div className="w-7 h-7 rounded-lg bg-white/80 shadow-sm flex items-center justify-center border border-white flex-shrink-0">
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] font-black text-slate-500/80 uppercase tracking-widest leading-none mb-1">Mentor</span>
                      <span className="text-[10px] font-bold text-slate-700 truncate leading-none">
                        {student.mentorName || 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filteredStudents.length === 0 && (
            <div className="col-span-full text-center p-12 text-gray-500">
              No students found in this class.
            </div>
          )}
        </div>
      )}

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0 rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Add New Student</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleAddStudent} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none" 
                  value={newStudent.fullName} onChange={e => setNewStudent({...newStudent, fullName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admission No.</label>
                  <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none" 
                    value={newStudent.admissionNumber} onChange={e => setNewStudent({...newStudent, admissionNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none" 
                    value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none bg-gray-100 text-gray-600 cursor-not-allowed"
                    value={className}>
                    <option value={className}>{CLASS_NAMES[className]}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mentor Selection</label>
                  <select required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none bg-white"
                    value={newStudent.mentorName} onChange={e => setNewStudent({...newStudent, mentorName: e.target.value})}>
                    <option value="" disabled>Select Mentor</option>
                    {MENTORS.map((mentor, idx) => (
                      <option key={idx} value={mentor}>{mentor}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth (Optional)</label>
                  <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none text-gray-700" 
                    value={newStudent.dob} onChange={e => setNewStudent({...newStudent, dob: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Place (Optional)</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none" 
                    value={newStudent.place} onChange={e => setNewStudent({...newStudent, place: e.target.value})} placeholder="e.g. Malappuram" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                  <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none" 
                    value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} placeholder="student@example.com" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Photo (Optional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-brand-blue transition bg-gray-50">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-brand-blue hover:text-brand-lightBlue focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-blue">
                        <span>Upload Profile Image</span>
                        <input type="file" className="sr-only" accept="image/jpeg, image/png, image/webp" onChange={(e) => setPhotoFile(e.target.files[0])} />
                      </label>
                    </div>
                    {photoFile ? (
                      <p className="text-sm font-medium text-brand-green mt-2">{photoFile.name}</p>
                    ) : (
                      <p className="text-xs text-gray-500 italic mt-2">*JPEG only • Max 300 KB • Recommended 400x400*</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={adding} className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-lightBlue transition disabled:opacity-50">
                  {adding ? 'Saving...' : 'Save Student'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <EditStudentModal
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={handleEditSave}
          studentData={editingStudent}
          isSaving={isSavingEdit}
        />
      )}
    </AdminLayout>
  );
};

export default ClassView;
