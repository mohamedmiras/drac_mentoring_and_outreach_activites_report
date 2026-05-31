import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const SettingsContext = createContext({});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [missionName, setMissionName] = useState('Mission 100');
  const [missionTarget, setMissionTarget] = useState(100);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    
    // Set up a real-time listener for settings
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.missionName) setMissionName(data.missionName);
        if (data.missionTarget) setMissionTarget(data.missionTarget);
      } else {
        // Create the document if it doesn't exist
        setDoc(settingsRef, {
          missionName: 'Mission 100',
          missionTarget: 100
        }).catch(err => console.error("Failed to initialize settings:", err));
      }
      setLoadingSettings(false);
    }, (error) => {
      console.error("Error fetching settings:", error);
      setLoadingSettings(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newMissionName, newMissionTarget) => {
    try {
      const settingsRef = doc(db, 'settings', 'global');
      await setDoc(settingsRef, {
        missionName: newMissionName,
        missionTarget: Number(newMissionTarget)
      }, { merge: true });
      return true;
    } catch (error) {
      console.error("Failed to update settings:", error);
      throw error;
    }
  };

  const value = {
    missionName,
    missionTarget,
    updateSettings,
    loadingSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
