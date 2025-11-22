export interface BusinessCardData {
  fullName: string;
  jobTitle: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  notes: string;
}

export enum AppView {
  HOME = 'HOME',
  CAMERA = 'CAMERA',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  HISTORY = 'HISTORY'
}

export interface ScanHistoryItem extends BusinessCardData {
  id: string;
  timestamp: number;
}