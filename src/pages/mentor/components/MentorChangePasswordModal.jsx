import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const MentorChangePasswordModal = ({ isOpen, onClose, username }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    try {
      // 1. Verify current password
      const q = query(collection(db, 'mentors'), where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) throw new Error('Mentor data not found.');
      
      const mentorDoc = querySnapshot.docs[0];
      const mentorData = mentorDoc.data();
      
      if (mentorData.password !== currentPassword) {
        throw new Error('Current password is incorrect.');
      }

      // 2. Update password
      await updateDoc(mentorDoc.ref, {
        password: newPassword
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-brand-blue" />
            Change Password
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-200 rounded-full hover:bg-red-100 hover:text-red-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Password Updated!</h3>
              <p className="text-gray-500">Your password has been changed successfully.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-xl">
                  {error}
                </div>
              )}

              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Current Password</label>
                <div className="relative">
                  <input 
                    type={showPasswords ? "text" : "password"} 
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition"
                    placeholder="Enter current password"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                <div className="relative">
                  <input 
                    type={showPasswords ? "text" : "password"} 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition"
                    placeholder="At least 4 characters"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Confirm New Password</label>
                <div className="relative">
                  <input 
                    type={showPasswords ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition"
                    placeholder="Repeat new password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-blue"
                  >
                    {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold shadow-lg shadow-brand-blue/20 hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  'Update Password'
                )}
              </button>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export default MentorChangePasswordModal;
