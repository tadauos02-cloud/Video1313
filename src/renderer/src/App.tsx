
import { useEffect, useState } from 'react'

const sections = [
  { id: 'dashboard', icon: '⌂', label: 'Dashboard' },
  { id: 'image', icon: '▧', label: 'Image Generation' },
  { id: 'textvideo', icon: '▶', label: 'Text to Video' },
  { id: 'imagevideo', icon: '▣', label: 'Image to Video' },
  { id: 'studio', icon: '✂', label: 'Video Studio' },
  { id: 'models', icon: '◈', label: 'Model Manager' },
  { id: 'skills', icon: '✦', label: 'Skills Manager' },
  { id: 'plugins', icon: '◉', label: 'Plugin Manager' },
  { id: 'github', icon: '⌘', label: 'GitHub Integration' },
  { id: 'memory', icon: '▤', label: 'Project Memory' },
  { id: 'settings', icon: '⚙', label: 'Settings' }
]

const ALL_RESOLUTIONS = [
  512, 640, 768, 896, 1024, 1152, 1280, 1408, 1536,
  1664, 1792, 1920, 2048, 2176, 2304, 2432, 2560,
  2688, 2816, 2944, 3072, 3200, 3328, 3456, 3584,
  3712, 3840, 3968, 4096
]

type ComfyUIStatus = {
  connected: boolean
  message: string
  gpuName?: string
  vramTotalGB?: number
  vramFreeGB?: number
  resolutions: number[]
  recommendedResolutions: number[]
}

type GenerateImageResult = {
  success: boolean
  imageDataUrl?: string
  filename?: string
  message: string
}

function App(): React.JSX.Element {
  const [active, setActive] = useState('dashboard')
  const [comfyStatus, setComfyStatus] = useState<ComfyUIStatus | null>(null)
  const [checking, setChecking] = useState(false)

  const [prompt, setPrompt] = useState(
    'A stunning photorealistic luxury villa on a tropical island, infinity swimming pool overlooking the crystal clear ocean, palm trees, beautiful sunset, cinematic golden lighting, realistic water reflections, highly detailed architecture, professional architectural photography'
  )

  const [availableResolutions, setAvailableResolutions] =
    useState<number[]>(ALL_RESOLUTIONS)

  const [recommendedResolutions, setRecommendedResolutions] =
    useState<number[]>([512, 640])

  const [resolution, setResolution] = useState(768)
  const [generating, setGenerating] = useState(false)
  const [generationMessage, setGenerationMessage] = useState('')
  const [generatedImage, setGeneratedImage] = useState('')
  const [generatedFilename, setGeneratedFilename] = useState('')

  const current = sections.find((item) => item.id === active)

  const maximumRecommended = Math.max(...recommendedResolutions)

  const selectedIsRecommended =
    recommendedResolutions.includes(resolution)

  const applyComfyStatus = (result: ComfyUIStatus): void => {
    setComfyStatus(result)

    const allSizes = result.resolutions?.length
      ? result.resolutions
      : ALL_RESOLUTIONS

    const recommended = result.recommendedResolutions?.length
      ? result.recommendedResolutions
      : [512, 640]

    setAvailableResolutions(allSizes)
    setRecommendedResolutions(recommended)

    setResolution((currentResolution) =>
      allSizes.includes(currentResolution)
        ? currentResolution
        : Math.max(...recommended)
    )
  }

  const checkComfyUI = async (): Promise<void> => {
    setChecking(true)

    try {
      const result = await window.api.checkComfyUI()
      applyComfyStatus(result)
    } catch {
      applyComfyStatus({
        connected: false,
        message: 'Unable to communicate with the local ComfyUI service',
        resolutions: ALL_RESOLUTIONS,
        recommendedResolutions: [512, 640]
      })
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    let activeComponent = true

    const loadCapabilities = async (): Promise<void> => {
      setChecking(true)

      try {
        const result = await window.api.checkComfyUI()

        if (activeComponent) {
          applyComfyStatus(result)
        }
      } catch {
        if (activeComponent) {
          applyComfyStatus({
            connected: false,
            message: 'Unable to detect local GPU capabilities',
            resolutions: ALL_RESOLUTIONS,
            recommendedResolutions: [512, 640]
          })
        }
      } finally {
        if (activeComponent) {
          setChecking(false)
        }
      }
    }

    void loadCapabilities()

    return () => {
      activeComponent = false
    }
  }, [])

  const generateImage = async (): Promise<void> => {
    if (!prompt.trim()) {
      setGenerationMessage('Please enter a prompt first.')
      return
    }

    setGenerating(true)
    setGenerationMessage('Sending workflow to local ComfyUI...')
    setGeneratedImage('')
    setGeneratedFilename('')

    try {
      const result: GenerateImageResult = await window.api.generateImage({
        prompt,
        width: resolution,
        height: resolution
      })

      if (result.success && result.imageDataUrl) {
        setGeneratedImage(result.imageDataUrl)
        setGeneratedFilename(result.filename || 'HybridAI.png')
        setGenerationMessage('Image generated successfully.')
      } else {
        setGenerationMessage(result.message || 'Image generation failed.')
      }
    } catch (error) {
      setGenerationMessage(
        error instanceof Error
          ? error.message
          : 'Unable to generate image.'
      )
    } finally {
      setGenerating(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: '#171d29',
    border: '1px solid #293447',
    borderRadius: 12,
    padding: 20,
    boxSizing: 'border-box'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#0e1522',
    border: '1px solid #344158',
    borderRadius: 8,
    color: '#e7edf8',
    padding: 12,
    fontSize: 13,
    outline: 'none',
    fontFamily: 'Segoe UI, sans-serif'
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        background: '#0d111b',
        color: '#e7edf8',
        fontFamily: 'Segoe UI, sans-serif',
        display: 'flex'
      }}
    >
      <aside
        style={{
          width: 235,
          minWidth: 205,
          height: '100vh',
          overflowY: 'auto',
          flexShrink: 0,
          background: '#111724',
          borderRight: '1px solid #263044',
          padding: 18,
          boxSizing: 'border-box'
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 5 }}>
          ◈ Hybrid AI
        </div>

        <div style={{ color: '#8290a8', fontSize: 12, marginBottom: 30 }}>
          VIDEO STUDIO
        </div>

        <div
          style={{
            color: '#75839a',
            fontSize: 11,
            marginBottom: 12,
            letterSpacing: 1
          }}
        >
          WORKSPACE
        </div>

        {sections.map((item) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            style={{
              width: '100%',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              textAlign: 'left',
              padding: '11px 12px',
              marginBottom: 5,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              color: active === item.id ? '#ffffff' : '#a7b3c7',
              background: active === item.id ? '#293b59' : 'transparent',
              fontSize: 13
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div
          style={{
            marginTop: 30,
            marginBottom: 15,
            padding: 12,
            borderRadius: 9,
            background: '#192436',
            fontSize: 12
          }}
        >
          <div style={{ color: '#65d6a1', marginBottom: 7 }}>
            ● Local First
          </div>

          <div style={{ color: '#9aa8bd', lineHeight: 1.6 }}>
            Local AI is the default. External APIs require your explicit permission.
          </div>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          height: '100vh',
          minWidth: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '28px 30px',
          boxSizing: 'border-box'
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 15,
            flexWrap: 'wrap',
            borderBottom: '1px solid #263044',
            paddingBottom: 20,
            marginBottom: 28
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#8795ac' }}>
              HYBRID AI VIDEO STUDIO / WORKSPACE
            </div>

            <h1 style={{ fontSize: 25, margin: '8px 0 0' }}>
              {current?.label}
            </h1>
          </div>

          <div
            style={{
              background: '#182a25',
              color: '#71d9a5',
              padding: '9px 13px',
              borderRadius: 8,
              fontSize: 12
            }}
          >
            ● API ACCESS: OFF
          </div>
        </header>

        {active === 'image' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              gap: 20
            }}
          >
            <section style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Local Image Generation</h2>

              <p
                style={{
                  color: '#98a6bb',
                  fontSize: 13,
                  lineHeight: 1.6
                }}
              >
                Generate images using your local SDXL Turbo model through ComfyUI.
                No online API is used.
              </p>

              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  marginTop: 22,
                  marginBottom: 8
                }}
              >
                Prompt
              </label>

              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={9}
                placeholder="Describe the image you want to create..."
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  lineHeight: 1.6
                }}
              />

              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  marginTop: 18,
                  marginBottom: 8
                }}
              >
                Image Resolution
              </label>

              <select
                value={resolution}
                onChange={(event) =>
                  setResolution(Number(event.target.value))
                }
                style={inputStyle}
              >
                {availableResolutions.map((size) => (
                  <option key={size} value={size}>
                    {size} × {size}
                    {recommendedResolutions.includes(size)
                      ? ' — Recommended'
                      : ''}
                  </option>
                ))}
              </select>

              <div
                style={{
                  marginTop: 12,
                  color: '#71d9a5',
                  fontSize: 11,
                  lineHeight: 1.7
                }}
              >
                {comfyStatus?.connected
                  ? `GPU: ${comfyStatus.gpuName || 'GPU information unavailable'} · VRAM: ${
                      comfyStatus.vramTotalGB !== undefined
                        ? `${comfyStatus.vramTotalGB} GB`
                        : 'Unknown'
                    } · Recommended maximum: ${maximumRecommended} × ${maximumRecommended}`
                  : 'GPU information unavailable. All resolution options remain available.'}
              </div>

              {!selectedIsRecommended && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 8,
                    background: '#382b1b',
                    border: '1px solid #72532c',
                    color: '#f0c477',
                    fontSize: 12,
                    lineHeight: 1.7
                  }}
                >
                  Warning: {resolution} × {resolution} is above the
                  recommended resolution for your detected GPU.
                  Generation may fail because of insufficient VRAM.
                  If this happens, select a smaller resolution.
                </div>
              )}

              <div
                style={{
                  marginTop: 8,
                  color: '#8290a8',
                  fontSize: 11,
                  lineHeight: 1.6
                }}
              >
                All resolution options are available. Recommendations are
                estimates based on GPU memory, not guarantees. Actual results
                depend on the model, workflow, free VRAM and system RAM.
              </div>

              <button
                onClick={generateImage}
                disabled={generating}
                style={{
                  width: '100%',
                  marginTop: 22,
                  padding: 14,
                  borderRadius: 8,
                  border: '1px solid #5278b1',
                  background: generating ? '#34445c' : '#315d96',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 650,
                  cursor: generating ? 'wait' : 'pointer',
                  opacity: generating ? 0.7 : 1
                }}
              >
                {generating ? 'Generating Image...' : '✦ Generate Image'}
              </button>

              {generating && (
                <div
                  style={{
                    color: '#e8bd70',
                    fontSize: 12,
                    marginTop: 14,
                    lineHeight: 1.6
                  }}
                >
                  ComfyUI is processing your image locally. This may take some time.
                  Please do not close the application.
                </div>
              )}

              {generationMessage && (
                <div
                  style={{
                    marginTop: 15,
                    padding: 12,
                    borderRadius: 8,
                    background: generatedImage ? '#182a25' : '#202b3b',
                    color: generatedImage ? '#71d9a5' : '#c1cee1',
                    fontSize: 12,
                    lineHeight: 1.6,
                    overflowWrap: 'anywhere'
                  }}
                >
                  {generationMessage}
                </div>
              )}
            </section>

            <section style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Generated Image</h2>

              {generatedImage ? (
                <>
                  <img
                    src={generatedImage}
                    alt="AI generated image"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      borderRadius: 9,
                      border: '1px solid #344158'
                    }}
                  />

                  <div
                    style={{
                      color: '#98a6bb',
                      fontSize: 12,
                      marginTop: 12,
                      overflowWrap: 'anywhere'
                    }}
                  >
                    File: {generatedFilename}
                  </div>

                  <a
                    href={generatedImage}
                    download={generatedFilename || 'HybridAI.png'}
                    style={{
                      display: 'inline-block',
                      marginTop: 14,
                      padding: '11px 15px',
                      borderRadius: 7,
                      background: '#293b59',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontSize: 12
                    }}
                  >
                    ↓ Download Image
                  </a>
                </>
              ) : (
                <div
                  style={{
                    minHeight: 350,
                    border: '1px dashed #3b4960',
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: 20,
                    color: '#8290a8',
                    fontSize: 13,
                    lineHeight: 1.8
                  }}
                >
                  {generating
                    ? 'Your image is being generated...'
                    : 'Your generated image will appear here.'}
                </div>
              )}

              <div
                style={{
                  marginTop: 20,
                  padding: 13,
                  background: '#111a28',
                  borderRadius: 8,
                  color: '#9aa8bd',
                  fontSize: 12,
                  lineHeight: 1.7
                }}
              >
                Model: SDXL Turbo FP16
                <br />
                Engine: Local ComfyUI
                <br />
                Sampler: Euler Ancestral
                <br />
                Steps: 1
                <br />
                Output: ComfyUI output folder
              </div>
            </section>
          </div>
        ) : active === 'dashboard' ? (
          <>
            <h2 style={{ fontSize: 21, marginBottom: 8 }}>
              Your Creative Workspace
            </h2>

            <p style={{ color: '#98a6bb', marginTop: 0, marginBottom: 25 }}>
              Create images, generate video scenes and assemble complete projects.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: 15
              }}
            >
              {[
                ['▧', 'Image Generation', 'Create images with local AI', 'image'],
                ['▶', 'Text to Video', 'Turn prompts into video scenes', 'textvideo'],
                ['▣', 'Image to Video', 'Animate your images', 'imagevideo'],
                ['✂', 'Video Studio', 'Assemble and edit video projects', 'studio']
              ].map(([icon, title, description, id]) => (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  style={{
                    ...cardStyle,
                    color: '#e7edf8',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 25, marginBottom: 15 }}>{icon}</div>

                  <div style={{ fontWeight: 650, marginBottom: 8 }}>
                    {title}
                  </div>

                  <div style={{ fontSize: 12, color: '#98a6bb' }}>
                    {description}
                  </div>
                </button>
              ))}
            </div>

            <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 15 }}>
              System Status
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: 15
              }}
            >
              <div style={cardStyle}>
                <div style={{ color: '#9aa8bd', fontSize: 12 }}>
                  LOCAL AI ENGINE
                </div>

                <div style={{ marginTop: 12, fontWeight: 650 }}>
                  ComfyUI
                </div>

                <div
                  style={{
                    color:
                      comfyStatus === null
                        ? '#e8bd70'
                        : comfyStatus.connected
                          ? '#71d9a5'
                          : '#f08080',
                    fontSize: 12,
                    marginTop: 8
                  }}
                >
                  {checking
                    ? 'Checking connection...'
                    : comfyStatus === null
                      ? 'Not checked yet'
                      : comfyStatus.connected
                        ? '● Connected'
                        : '● Disconnected'}
                </div>

                <p
                  style={{
                    color: '#98a6bb',
                    fontSize: 11,
                    lineHeight: 1.5,
                    marginTop: 8
                  }}
                >
                  {comfyStatus?.message ?? 'Local address: 127.0.0.1:8188'}
                </p>

                {comfyStatus?.gpuName && (
                  <p
                    style={{
                      color: '#9aa8bd',
                      fontSize: 11,
                      lineHeight: 1.5,
                      overflowWrap: 'anywhere'
                    }}
                  >
                    GPU: {comfyStatus.gpuName}
                    <br />
                    VRAM: {comfyStatus.vramTotalGB ?? 'Unknown'} GB
                    {comfyStatus.vramFreeGB !== undefined && (
                      <>
                        <br />
                        Free VRAM: {comfyStatus.vramFreeGB} GB
                      </>
                    )}
                    <br />
                    Recommended maximum: {maximumRecommended}
                  </p>
                )}

                <button
                  onClick={checkComfyUI}
                  disabled={checking}
                  style={{
                    background: '#293b59',
                    color: '#ffffff',
                    border: '1px solid #405779',
                    borderRadius: 7,
                    padding: '9px 12px',
                    cursor: checking ? 'wait' : 'pointer',
                    opacity: checking ? 0.6 : 1,
                    fontSize: 12,
                    marginTop: 5
                  }}
                >
                  {checking ? 'Checking...' : 'Check Connection'}
                </button>
              </div>

              <div style={cardStyle}>
                <div style={{ color: '#9aa8bd', fontSize: 12 }}>
                  API ACCESS
                </div>

                <div style={{ marginTop: 12, fontWeight: 650 }}>
                  Disabled
                </div>

                <div style={{ color: '#71d9a5', fontSize: 12, marginTop: 8 }}>
                  Manual permission required
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ color: '#9aa8bd', fontSize: 12 }}>
                  PROJECT MEMORY
                </div>

                <div style={{ marginTop: 12, fontWeight: 650 }}>
                  Not configured
                </div>

                <div style={{ color: '#e8bd70', fontSize: 12, marginTop: 8 }}>
                  Setup pending
                </div>
              </div>
            </div>

            <div style={{ ...cardStyle, marginTop: 22 }}>
              <h3 style={{ marginTop: 0 }}>Hardware Information</h3>

              <p
                style={{
                  color: '#a7b3c7',
                  fontSize: 13,
                  lineHeight: 1.7,
                  marginBottom: 0
                }}
              >
                {comfyStatus?.gpuName
                  ? `${comfyStatus.gpuName} · ${
                      comfyStatus.vramTotalGB ?? 'Unknown'
                    } GB VRAM.`
                  : 'GPU information has not been detected yet.'}
                {' '}
                Resolution choices are not locked to the current GPU.
                Recommended settings are detected automatically.
                Longer videos will be assembled from shorter scenes.
              </p>
            </div>

            <div style={{ ...cardStyle, marginTop: 20 }}>
              <h3 style={{ marginTop: 0 }}>Video Production Targets</h3>

              <p style={{ color: '#a7b3c7', fontSize: 13, lineHeight: 1.8 }}>
                Planned output lengths: 15 seconds, 30 seconds, 1 minute,
                3 minutes, 5 minutes and 10 minutes.
                Longer videos will use scene generation and automatic assembly.
              </p>
            </div>
          </>
        ) : (
          <div style={{ ...cardStyle, maxWidth: 750 }}>
            <h2 style={{ marginTop: 0 }}>{current?.label}</h2>

            <p style={{ color: '#a7b3c7', lineHeight: 1.7 }}>
              This module is planned for the next development stages.
              Its actual local AI connection and controls have not been installed yet.
            </p>

            <button
              onClick={() => setActive('dashboard')}
              style={{
                background: '#25334a',
                color: '#e5edff',
                border: '1px solid #3b506e',
                borderRadius: 8,
                padding: '10px 14px',
                cursor: 'pointer'
              }}
            >
              ← Back to Dashboard
            </button>
          </div>
        )}

        <footer
          style={{
            color: '#68778e',
            fontSize: 11,
            marginTop: 35,
            borderTop: '1px solid #263044',
            paddingTop: 15,
            paddingBottom: 25
          }}
        >
          HYBRID AI VIDEO STUDIO · LOCAL-FIRST · API MANUAL CONTROL
        </footer>
      </main>
    </div>
  )
}

export default App
