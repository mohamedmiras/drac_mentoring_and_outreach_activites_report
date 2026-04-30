import React, { useState, useEffect } from 'react';
import { X, User, Hash, School, ShieldCheck, Calendar, Lock, ChevronDown, Activity, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const EditStudentModal = ({ isOpen, onClose, onSave, studentData, isSaving }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    admissionNumber: '',
    className: '',
    mentorName: '',
    dob: '',
    password: '',
    mentorUsername: '',
    place: '',
    email: ''
  });
  
  const [mentors, setMentors] = useState([]);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const snap = await getDocs(collection(db, 'mentors'));
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        setMentors(data);
      } catch (err) {
        console.error("Failed to fetch mentors", err);
      }
    };
    fetchMentors();
  }, []);

  useEffect(() => {
    if (studentData) {
      setFormData({
        fullName: studentData.fullName || '',
        admissionNumber: studentData.admissionNumber || '',
        className: studentData.className || '',
        mentorName: studentData.mentorName || '',
        mentorUsername: studentData.mentorUsername || '',
        dob: studentData.dob || '',
        password: studentData.password || '',
        place: studentData.place || '',
        email: studentData.email || ''
      });
    }
  }, [studentData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputClasses = "w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all text-gray-700 disabled:opacity-50";
  const labelClasses = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-blue" />
              Edit Student Profile
            </h3>
            <button onClick={onClose} disabled={isSaving} className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className={labelClasses}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    disabled={isSaving}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={inputClasses}
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Admission No</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    disabled={isSaving}
                    value={formData.admissionNumber}
                    onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                    className={inputClasses}
                    placeholder="ADM-001"
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Class</label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    disabled={isSaving}
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className={inputClasses}
                    placeholder="e.g. S5"
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Assigned Mentor</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <select
                    disabled={isSaving}
                    value={formData.mentorUsername || ''}
                    onChange={(e) => {
                      const selectedMentor = mentors.find(m => m.username === e.target.value);
                      setFormData({ 
                        ...formData, 
                        mentorUsername: e.target.value,
                        mentorName: selectedMentor ? selectedMentor.name : ''
                      });
                    }}
                    className={`${inputClasses} appearance-none cursor-pointer bg-white`}
                  >
                    <option value="">-- Unassigned --</option>
                    {mentors.map(mentor => (
                      <option key={mentor.username} value={mentor.username}>
                        {mentor.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    disabled={isSaving}
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Place</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    disabled={isSaving}
                    value={formData.place}
                    onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                    className={inputClasses}
                    placeholder="e.g. Malappuram"
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Email Address</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    disabled={isSaving}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClasses}
                    placeholder="student@example.com"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClasses}>Portal Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    disabled={isSaving}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={inputClasses}
                    placeholder="Student login password"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={onClose}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-lightBlue transition-all shadow-lg shadow-brand-blue/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EditStudentModal;
