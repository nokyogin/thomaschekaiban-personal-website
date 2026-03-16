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

// Health data — populated from DB via CSV upload
export const healthData: HealthRecord[] = [];
