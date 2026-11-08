import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  checkComfyUI: () => ipcRenderer.invoke('comfyui:check-status'),

  generateImage: (request: {
    prompt: string
    width: number
    height: number
  }) => ipcRenderer.invoke('comfyui:generate-image', request)
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