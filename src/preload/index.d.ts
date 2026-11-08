
import { ElectronAPI } from '@electron-toolkit/preload'

type ComfyUIStatus = {
  connected: boolean
  message: string
  gpuName?: string
  vramTotalGB?: number
  vramFreeGB?: number
  resolutions: number[]
  recommendedResolutions: number[]
}

type GenerateImageRequest = {
  prompt: string
  width: number
  height: number
}

type GenerateImageResult = {
  success: boolean
  imageDataUrl?: string
  filename?: string
  message: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      checkComfyUI: () => Promise<ComfyUIStatus>
      generateImage: (
        request: GenerateImageRequest
      ) => Promise<GenerateImageResult>
    }
  }
}
