export type PostItem = {
  id: string
  content: string
  createdAt: string
  /** 移动端页面进入时间（ISO），由客户端在打开页面时生成 */
  enteredAt?: string
  ua?: string
}

export async function fetchPosts(): Promise<PostItem[]> {
  const res = await fetch('/api/posts')
  if (!res.ok) throw new Error(`fetchPosts_failed_${res.status}`)
  const data = (await res.json()) as { items?: PostItem[] }
  return Array.isArray(data.items) ? data.items : []
}

export async function createPost(
  content: string,
  ua?: string,
  enteredAt?: string,
): Promise<PostItem> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // 显式带上 enteredAt，避免 undefined 被 JSON.stringify 整段省略导致服务端收不到
    body: JSON.stringify({
      content,
      ua: ua ?? '',
      enteredAt: enteredAt ?? '',
    }),
  })
  if (!res.ok) throw new Error(`createPost_failed_${res.status}`)
  const data = (await res.json()) as { item: PostItem }
  return data.item
}

