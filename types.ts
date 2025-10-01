export interface FileWithPreview {
  file: File;
  preview: string;
}

export interface OptionState {
  enabled: boolean;
  value: string;
  customFiles: FileWithPreview[];
  customRequest: string;
}

export interface GenerationParams {
  characterImages: File[];
  clothing: OptionState;
  background: OptionState;
  vehicle: OptionState;
  celebrity: OptionState;
  weather: OptionState;
  additionalRequest: string;
  adjustSkinTone: boolean;
  applyMakeup: boolean;
  onProgress?: (current: number, total: number) => void;
}