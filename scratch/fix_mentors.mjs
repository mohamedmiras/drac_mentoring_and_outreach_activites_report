import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const envVars = fs.readFileSync('.env', 'utf-8')
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim().replace(/^['"]|['"]$/g, '');
    return acc;
  }, {});

const app = initializeApp({
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID
});
const db = getFirestore(app);

// First fetch mentors to build mapping dynamically
async function fixMentorMapping() {
  const mentorsSnap = await getDocs(collection(db, 'mentors'));
  const mentors = [];
  mentorsSnap.forEach(d => mentors.push(d.data()));

  const snapshot = await getDocs(collection(db, 'students'));
  const updates = [];

  snapshot.forEach(d => {
    const s = d.data();
    if (s.mentorName) {
      // Find matching mentor by name loosely
      const nameLower = s.mentorName.toLowerCase().replace(/usthad/g, '').trim();
      let matchedUsername = '';
      
      for (const m of mentors) {
        const mName = m.name.toLowerCase().replace(/usthad/g, '').trim();
        // If string includes part of the name
        if (nameLower.includes(mName) || mName.includes(nameLower)) {
          matchedUsername = m.username;
          break;
        }
      }

      if (matchedUsername) {
         updates.push(updateDoc(doc(db, 'students', d.id), { mentorUsername: matchedUsername }));
      }
    }
  });

  await Promise.all(updates);
  console.log(`Successfully matched and updated ${updates.length} students to their correct mentors.`);
}

fixMentorMapping().catch(console.error);
