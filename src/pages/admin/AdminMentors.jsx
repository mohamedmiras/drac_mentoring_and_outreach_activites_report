import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ShieldCheck, X, Search, UserCircle, Star, KeyRound } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const nicknameMap = {
  "Usthad Yasir Hudawi": "Yasir Hudawi",
  "Usthad Thoyyib Hudawi": "Thoyyib Hudawi",
  "Usthad Rafi Hudawi": "Rafi Hudawi",
  "Usthad Zakariya Hudawi": "Zakariya Hudawi",
  "Usthad Numan Hudawi": "Numan Hudawi",
  "Usthad Muhsin MC Hudawi": "Muhsin Hudawi",
  "Usthad Anver Sadiq Hudawi": "Anver Hudawi",
  "Usthad Abu Shammas Rafeeq Faisy": "Rafeeq Faisy",
  "Usthad Salman Hudawi": "Salman Hudawi"
};

const getNickname = (fullName) => {
  return nicknameMap[fullName] || fullName;
};

// Card styles for variation
const cardStyles = [
  "from-blue-50 to-white border-blue-200 text-brand-blue",
  "from-emerald-50 to-white border-emerald-200 text-emerald-700",
  "from-violet-50 to-white border-violet-200 text-violet-700",
  "from-amber-50 to-white border-amber-200 text-amber-700",
  "from-orange-50 to-white border-orange-200 text-orange-700",
];

const AdminMentors = () => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMentor, setEditingMentor] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    caption: 'Guiding the leaders of tomorrow'
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'mentors'));
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      // Sort to keep consistent order
      setMentors(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingMentor(null);
    setFormData({ name: '', username: '', password: '', caption: 'Guiding the leaders of tomorrow' });
    setIsModalOpen(true);
  };

  const openEditModal = (mentor) => {
    setEditingMentor(mentor);
    setFormData({
      name: mentor.name || '',
      username: mentor.username || '',
      password: mentor.password || '',
      caption: mentor.caption || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingMentor) {
        // Update
        const ref = doc(db, 'mentors', editingMentor.id);
        await updateDoc(ref, {
          name: formData.name,
          username: formData.username,
          password: formData.password,
          caption: formData.caption,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Add
        const newId = formData.username.toLowerCase().replace(/\s+/g, '');
        const ref = doc(db, 'mentors', newId);
        await setDoc(ref, {
          name: formData.name,
          username: formData.username,
          password: formData.password,
          caption: formData.caption,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      fetchMentors();
    } catch (err) {
      console.error(err);
      alert("Failed to save mentor data.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to completely remove ${name} from the system?`)) {
      try {
        await deleteDoc(doc(db, 'mentors', id));
        fetchMentors();
      } catch (err) {
        console.error(err);
        alert("Failed to delete mentor.");
      }
    }
  };

  const filteredMentors = mentors.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-brand-blue" />
            Mentors Management
          </h1>
          <p className="text-slate-500 font-medium mt-2 max-w-2xl">
            Add, update, or remove mentors. Manage their authentication and profile captions.
          </p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-3 bg-brand-blue hover:bg-brand-lightBlue text-white font-bold rounded-xl shadow-lg shadow-brand-blue/30 transition-all hover:-translate-y-1 group whitespace-nowrap"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          Add New Mentor
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-8 flex items-center relative z-10">
        <div className="pl-4 pr-3 text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input 
          type="text" 
          placeholder="Search by mentor name or username..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent py-3 pr-4 outline-none text-slate-700 font-medium placeholder:text-slate-400"
        />
      </div>

      {/* Grid Layout with Size Variation */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-3xl border border-slate-200"></div>
          ))}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
          <AnimatePresence>
            {filteredMentors.map((mentor, idx) => {
              const styleClass = cardStyles[idx % cardStyles.length];
              // Make some cards span 2 columns randomly to give premium size variation
              const isLarge = idx === 0 || idx === 5 || idx === 8; 
              
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  key={mentor.id}
                  className={cn(
                    "bg-gradient-to-br rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-xl border transition-all duration-300 group flex flex-col relative overflow-hidden",
                    styleClass,
                    isLarge ? "sm:col-span-2 xl:col-span-2" : "col-span-1"
                  )}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-2xl -mt-10 -mr-10 pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm border border-white flex items-center justify-center shrink-0">
                      <UserCircle className="w-10 h-10 opacity-70" />
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(mentor)} className="p-2 bg-white/80 hover:bg-white text-blue-600 rounded-xl shadow-sm border border-white transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(mentor.id, mentor.name)} className="p-2 bg-white/80 hover:bg-red-50 text-red-500 rounded-xl shadow-sm border border-white transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative z-10 flex-1">
                    <h3 className="text-3xl font-medium tracking-tight mb-1">{getNickname(mentor.name)}</h3>
                    <p className="text-base font-normal opacity-70 mb-4">{mentor.name}</p>
                    
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/50 backdrop-blur-sm rounded-lg border border-white/40 text-xs font-bold shadow-sm">
                      <Star className="w-3.5 h-3.5" />
                      <span className="line-clamp-1">{mentor.caption || 'No caption'}</span>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-black/5 flex items-center justify-between relative z-10">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Username</span>
                      <span className="font-semibold text-sm">{mentor.username}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 opacity-70" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-10"
            >
              <div className="bg-gradient-to-r from-brand-blue to-blue-800 p-6 sm:p-8 flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                  {editingMentor ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                  {editingMentor ? 'Edit Mentor Profile' : 'Register New Mentor'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Official Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Usthad Yasir Hudawi"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-slate-800 font-bold transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Username</label>
                    <input 
                      type="text" 
                      required
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})}
                      placeholder="yasirhudawi"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-slate-800 font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        placeholder="Secure password"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-slate-800 font-bold transition-all"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Motivational Caption</label>
                  <input 
                    type="text" 
                    required
                    value={formData.caption}
                    onChange={e => setFormData({...formData, caption: e.target.value})}
                    placeholder="Inspiring excellence..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-slate-800 font-bold transition-all"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-3 bg-brand-blue hover:bg-brand-lightBlue text-white font-bold rounded-xl shadow-md shadow-brand-blue/30 transition-colors disabled:opacity-70 flex items-center gap-2"
                  >
                    {formLoading ? 'Saving...' : 'Save Mentor Data'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminMentors;
