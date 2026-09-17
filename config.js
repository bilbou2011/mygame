const AUTH_MODE = {
  SIGN_IN: 'login',
  SIGN_UP: 'signup'
};

let currentMode = AUTH_MODE.SIGN_IN;
let supabase = null;
let currentProfile = null;
let currentUser = null;

const authForm = document.getElementById('authForm');
const authMessage = document.getElementById('authMessage');
const authPanel = document.getElementById('authPanel');
const gamePanel = document.getElementById('gamePanel');
const logoutBtn = document.getElementById('logoutBtn');
const adminPanel = document.getElementById('adminPanel');
const adminButton = document.getElementById('adminButton');
const nameWrap = document.getElementById('nameWrap');

function setAuthMessage(text, type = '') {
  authMessage.textContent = text;
  authMessage.className = 'auth-message';
  if (type) authMessage.classList.add(type);
}

function ensureSupabaseConfig() {
  const config = window.__SUPABASE_CONFIG__;
  if (!config || !config.url || !config.anonKey || config.url.includes('YOUR_PROJECT') || config.anonKey.includes('YOUR_')) {
    setAuthMessage('Configure config.js with your Supabase URL and anon key before using auth.', 'error');
    return false;
  }
  return true;
}

function initSupabase() {
  if (!ensureSupabaseConfig()) return;
  supabase = window.supabase.createClient(
    window.__SUPABASE_CONFIG__.url,
    window.__SUPABASE_CONFIG__.anonKey
  );
}

function setMode(mode) {
  currentMode = mode;
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === mode));
  const buttonText = mode === AUTH_MODE.SIGN_UP ? 'Create account' : 'Log in';
  document.getElementById('submitAuthBtn').textContent = buttonText;
  nameWrap.classList.toggle('hidden', mode !== AUTH_MODE.SIGN_UP);
}

async function loadProfile() {
  if (!supabase || !currentUser) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error) {
    console.error('Profile fetch failed:', error);
    currentProfile = null;
    return;
  }

  currentProfile = data;
  document.getElementById('userBadge').textContent = currentProfile.display_name || currentUser.email;
  document.getElementById('profileMeta').textContent = `${currentUser.email} • ${currentProfile.role}`;

  if (currentProfile.role === 'admin') {
    document.getElementById('adminStatus').textContent = 'Enabled';
    adminButton.classList.remove('hidden');
  } else {
    document.getElementById('adminStatus').textContent = 'Not enabled';
    adminButton.classList.add('hidden');
  }
}

async function saveProgressToSupabase() {
  if (!supabase || !currentUser) return;

  const payload = {
    id: currentUser.id,
    level: window.gameAPI.game.level,
    best_score: Math.max(window.gameAPI.game.score, 0),
    armor: Math.round(window.gameAPI.game.pulse),
    last_saved_at: new Date().toISOString()
  };

  const { error } = await supabase.from('player_progress').upsert(payload, { onConflict: 'id' });
  if (error) console.error('Save failed:', error);
}

async function loadSavedProgressFromSupabase() {
  if (!supabase || !currentUser) return;

  const { data, error } = await supabase
    .from('player_progress')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error) return;
  if (data) {
    const level = Number(data.level) || 1;
    window.gameAPI.buildLevel(level);
    document.getElementById('levelDisplay').textContent = String(level);
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!supabase) return;

  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const displayName = document.getElementById('nameInput').value.trim();

  if (!email || !password) {
    setAuthMessage('Email and password are required.', 'error');
    return;
  }

  setAuthMessage('Working…');

  try {
    if (currentMode === AUTH_MODE.SIGN_UP) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0]
          }
        }
      });

      if (error) throw error;
      if (data.user) {
        setAuthMessage('Check your email to confirm the account, then log in.', 'success');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      await loadProfile();
      await loadSavedProgressFromSupabase();
      authPanel.classList.add('hidden');
      gamePanel.classList.remove('hidden');
      logoutBtn.classList.remove('hidden');
      setAuthMessage('Signed in successfully.', 'success');
      window.gameAPI.startGameLoop();
    }
  } catch (error) {
    setAuthMessage(error.message || 'Authentication failed.', 'error');
  }
}

async function handleLogout() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    setAuthMessage(error.message, 'error');
    return;
  }
  currentUser = null;
  currentProfile = null;
  gamePanel.classList.add('hidden');
  authPanel.classList.remove('hidden');
  logoutBtn.classList.add('hidden');
  adminPanel.classList.add('hidden');
  setAuthMessage('Signed out successfully.', 'success');
  document.getElementById('authForm').reset();
}

async function syncAuthState() {
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    authPanel.classList.add('hidden');
    gamePanel.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    await loadProfile();
    await loadSavedProgressFromSupabase();
    window.gameAPI.startGameLoop();
  }
}

function configureEventHandlers() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  authForm.addEventListener('submit', handleAuthSubmit);
  logoutBtn.addEventListener('click', handleLogout);

  document.getElementById('fullscreenBtn').addEventListener('click', async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
    }
  });

  document.getElementById('grantLevelBtn').addEventListener('click', async () => {
    if (!supabase || !currentUser) return;
    const next = Math.min(24, (window.gameAPI.game.level || 1) + 1);
    window.gameAPI.buildLevel(next);
    await saveProgressToSupabase();
  });

  document.getElementById('restoreArmorBtn').addEventListener('click', () => {
    window.gameAPI.game.pulse = 100;
    document.getElementById('armorDisplay').textContent = '100%';
  });

  document.getElementById('resetSaveBtn').addEventListener('click', async () => {
    if (!supabase || !currentUser) return;
    await supabase.from('player_progress').delete().eq('id', currentUser.id);
    window.gameAPI.buildLevel(1);
  });

  adminButton.addEventListener('click', () => {
    adminPanel.classList.toggle('hidden');
  });

  window.addEventListener('loom-win', async () => {
    if (!supabase || !currentUser) return;
    const nextLevel = Math.min(24, (window.gameAPI.game.level || 1) + 1);
    window.gameAPI.buildLevel(nextLevel);
    await saveProgressToSupabase();
  });

  window.addEventListener('loom-lost', async () => {
    if (!supabase || !currentUser) return;
    await saveProgressToSupabase();
  });

  window.addEventListener('loom-pause-toggle', () => {
    const target = window.gameAPI.game.state === 'playing' ? 'paused' : 'playing';
    window.gameAPI.game.state = target;
  });
}

window.addEventListener('load', async () => {
  initSupabase();
  configureEventHandlers();
  setMode(AUTH_MODE.SIGN_IN);
  if (supabase) {
    syncAuthState();
  }
});
