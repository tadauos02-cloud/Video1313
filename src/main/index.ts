
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const COMFYUI_URL = 'http://127.0.0.1:8188'

const ALL_IMAGE_RESOLUTIONS = [
  512, 640, 768, 896, 1024, 1152, 1280, 1408, 1536,
  1664, 1792, 1920, 2048, 2176, 2304, 2432, 2560,
  2688, 2816, 2944, 3072, 3200, 3328, 3456, 3584,
  3712, 3840, 3968, 4096
]

const DEFAULT_NEGATIVE_PROMPT =
  'blurry, low quality, distorted architecture, unrealistic proportions, extra objects, text, watermark, cartoon, painting'

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

type GpuCapabilities = {
  gpuName?: string
  vramTotalGB?: number
  vramFreeGB?: number
  resolutions: number[]
  recommendedResolutions: number[]
}

function getRecommendedResolutions(vramGB: number): number[] {
  if (vramGB >= 48) {
    return ALL_IMAGE_RESOLUTIONS
  }

  if (vramGB >= 24) {
    return ALL_IMAGE_RESOLUTIONS.filter((size) => size <= 3072)
  }

  if (vramGB >= 16) {
    return ALL_IMAGE_RESOLUTIONS.filter((size) => size <= 2560)
  }

  if (vramGB >= 12) {
    return ALL_IMAGE_RESOLUTIONS.filter((size) => size <= 2048)
  }

  if (vramGB >= 8) {
    return ALL_IMAGE_RESOLUTIONS.filter((size) => size <= 1536)
  }

  if (vramGB >= 6) {
    return ALL_IMAGE_RESOLUTIONS.filter((size) => size <= 1024)
  }

  if (vramGB >= 4) {
    return ALL_IMAGE_RESOLUTIONS.filter((size) => size <= 768)
  }

  return [512, 640]
}

async function getGpuCapabilities(): Promise<GpuCapabilities> {
  const response = await fetch(`${COMFYUI_URL}/system_stats`, {
    signal: AbortSignal.timeout(5000)
  })

  if (!response.ok) {
    throw new Error('Unable to read ComfyUI system information.')
  }

  const stats = await response.json()
  const devices = Array.isArray(stats.devices) ? stats.devices : []

  const gpu = devices
    .filter((device: any) => Number(device.vram_total) > 0)
    .sort(
      (a: any, b: any) =>
        Number(b.vram_total) - Number(a.vram_total)
    )[0]

  if (!gpu) {
    return {
      resolutions: ALL_IMAGE_RESOLUTIONS,
      recommendedResolutions: [512, 640]
    }
  }

  const vramTotalGB = Number(gpu.vram_total) / (1024 ** 3)
  const vramFreeGB = Number(gpu.vram_free) / (1024 ** 3)

  return {
    gpuName: gpu.name || gpu.device || 'NVIDIA GPU',
    vramTotalGB: Number(vramTotalGB.toFixed(2)),
    vramFreeGB: Number(vramFreeGB.toFixed(2)),
    resolutions: ALL_IMAGE_RESOLUTIONS,
    recommendedResolutions: getRecommendedResolutions(vramTotalGB)
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle(
  'comfyui:check-status',
  async (): Promise<ComfyUIStatus> => {
    try {
      const capabilities = await getGpuCapabilities()

      return {
        connected: true,
        message: capabilities.gpuName
          ? 'ComfyUI is running locally'
          : 'ComfyUI connected. GPU information unavailable.',
        ...capabilities
      }
    } catch {
      return {
        connected: false,
        message: 'ComfyUI is not running or is unreachable',
        resolutions: ALL_IMAGE_RESOLUTIONS,
        recommendedResolutions: [512, 640]
      }
    }
  }
)

ipcMain.handle(
  'comfyui:generate-image',
  async (_, request: GenerateImageRequest): Promise<GenerateImageResult> => {
    try {
      if (
        !request ||
        typeof request.prompt !== 'string' ||
        !request.prompt.trim()
      ) {
        return {
          success: false,
          message: 'Please enter an image prompt.'
        }
      }

      if (
        !Number.isInteger(request.width) ||
        !Number.isInteger(request.height) ||
        !ALL_IMAGE_RESOLUTIONS.includes(request.width) ||
        !ALL_IMAGE_RESOLUTIONS.includes(request.height)
      ) {
        return {
          success: false,
          message: 'Please select a supported resolution between 512 and 4096.'
        }
      }

      const workflow = {
        '5': {
          inputs: {
            width: request.width,
            height: request.height,
            batch_size: 1
          },
          class_type: 'EmptyLatentImage'
        },
        '6': {
          inputs: {
            text: request.prompt.trim(),
            clip: ['20', 1]
          },
          class_type: 'CLIPTextEncode'
        },
        '7': {
          inputs: {
            text: DEFAULT_NEGATIVE_PROMPT,
            clip: ['20', 1]
          },
          class_type: 'CLIPTextEncode'
        },
        '8': {
          inputs: {
            samples: ['13', 0],
            vae: ['20', 2]
          },
          class_type: 'VAEDecode'
        },
        '13': {
          inputs: {
            add_noise: true,
            noise_seed: Math.floor(Math.random() * 2147483647),
            cfg: 1,
            model: ['20', 0],
            positive: ['6', 0],
            negative: ['7', 0],
            sampler: ['14', 0],
            sigmas: ['22', 0],
            latent_image: ['5', 0]
          },
          class_type: 'SamplerCustom'
        },
        '14': {
          inputs: {
            sampler_name: 'euler_ancestral'
          },
          class_type: 'KSamplerSelect'
        },
        '20': {
          inputs: {
            ckpt_name: 'sd_xl_turbo_1.0_fp16.safetensors'
          },
          class_type: 'CheckpointLoaderSimple'
        },
        '22': {
          inputs: {
            steps: 1,
            denoise: 1,
            model: ['20', 0]
          },
          class_type: 'SDTurboScheduler'
        },
        '25': {
          inputs: {
            filename_prefix: 'HybridAI',
            images: ['8', 0]
          },
          class_type: 'SaveImage'
        }
      }

      const queueResponse = await fetch(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: workflow
        }),
        signal: AbortSignal.timeout(15000)
      })

      const queueData = await queueResponse.json().catch(() => ({}))

      if (!queueResponse.ok || !queueData.prompt_id) {
        return {
          success: false,
          message:
            queueData.error?.message ||
            'ComfyUI rejected the workflow. Check the ComfyUI console.'
        }
      }

      const promptId = queueData.prompt_id as string

      for (let attempt = 0; attempt < 240; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const historyResponse = await fetch(
          `${COMFYUI_URL}/history/${promptId}`,
          {
            signal: AbortSignal.timeout(10000)
          }
        )

        if (!historyResponse.ok) {
          continue
        }

        const history = await historyResponse.json()
        const job = history[promptId]

        if (!job) {
          continue
        }

        if (job.status?.status_str === 'error') {
          const errorText = JSON.stringify(job.status.messages || [])

          return {
            success: false,
            message: /out of memory|cuda error|alloc/i.test(errorText)
              ? 'GPU ran out of memory. Try a smaller resolution, such as 512 or 640.'
              : 'ComfyUI failed while generating the image. Check its console.'
          }
        }

        const outputs = job.outputs || {}

        const imageEntry = Object.values(outputs).flatMap(
          (output: any) => Array.isArray(output.images)
            ? output.images
            : []
        )[0] as
          | {
              filename: string
              subfolder: string
              type: string
            }
          | undefined

        if (imageEntry) {
          const imageUrl = new URL(`${COMFYUI_URL}/view`)

          imageUrl.searchParams.set('filename', imageEntry.filename)
          imageUrl.searchParams.set(
            'subfolder',
            imageEntry.subfolder || ''
          )
          imageUrl.searchParams.set(
            'type',
            imageEntry.type || 'output'
          )

          const imageResponse = await fetch(imageUrl, {
            signal: AbortSignal.timeout(30000)
          })

          if (!imageResponse.ok) {
            return {
              success: false,
              message: 'Image was generated but could not be retrieved.'
            }
          }

          const imageBuffer = Buffer.from(
            await imageResponse.arrayBuffer()
          )

          const imageDataUrl =
            `data:image/png;base64,${imageBuffer.toString('base64')}`

          return {
            success: true,
            imageDataUrl,
            filename: imageEntry.filename,
            message: 'Image generated successfully.'
          }
        }
      }

      return {
        success: false,
        message: 'Generation timed out after 4 minutes. Check ComfyUI.'
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown generation error.'

      return {
        success: false,
        message: /out of memory|cuda error|alloc/i.test(message)
          ? 'GPU ran out of memory. Try a smaller resolution, such as 512 or 640.'
          : message
      }
    }
  }
)

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
