import { useEffect, useMemo, useRef, useState } from 'react'
import { createPost } from '../lib/api'
import './mobile-ugly.css'

const SUBMIT_WINDOW_MS = 180_000
/** 同一会话内首次打开 /m 的时间（刷新不变）；用于展示与入库 enteredAt */
const SESSION_FIRST_ENTER_KEY = 'sl:firstEnteredAtIso'

function getOrSetFirstEnteredIso(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_FIRST_ENTER_KEY)
    if (existing && existing.trim()) return existing.trim()
    const iso = new Date().toISOString()
    sessionStorage.setItem(SESSION_FIRST_ENTER_KEY, iso)
    return iso
  } catch {
    return new Date().toISOString()
  }
}

function formatEnteredDisplay(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function countCjk(s: string) {
  let n = 0
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0
    // Basic CJK Unified Ideographs + Extension A (roughly enough for “中文字符”)
    const isCjk = (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)
    if (isCjk) n += 1
  }
  return n
}

function clampByCjk(s: string, maxCjk: number) {
  let out = ''
  let cjk = 0
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0
    const isCjk = (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)
    if (isCjk) {
      if (cjk >= maxCjk) break
      cjk += 1
    }
    out += ch
  }
  return out
}

export function MobileSubmitPage() {
  const [firstEnteredIso] = useState(() => getOrSetFirstEnteredIso())
  /** 每次进入页面（含刷新）重置，用于 180 秒校验 */
  const pageLoadMsRef = useRef(Date.now())
  /** 仅用于触发重渲染；超时判断一律用 Date.now() 与 pageLoadMsRef 的差值（后台定时器会被节流） */
  const [, setTick] = useState(0)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    const id = window.setInterval(bump, 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') bump()
    }
    window.addEventListener('focus', bump)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', bump)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', bump)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', bump)
    }
  }, [])

  const withinWindow = Date.now() - pageLoadMsRef.current <= SUBMIT_WINDOW_MS

  const cjkCount = useMemo(() => countCjk(value), [value])
  const over = cjkCount > 100
  const canSubmit = value.trim().length > 0 && !busy && !over && withinWindow

  const tip = msg ?? (!withinWindow ? '超时了' : null)

  async function submit() {
    // 必须以当前墙钟为准（避免依赖可能被后台节流拖慢的渲染）
    if (Date.now() - pageLoadMsRef.current > SUBMIT_WINDOW_MS) {
      setMsg('超时了')
      return
    }
    if (!canSubmit) return
    setBusy(true)
    setMsg(null)
    try {
      if (Date.now() - pageLoadMsRef.current > SUBMIT_WINDOW_MS) {
        setMsg('超时了')
        return
      }
      const ua = navigator.userAgent
      await createPost(value.trim(), ua, firstEnteredIso)
      setValue('')
      setMsg('好耶，已丢进墙里了。')
    } catch {
      setMsg('提交失败：可能是网络或服务没启动。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="uglyWrap">
      <div className="uglyTop">
        <div className="uglyTopText">
          <div className="uglyTitle">匿名投递机</div>
          <div className="uglyEnterTime">
            进入时间：{formatEnteredDisplay(firstEnteredIso)}
          </div>
        </div>
      </div>

      <div className="uglyBox">
        <div className="uglyScroller" aria-label="奇怪的横向区域">
          <div className="uglyCanvas">
            <div className="uglyPane left">
              <textarea
                className="uglyInput"
                placeholder="在这里塞一段东西……"
                value={value}
                onChange={(e) => setValue(clampByCjk(e.target.value, 100))}
                rows={3}
                inputMode="text"
              />
              <div className="uglyMeta">
                <span className={over ? 'uglyBad' : 'uglyOk'}>中文 {cjkCount}/100</span>
              </div>
              {tip ? <div className="uglyMsg">{tip}</div> : <div className="uglyMsg ghost">.</div>}
            </div>

            <div className="uglyPane right">
              <button
                className="uglyBtn"
                type="button"
                onClick={submit}
                disabled={!value.trim() || over || busy || !withinWindow}
              >
                {busy ? '…' : '交'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

