import dotenv from 'dotenv'
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};
dotenv.config({ path: '.env.local' })

console.log({
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
})

const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: serviceAccountJson
          ? cert(JSON.parse(serviceAccountJson) as ServiceAccount)
          : cert({
              projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
              clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
      });

const db = getFirestore(app);

const teams = [
  {
    id: "inf",
    name: "Informatika",
    prodi: "Teknik Informatika",
    color: "#22d3ee",
  },
  { id: "si", name: "Sistem Informasi", prodi: "Sistem Informasi", color: "#6366f1" },
  { id: "sipil", name: "Sipil", prodi: "Teknik Sipil", color: "#f97316" },
  { id: "industri", name: "Industri", prodi: "Teknik Industri", color: "#10b981" },
  { id: "arsi", name: "Arsitektur", prodi: "Arsitektur", color: "#f43f5e" },
];

const questions = Array.from({ length: 10 }).map((_, index) => ({
  id: `q${index + 1}`,
  number: index + 1,
  category: index % 2 === 0 ? "GENERAL" : "LOGIC",
  text: `Contoh pertanyaan nomor ${index + 1}.`,
  answer_key: `Jawaban ${index + 1}`,
  is_active: false,
}));

const seed = async () => {
  const batch = db.batch();

  teams.forEach((team) => {
    const ref = db.collection("teams").doc(team.id);
    batch.set(ref, {
      ...team,
      score_phase1: 50,
      topic_phase2: "",
      ai_timer_remaining: 1800,
      ai_timer_last_started: null,
      is_ai_active: false,
      total_score_phase2: 0,
      total_score_phase3: 0,
      final_score: 0,
    });
  });

  questions.forEach((question) => {
    const { id, ...rest } = question;
    batch.set(db.collection("questions_phase1").doc(id), rest);
  });

  batch.set(db.collection("game_state").doc("main"), {
    active_phase: "IDLE",
    p1_question_id: null,
    p1_show_answer: false,
    p1_timer_end: null,
    p1_buzzer_open: false,
    p1_buzzer_locked_by: null,
    p1_pot_score: 0,
    p3_active_team_id: null,
    p1_settings: {
      general_count: 5,
      logic_count: 5,
      shuffle_questions: false,
    },
  });

  await batch.commit();

  console.log("Seed completed.");
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
