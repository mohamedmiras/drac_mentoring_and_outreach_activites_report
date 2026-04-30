import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(() => {
    const localStudent = localStorage.getItem('student_session');
    const localMentor = localStorage.getItem('mentor_session');
    if (localStudent) {
      try { return { role: 'student', admissionNumber: JSON.parse(localStudent).admissionNumber }; } catch(e) { return null; }
    } else if (localMentor) {
      try { 
        const p = JSON.parse(localMentor);
        return { role: 'mentor', username: p.username, mentorId: p.id, name: p.name }; 
      } catch(e) { return null; }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      const localStudent = localStorage.getItem('student_session');
      const localMentor = localStorage.getItem('mentor_session');

      if (user) {
        // If we have a Firebase user, they are an admin. 
        // Clear any lingering student/mentor sessions to prevent conflicts.
        if (localStudent || localMentor) {
          localStorage.removeItem('student_session');
          localStorage.removeItem('mentor_session');
        }
        setUserData({ role: 'admin' });
      } else if (!localStudent && !localMentor) {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginAdmin = async (email, password) => {
    localStorage.removeItem('student_session');
    localStorage.removeItem('mentor_session');
    const result = await signInWithEmailAndPassword(auth, email, password);
    setUserData({ role: 'admin' });
    return result;
  };

  const loginStudent = async (admissionNumber, password) => {
    // Custom Firestore authentication for students (No Firebase Auth account needed)
    const q = query(collection(db, 'students'), where('admissionNumber', '==', String(admissionNumber)));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Student not found');
    }

    const studentDoc = querySnapshot.docs[0].data();
    if (studentDoc.password !== password) {
      throw new Error('Incorrect password');
    }

    // Success - create local session
    const sessionData = { admissionNumber: studentDoc.admissionNumber };
    localStorage.setItem('student_session', JSON.stringify(sessionData));
    setUserData({ role: 'student', admissionNumber: studentDoc.admissionNumber });
    return true;
  };

  const loginMentor = async (username, password) => {
    const q = query(collection(db, 'mentors'), where('username', '==', String(username)));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Mentor not found');
    }

    const mentorDoc = querySnapshot.docs[0].data();
    if (mentorDoc.password !== password) {
      throw new Error('Incorrect password');
    }

    const sessionData = { username: mentorDoc.username, id: querySnapshot.docs[0].id, name: mentorDoc.name };
    localStorage.setItem('mentor_session', JSON.stringify(sessionData));
    setUserData({ role: 'mentor', username: mentorDoc.username, mentorId: querySnapshot.docs[0].id, name: mentorDoc.name });
    return true;
  };

  const logout = () => {
    if (userData?.role === 'student') {
      localStorage.removeItem('student_session');
      setUserData(null);
      return Promise.resolve();
    }
    if (userData?.role === 'mentor') {
      localStorage.removeItem('mentor_session');
      setUserData(null);
      return Promise.resolve();
    }
    return signOut(auth);
  };

  const value = {
    currentUser,
    userData,
    loading,
    loginAdmin,
    loginStudent,
    loginMentor,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

