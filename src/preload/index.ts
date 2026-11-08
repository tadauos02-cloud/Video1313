import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  checkComfyUI: () => ipcRenderer.invoke('comfyui:check-status'),

  generateImage: (request: {
    prompt: string
    width: number
    height: number
  }) => ipcRenderer.invoke('comfyui:generate-image', request),

  listProviders: () => ipcRenderer.invoke('plugins:list-providers'),
  saveProviderKey: (providerId: string, apiKey: string) =>
    ipcRenderer.invoke('plugins:save-key', { providerId, apiKey }),
  removeProviderKey: (providerId: string) =>
    ipcRenderer.invoke('plugins:remove-key', providerId),
  testProviderConnection: (providerId: string) =>
    ipcRenderer.invoke('plugins:test-connection', providerId)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose preload APIs:', error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}