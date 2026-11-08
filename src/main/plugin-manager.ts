import { app, ipcMain, safeStorage } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

type ProviderId = 'huggingface' | 'fal' | 'replicate'

type ProviderDefinition = {
  id: ProviderId
  name: string
  description: string
  capabilities: Array<'image' | 'video'>
  keyLabel: string
  keyPlaceholder: string
  docsUrl: string
  pricingNote: string
  connectionTest: 'identity' | 'on-first-use'
}

const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'huggingface',
    name: 'Hugging Face Inference Providers',
    description: 'One token can access compatible image and video models through participating inference providers.',
    capabilities: ['image', 'video'],
    keyLabel: 'Hugging Face access token',
    keyPlaceholder: 'hf_…',
    docsUrl: 'https://huggingface.co/settings/tokens',
    pricingNote: 'Not unlimited-free. Credits and charges depend on your Hugging Face plan and selected inference provider.',
    connectionTest: 'identity'
  },
  {
    id: 'fal',
    name: 'fal.ai',
    description: 'Hosted image and video generation APIs.',
    capabilities: ['image', 'video'],
    keyLabel: 'fal.ai API key',
    keyPlaceholder: 'Paste your fal.ai key',
    docsUrl: 'https://fal.ai/dashboard/keys',
    pricingNote: 'Usage-based billing may apply. Check current pricing and any trial credits before generating.',
    connectionTest: 'on-first-use'
  },
  {
    id: 'replicate',
    name: 'Replicate',
    description: 'Hosted model APIs for image and video generation.',
    capabilities: ['image', 'video'],
    keyLabel: 'Replicate API token',
    keyPlaceholder: 'r8_…',
    docsUrl: 'https://replicate.com/account/api-tokens',
    pricingNote: 'Usage-based billing may apply. Check current model pricing and account credits before generating.',
    connectionTest: 'on-first-use'
  }
]

type StoredSecrets = Partial<Record<ProviderId, string>>

function getSecretsPath(): string {
  return join(app.getPath('userData'), 'provider-secrets.json')
}

async function readSecrets(): Promise<StoredSecrets> {
  try {
    const raw = await readFile(getSecretsPath(), 'utf8')
    const encrypted = JSON.parse(raw) as Record<string, string>
    const secrets: StoredSecrets = {}

    for (const provider of PROVIDERS) {
      const value = encrypted[provider.id]
      if (!value) continue
      const decrypted = await safeStorage.decryptStringAsync(
        Buffer.from(value, 'base64')
      )
      secrets[provider.id] = decrypted.result
    }

    return secrets
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw new Error('Saved provider credentials could not be read. Re-enter the affected API key.')
  }
}

async function writeSecrets(secrets: StoredSecrets): Promise<void> {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('Secure credential storage is unavailable on this computer. No API key was saved.')
  }

  const encrypted: Record<string, string> = {}
  for (const provider of PROVIDERS) {
    const value = secrets[provider.id]
    if (!value) continue
    const buffer = await safeStorage.encryptStringAsync(value)
    encrypted[provider.id] = buffer.toString('base64')
  }

  const path = getSecretsPath()
  await mkdir(app.getPath('userData'), { recursive: true })
  const temporaryPath = `${path}.tmp`
  await writeFile(temporaryPath, JSON.stringify(encrypted, null, 2), { encoding: 'utf8', mode: 0o600 })
  await rename(temporaryPath, path)
}

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && PROVIDERS.some((provider) => provider.id === value)
}

export function registerPluginHandlers(): void {
  ipcMain.handle('plugins:list-providers', async () => {
    const secrets = await readSecrets()
    return {
      providers: PROVIDERS.map(({ id, ...provider }) => ({
        id,
        ...provider,
        configured: Boolean(secrets[id])
      }))
    }
  })

  ipcMain.handle('plugins:save-key', async (_event, input: { providerId: unknown; apiKey: unknown }) => {
    if (!input || !isProviderId(input.providerId)) {
      return { success: false, message: 'Unknown provider.' }
    }
    if (typeof input.apiKey !== 'string' || input.apiKey.trim().length < 8 || input.apiKey.length > 4096) {
      return { success: false, message: 'Enter a valid API key (8–4096 characters).' }
    }

    try {
      const secrets = await readSecrets()
      secrets[input.providerId] = input.apiKey.trim()
      await writeSecrets(secrets)
      return { success: true, message: 'API key encrypted and saved on this device.' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Could not save API key securely.'
      }
    }
  })

  ipcMain.handle('plugins:remove-key', async (_event, providerId: unknown) => {
    if (!isProviderId(providerId)) return { success: false, message: 'Unknown provider.' }
    try {
      const secrets = await readSecrets()
      delete secrets[providerId]
      await writeSecrets(secrets)
      return { success: true, message: 'Saved API key removed.' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Could not remove API key.'
      }
    }
  })

  ipcMain.handle('plugins:test-connection', async (_event, providerId: unknown) => {
    if (!isProviderId(providerId)) return { success: false, message: 'Unknown provider.' }

    try {
      const secrets = await readSecrets()
      const apiKey = secrets[providerId]
      if (!apiKey) return { success: false, message: 'Save an API key first.' }

      if (providerId !== 'huggingface') {
        return {
          success: false,
          message: 'The key is saved. A safe, non-billable verification endpoint is not available in this connector yet.'
        }
      }

      const response = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(12000)
      })

      if (!response.ok) {
        return {
          success: false,
          message: response.status === 401 || response.status === 403
            ? 'Hugging Face rejected this token. Check its validity and Inference Providers permission.'
            : `Hugging Face verification failed (HTTP ${response.status}).`
        }
      }

      return { success: true, message: 'Hugging Face token verified. This does not confirm available credits or model access.' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed.'
      }
    }
  })
}
