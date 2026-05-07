import { useEffect, useMemo, useState } from 'react'
import { fetchPosts, type PostItem } from '../lib/api'

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function PcWallPage({ onGoMobile }: { onGoMobile: () => void }) {
  const [items, setItems] = useState<PostItem[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [uaModal, setUaModal] = useState<{ id: string; ua: string } | null>(null)

  const sorted = useMemo(() => {
    const arr = [...items]
    arr.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    return arr
  }, [items])

  async function refresh() {
    try {
      const next = await fetchPosts()
      setItems(next)
      setErr(null)
    } catch {
      setErr('拉取失败（服务可能没启动）')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="pcWrap">
      <header className="pcTop">
        <div className="pcTitle">结果墙（PC）</div>
        <div className="pcRight">
          <button className="pcBtn" type="button" onClick={onGoMobile}>
            去投递（手机页）
          </button>
          <button className="pcBtn ghost" type="button" onClick={() => void refresh()}>
            手动刷新
          </button>
        </div>
      </header>

      {err ? <div className="pcErr">{err}</div> : null}

      <main className="pcMain">
        {sorted.length === 0 ? (
          <div className="pcEmpty">还没有内容。用手机页提交一条试试。</div>
        ) : (
          <ul className="pcList">
            {sorted.map((it) => (
              <li key={it.id} className="pcItem">
                <div className="pcMeta">
                  <div className="pcTimes">
                    <span className="pcTimeLabel">
                      进入：{it.enteredAt ? formatTime(it.enteredAt) : '—'}
                    </span>
                    <span className="pcTimeLabel">
                      提交：{formatTime(it.createdAt)}
                    </span>
                  </div>
                  <button
                    className="pcIdBtn"
                    type="button"
                    onDoubleClick={() => {
                      const ua = (it.ua ?? '').trim()
                      setUaModal({ id: it.id, ua: ua || '（该记录没有 UA）' })
                    }}
                    title="双击查看 UA"
                  >
                    #{it.id.slice(0, 8)}
                  </button>
                </div>
                <div className="pcContent">{it.content}</div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {uaModal ? (
        <div
          className="pcModalMask"
          role="dialog"
          aria-modal="true"
          onClick={() => setUaModal(null)}
        >
          <div className="pcModal" onClick={(e) => e.stopPropagation()}>
            <div className="pcModalTop">
              <div className="pcModalTitle">UA</div>
              <button className="pcBtn ghost" type="button" onClick={() => setUaModal(null)}>
                关闭
              </button>
            </div>
            <div className="pcModalBody">
              <div className="pcModalMeta">#{uaModal.id.slice(0, 8)}</div>
              <pre className="pcUa">{uaModal.ua}</pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

