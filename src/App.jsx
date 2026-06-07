import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser } from './firebase';
import { AI_CONFIG, AI_ORDER } from './aiConfig';
import { sendToGemini } from './geminiApi';
import { getRole, getOrCreateAuthCode } from './roles';
import {
  ArrowUp, LogOut, X, BookOpen, Calculator, Search, Sparkles,
  Shield, User, Copy, Check
} from 'lucide-react';

function getStorageKey(uid, aiId) { return `chat_${uid}_${aiId}`; }
function loadConversation(uid, aiId) {
  try { const s = localStorage.getItem(getStorageKey(uid, aiId)); return s ? JSON.parse(s) : []; }
  catch { return []; }
}
function saveConversation(uid, aiId, msgs) {
  try { localStorage.setItem(getStorageKey(uid, aiId), JSON.stringify(msgs)); } catch {}
}
function formatText(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br/>');
}

const AI_ICONS = {
  scorpio: <Calculator size={14}/>,
  exeunt:  <BookOpen size={14}/>,
  clarity: <Search size={14}/>,
};

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, loading }) {
  return (
    <div style={{
      height:'100dvh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'#0f0f10', fontFamily:"'DM Sans', sans-serif",
      position:'relative', overflow:'hidden',
    }}>
      <div style={{
        position:'fixed', top:'-200px', left:'50%', transform:'translateX(-50%)',
        width:'500px', height:'400px', borderRadius:'50%',
        filter:'blur(100px)', opacity:0.12, background:'#8B5CF6', pointerEvents:'none',
      }}/>
      <div style={{
        position:'relative', zIndex:1, display:'flex', flexDirection:'column',
        alignItems:'center', gap:24, padding:'40px 32px',
        background:'#18181b', border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:24, maxWidth:380, width:'90%',
      }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ marginBottom:10, color:'#8B5CF6', display:'flex', justifyContent:'center' }}>
            <Sparkles size={36}/>
          </div>
          <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:24, color:'#f4f4f5', marginBottom:6 }}>
            A Teacher's AI <span style={{ fontStyle:'italic', opacity:0.45 }}>Tool</span>
          </div>
          <div style={{ fontSize:13, color:'#71717a', lineHeight:1.6 }}>
            Sign in with your Google account to access Scorpio, Exeunt &amp; Clarity
          </div>
        </div>
        <div style={{ width:'100%', height:1, background:'rgba(255,255,255,0.06)' }}/>
        <div style={{ display:'flex', gap:12, width:'100%' }}>
          {AI_ORDER.map(id => {
            const c = AI_CONFIG[id];
            return (
              <div key={id} style={{
                flex:1, padding:'10px 8px', borderRadius:12, textAlign:'center',
                background:c.glowColor, border:`1px solid ${c.hex}33`,
              }}>
                <div style={{ marginBottom:4, display:'flex', justifyContent:'center', color:c.hex }}>
                  {id==='scorpio'?<Calculator size={20}/>:id==='exeunt'?<BookOpen size={20}/>:<Search size={20}/>}
                </div>
                <div style={{ fontSize:12, fontWeight:500, color:'#f4f4f5' }}>{c.label}</div>
                <div style={{ fontSize:10, color:'#71717a', marginTop:2 }}>{c.subject}</div>
              </div>
            );
          })}
        </div>
        <button onClick={onLogin} disabled={loading} style={{
          width:'100%', padding:'12px 20px', borderRadius:12,
          border:'1px solid rgba(255,255,255,0.1)',
          background: loading ? '#27272a' : '#fff',
          color: loading ? '#71717a' : '#111',
          fontSize:14, fontWeight:500, cursor: loading ? 'not-allowed' : 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:10,
          fontFamily:"'DM Sans', sans-serif", transition:'all 0.2s',
        }}>
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
        <div style={{ fontSize:11, color:'#3f3f46', textAlign:'center' }}>
          Only authorised accounts can access this tool
        </div>
      </div>
    </div>
  );
}

// ── Profile Sidebar ───────────────────────────────────────────────────────────
function ProfileSidebar({ user, role, authCode, open, onClose, onSignOut }) {
  const [copied, setCopied] = useState(false);
  const isAdmin = role === 'admin';

  function copyCode() {
    navigator.clipboard.writeText(authCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      {open && (
        <div onClick={onClose} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          zIndex:50, backdropFilter:'blur(4px)',
        }}/>
      )}
      <div style={{
        position:'fixed', top:0, right:0, height:'100dvh', width:270,
        background:'#18181b', borderLeft:'1px solid rgba(255,255,255,0.08)',
        zIndex:51, transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition:'transform 0.3s cubic-bezier(0.34,1.2,0.64,1)',
        display:'flex', flexDirection:'column',
        fontFamily:"'DM Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 16px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize:13, fontWeight:500, color:'#a1a1aa' }}>Account</span>
          <button onClick={onClose} style={{
            background:'none', border:'none', cursor:'pointer',
            color:'#52525b', padding:4, borderRadius:6,
            display:'flex', alignItems:'center',
          }}>
            <X size={16}/>
          </button>
        </div>

        {/* User info */}
        <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ position:'relative' }}>
            <img src={user.photoURL} alt={user.displayName} style={{
              width:64, height:64, borderRadius:'50%',
              border:'2px solid rgba(255,255,255,0.1)',
            }}/>
            {/* Role badge on avatar */}
            <div style={{
              position:'absolute', bottom:-2, right:-2,
              width:20, height:20, borderRadius:'50%',
              background: isAdmin ? '#8B5CF6' : '#3B82F6',
              display:'flex', alignItems:'center', justifyContent:'center',
              border:'2px solid #18181b',
            }}>
              {isAdmin ? <Shield size={10} color="#fff"/> : <User size={10} color="#fff"/>}
            </div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:500, color:'#f4f4f5' }}>{user.displayName}</div>
            <div style={{ fontSize:12, color:'#71717a', marginTop:2 }}>{user.email}</div>
          </div>

          {/* Role pill */}
          <div style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'4px 10px', borderRadius:999,
            background: isAdmin ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
            border: `1px solid ${isAdmin ? 'rgba(139,92,246,0.3)' : 'rgba(59,130,246,0.3)'}`,
            fontSize:11, fontWeight:500,
            color: isAdmin ? '#a78bfa' : '#60a5fa',
          }}>
            {isAdmin ? <Shield size={10}/> : <User size={10}/>}
            {isAdmin ? 'Admin' : 'User'}
          </div>
        </div>

        <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'0 16px' }}/>

        {/* Auth Code */}
        <div style={{ padding:'16px' }}>
          <div style={{ fontSize:11, color:'#52525b', marginBottom:8, fontWeight:500, letterSpacing:'0.5px', textTransform:'uppercase' }}>
            Authorization Code
          </div>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            background:'#222226', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:10, padding:'10px 12px',
          }}>
            <span style={{
              fontFamily:'monospace', fontSize:20, fontWeight:700,
              letterSpacing:'0.15em', color:'#f4f4f5',
            }}>
              {authCode}
            </span>
            <button onClick={copyCode} style={{
              background:'none', border:'none', cursor:'pointer',
              color: copied ? '#4ade80' : '#52525b',
              display:'flex', alignItems:'center', transition:'color 0.2s',
            }}>
              {copied ? <Check size={15}/> : <Copy size={15}/>}
            </button>
          </div>
          <div style={{ fontSize:11, color:'#3f3f46', marginTop:6, lineHeight:1.5 }}>
            Required when signing in from a new device
          </div>
        </div>

        <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'0 16px' }}/>

        {/* Sign out */}
        <div style={{ padding:'12px 8px' }}>
          <button onClick={onSignOut} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10,
            padding:'10px 12px', borderRadius:10, border:'none',
            background:'none', cursor:'pointer', color:'#f87171',
            fontSize:14, fontFamily:"'DM Sans', sans-serif", transition:'background 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}
          >
            <LogOut size={15}/> Sign out
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [role, setRole] = useState('user');
  const [authCode, setAuthCode] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const aiFromPath = AI_ORDER.includes(location.pathname.replace('/',''))
    ? location.pathname.replace('/','') : 'scorpio';

  const [activeAI, setActiveAI] = useState(aiFromPath);
  const [conversations, setConversations] = useState({ scorpio:[], exeunt:[], clarity:[] });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const chatRef = useRef(null);
  const textareaRef = useRef(null);
  const tabsRef = useRef({});
  const pillRef = useRef(null);

  const cfg = AI_CONFIG[activeAI];
  const msgs = conversations[activeAI];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        const loaded = {};
        AI_ORDER.forEach(id => { loaded[id] = loadConversation(u.uid, id); });
        setConversations(loaded);
        setRole(getRole(u.email));
        setAuthCode(getOrCreateAuthCode(u.uid));
      }
    });
    return unsub;
  }, []);

  async function handleSignIn() {
    setSignInLoading(true);
    try { await signInWithGoogle(); } catch(e) { console.error(e); }
    finally { setSignInLoading(false); }
  }

  async function handleSignOut() {
    setSidebarOpen(false);
    await signOutUser();
    setConversations({ scorpio:[], exeunt:[], clarity:[] });
    setRole('user');
    setAuthCode('');
    navigate('/');
  }

  function switchAI(id) { setActiveAI(id); setError(''); navigate('/'+id); }

  useEffect(() => {
    const id = location.pathname.replace('/','');
    if (AI_ORDER.includes(id)) setActiveAI(id);
  }, [location.pathname]);

  useLayoutEffect(() => {
    const tabEl = tabsRef.current[activeAI];
    const pill = pillRef.current;
    if (!tabEl || !pill) return;
    const switcher = tabEl.closest('#switcher');
    if (!switcher) return;
    const sRect = switcher.getBoundingClientRect();
    const tRect = tabEl.getBoundingClientRect();
    pill.style.left = (tRect.left - sRect.left) + 'px';
    pill.style.width = tRect.width + 'px';
    pill.style.background = cfg.hex;
  }, [activeAI, user]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [conversations, loading, activeAI]);

  async function send(text) {
    if (!text.trim() || loading || !user) return;
    setInput(''); setError('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    const newMsgs = [...conversations[activeAI], { role:'user', content:text }];
    setConversations(prev => ({ ...prev, [activeAI]: newMsgs }));
    saveConversation(user.uid, activeAI, newMsgs);
    setLoading(true);
    try {
      const reply = await sendToGemini(cfg.system, newMsgs);
      const finalMsgs = [...newMsgs, { role:'assistant', content:reply }];
      setConversations(prev => ({ ...prev, [activeAI]: finalMsgs }));
      saveConversation(user.uid, activeAI, finalMsgs);
    } catch(e) {
      setError(e.message);
      setConversations(prev => ({ ...prev, [activeAI]: newMsgs }));
    } finally { setLoading(false); }
  }

  function clearChat() {
    if (!user) return;
    setConversations(prev => ({ ...prev, [activeAI]:[] }));
    localStorage.removeItem(getStorageKey(user.uid, activeAI));
    setError('');
  }

  function handleKey(e) { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); send(input); } }
  function autoResize(e) { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'; }

  const welcomeSubs = {
    scorpio: "Your math tutor. Ask me anything — I'll break it down step by step.",
    exeunt:  "Your English & writing helper. Grammar, essays, poetry — I've got you.",
    clarity: "Your research buddy. Ask me about any topic and I'll explain it clearly.",
  };

  if (authLoading) return (
    <div style={{ height:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f0f10', color:'#71717a', fontFamily:"'DM Sans', sans-serif", fontSize:14 }}>
      Loading…
    </div>
  );

  if (!user) return <LoginScreen onLogin={handleSignIn} loading={signInLoading}/>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', position:'relative', overflow:'hidden' }}>

      <div style={{
        position:'fixed', top:'-180px', left:'50%', transform:'translateX(-50%)',
        width:'500px', height:'360px', borderRadius:'50%',
        filter:'blur(100px)', opacity:0.13, pointerEvents:'none',
        background:cfg.hex, transition:'background 0.5s ease', zIndex:0,
      }}/>

      <ProfileSidebar
        user={user} role={role} authCode={authCode}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSignOut={handleSignOut}
      />

      {/* Topbar */}
      <div style={{
        position:'relative', zIndex:10, display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'13px 20px',
        borderBottom:'1px solid rgba(255,255,255,0.08)',
        background:'rgba(15,15,16,0.85)', backdropFilter:'blur(12px)', flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:18, letterSpacing:'-0.3px' }}>
            A Teacher's AI <span style={{ fontStyle:'italic', opacity:0.45 }}>Tool</span>
          </div>
          {/* Role badge in topbar */}
          <div style={{
            display:'flex', alignItems:'center', gap:4,
            padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:500,
            background: role==='admin' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
            border: `1px solid ${role==='admin' ? 'rgba(139,92,246,0.3)' : 'rgba(59,130,246,0.3)'}`,
            color: role==='admin' ? '#a78bfa' : '#60a5fa',
          }}>
            {role==='admin' ? <Shield size={9}/> : <User size={9}/>}
            {role==='admin' ? 'Admin' : 'User'}
          </div>
        </div>

        <div id="switcher" style={{
          display:'flex', alignItems:'center',
          background:'#18181b', border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:999, padding:'4px', gap:2, position:'relative',
        }}>
          <div ref={pillRef} style={{
            position:'absolute', height:'calc(100% - 8px)', borderRadius:999, top:4,
            transition:'left 0.3s cubic-bezier(0.34,1.56,0.64,1), width 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.4s',
            zIndex:1,
          }}/>
          {AI_ORDER.map(id => (
            <button key={id} ref={el => tabsRef.current[id]=el} onClick={() => switchAI(id)} style={{
              position:'relative', zIndex:2, padding:'6px 15px', borderRadius:999,
              fontSize:13, fontWeight: activeAI===id ? 500 : 400,
              color: activeAI===id ? '#fff' : '#71717a',
              cursor:'pointer', border:'none', background:'transparent',
              fontFamily:"'DM Sans', sans-serif", whiteSpace:'nowrap', transition:'color 0.2s',
            }}>
              {AI_CONFIG[id].label}
            </button>
          ))}
        </div>

        <button onClick={() => setSidebarOpen(true)} style={{
          background:'none', border:'none', cursor:'pointer', padding:0,
          borderRadius:'50%', display:'flex', alignItems:'center',
        }}>
          <img src={user.photoURL} alt={user.displayName} style={{
            width:32, height:32, borderRadius:'50%',
            border:'1.5px solid rgba(255,255,255,0.12)',
          }}/>
        </button>
      </div>

      {/* Now using banner */}
      <div style={{
        flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
        gap:7, padding:'7px 20px', fontSize:12, color:'#71717a',
        borderBottom:'1px solid rgba(255,255,255,0.08)',
        background:'rgba(15,15,16,0.6)', backdropFilter:'blur(8px)',
        position:'relative', zIndex:9,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.hex, animation:'pulse 2s infinite', flexShrink:0, display:'inline-block' }}/>
          <span>Now using <strong style={{ fontWeight:500, color:'#e4e4e7' }}>{cfg.label}</strong> — {cfg.subject}</span>
          <span style={{ opacity:0.45, fontSize:11 }}>{cfg.disclaimer}</span>
        </div>
        {msgs.length > 0 && (
          <button onClick={clearChat} style={{
            fontSize:11, color:'#52525b', background:'none', border:'none',
            cursor:'pointer', padding:'2px 8px', borderRadius:6,
            fontFamily:"'DM Sans', sans-serif", transition:'color 0.2s',
            display:'flex', alignItems:'center', gap:4,
          }}
            onMouseEnter={e => e.currentTarget.style.color='#f87171'}
            onMouseLeave={e => e.currentTarget.style.color='#52525b'}
          >
            <X size={11}/> Clear chat
          </button>
        )}
      </div>

      {/* Chat area */}
      <div ref={chatRef} style={{
        flex:1, overflowY:'auto', padding:'20px',
        display:'flex', flexDirection:'column', gap:14,
        position:'relative', zIndex:5,
      }}>
        {msgs.length === 0 ? (
          <div className="animate-fadeUp" style={{
            display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', flex:1, gap:10, textAlign:'center',
            padding:'40px 20px', minHeight:300,
          }}>
            <div style={{
              width:56, height:56, borderRadius:16, display:'flex',
              alignItems:'center', justifyContent:'center',
              background:cfg.glowColor, border:`1px solid ${cfg.hex}33`, marginBottom:4, color:cfg.hex,
            }}>
              {cfg.id==='scorpio'?<Calculator size={26}/>:cfg.id==='exeunt'?<BookOpen size={26}/>:<Search size={26}/>}
            </div>
            <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:22 }}>Hey! I'm {cfg.label}</div>
            <div style={{ fontSize:14, color:'#71717a', maxWidth:280, lineHeight:1.65 }}>{welcomeSubs[activeAI]}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:16, maxWidth:500 }}>
              {cfg.chips.map(chip => (
                <button key={chip} onClick={() => send(chip)} style={{
                  padding:'8px 14px', background:'#18181b',
                  border:'1px solid rgba(255,255,255,0.08)', borderRadius:999,
                  fontSize:13, color:'#71717a', cursor:'pointer',
                  fontFamily:"'DM Sans', sans-serif", transition:'all 0.2s',
                }}
                  onMouseEnter={e => { e.target.style.color='#f4f4f5'; e.target.style.borderColor='rgba(255,255,255,0.2)'; }}
                  onMouseLeave={e => { e.target.style.color='#71717a'; e.target.style.borderColor='rgba(255,255,255,0.08)'; }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          msgs.map((m, i) => (
            <div key={i} className="animate-fadeUp" style={{
              display:'flex', gap:10, maxWidth:'78%',
              alignSelf: m.role==='user' ? 'flex-end' : 'flex-start',
              flexDirection: m.role==='user' ? 'row-reverse' : 'row',
            }}>
              <div style={{
                width:30, height:30, borderRadius:'50%', display:'flex',
                alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:600, flexShrink:0, color:'#fff',
                background: m.role==='user' ? '#27272a' : cfg.hex,
                border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden',
              }}>
                {m.role==='user'
                  ? <img src={user.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : cfg.initials}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:3, maxWidth:'100%' }}>
                {m.role==='assistant' && (
                  <div style={{ fontSize:11, color:cfg.hex, fontWeight:500, letterSpacing:'0.3px', paddingLeft:2, display:'flex', alignItems:'center', gap:4 }}>
                    {AI_ICONS[activeAI]} {cfg.label}
                  </div>
                )}
                <div style={{
                  padding:'10px 14px', borderRadius:18,
                  borderBottomRightRadius: m.role==='user' ? 4 : 18,
                  borderBottomLeftRadius: m.role==='assistant' ? 4 : 18,
                  fontSize:14, lineHeight:1.65, color:'#f4f4f5',
                  background: m.role==='user' ? '#222226' : '#18181b',
                  border:'1px solid rgba(255,255,255,0.08)',
                }} dangerouslySetInnerHTML={{ __html: formatText(m.content) }}/>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display:'flex', gap:10, alignSelf:'flex-start' }}>
            <div style={{
              width:30, height:30, borderRadius:'50%', display:'flex',
              alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:600, flexShrink:0, color:'#fff',
              background:cfg.hex, border:'1px solid rgba(255,255,255,0.08)',
            }}>{cfg.initials}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              <div style={{ fontSize:11, color:cfg.hex, fontWeight:500, paddingLeft:2, display:'flex', alignItems:'center', gap:4 }}>
                {AI_ICONS[activeAI]} {cfg.label}
              </div>
              <div style={{
                padding:'12px 14px', borderRadius:18, borderBottomLeftRadius:4,
                background:'#18181b', border:'1px solid rgba(255,255,255,0.08)',
                display:'flex', gap:5, alignItems:'center',
              }}>
                <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            alignSelf:'center', padding:'8px 16px', borderRadius:8,
            background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)',
            fontSize:13, color:'#f87171', maxWidth:'80%', textAlign:'center',
          }}>⚠️ {error}</div>
        )}
      </div>

      {/* Input */}
      <div style={{
        position:'relative', zIndex:10, padding:'12px 20px 16px',
        background:'rgba(15,15,16,0.92)', backdropFilter:'blur(12px)',
        borderTop:'1px solid rgba(255,255,255,0.08)', flexShrink:0,
      }}>
        <div style={{
          display:'flex', alignItems:'flex-end', gap:10,
          background:'#18181b', border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:16, padding:'10px 10px 10px 16px',
        }}>
          <textarea ref={textareaRef} value={input}
            onChange={e => setInput(e.target.value)}
            onInput={autoResize} onKeyDown={handleKey} rows={1}
            placeholder={`Ask ${cfg.label} anything…`}
            style={{
              flex:1, background:'transparent', border:'none', outline:'none',
              resize:'none', fontFamily:"'DM Sans', sans-serif", fontSize:14,
              color:'#f4f4f5', lineHeight:1.6, maxHeight:120, minHeight:24,
            }}
          />
          <button onClick={() => send(input)} disabled={loading||!input.trim()} style={{
            width:36, height:36, borderRadius:10, border:'none',
            cursor: loading||!input.trim() ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, color:'#fff',
            background: loading||!input.trim() ? '#3f3f46' : cfg.hex,
            transition:'background 0.3s',
          }}>
            <ArrowUp size={16}/>
          </button>
        </div>
        <div style={{ textAlign:'center', fontSize:11, color:'#3f3f46', marginTop:7 }}>
          Scorpio, Exeunt &amp; Clarity are powered by Groq AI
        </div>
      </div>
    </div>
  );
}
