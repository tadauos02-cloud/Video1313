
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

type PluginProvider = {
  id: string
  name: string
  description: string
  capabilities: Array<'image' | 'video'>
  keyLabel: string
  keyPlaceholder: string
  docsUrl: string
  pricingNote: string
  connectionTest: 'identity' | 'on-first-use'
  configured: boolean
}

type PluginActionResult = {
  success: boolean
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
      listProviders: () => Promise<{ providers: PluginProvider[] }>
      saveProviderKey: (providerId: string, apiKey: string) => Promise<PluginActionResult>
      removeProviderKey: (providerId: string) => Promise<PluginActionResult>
      testProviderConnection: (providerId: string) => Promise<PluginActionResult>
    }
  }
}
