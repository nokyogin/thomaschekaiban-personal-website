export interface UserProfile {
  heightCm: number;
  birthDate: string; // ISO date
  sex: "male" | "female";
}

export const userProfile: UserProfile = {
  heightCm: 176.5,
  birthDate: "1994-07-01",
  sex: "male",
};

export function getUserAge(): number {
  const now = new Date();
  const birth = new Date(userProfile.birthDate);
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export interface HealthRecord {
  time: string;
  weight: number;
  bodyFat: number;
  muscleMass: number;
  skeletalMuscleMass: number;
  bmr: number;
  visceralFat: number;
  water: number;
}

// Tom's health data — fallback when DB is empty
// Sorted chronologically (oldest first)
export const healthData: HealthRecord[] = [
  { time: "2024-01-14", weight: 63.85, bodyFat: 14.2, muscleMass: 52.1, bmr: 1431, water: 58.8, visceralFat: 6, skeletalMuscleMass: 28.39 },
  { time: "2024-01-14", weight: 63.75, bodyFat: 15.0, muscleMass: 51.5, bmr: 1431, water: 58.3, visceralFat: 6, skeletalMuscleMass: 28.1 },
  { time: "2024-01-16", weight: 62.6, bodyFat: 14.2, muscleMass: 51.1, bmr: 1415, water: 58.8, visceralFat: 5, skeletalMuscleMass: 27.79 },
  { time: "2024-01-17", weight: 62.85, bodyFat: 14.3, muscleMass: 51.2, bmr: 1418, water: 58.7, visceralFat: 6, skeletalMuscleMass: 27.79 },
  { time: "2024-01-18", weight: 62.85, bodyFat: 14.2, muscleMass: 51.2, bmr: 1418, water: 58.8, visceralFat: 6, skeletalMuscleMass: 27.89 },
  { time: "2024-01-19", weight: 62.65, bodyFat: 14.0, muscleMass: 51.2, bmr: 1415, water: 58.9, visceralFat: 5, skeletalMuscleMass: 27.79 },
  { time: "2024-01-20", weight: 62.25, bodyFat: 13.8, muscleMass: 51.0, bmr: 1409, water: 59.0, visceralFat: 5, skeletalMuscleMass: 27.7 },
  { time: "2024-01-27", weight: 61.5, bodyFat: 13.4, muscleMass: 50.6, bmr: 1398, water: 59.3, visceralFat: 5, skeletalMuscleMass: 27.5 },
  { time: "2024-02-08", weight: 63.8, bodyFat: 14.6, muscleMass: 51.8, bmr: 1433, water: 58.5, visceralFat: 6, skeletalMuscleMass: 28.2 },
  { time: "2024-02-10", weight: 64.25, bodyFat: 15.2, muscleMass: 51.8, bmr: 1439, water: 58.1, visceralFat: 6, skeletalMuscleMass: 28.2 },
  { time: "2024-02-12", weight: 61.45, bodyFat: 13.4, muscleMass: 50.5, bmr: 1397, water: 59.3, visceralFat: 5, skeletalMuscleMass: 27.5 },
  { time: "2024-02-15", weight: 62.35, bodyFat: 14.1, muscleMass: 50.9, bmr: 1410, water: 58.8, visceralFat: 5, skeletalMuscleMass: 27.7 },
  { time: "2024-02-18", weight: 64.4, bodyFat: 15.0, muscleMass: 52.1, bmr: 1442, water: 58.3, visceralFat: 6, skeletalMuscleMass: 28.39 },
  { time: "2024-02-24", weight: 63.1, bodyFat: 14.6, muscleMass: 51.2, bmr: 1422, water: 58.5, visceralFat: 6, skeletalMuscleMass: 27.89 },
  { time: "2024-02-28", weight: 63.7, bodyFat: 15.1, muscleMass: 51.4, bmr: 1431, water: 58.2, visceralFat: 6, skeletalMuscleMass: 28.0 },
  { time: "2024-03-05", weight: 62.3, bodyFat: 14.0, muscleMass: 50.9, bmr: 1410, water: 58.9, visceralFat: 5, skeletalMuscleMass: 27.7 },
  { time: "2024-03-06", weight: 62.5, bodyFat: 14.2, muscleMass: 51.0, bmr: 1413, water: 58.8, visceralFat: 5, skeletalMuscleMass: 27.7 },
  { time: "2024-03-10", weight: 63.0, bodyFat: 14.3, muscleMass: 51.3, bmr: 1421, water: 58.7, visceralFat: 6, skeletalMuscleMass: 27.89 },
  { time: "2024-03-12", weight: 62.45, bodyFat: 13.7, muscleMass: 51.2, bmr: 1412, water: 59.1, visceralFat: 5, skeletalMuscleMass: 27.79 },
  { time: "2024-03-29", weight: 61.65, bodyFat: 13.4, muscleMass: 50.7, bmr: 1400, water: 59.3, visceralFat: 5, skeletalMuscleMass: 27.6 },
  { time: "2024-04-16", weight: 64.55, bodyFat: 15.8, muscleMass: 51.7, bmr: 1443, water: 57.7, visceralFat: 6, skeletalMuscleMass: 28.2 },
  { time: "2024-05-07", weight: 67.1, bodyFat: 17.3, muscleMass: 52.7, bmr: 1482, water: 56.6, visceralFat: 8, skeletalMuscleMass: 28.7 },
  { time: "2024-05-08", weight: 65.7, bodyFat: 16.5, muscleMass: 52.2, bmr: 1461, water: 57.2, visceralFat: 7, skeletalMuscleMass: 28.39 },
  { time: "2024-07-04", weight: 64.4, bodyFat: 16.1, muscleMass: 51.4, bmr: 1442, water: 57.5, visceralFat: 6, skeletalMuscleMass: 28.0 },
  { time: "2024-07-08", weight: 65.65, bodyFat: 16.7, muscleMass: 52.0, bmr: 1459, water: 57.1, visceralFat: 7, skeletalMuscleMass: 28.29 },
  { time: "2024-07-19", weight: 65.25, bodyFat: 16.2, muscleMass: 52.0, bmr: 1453, water: 57.4, visceralFat: 7, skeletalMuscleMass: 28.29 },
  { time: "2024-07-20", weight: 65.85, bodyFat: 16.5, muscleMass: 52.3, bmr: 1462, water: 57.2, visceralFat: 7, skeletalMuscleMass: 28.5 },
  { time: "2024-08-09", weight: 65.05, bodyFat: 16.1, muscleMass: 51.9, bmr: 1451, water: 57.5, visceralFat: 7, skeletalMuscleMass: 28.2 },
  { time: "2024-08-13", weight: 64.3, bodyFat: 15.1, muscleMass: 51.9, bmr: 1440, water: 58.2, visceralFat: 6, skeletalMuscleMass: 28.29 },
  { time: "2024-08-26", weight: 65.5, bodyFat: 16.4, muscleMass: 52.1, bmr: 1458, water: 57.3, visceralFat: 7, skeletalMuscleMass: 28.39 },
  { time: "2024-08-31", weight: 63.15, bodyFat: 14.5, muscleMass: 51.3, bmr: 1422, water: 58.6, visceralFat: 6, skeletalMuscleMass: 27.89 },
  { time: "2024-09-14", weight: 64.3, bodyFat: 15.6, muscleMass: 51.6, bmr: 1440, water: 57.8, visceralFat: 6, skeletalMuscleMass: 28.1 },
  { time: "2024-10-06", weight: 65.6, bodyFat: 16.5, muscleMass: 52.1, bmr: 1459, water: 57.2, visceralFat: 7, skeletalMuscleMass: 28.39 },
  { time: "2024-10-25", weight: 65.4, bodyFat: 16.3, muscleMass: 52.1, bmr: 1456, water: 57.3, visceralFat: 7, skeletalMuscleMass: 28.29 },
  { time: "2024-12-04", weight: 66.6, bodyFat: 17.1, muscleMass: 52.5, bmr: 1474, water: 56.8, visceralFat: 7, skeletalMuscleMass: 28.7 },
  { time: "2024-12-08", weight: 68.55, bodyFat: 18.6, muscleMass: 53.0, bmr: 1503, water: 55.7, visceralFat: 8, skeletalMuscleMass: 28.89 },
  { time: "2025-01-05", weight: 69.15, bodyFat: 19.1, muscleMass: 53.2, bmr: 1503, water: 55.4, visceralFat: 9, skeletalMuscleMass: 29.0 },
  { time: "2025-01-07", weight: 69.25, bodyFat: 19.3, muscleMass: 53.1, bmr: 1504, water: 55.2, visceralFat: 9, skeletalMuscleMass: 28.89 },
  { time: "2025-01-16", weight: 68.4, bodyFat: 19.0, muscleMass: 52.7, bmr: 1492, water: 55.5, visceralFat: 8, skeletalMuscleMass: 28.7 },
  { time: "2025-02-17", weight: 66.7, bodyFat: 17.1, muscleMass: 52.5, bmr: 1467, water: 56.8, visceralFat: 8, skeletalMuscleMass: 28.7 },
  { time: "2025-02-23", weight: 65.55, bodyFat: 16.8, muscleMass: 51.8, bmr: 1449, water: 57.0, visceralFat: 7, skeletalMuscleMass: 28.2 },
  { time: "2025-03-05", weight: 66.85, bodyFat: 17.5, muscleMass: 52.4, bmr: 1468, water: 56.5, visceralFat: 8, skeletalMuscleMass: 28.6 },
  { time: "2025-03-14", weight: 67.25, bodyFat: 18.0, muscleMass: 52.4, bmr: 1474, water: 56.2, visceralFat: 8, skeletalMuscleMass: 28.6 },
  { time: "2025-03-20", weight: 66.15, bodyFat: 17.1, muscleMass: 52.1, bmr: 1458, water: 56.8, visceralFat: 7, skeletalMuscleMass: 28.39 },
  { time: "2025-04-08", weight: 68.4, bodyFat: 18.3, muscleMass: 53.1, bmr: 1492, water: 55.9, visceralFat: 8, skeletalMuscleMass: 29.0 },
  { time: "2025-04-26", weight: 66.85, bodyFat: 17.5, muscleMass: 52.4, bmr: 1468, water: 56.5, visceralFat: 8, skeletalMuscleMass: 28.6 },
  { time: "2025-05-11", weight: 67.9, bodyFat: 18.0, muscleMass: 52.9, bmr: 1485, water: 56.2, visceralFat: 8, skeletalMuscleMass: 28.89 },
  { time: "2025-05-29", weight: 68.55, bodyFat: 18.8, muscleMass: 52.9, bmr: 1494, water: 55.6, visceralFat: 9, skeletalMuscleMass: 28.79 },
  { time: "2025-06-14", weight: 68.3, bodyFat: 18.7, muscleMass: 52.8, bmr: 1491, water: 55.7, visceralFat: 8, skeletalMuscleMass: 28.79 },
  { time: "2025-06-29", weight: 66.1, bodyFat: 16.8, muscleMass: 52.3, bmr: 1458, water: 57.0, visceralFat: 7, skeletalMuscleMass: 28.5 },
  { time: "2025-07-01", weight: 66.45, bodyFat: 17.1, muscleMass: 52.4, bmr: 1462, water: 56.8, visceralFat: 7, skeletalMuscleMass: 28.6 },
  { time: "2025-08-12", weight: 65.75, bodyFat: 16.7, muscleMass: 52.1, bmr: 1452, water: 57.1, visceralFat: 7, skeletalMuscleMass: 28.39 },
  { time: "2025-08-27", weight: 67.85, bodyFat: 17.9, muscleMass: 52.9, bmr: 1483, water: 56.2, visceralFat: 8, skeletalMuscleMass: 28.89 },
  { time: "2025-09-30", weight: 69.15, bodyFat: 19.1, muscleMass: 53.2, bmr: 1503, water: 55.4, visceralFat: 9, skeletalMuscleMass: 29.0 },
  { time: "2025-11-04", weight: 71.5, bodyFat: 21.0, muscleMass: 53.7, bmr: 1538, water: 54.1, visceralFat: 10, skeletalMuscleMass: 29.29 },
  { time: "2025-11-15", weight: 72.0, bodyFat: 21.1, muscleMass: 54.1, bmr: 1546, water: 54.0, visceralFat: 10, skeletalMuscleMass: 29.5 },
  { time: "2025-11-22", weight: 71.75, bodyFat: 21.3, muscleMass: 53.7, bmr: 1541, water: 53.9, visceralFat: 10, skeletalMuscleMass: 29.29 },
  { time: "2025-12-06", weight: 72.55, bodyFat: 21.6, muscleMass: 54.1, bmr: 1553, water: 53.7, visceralFat: 10, skeletalMuscleMass: 29.6 },
  { time: "2025-12-30", weight: 74.3, bodyFat: 22.1, muscleMass: 55.0, bmr: 1571, water: 53.4, visceralFat: 10, skeletalMuscleMass: 30.2 },
  { time: "2026-01-03", weight: 73.45, bodyFat: 22.2, muscleMass: 54.3, bmr: 1558, water: 53.3, visceralFat: 10, skeletalMuscleMass: 29.7 },
  { time: "2026-01-23", weight: 74.8, bodyFat: 22.7, muscleMass: 55.0, bmr: 1579, water: 53.0, visceralFat: 10, skeletalMuscleMass: 30.2 },
  { time: "2026-03-03", weight: 76.55, bodyFat: 23.6, muscleMass: 55.6, bmr: 1604, water: 52.3, visceralFat: 11, skeletalMuscleMass: 30.5 },
];
