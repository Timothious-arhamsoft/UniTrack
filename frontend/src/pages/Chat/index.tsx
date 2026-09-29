import { useState, useEffect, useRef } from 'react'
import { api, ChatSession, ChatMessage } from '../../api'
import { UniTrackBotIcon} from '../../assets'

export const Chat = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const initialSessionCreated = useRef(false);
  const creatingSession = useRef(false);

  // 1. Fetch Chat Sessions on load
  const loadSessions = async (autoSelectId?: number) => {
    try {
      setLoading(true)
      setError(null)
      const data: ChatSession[] = await api.chat.listSessions()
      setSessions(data)

      if (data.length > 0) {
        const targetId =
          autoSelectId ||
          (activeSessionId &&
          data.some(s => s.id === activeSessionId)
            ? activeSessionId
            : data[0].id);

        setActiveSessionId(targetId);
        loadSessionDetail(targetId);
      } else {
        // Create only one initial session
        if (!initialSessionCreated.current) {
          initialSessionCreated.current = true;
          await handleNewChat();
        }
      }
    } catch (err: any) {
      console.error('Failed to load chat sessions:', err)
      setError(err.message || 'Failed to connect to Chat server.')
    } finally {
      setLoading(false)
    }
  }

  // 2. Fetch specific session details with message history
  const loadSessionDetail = async (id: number) => {
    try {
      const detail: ChatSession = await api.chat.getSession(id)
      setActiveSession(detail)
      scrollToBottom()
    } catch (err: any) {
      console.error('Failed to load session detail:', err)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // 3. Create New Chat Session
  const handleNewChat = async () => {
    if (creatingSession.current) return;

    creatingSession.current = true;

    try {
      setSending(true);

      const newSess: ChatSession =
        await api.chat.createSession("New Chat");

      setSessions(prev => {
        // Avoid adding the same session twice in the UI
        if (prev.some(s => s.id === newSess.id)) {
          return prev;
        }

        return [newSess, ...prev];
      });

      setActiveSessionId(newSess.id);
      setActiveSession(newSess);
    } catch (err: any) {
      setError("Failed to create new chat session.");
      initialSessionCreated.current = false;
    } finally {
      creatingSession.current = false;
      setSending(false);
    }
  };

  // 4. Select Session
  const handleSelectSession = (id: number) => {
    setActiveSessionId(id)
    loadSessionDetail(id)
  }

  // 5. Delete Session
  const handleDeleteSession = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!window.confirm('Delete this chat history?')) return
    try {
      await api.chat.deleteSession(id)
      const updated = sessions.filter(s => s.id !== id)
      setSessions(updated)
      if (activeSessionId === id) {
        if (updated.length > 0) {
          setActiveSessionId(updated[0].id)
          loadSessionDetail(updated[0].id)
        } else {
          setActiveSession(null)
          setActiveSessionId(null)
        }
      }
    } catch (err: any) {
      alert('Failed to delete session: ' + err.message)
    }
  }

  // 6. Send Message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText
    if (!textToSend.trim() || sending || !activeSessionId) return

    const currentId = activeSessionId
    setInputText('')
    setSending(true)
    setError(null)

    // Optimistically push User message to local UI
    const optimisticUserMsg: ChatMessage = {
      id: Date.now(),
      session_id: currentId,
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString()
    }

    setActiveSession(prev => {
      if (!prev) return null
      return {
        ...prev,
        messages: [...(prev.messages || []), optimisticUserMsg]
      }
    })
    scrollToBottom()

    try {
      const updatedSession: ChatSession = await api.chat.sendMessage(currentId, textToSend)
      setActiveSession(updatedSession)
      
      // Update sidebar session title & excerpt
      setSessions(prev =>
        prev.map(s => (s.id === currentId ? { ...s, title: updatedSession.title, updated_at: updatedSession.updated_at } : s))
      )
      scrollToBottom()
    } catch (err: any) {
      console.error('Send message error:', err)
      setError('Failed to get response from Unibot: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Formatting simple markdown-like elements (bold, bullet points, code blocks)
  const renderFormattedMessage = (content: string) => {
    const lines = content.split('\n')
    return lines.map((line, idx) => {
      let formatted: React.ReactNode = line

      // Simple code block display
      if (line.startsWith('```')) {
        return (
          <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem', margin: '4px 0', color: '#a5b4fc' }}>
            {line.replace(/```/g, '')}
          </div>
        )
      }

      // Bullets
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().substring(2)
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: '8px',
              marginLeft: '8px',
              marginTop: '2px',
              marginBottom: '2px',
            }}
          >
            <span style={{ color: 'var(--color-primary)' }}>•</span>
            <span>{renderInlineStyles(bulletText)}</span>
          </div>

        )
      }

      return (
        <div key={idx} style={{ minHeight: '1.2em', marginBottom: '4px' }}>
          {renderInlineStyles(line)}
        </div>
      )
    })
  }

  const renderInlineStyles = (text: string) => {
    // Bold text (**text**)
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} style={{ color: '#fff', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{part.slice(1, -1)}</code>
      }
      return part
    })
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 40px)', margin: '-24px', background: 'var(--color-bg)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      {/* ── Sub-Sidebar: Chat Session History ── */}
      <div style={{ width: '280px', borderRight: '1px solid var(--color-border)', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column' }}>
        {/* Header / New Chat button */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <button
            onClick={handleNewChat}
            disabled={sending}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              transition: 'all 200ms ease',
            }}
          >
            <span>+</span> New Chat
          </button>
        </div>

        {/* Sessions List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-subtle)', padding: '0 8px 8px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Unibot History
          </div>

          {loading && sessions.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Loading conversations...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              No previous chats.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sessions.map(s => {
                const isActive = s.id === activeSessionId
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                      border: isActive ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '1rem' }}>💬</span>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.title || 'Unibot Session'}
                        </div>
                        {s.last_message_excerpt && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.last_message_excerpt}
                          </div>
                        )}
                      </div>
                    </div>
                        <button
                          onClick={(e) => handleDeleteSession(e, s.id)}
                          title="Delete chat"
                          aria-label="Delete chat"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgb(201, 182, 253)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            opacity: 0.7,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>



                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-bg-darker)' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(30, 41, 59, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center',  flexShrink: 0,}}>
              <UniTrackBotIcon size={42} aria-label="UniTrack Bot"/>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Unibot AI Assistant</span>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99,102,241,0.2)', color: 'var(--color-primary)', border: '1px solid rgba(99,102,241,0.3)', fontWeight: 500 }}>
                  Hosted / Groq AI
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>
                {activeSession?.title || 'Personal Admission & Application Counselor'}
              </div>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ margin: '12px 24px 0 24px', padding: '10px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* Message History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!activeSession || !activeSession.messages || activeSession.messages.length === 0 ? (
            <div style={{ margin: 'auto', maxWidth: '500px', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 4px 12px rgba(99,102,241,0.4))' }}>
                🎓
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>Welcome to Unibot</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-text-subtle)' }}>
                  Ask me anything about university admissions, deadlines, SOP writing, document requirements, or scholarship applications!
                </p>
              </div>

              {/* Sample Prompt Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                {[
                  'What deadlines are coming up?',
                  'Help me structure a Statement of Purpose',
                  'What documents do I need for German admissions?',
                  'Tips for requesting a Letter of Recommendation',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.2)'
                      e.currentTarget.style.color = '#fff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                      e.currentTarget.style.color = 'var(--color-text-muted)'
                    }}
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeSession.messages.map((msg, index) => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={msg.id || index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginBottom: '4px', paddingLeft: isUser ? 0 : '4px', paddingRight: isUser ? '4px' : 0 }}>
                    {isUser ? (
                        'You'
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <UniTrackBotIcon size={18} />
                          Unibot
                        </span>
                      )}

                  </div>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      background: isUser ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(30, 41, 59, 0.8)',
                      color: isUser ? '#ffffff' : 'var(--color-text-main)',
                      border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      fontSize: '0.92rem',
                      lineHeight: 1.5,
                      boxShadow: isUser ? '0 4px 14px rgba(99,102,241,0.25)' : '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  >
                    {renderFormattedMessage(msg.content)}
                  </div>
                </div>
              )
            })
          )}

          {/* Thinking animation when sending */}
          {sending && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '85%' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginBottom: '4px', paddingLeft: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <UniTrackBotIcon size={18} />
                  Unibot
                </span>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 2px', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--color-text-muted)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="typing-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }}></span>
                Unibot is thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', background: 'rgba(15, 23, 42, 0.5)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Unibot about deadlines, admission documents, scholarships..."
              rows={2}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'none',
              }}
            />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || sending}
                aria-label="Send message"
                title="Send message"
                style={{
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  borderRadius: '8px',
                  background:
                    !inputText.trim() || sending
                      ? 'rgba(255,255,255,0.1)'
                      : 'var(--color-primary)',
                  color:
                    !inputText.trim() || sending
                      ? 'var(--color-text-subtle)'
                      : '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  cursor:
                    !inputText.trim() || sending ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {sending ? '⏳' : '➤'}
              </button>

          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', marginTop: '6px', textAlign: 'right' }}>
            Press Enter to send, Shift + Enter for newline
          </div>
        </div>
      </div>
    </div>
  )
}
