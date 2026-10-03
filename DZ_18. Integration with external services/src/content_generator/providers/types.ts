export interface ProviderHealth {
  ok: boolean;
  provider: string;
  detail?: string;
}

export interface AvatarDto {
  id: string;
  name: string;
  previewUrl?: string;
}

export interface VoiceDto {
  id: string;
  name: string;
  language?: string;
  gender?: string;
  previewUrl?: string;
}

export interface AvatarProvider {
  health(): Promise<ProviderHealth>;
  listAvatars(): Promise<AvatarDto[]>;
  listVoices(): Promise<VoiceDto[]>;
  generateVideo?(input: {
    avatarId: string;
    voiceId: string;
    script: string;
  }): Promise<{ jobId: string }>;
}

export interface ImageProvider {
  health(): Promise<ProviderHealth>;
  generate(input: { prompt: string; negativePrompt?: string }): Promise<{ assetId: string; url?: string }>;
}

export interface TTSProvider {
  health(): Promise<ProviderHealth>;
  synthesize(input: { voiceId: string; text: string }): Promise<{ assetId: string; url?: string }>;
}

export interface VideoProvider {
  health(): Promise<ProviderHealth>;
  generate(input: { prompt: string; sourceAssetIds?: string[] }): Promise<{ jobId: string }>;
}
