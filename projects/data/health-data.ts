export interface HealthRecord {
  time: string;
  weight: number;
  bmi: number;
  bodyFat: number;
  muscleMass: number;
  bmr: number;
  water: number;
  bodyFatMass: number;
  leanBodyMass: number;
  boneMass: number;
  visceralFat: number;
  protein: number;
  skeletalMuscleMass: number;
  subcutaneousFat: number;
  bodyAge: number;
}

// Tom's health data — filtered to entries with valid measurements (BMI > 0)
// Sorted chronologically (oldest first)
export const healthData: HealthRecord[] = [
  { time: "2024-01-14", weight: 63.85, bmi: 20.3, bodyFat: 14.2, muscleMass: 52.1, bmr: 1431, water: 58.8, bodyFatMass: 9, leanBodyMass: 54.85, boneMass: 2.7, visceralFat: 6, protein: 18.0, skeletalMuscleMass: 28.39, subcutaneousFat: 12.8, bodyAge: 29 },
  { time: "2024-01-14", weight: 63.75, bmi: 20.8, bodyFat: 15.0, muscleMass: 51.5, bmr: 1431, water: 58.3, bodyFatMass: 9.5, leanBodyMass: 54.25, boneMass: 2.7, visceralFat: 6, protein: 17.7, skeletalMuscleMass: 28.1, subcutaneousFat: 13.4, bodyAge: 29 },
  { time: "2024-01-16", weight: 62.6, bmi: 20.4, bodyFat: 14.2, muscleMass: 51.1, bmr: 1415, water: 58.8, bodyFatMass: 8.8, leanBodyMass: 53.8, boneMass: 2.7, visceralFat: 5, protein: 17.9, skeletalMuscleMass: 27.79, subcutaneousFat: 12.7, bodyAge: 29 },
  { time: "2024-01-17", weight: 62.85, bmi: 20.5, bodyFat: 14.3, muscleMass: 51.2, bmr: 1418, water: 58.7, bodyFatMass: 8.9, leanBodyMass: 53.95, boneMass: 2.7, visceralFat: 6, protein: 18.0, skeletalMuscleMass: 27.79, subcutaneousFat: 12.8, bodyAge: 29 },
  { time: "2024-01-18", weight: 62.85, bmi: 20.5, bodyFat: 14.2, muscleMass: 51.2, bmr: 1418, water: 58.8, bodyFatMass: 8.9, leanBodyMass: 53.95, boneMass: 2.7, visceralFat: 6, protein: 17.9, skeletalMuscleMass: 27.89, subcutaneousFat: 12.8, bodyAge: 29 },
  { time: "2024-01-19", weight: 62.65, bmi: 20.4, bodyFat: 14.0, muscleMass: 51.2, bmr: 1415, water: 58.9, bodyFatMass: 8.7, leanBodyMass: 53.95, boneMass: 2.7, visceralFat: 5, protein: 18.0, skeletalMuscleMass: 27.79, subcutaneousFat: 12.5, bodyAge: 29 },
  { time: "2024-01-20", weight: 62.25, bmi: 20.3, bodyFat: 13.8, muscleMass: 51.0, bmr: 1409, water: 59.0, bodyFatMass: 8.5, leanBodyMass: 53.75, boneMass: 2.7, visceralFat: 5, protein: 18.1, skeletalMuscleMass: 27.7, subcutaneousFat: 12.3, bodyAge: 29 },
  { time: "2024-01-27", weight: 61.5, bmi: 20.0, bodyFat: 13.4, muscleMass: 50.6, bmr: 1398, water: 59.3, bodyFatMass: 8.2, leanBodyMass: 53.3, boneMass: 2.7, visceralFat: 5, protein: 18.1, skeletalMuscleMass: 27.5, subcutaneousFat: 12.1, bodyAge: 29 },
  { time: "2024-02-08", weight: 63.8, bmi: 20.8, bodyFat: 14.6, muscleMass: 51.8, bmr: 1433, water: 58.5, bodyFatMass: 9.3, leanBodyMass: 54.5, boneMass: 2.7, visceralFat: 6, protein: 17.9, skeletalMuscleMass: 28.2, subcutaneousFat: 13.1, bodyAge: 29 },
  { time: "2024-02-10", weight: 64.25, bmi: 20.9, bodyFat: 15.2, muscleMass: 51.8, bmr: 1439, water: 58.1, bodyFatMass: 9.7, leanBodyMass: 54.55, boneMass: 2.7, visceralFat: 6, protein: 17.8, skeletalMuscleMass: 28.2, subcutaneousFat: 13.6, bodyAge: 29 },
  { time: "2024-02-12", weight: 61.45, bmi: 20.0, bodyFat: 13.4, muscleMass: 50.5, bmr: 1397, water: 59.3, bodyFatMass: 8.2, leanBodyMass: 53.25, boneMass: 2.7, visceralFat: 5, protein: 18.1, skeletalMuscleMass: 27.5, subcutaneousFat: 12.1, bodyAge: 29 },
  { time: "2024-02-15", weight: 62.35, bmi: 20.3, bodyFat: 14.1, muscleMass: 50.9, bmr: 1410, water: 58.8, bodyFatMass: 8.7, leanBodyMass: 53.65, boneMass: 2.7, visceralFat: 5, protein: 18.0, skeletalMuscleMass: 27.7, subcutaneousFat: 12.6, bodyAge: 29 },
  { time: "2024-02-18", weight: 64.4, bmi: 21.0, bodyFat: 15.0, muscleMass: 52.1, bmr: 1442, water: 58.3, bodyFatMass: 9.6, leanBodyMass: 54.8, boneMass: 2.7, visceralFat: 6, protein: 17.8, skeletalMuscleMass: 28.39, subcutaneousFat: 13.4, bodyAge: 29 },
  { time: "2024-02-24", weight: 63.1, bmi: 20.6, bodyFat: 14.6, muscleMass: 51.2, bmr: 1422, water: 58.5, bodyFatMass: 9.2, leanBodyMass: 53.9, boneMass: 2.7, visceralFat: 6, protein: 17.9, skeletalMuscleMass: 27.89, subcutaneousFat: 13.1, bodyAge: 29 },
  { time: "2024-02-28", weight: 63.7, bmi: 20.8, bodyFat: 15.1, muscleMass: 51.4, bmr: 1431, water: 58.2, bodyFatMass: 9.6, leanBodyMass: 54.1, boneMass: 2.7, visceralFat: 6, protein: 17.8, skeletalMuscleMass: 28.0, subcutaneousFat: 13.5, bodyAge: 29 },
  { time: "2024-03-05", weight: 62.3, bmi: 20.3, bodyFat: 14.0, muscleMass: 50.9, bmr: 1410, water: 58.9, bodyFatMass: 8.7, leanBodyMass: 53.59, boneMass: 2.7, visceralFat: 5, protein: 18.0, skeletalMuscleMass: 27.7, subcutaneousFat: 12.6, bodyAge: 29 },
  { time: "2024-03-06", weight: 62.5, bmi: 20.4, bodyFat: 14.2, muscleMass: 51.0, bmr: 1413, water: 58.8, bodyFatMass: 8.8, leanBodyMass: 53.7, boneMass: 2.7, visceralFat: 5, protein: 17.9, skeletalMuscleMass: 27.7, subcutaneousFat: 12.7, bodyAge: 29 },
  { time: "2024-03-10", weight: 63.0, bmi: 20.5, bodyFat: 14.3, muscleMass: 51.3, bmr: 1421, water: 58.7, bodyFatMass: 9.0, leanBodyMass: 54.0, boneMass: 2.7, visceralFat: 6, protein: 18.0, skeletalMuscleMass: 27.89, subcutaneousFat: 12.9, bodyAge: 29 },
  { time: "2024-03-12", weight: 62.45, bmi: 20.3, bodyFat: 13.7, muscleMass: 51.2, bmr: 1412, water: 59.1, bodyFatMass: 8.5, leanBodyMass: 53.95, boneMass: 2.7, visceralFat: 5, protein: 18.1, skeletalMuscleMass: 27.79, subcutaneousFat: 12.3, bodyAge: 29 },
  { time: "2024-03-29", weight: 61.65, bmi: 20.1, bodyFat: 13.4, muscleMass: 50.7, bmr: 1400, water: 59.3, bodyFatMass: 8.2, leanBodyMass: 53.45, boneMass: 2.7, visceralFat: 5, protein: 18.1, skeletalMuscleMass: 27.6, subcutaneousFat: 12.0, bodyAge: 29 },
  { time: "2024-04-16", weight: 64.55, bmi: 21.0, bodyFat: 15.8, muscleMass: 51.7, bmr: 1443, water: 57.7, bodyFatMass: 10.1, leanBodyMass: 54.44, boneMass: 2.7, visceralFat: 6, protein: 17.6, skeletalMuscleMass: 28.2, subcutaneousFat: 14.1, bodyAge: 29 },
  { time: "2024-05-07", weight: 67.1, bmi: 21.9, bodyFat: 17.3, muscleMass: 52.7, bmr: 1482, water: 56.6, bodyFatMass: 11.6, leanBodyMass: 55.49, boneMass: 2.8, visceralFat: 8, protein: 17.3, skeletalMuscleMass: 28.7, subcutaneousFat: 15.5, bodyAge: 30 },
  { time: "2024-05-08", weight: 65.7, bmi: 21.4, bodyFat: 16.5, muscleMass: 52.2, bmr: 1461, water: 57.2, bodyFatMass: 10.8, leanBodyMass: 54.9, boneMass: 2.7, visceralFat: 7, protein: 17.6, skeletalMuscleMass: 28.39, subcutaneousFat: 14.8, bodyAge: 29 },
  { time: "2024-07-04", weight: 64.4, bmi: 21.0, bodyFat: 16.1, muscleMass: 51.4, bmr: 1442, water: 57.5, bodyFatMass: 10.3, leanBodyMass: 54.1, boneMass: 2.7, visceralFat: 6, protein: 17.6, skeletalMuscleMass: 28.0, subcutaneousFat: 14.4, bodyAge: 29 },
  { time: "2024-07-08", weight: 65.65, bmi: 21.4, bodyFat: 16.7, muscleMass: 52.0, bmr: 1459, water: 57.1, bodyFatMass: 10.9, leanBodyMass: 54.75, boneMass: 2.7, visceralFat: 7, protein: 17.5, skeletalMuscleMass: 28.29, subcutaneousFat: 14.9, bodyAge: 29 },
  { time: "2024-07-19", weight: 65.25, bmi: 21.2, bodyFat: 16.2, muscleMass: 52.0, bmr: 1453, water: 57.4, bodyFatMass: 10.5, leanBodyMass: 54.75, boneMass: 2.7, visceralFat: 7, protein: 17.6, skeletalMuscleMass: 28.29, subcutaneousFat: 14.5, bodyAge: 29 },
  { time: "2024-07-20", weight: 65.85, bmi: 21.4, bodyFat: 16.5, muscleMass: 52.3, bmr: 1462, water: 57.2, bodyFatMass: 10.8, leanBodyMass: 55.05, boneMass: 2.7, visceralFat: 7, protein: 17.6, skeletalMuscleMass: 28.5, subcutaneousFat: 14.7, bodyAge: 29 },
  { time: "2024-08-09", weight: 65.05, bmi: 21.2, bodyFat: 16.1, muscleMass: 51.9, bmr: 1451, water: 57.5, bodyFatMass: 10.4, leanBodyMass: 54.65, boneMass: 2.7, visceralFat: 7, protein: 17.6, skeletalMuscleMass: 28.2, subcutaneousFat: 14.4, bodyAge: 29 },
  { time: "2024-08-13", weight: 64.3, bmi: 20.9, bodyFat: 15.1, muscleMass: 51.9, bmr: 1440, water: 58.2, bodyFatMass: 9.7, leanBodyMass: 54.59, boneMass: 2.7, visceralFat: 6, protein: 17.8, skeletalMuscleMass: 28.29, subcutaneousFat: 13.6, bodyAge: 29 },
  { time: "2024-08-26", weight: 65.5, bmi: 21.3, bodyFat: 16.4, muscleMass: 52.1, bmr: 1458, water: 57.3, bodyFatMass: 10.7, leanBodyMass: 54.8, boneMass: 2.7, visceralFat: 7, protein: 17.5, skeletalMuscleMass: 28.39, subcutaneousFat: 14.7, bodyAge: 29 },
  { time: "2024-08-31", weight: 63.15, bmi: 20.6, bodyFat: 14.5, muscleMass: 51.3, bmr: 1422, water: 58.6, bodyFatMass: 9.1, leanBodyMass: 54.05, boneMass: 2.7, visceralFat: 6, protein: 17.9, skeletalMuscleMass: 27.89, subcutaneousFat: 13.0, bodyAge: 29 },
  { time: "2024-09-14", weight: 64.3, bmi: 20.9, bodyFat: 15.6, muscleMass: 51.6, bmr: 1440, water: 57.8, bodyFatMass: 10.0, leanBodyMass: 54.3, boneMass: 2.7, visceralFat: 6, protein: 17.7, skeletalMuscleMass: 28.1, subcutaneousFat: 14.0, bodyAge: 29 },
  { time: "2024-10-06", weight: 65.6, bmi: 21.4, bodyFat: 16.5, muscleMass: 52.1, bmr: 1459, water: 57.2, bodyFatMass: 10.8, leanBodyMass: 54.8, boneMass: 2.7, visceralFat: 7, protein: 17.6, skeletalMuscleMass: 28.39, subcutaneousFat: 14.8, bodyAge: 29 },
  { time: "2024-10-25", weight: 65.4, bmi: 21.3, bodyFat: 16.3, muscleMass: 52.1, bmr: 1456, water: 57.3, bodyFatMass: 10.6, leanBodyMass: 54.8, boneMass: 2.7, visceralFat: 7, protein: 17.6, skeletalMuscleMass: 28.29, subcutaneousFat: 14.6, bodyAge: 29 },
  { time: "2024-12-04", weight: 66.6, bmi: 21.7, bodyFat: 17.1, muscleMass: 52.5, bmr: 1474, water: 56.8, bodyFatMass: 11.3, leanBodyMass: 55.3, boneMass: 2.8, visceralFat: 7, protein: 17.3, skeletalMuscleMass: 28.7, subcutaneousFat: 15.2, bodyAge: 30 },
  { time: "2024-12-08", weight: 68.55, bmi: 22.3, bodyFat: 18.6, muscleMass: 53.0, bmr: 1503, water: 55.7, bodyFatMass: 12.7, leanBodyMass: 55.84, boneMass: 2.8, visceralFat: 8, protein: 17.1, skeletalMuscleMass: 28.89, subcutaneousFat: 16.6, bodyAge: 30 },
  { time: "2025-01-05", weight: 69.15, bmi: 22.5, bodyFat: 19.1, muscleMass: 53.2, bmr: 1503, water: 55.4, bodyFatMass: 13.1, leanBodyMass: 56.05, boneMass: 2.8, visceralFat: 9, protein: 17.0, skeletalMuscleMass: 29.0, subcutaneousFat: 16.9, bodyAge: 31 },
  { time: "2025-01-07", weight: 69.25, bmi: 22.5, bodyFat: 19.3, muscleMass: 53.1, bmr: 1504, water: 55.2, bodyFatMass: 13.3, leanBodyMass: 55.95, boneMass: 2.8, visceralFat: 9, protein: 17.0, skeletalMuscleMass: 28.89, subcutaneousFat: 17.1, bodyAge: 31 },
  { time: "2025-01-16", weight: 68.4, bmi: 22.3, bodyFat: 19.0, muscleMass: 52.7, bmr: 1492, water: 55.5, bodyFatMass: 12.9, leanBodyMass: 55.5, boneMass: 2.8, visceralFat: 8, protein: 16.9, skeletalMuscleMass: 28.7, subcutaneousFat: 16.8, bodyAge: 31 },
  { time: "2025-02-17", weight: 66.7, bmi: 21.7, bodyFat: 17.1, muscleMass: 52.5, bmr: 1467, water: 56.8, bodyFatMass: 11.4, leanBodyMass: 55.3, boneMass: 2.8, visceralFat: 8, protein: 17.3, skeletalMuscleMass: 28.7, subcutaneousFat: 15.3, bodyAge: 31 },
  { time: "2025-02-23", weight: 65.55, bmi: 21.3, bodyFat: 16.8, muscleMass: 51.8, bmr: 1449, water: 57.0, bodyFatMass: 11.0, leanBodyMass: 54.55, boneMass: 2.7, visceralFat: 7, protein: 17.5, skeletalMuscleMass: 28.2, subcutaneousFat: 15.1, bodyAge: 30 },
  { time: "2025-03-05", weight: 66.85, bmi: 21.8, bodyFat: 17.5, muscleMass: 52.4, bmr: 1468, water: 56.5, bodyFatMass: 11.6, leanBodyMass: 55.24, boneMass: 2.8, visceralFat: 8, protein: 17.2, skeletalMuscleMass: 28.6, subcutaneousFat: 15.5, bodyAge: 31 },
  { time: "2025-03-14", weight: 67.25, bmi: 21.9, bodyFat: 18.0, muscleMass: 52.4, bmr: 1474, water: 56.2, bodyFatMass: 12.0, leanBodyMass: 55.25, boneMass: 2.8, visceralFat: 8, protein: 17.1, skeletalMuscleMass: 28.6, subcutaneousFat: 15.9, bodyAge: 31 },
  { time: "2025-03-20", weight: 66.15, bmi: 21.5, bodyFat: 17.1, muscleMass: 52.1, bmr: 1458, water: 56.8, bodyFatMass: 11.3, leanBodyMass: 54.85, boneMass: 2.7, visceralFat: 7, protein: 17.4, skeletalMuscleMass: 28.39, subcutaneousFat: 15.3, bodyAge: 31 },
  { time: "2025-04-08", weight: 68.4, bmi: 22.3, bodyFat: 18.3, muscleMass: 53.1, bmr: 1492, water: 55.9, bodyFatMass: 12.5, leanBodyMass: 55.9, boneMass: 2.8, visceralFat: 8, protein: 17.2, skeletalMuscleMass: 29.0, subcutaneousFat: 16.3, bodyAge: 31 },
  { time: "2025-04-26", weight: 66.85, bmi: 21.8, bodyFat: 17.5, muscleMass: 52.4, bmr: 1468, water: 56.5, bodyFatMass: 11.6, leanBodyMass: 55.24, boneMass: 2.8, visceralFat: 8, protein: 17.2, skeletalMuscleMass: 28.6, subcutaneousFat: 15.5, bodyAge: 31 },
  { time: "2025-05-11", weight: 67.9, bmi: 22.1, bodyFat: 18.0, muscleMass: 52.9, bmr: 1485, water: 56.2, bodyFatMass: 12.2, leanBodyMass: 55.7, boneMass: 2.8, visceralFat: 8, protein: 17.1, skeletalMuscleMass: 28.89, subcutaneousFat: 16.0, bodyAge: 31 },
  { time: "2025-05-29", weight: 68.55, bmi: 22.3, bodyFat: 18.8, muscleMass: 52.9, bmr: 1494, water: 55.6, bodyFatMass: 12.8, leanBodyMass: 55.75, boneMass: 2.8, visceralFat: 9, protein: 17.0, skeletalMuscleMass: 28.79, subcutaneousFat: 16.7, bodyAge: 31 },
  { time: "2025-06-14", weight: 68.3, bmi: 22.3, bodyFat: 18.7, muscleMass: 52.8, bmr: 1491, water: 55.7, bodyFatMass: 12.7, leanBodyMass: 55.59, boneMass: 2.8, visceralFat: 8, protein: 17.0, skeletalMuscleMass: 28.79, subcutaneousFat: 16.6, bodyAge: 31 },
  { time: "2025-06-29", weight: 66.1, bmi: 21.5, bodyFat: 16.8, muscleMass: 52.3, bmr: 1458, water: 57.0, bodyFatMass: 11.1, leanBodyMass: 54.99, boneMass: 2.7, visceralFat: 7, protein: 17.5, skeletalMuscleMass: 28.5, subcutaneousFat: 15.0, bodyAge: 31 },
  { time: "2025-07-01", weight: 66.45, bmi: 21.6, bodyFat: 17.1, muscleMass: 52.4, bmr: 1462, water: 56.8, bodyFatMass: 11.3, leanBodyMass: 55.15, boneMass: 2.7, visceralFat: 7, protein: 17.4, skeletalMuscleMass: 28.6, subcutaneousFat: 15.2, bodyAge: 31 },
  { time: "2025-08-12", weight: 65.75, bmi: 21.4, bodyFat: 16.7, muscleMass: 52.1, bmr: 1452, water: 57.1, bodyFatMass: 10.9, leanBodyMass: 54.85, boneMass: 2.7, visceralFat: 7, protein: 17.5, skeletalMuscleMass: 28.39, subcutaneousFat: 14.8, bodyAge: 30 },
  { time: "2025-08-27", weight: 67.85, bmi: 22.1, bodyFat: 17.9, muscleMass: 52.9, bmr: 1483, water: 56.2, bodyFatMass: 12.1, leanBodyMass: 55.74, boneMass: 2.8, visceralFat: 8, protein: 17.2, skeletalMuscleMass: 28.89, subcutaneousFat: 15.9, bodyAge: 31 },
  { time: "2025-09-30", weight: 69.15, bmi: 22.5, bodyFat: 19.1, muscleMass: 53.2, bmr: 1503, water: 55.4, bodyFatMass: 13.1, leanBodyMass: 56.05, boneMass: 2.8, visceralFat: 9, protein: 17.0, skeletalMuscleMass: 29.0, subcutaneousFat: 16.9, bodyAge: 31 },
  { time: "2025-11-04", weight: 71.5, bmi: 23.3, bodyFat: 21.0, muscleMass: 53.7, bmr: 1538, water: 54.1, bodyFatMass: 15.0, leanBodyMass: 56.5, boneMass: 2.8, visceralFat: 10, protein: 16.6, skeletalMuscleMass: 29.29, subcutaneousFat: 18.7, bodyAge: 32 },
  { time: "2025-11-15", weight: 72.0, bmi: 23.5, bodyFat: 21.1, muscleMass: 54.1, bmr: 1546, water: 54.0, bodyFatMass: 15.1, leanBodyMass: 56.9, boneMass: 2.8, visceralFat: 10, protein: 16.6, skeletalMuscleMass: 29.5, subcutaneousFat: 18.6, bodyAge: 32 },
  { time: "2025-11-22", weight: 71.75, bmi: 23.4, bodyFat: 21.3, muscleMass: 53.7, bmr: 1541, water: 53.9, bodyFatMass: 15.2, leanBodyMass: 56.55, boneMass: 2.8, visceralFat: 10, protein: 16.5, skeletalMuscleMass: 29.29, subcutaneousFat: 18.8, bodyAge: 32 },
  { time: "2025-12-06", weight: 72.55, bmi: 23.6, bodyFat: 21.6, muscleMass: 54.1, bmr: 1553, water: 53.7, bodyFatMass: 15.6, leanBodyMass: 56.94, boneMass: 2.8, visceralFat: 10, protein: 16.5, skeletalMuscleMass: 29.6, subcutaneousFat: 19.1, bodyAge: 32 },
  { time: "2025-12-30", weight: 74.3, bmi: 24.2, bodyFat: 22.1, muscleMass: 55.0, bmr: 1571, water: 53.4, bodyFatMass: 16.4, leanBodyMass: 57.9, boneMass: 2.9, visceralFat: 10, protein: 16.3, skeletalMuscleMass: 30.2, subcutaneousFat: 19.6, bodyAge: 33 },
  { time: "2026-01-03", weight: 73.45, bmi: 23.9, bodyFat: 22.2, muscleMass: 54.3, bmr: 1558, water: 53.3, bodyFatMass: 16.2, leanBodyMass: 57.25, boneMass: 2.9, visceralFat: 10, protein: 16.2, skeletalMuscleMass: 29.7, subcutaneousFat: 19.6, bodyAge: 33 },
  { time: "2026-01-23", weight: 74.8, bmi: 24.4, bodyFat: 22.7, muscleMass: 55.0, bmr: 1579, water: 53.0, bodyFatMass: 16.9, leanBodyMass: 57.9, boneMass: 2.9, visceralFat: 10, protein: 16.1, skeletalMuscleMass: 30.2, subcutaneousFat: 20.0, bodyAge: 34 },
  { time: "2026-03-03", weight: 76.55, bmi: 24.9, bodyFat: 23.6, muscleMass: 55.6, bmr: 1604, water: 52.3, bodyFatMass: 18.0, leanBodyMass: 58.55, boneMass: 2.9, visceralFat: 11, protein: 16.1, skeletalMuscleMass: 30.5, subcutaneousFat: 20.8, bodyAge: 34 },
];
