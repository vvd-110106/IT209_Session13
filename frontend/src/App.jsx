import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, clearCredentials, setCredentials } from './api.js'

const categoryIcons = {
  'su-kien': '🏆',
  'do-that-lac': '🔍',
  'hoi-dap': '💡',
  'trao-doi': '🔄',
  'phan-anh': '📢',
  'tim-nhom': '👥',
}

function getCategoryBadgeClass(slug) {
  switch (slug) {
    case 'su-kien': return 'badge-event'
    case 'do-that-lac': return 'badge-lost'
    case 'hoi-dap': return 'badge-study'
    case 'trao-doi': return 'badge-trade'
    case 'phan-anh': return 'badge-feedback'
    case 'tim-nhom': return 'badge-team'
    default: return 'badge-study'
  }
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const diffMinutes = Math.floor((now - date) / (1000 * 60))
  if (diffMinutes < 1) return 'Vừa xong'
  if (diffMinutes < 60) return `${diffMinutes} phút trước`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} giờ trước`
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function getInitial(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts[parts.length - 1].charAt(0).toUpperCase()
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('campus_hub_theme') || 'dark')
  const [user, setUser] = useState(null)
  const [categories, setCategories] = useState([])
  const [posts, setPosts] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const [filters, setFilters] = useState({ keyword: '', categoryId: '', status: 'ALL' })
  const [sortBy, setSortBy] = useState('latest')
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState('')

  // Toggle Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('campus_hub_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Toast notice auto-dismiss
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])

  const [reloadKey, setReloadKey] = useState(0)
  const loadPosts = useCallback(() => setReloadKey(k => k + 1), [])

  useEffect(() => {
    let active = true
    const query = new URLSearchParams()
    if (filters.keyword) query.set('keyword', filters.keyword)
    if (filters.categoryId) query.set('categoryId', filters.categoryId)
    api(`/posts?${query}`)
      .then((page) => {
        if (active) setPosts(page.content || [])
      })
      .catch((error) => {
        if (active) setNotice(error.message)
      })
    return () => { active = false }
  }, [filters.keyword, filters.categoryId, reloadKey])

  useEffect(() => {
    api('/categories').then(setCategories).catch((err) => setNotice(err.message))
    api('/auth/me').then(setUser).catch(() => clearCredentials())
  }, [])

  async function openPost(id) {
    try {
      const postDetail = await api(`/posts/${id}`)
      setSelectedPost(postDetail)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setNotice(error.message)
    }
  }

  function logout() {
    clearCredentials()
    setUser(null)
    setSelectedPost(null)
    setNotice('Đã đăng xuất tài khoản an toàn')
  }

  async function refreshSelected() {
    if (selectedPost) await openPost(selectedPost.id)
    await loadPosts()
  }

  // Filter & Sort logic on client
  const displayedPosts = useMemo(() => {
    let result = [...posts]
    if (filters.status !== 'ALL') {
      result = result.filter(p => p.status === filters.status)
    }
    if (sortBy === 'latest') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else if (sortBy === 'most_reactions') {
      result.sort((a, b) => b.reactionCount - a.reactionCount)
    } else if (sortBy === 'most_comments') {
      result.sort((a, b) => b.commentCount - a.commentCount)
    }
    return result
  }, [posts, filters.status, sortBy])

  // Calculated Stats
  const totalReactions = useMemo(() => posts.reduce((sum, p) => sum + (p.reactionCount || 0), 0), [posts])
  const totalComments = useMemo(() => posts.reduce((sum, p) => sum + (p.commentCount || 0), 0), [posts])

  return (
    <div className="app-shell">
      {/* Navigation Topbar */}
      <header className="topbar">
        <button className="brand" onClick={() => setSelectedPost(null)}>
          <div className="brand-icon-wrapper">C</div>
          <div className="brand-text">
            <span className="brand-name">Campus Hub</span>
            <span className="brand-badge">PTIT Community</span>
          </div>
        </button>

        <div className="nav-actions">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user ? (
            <>
              <div className="user-profile-badge">
                <div className="user-avatar">{getInitial(user.displayName)}</div>
                <span className="user-display-name">{user.displayName}</span>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setDialog('post')}>
                ✍️ Đăng bài mới
              </button>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setDialog('login')}>
              🔑 Đăng nhập / Đăng ký
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main>
        {notice && (
          <div className="toast-notice" onClick={() => setNotice('')}>
            <span>🔔</span>
            <span>{notice}</span>
          </div>
        )}

        {selectedPost ? (
          <PostDetail
            post={selectedPost}
            user={user}
            onBack={() => setSelectedPost(null)}
            onChanged={refreshSelected}
            onDeleted={() => { setSelectedPost(null); loadPosts() }}
            setNotice={setNotice}
          />
        ) : (
          <>
            {/* Hero Dashboard Banner */}
            <section className="hero-banner">
              <div className="hero-content">
                <div className="hero-eyebrow">
                  <span>⚡</span> Không gian trao đổi sinh viên
                </div>
                <h1 className="hero-title">
                  Khám phá & kết nối mọi hoạt động tại <span>Campus Hub</span>
                </h1>
                <p className="hero-desc">
                  Nơi tổng hợp sự kiện trường học, tìm kiếm đồ thất lạc, hỏi đáp kinh nghiệm học tập,
                  trao đổi đồ dùng sinh viên và tìm đồng đội làm đồ án môn học.
                </p>
              </div>

              <div className="hero-stats-row">
                <div className="stat-card">
                  <div className="stat-number">{posts.length}</div>
                  <div className="stat-label">Bài viết</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{totalReactions}</div>
                  <div className="stat-label">Lượt quan tâm</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{totalComments}</div>
                  <div className="stat-label">Bình luận</div>
                </div>
              </div>
            </section>

            {/* Filter and Search Controls */}
            <section className="controls-bar">
              <div className="search-row">
                <div className="search-box">
                  <span className="search-box-icon">🔍</span>
                  <input
                    className="search-input"
                    value={filters.keyword}
                    placeholder="Tìm kiếm bài viết theo tiêu đề hoặc nội dung..."
                    onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                  />
                  {filters.keyword && (
                    <button
                      className="clear-search-btn"
                      onClick={() => setFilters(prev => ({ ...prev, keyword: '' }))}
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="sort-select-wrapper">
                  <select
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="latest">⏱️ Mới nhất</option>
                    <option value="most_reactions">🔥 Quan tâm nhiều nhất</option>
                    <option value="most_comments">💬 Sôi nổi nhất</option>
                  </select>
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="category-chips" role="tablist">
                <button
                  className={`category-chip ${filters.categoryId === '' ? 'active' : ''}`}
                  onClick={() => setFilters(prev => ({ ...prev, categoryId: '' }))}
                >
                  <span>✨</span> Tất cả chuyên mục
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`category-chip ${String(filters.categoryId) === String(cat.id) ? 'active' : ''}`}
                    onClick={() => setFilters(prev => ({ ...prev, categoryId: String(cat.id) }))}
                  >
                    <span>{categoryIcons[cat.slug] || '📌'}</span> {cat.name}
                  </button>
                ))}
              </div>
            </section>

            {/* Grid of Posts */}
            <section className="post-grid">
              {displayedPosts.map((post) => (
                <PostCard key={post.id} post={post} onOpen={openPost} />
              ))}

              {!displayedPosts.length && (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <h3>Không tìm thấy bài viết phù hợp</h3>
                  <p>Hãy thử từ khóa khác hoặc chuyển sang chuyên mục khác để xem thêm nội dung.</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Modern Footer */}
      <footer>
        <div className="footer-inner">
          <div>
            <strong>Campus Hub</strong> · Mini Project Session 13 DevOps Platform
          </div>
          <div>
            Hệ thống Spring Boot 3 · React · Docker Compose · Nginx Reverse Proxy
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      {dialog === 'login' && (
        <AuthDialog
          onClose={() => setDialog(null)}
          onLogin={(loggedInUser) => {
            setUser(loggedInUser)
            setDialog(null)
            setNotice(`Chào mừng trở lại, ${loggedInUser.displayName}!`)
            loadPosts()
          }}
        />
      )}

      {dialog === 'post' && (
        <PostDialog
          categories={categories}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null)
            setNotice('Đã đăng bài viết thành công!')
            loadPosts()
          }}
        />
      )}
    </div>
  )
}

function PostCard({ post, onOpen }) {
  const icon = categoryIcons[post.category.slug] || '📌'
  const badgeClass = getCategoryBadgeClass(post.category.slug)

  return (
    <article className="post-card" onClick={() => onOpen(post.id)}>
      <div className="card-header">
        <span className={`category-badge ${badgeClass}`}>
          <span>{icon}</span> {post.category.name}
        </span>
        <span className="card-time">{formatDate(post.createdAt)}</span>
      </div>

      <h2 className="post-card-title">{post.title}</h2>
      <p className="post-card-snippet">{post.content}</p>

      <div className="card-footer">
        <div className="author-info">
          <div className="author-avatar-sm">{getInitial(post.author.displayName)}</div>
          <span className="author-name-text">{post.author.displayName}</span>
        </div>

        <div className="engagement-stats">
          <span className={`stat-item ${post.reactedByCurrentUser ? 'active-liked' : ''}`}>
            <span>{post.reactedByCurrentUser ? '❤️' : '🤍'}</span> {post.reactionCount}
          </span>
          <span className="stat-item">
            <span>💬</span> {post.commentCount}
          </span>
        </div>
      </div>
    </article>
  )
}

function PostDetail({ post, user, onBack, onChanged, onDeleted, setNotice }) {
  const [comment, setComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const canManage = user && (user.id === post.author.id || user.role === 'ADMIN')

  async function act(action, successMsg) {
    try {
      await action()
      if (successMsg) setNotice(successMsg)
      await onChanged()
    } catch (error) {
      setNotice(error.message)
    }
  }

  function copyShareLink() {
    navigator.clipboard.writeText(window.location.href)
    setNotice('Đã sao chép liên kết bài viết vào bộ nhớ tạm!')
  }

  return (
    <div className="post-detail-container">
      <button className="back-nav-btn" onClick={onBack}>
        <span>←</span> Quay lại danh sách bài viết
      </button>

      <article className="detail-main-card">
        <div className="detail-header-meta">
          <span className={`category-badge ${getCategoryBadgeClass(post.category.slug)}`}>
            <span>{categoryIcons[post.category.slug] || '📌'}</span> {post.category.name}
          </span>
          <span className={`status-badge status-${post.status.toLowerCase()}`}>
            {post.status === 'PUBLISHED' ? '● Đang mở' : post.status === 'RESOLVED' ? '✓ Đã xong' : 'Ẩn'}
          </span>
        </div>

        <h1 className="detail-title">{post.title}</h1>

        <div className="author-bar-detail">
          <div className="author-left">
            <div className="author-avatar-lg">{getInitial(post.author.displayName)}</div>
            <div className="author-meta-text">
              <h4>{post.author.displayName}</h4>
              <span>Đăng vào {formatDate(post.createdAt)}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={copyShareLink}>
            🔗 Chia sẻ bài
          </button>
        </div>

        <div className="detail-body-content">{post.content}</div>

        <div className="detail-actions-bar">
          <div className="action-left-group">
            <button
              className={`btn ${post.reactedByCurrentUser ? 'btn-primary' : 'btn-secondary'}`}
              disabled={!user}
              onClick={() =>
                act(
                  () => api(`/posts/${post.id}/reaction`, { method: 'POST' }),
                  post.reactedByCurrentUser ? 'Đã bỏ quan tâm' : 'Đã bày tỏ quan tâm bài viết ❤️'
                )
              }
            >
              <span>{post.reactedByCurrentUser ? '❤️' : '🤍'}</span>
              <span>{post.reactionCount} Quan tâm</span>
            </button>
          </div>

          <div className="action-right-group">
            {canManage && post.status !== 'RESOLVED' && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  act(
                    () => api(`/posts/${post.id}/status`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: 'RESOLVED' }),
                    }),
                    'Đã đánh dấu hoàn tất bài viết'
                  )
                }
              >
                ✓ Đánh dấu hoàn tất
              </button>
            )}

            {user?.role === 'ADMIN' && post.status !== 'HIDDEN' && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  act(
                    () => api(`/posts/${post.id}/status`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: 'HIDDEN' }),
                    }),
                    'Đã ẩn bài viết'
                  )
                }
              >
                Ẩn bài
              </button>
            )}

            {canManage && (
              <button
                className="btn btn-danger btn-sm"
                onClick={async () => {
                  if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return
                  try {
                    await api(`/posts/${post.id}`, { method: 'DELETE' })
                    setNotice('Đã xóa bài viết thành công')
                    onDeleted()
                  } catch (error) {
                    setNotice(error.message)
                  }
                }}
              >
                🗑️ Xóa bài
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <section className="comments-section">
        <div className="comments-header-title">
          <span>Bình luận</span>
          <span className="comments-count-pill">{post.commentCount}</span>
        </div>

        {user ? (
          <form
            className="comment-input-form"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!comment.trim()) return
              setSubmittingComment(true)
              try {
                await api(`/posts/${post.id}/comments`, {
                  method: 'POST',
                  body: JSON.stringify({ content: comment.trim() }),
                })
                setComment('')
                setNotice('Đã thêm bình luận mới!')
                await onChanged()
              } catch (err) {
                setNotice(err.message)
              } finally {
                setSubmittingComment(false)
              }
            }}
          >
            <textarea
              className="comment-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ ý kiến hoặc phản hồi của bạn về bài viết..."
              required
              maxLength={1000}
            />
            <div className="comment-form-actions">
              <button className="btn btn-primary btn-sm" disabled={submittingComment}>
                {submittingComment ? 'Đang gửi...' : '💬 Gửi bình luận'}
              </button>
            </div>
          </form>
        ) : (
          <div className="empty-state" style={{ padding: '24px', marginBottom: '24px' }}>
            <p>Vui lòng đăng nhập để bình luận hoặc tương tác với bài viết này.</p>
          </div>
        )}

        <div className="comments-list">
          {post.comments && post.comments.length > 0 ? (
            post.comments.map((item) => (
              <div className="comment-item" key={item.id}>
                <div className="comment-item-header">
                  <div className="comment-author-badge">
                    <div className="author-avatar-sm">{getInitial(item.author.displayName)}</div>
                    <span className="comment-author-name">{item.author.displayName}</span>
                  </div>
                  <span className="comment-time">{formatDate(item.createdAt)}</span>
                </div>
                <p className="comment-text">{item.content}</p>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '16px 0' }}>
              Chưa có bình luận nào. Hãy là người đầu tiên để lại phản hồi!
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function AuthDialog({ onClose, onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', displayName: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        await api('/auth/register', { method: 'POST', body: JSON.stringify(form) })
      }
      setCredentials(form.username, form.password)
      const currentUser = await api('/auth/me')
      onLogin(currentUser)
    } catch (err) {
      clearCredentials()
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError('') }}
          >
            Đăng ký
          </button>
        </div>

        {error && <div className="form-error-banner">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Tên đăng nhập</label>
            <input
              className="form-input"
              required
              minLength={3}
              placeholder="ví dụ: student hoặc nguyenvana"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Tên hiển thị</label>
              <input
                className="form-input"
                required
                placeholder="ví dụ: Nguyễn Văn A"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input
              className="form-input"
              type="password"
              required
              minLength={6}
              placeholder="Tối thiểu 6 ký tự"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập ngay' : 'Tạo tài khoản mới')}
          </button>
        </form>
      </div>
    </div>
  )
}

function PostDialog({ categories, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', content: '', categoryId: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api('/posts', {
        method: 'POST',
        body: JSON.stringify({ ...form, categoryId: Number(form.categoryId) }),
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">✍️ Đăng bài viết mới</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="form-error-banner">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Tiêu đề bài viết</label>
            <input
              className="form-input"
              required
              maxLength={160}
              placeholder="Nhập tiêu đề ngắn gọn, rõ ràng..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Chuyên mục</label>
            <select
              className="form-select"
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">-- Chọn chuyên mục phù hợp --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryIcons[c.slug] || '📌'} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nội dung chi tiết</label>
            <textarea
              className="form-textarea"
              required
              rows={6}
              maxLength={10000}
              placeholder="Mô tả cụ thể thông tin bạn muốn chia sẻ..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Đang đăng tải...' : '🚀 Đăng bài ngay'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
