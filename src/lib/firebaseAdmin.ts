import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

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

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
