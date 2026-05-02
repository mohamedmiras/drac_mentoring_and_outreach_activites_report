import React, { useState, useEffect } from 'react';
import { X, User, Hash, School, ShieldCheck, Calendar, Lock, ChevronDown, Activity, Mail, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { processAndUploadImage } from '../../../lib/imageOptimization';

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
  const [photoFile, setPhotoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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
        email: studentData.email || '',
        photoURL: studentData.photoURL || ''
      });
    }
  }, [studentData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalData = { ...formData };
    
    if (photoFile) {
      setIsUploading(true);
      try {
        const photoURL = await processAndUploadImage(photoFile, 'profile');
        finalData.photoURL = photoURL;
      } catch (err) {
        console.error("Image upload failed", err);
        alert("Failed to upload profile image.");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    
    onSave(finalData);
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
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-blue" />
              Edit Student Profile
            </h3>
            <button onClick={onClose} disabled={isSaving} className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
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
                    disabled={isSaving || isUploading}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={inputClasses}
                    placeholder="Student login password"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClasses}>Profile Photo</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-200 border-dashed rounded-xl hover:border-brand-blue transition bg-white/50">
                  <div className="space-y-1 text-center w-full">
                    
                    {photoFile ? (
                      <div className="mx-auto w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 mb-3">
                        <img src={URL.createObjectURL(photoFile)} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : formData.photoURL ? (
                      <div className="mx-auto w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 mb-3">
                        <img src={formData.photoURL} alt="Current" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    )}

                    <div className="flex text-sm text-gray-600 justify-center">
                      <label className="relative cursor-pointer rounded-md font-medium text-brand-blue hover:text-blue-600 focus-within:outline-none">
                        <span>{formData.photoURL || photoFile ? 'Change photo' : 'Upload new photo'}</span>
                        <input type="file" className="sr-only" accept="image/jpeg, image/png, image/webp" onChange={(e) => setPhotoFile(e.target.files[0])} disabled={isSaving || isUploading} />
                      </label>
                    </div>
                    {photoFile ? (
                      <p className="text-xs font-medium text-emerald-600 mt-2 truncate max-w-[200px] mx-auto">{photoFile.name}</p>
                    ) : (
                      <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">JPEG/PNG up to 1MB</p>
                    )}
                  </div>
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
                disabled={isSaving || isUploading}
                className="flex-1 py-3 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-lightBlue transition-all shadow-lg shadow-brand-blue/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {(isSaving || isUploading) ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {isUploading ? 'Uploading...' : 'Saving...'}
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
