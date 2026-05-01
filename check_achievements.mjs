import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAJOaNxOe5Ykp9C_LC0_vddN4z_B3hqS8w",
  authDomain: "student-achievement-d8242.firebaseapp.com",
  databaseURL: "https://student-achievement-d8242-default-rtdb.firebaseio.com",
  projectId: "student-achievement-d8242",
  storageBucket: "student-achievement-d8242.firebasestorage.app",
  messagingSenderId: "880105558850",
  appId: "1:880105558850:web:b6970bcb218c5bcc286edb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAchievements() {
  console.log("Fetching data...");
  const studentsSnap = await getDocs(collection(db, "students"));
  const studentIds = new Set();
  studentsSnap.forEach(doc => studentIds.add(doc.id));
  console.log(`Found ${studentIds.size} active students.`);

  const achSnap = await getDocs(collection(db, "achievements"));
  let totalAchievements = 0;
  let orphanedAchievements = [];

  achSnap.forEach(document => {
    totalAchievements++;
    const data = document.data();
    if (!studentIds.has(data.studentId)) {
      orphanedAchievements.push(document.id);
    }
  });

  console.log(`Total achievements currently in database: ${totalAchievements}`);
  console.log(`Orphaned achievements (belonging to deleted students): ${orphanedAchievements.length}`);

  if (orphanedAchievements.length > 0) {
    console.log("Cleaning up orphaned achievements...");
    for (const id of orphanedAchievements) {
      await deleteDoc(doc(db, "achievements", id));
      console.log(`Deleted orphaned achievement: ${id}`);
    }
    console.log(`Cleanup complete. New total: ${totalAchievements - orphanedAchievements.length}`);
  }
  
  process.exit(0);
}

checkAchievements().catch(console.error);
