import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, UserPlus } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { processAndUploadImage } from '../../../lib/imageOptimization';

const CLASS_NAMES = {
  'sec-final': 'Secondary Final Year',
  'ss-first': 'Senior Secondary First Year',
  'ss-final': 'Senior Secondary Final Year',
  'degree-first': 'Degree First Year',
};

const AddMenteeModal = ({ isOpen, onClose, onSuccess, mentorProfile }) => {
  const [newStudent, setNewStudent] = useState({
    fullName: '',
    admissionNumber: '',
    password: '',
    classId: '',
    dob: '',
    place: '',
    email: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [adding, setAdding] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
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
        mentorName: mentorProfile.name, // Auto-selected mentor name
        mentorUsername: mentorProfile.username, // Auto-selected mentor username for queries
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

      setNewStudent({ fullName: '', admissionNumber: '', password: '', classId: '', dob: '', place: '', email: '' });
      setPhotoFile(null);
      onSuccess(); // Triggers a re-fetch of mentees
    } catch (error) {
      console.error("Error adding student: ", error);
      alert(error.message || "Failed to add student");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-blue" />
            Add New Mentee
          </h2>
          <button onClick={onClose} disabled={adding} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none" 
              value={newStudent.fullName} onChange={e => setNewStudent({...newStudent, fullName: e.target.value})} placeholder="Student's full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admission No.</label>
              <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none" 
                value={newStudent.admissionNumber} onChange={e => setNewStudent({...newStudent, admissionNumber: e.target.value})} placeholder="e.g. ADM-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Portal Password</label>
              <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none" 
                value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} placeholder="Login password" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none bg-white"
                value={newStudent.classId} onChange={e => setNewStudent({...newStudent, classId: e.target.value})}>
                <option value="" disabled>Select Class</option>
                {Object.entries(CLASS_NAMES).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Mentor</label>
              <input disabled type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 font-bold cursor-not-allowed" 
                value={mentorProfile?.name || 'Loading...'} />
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
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-brand-blue hover:text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-blue">
                    <span>Upload Profile Image</span>
                    <input type="file" className="sr-only" accept="image/jpeg, image/png, image/webp" onChange={(e) => setPhotoFile(e.target.files[0])} />
                  </label>
                </div>
                {photoFile ? (
                  <p className="text-sm font-medium text-emerald-600 mt-2 truncate max-w-xs">{photoFile.name}</p>
                ) : (
                  <p className="text-xs text-gray-500 italic mt-2">*JPEG only • Max 300 KB • Recommended 400x400*</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" disabled={adding} onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
              Cancel
            </button>
            <button type="submit" disabled={adding} className="px-5 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-bold shadow-sm">
              {adding ? 'Saving...' : 'Add Mentee'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AddMenteeModal;
