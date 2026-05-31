import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, Target, Save, CheckCircle } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useSettings } from '../../contexts/SettingsContext';
import { auth } from '../../lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

const AdminSettings = () => {
  const { missionName, missionTarget, updateSettings, loadingSettings } = useSettings();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [formMissionName, setFormMissionName] = useState(missionName || 'Mission 100');
  const [formMissionTarget, setFormMissionTarget] = useState(missionTarget || 100);
  const [missionError, setMissionError] = useState('');
  const [missionSuccess, setMissionSuccess] = useState('');
  const [isUpdatingMission, setIsUpdatingMission] = useState(false);

  // Sync state if settings load after mount
  React.useEffect(() => {
    if (!loadingSettings) {
      setFormMissionName(missionName);
      setFormMissionTarget(missionTarget);
    }
  }, [missionName, missionTarget, loadingSettings]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      return setPasswordError('New passwords do not match');
    }
    if (newPassword.length < 6) {
      return setPasswordError('Password must be at least 6 characters');
    }

    setIsUpdatingPassword(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated admin found");

      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setPasswordError('Incorrect current password');
      } else {
        setPasswordError(error.message || 'Failed to update password');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleMissionUpdate = async (e) => {
    e.preventDefault();
    setMissionError('');
    setMissionSuccess('');

    if (!formMissionName.trim()) {
      return setMissionError('Mission name cannot be empty');
    }
    if (Number(formMissionTarget) <= 0) {
      return setMissionError('Mission target must be greater than 0');
    }

    setIsUpdatingMission(true);
    try {
      await updateSettings(formMissionName, formMissionTarget);
      setMissionSuccess('Mission tracking settings updated successfully!');
    } catch (error) {
      setMissionError('Failed to update mission settings');
    } finally {
      setIsUpdatingMission(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-brand-blue" />
          System Settings
        </h1>
        <p className="text-slate-500 font-medium mt-2 max-w-2xl">
          Manage your administrator credentials and global dashboard configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Security / Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-lg border border-slate-200 transition-all duration-300 flex flex-col"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Lock className="w-6 h-6 text-brand-blue" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Change Password</h2>
              <p className="text-sm text-slate-500">Update your admin login password securely</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-5 flex-1 flex flex-col">
            {passwordError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> {passwordSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-slate-800 font-medium transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-slate-800 font-medium transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 outline-none text-slate-800 font-medium transition-all"
              />
            </div>

            <div className="mt-auto pt-6 flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-lightBlue transition-colors shadow-md shadow-brand-blue/20 disabled:opacity-70"
              >
                <Save className="w-4 h-4" />
                {isUpdatingPassword ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Mission Configuration Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-lg border border-slate-200 transition-all duration-300 flex flex-col relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/50 rounded-full blur-3xl -z-10 -mt-10 -mr-10"></div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <Target className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Mission Customization</h2>
              <p className="text-sm text-slate-500">Configure global dashboard progress target</p>
            </div>
          </div>

          <form onSubmit={handleMissionUpdate} className="space-y-5 flex-1 flex flex-col">
            {missionError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                {missionError}
              </div>
            )}
            {missionSuccess && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> {missionSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Custom Mission Title</label>
              <input
                type="text"
                required
                value={formMissionName}
                onChange={(e) => setFormMissionName(e.target.value)}
                placeholder="e.g. Mission 70"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none text-slate-800 font-medium transition-all"
              />
              <p className="text-xs text-slate-400 mt-2">This name will appear on all dashboards and reports.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Target Goal</label>
              <input
                type="number"
                required
                min="1"
                value={formMissionTarget}
                onChange={(e) => setFormMissionTarget(e.target.value)}
                placeholder="e.g. 70"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none text-slate-800 font-medium transition-all"
              />
              <p className="text-xs text-slate-400 mt-2">The number of achievements required to complete the mission.</p>
            </div>

            <div className="mt-auto pt-6 flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingMission || loadingSettings}
                className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20 disabled:opacity-70"
              >
                <Save className="w-4 h-4" />
                {isUpdatingMission ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
