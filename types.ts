
export interface Hairstyle {
  id: string;
  name: string;
  prompt: string;
  previewUrl: string;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface GeneratedResult {
  imageUrl: string;
  prompt: string;
}

export interface SuggestedStyle {
  name: string;
  description: string;
}

export interface FaceAnalysis {
  faceShape: string;
  features: string;
  suggestions: SuggestedStyle[];
}

export type ViewAngle = 'Front' | 'Left' | 'Right' | 'Back' | 'Physics' | '3D';
