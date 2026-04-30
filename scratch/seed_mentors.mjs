import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

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

const mentors = [
  { name: "Usthad Abu Shammas Rafeeq Faisy", username: "rafeeqfaisy", password: "password123" },
  { name: "Usthad Thoyyib Hudawi", username: "thoyyibhudawi", password: "password123" },
  { name: "Usthad Yasir Hudawi", username: "yasirhudawi", password: "password123" },
  { name: "Usthad Salman Hudawi", username: "salmanhudawi", password: "password123" },
  { name: "Usthad Zakariya Hudawi", username: "zakariyahudawi", password: "password123" },
  { name: "Usthad Numan Hudawi", username: "numanhudawi", password: "password123" },
  { name: "Usthad Muhsin MC Hudawi", username: "muhsinmchudawi", password: "password123" },
  { name: "Usthad Rafi Hudawi", username: "rafihudawi", password: "password123" },
  { name: "Usthad Anver Sadiq Hudawi", username: "anversadiqhudawi", password: "password123" }
];

async function seed() {
  console.log('Seeding mentors...');
  const mentorsRef = collection(db, 'mentors');
  for (const mentor of mentors) {
    await setDoc(doc(mentorsRef, mentor.username), mentor);
    console.log(`Added mentor: ${mentor.name}`);
  }
  console.log('Done.');
  process.exit(0);
}

seed().catch(console.error);
