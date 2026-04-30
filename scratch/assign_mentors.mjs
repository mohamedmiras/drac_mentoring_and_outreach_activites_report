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

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const mentorsList = [
  'rafeeqfaisy', 'thoyyibhudawi', 'yasirhudawi', 
  'salmanhudawi', 'zakariyahudawi', 'numanhudawi', 
  'muhsinmchudawi', 'rafihudawi', 'anversadiqhudawi'
];

async function assignMentors() {
  const snapshot = await getDocs(collection(db, 'students'));
  let i = 0;
  
  const updates = [];
  snapshot.forEach(d => {
    const mentor = mentorsList[i % mentorsList.length];
    updates.push(updateDoc(doc(db, 'students', d.id), { mentorUsername: mentor }));
    i++;
  });
  
  await Promise.all(updates);
  console.log('Successfully assigned mentors to ' + updates.length + ' students.');
}

assignMentors().catch(console.error);
