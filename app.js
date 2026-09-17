(() => {
  const getById = id => document.getElementById(id);
  let client = null;
  let currentUser = null;
  let mode = 'login';
  const skins = [
    ['aurora', 'Aurora', '#86f7df', 0],
    ['sol', 'Solaris', '#ffd479', 25],
    ['void', 'Voidglass', '#c084fc', 50],
    ['ember', 'Ember', '#ff8a65', 75]
  ];

  function notice(text, type = '') {
    const el = getById('authMessage');
    if (el) {
      el.textContent = text;
      el.className = `auth-message ${type}`;
    }
  }

  function init() {
    const config = window.__SUPABASE_CONFIG__;
    if (!config || !config.url || !config.anonKey || config.url.includes('YOUR_') || config.anonKey.includes('YOUR_')) {
      notice('Add your Supabase URL and publishable key to config.js before signing in.', 'error');
      bind();
      return;
    }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      notice('Supabase failed to load. Check your internet connection and refresh.', 'error');
      bind();
      return;
    }
    client = window.supabase.createClient(config.url, config.anonKey);
    bind();
    client.auth.getSession().then(({ data }) => {
      if (data && data.session) enter(data.session.user);
    }).catch(error => notice(error.message, 'error'));
    client.auth.onAuthStateChange((event, session) => {
      if (session) enter(session.user);
    });
  }

  function bind() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        mode = tab.dataset.mode;
        document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === tab));
        getById('nameWrap')?.classList.toggle('hidden', mode !== 'signup');
        const submit = getById('authSubmit');
        if (submit) submit.textContent = mode === 'signup' ? 'Create account ↗' : 'Log in ↗';
        notice('');
      });
    });
    const form = getById('authForm');
    if (form) form.addEventListener('submit', auth);
    getById('logoutBtn')?.addEventListener('click', () => client?.auth.signOut());
    getById('acceptCookies')?.addEventListener('click', () => {
      localStorage.setItem('loomCookies', '1');
      getById('cookies')?.classList.add('hidden');
    });
    document.querySelectorAll('[data-close]').forEach(button => {
      button.addEventListener('click', () => getById(button.dataset.close)?.classList.add('hidden'));
    });
    getById('shopButton')?.addEventListener('click', () => {
      getById('shopModal')?.classList.remove('hidden');
      renderShop();
    });
    getById('settingsButton')?.addEventListener('click', () => getById('settingsModal')?.classList.remove('hidden'));
    getById('reportButton')?.addEventListener('click', () => getById('reportModal')?.classList.remove('hidden'));
  }

  async function auth(event) {
    event.preventDefault();
    if (!client) {
      notice('Configure Supabase first.', 'error');
      return;
    }
    const email = getById('emailInput')?.value.trim();
    const password = getById('passwordInput')?.value;
    if (!email || !password) {
      notice('Enter an email address and password.', 'error');
      return;
    }
    const submit = getById('authSubmit');
    if (submit) submit.disabled = true;
    try {
      let result;
      if (mode === 'signup') {
        const name = getById('nameInput')?.value.trim() || 'Pilot';
        result = await client.auth.signUp({ email, password, options: { data: { pilot_name: name } } });
      } else {
        result = await client.auth.signInWithPassword({ email, password });
      }
      if (result.error) {
        notice(result.error.message, 'error');
        return;
      }
      if (mode === 'signup') {
        notice(result.data.session ? 'Account created.' : 'Account created. Check your email to confirm it.', 'success');
      } else if (result.data.user) {
        enter(result.data.user);
      }
    } catch (error) {
      notice(error.message || 'Authentication failed.', 'error');
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function enter(user) {
    currentUser = user;
    getById('authPanel')?.classList.add('hidden');
    getById('gamePanel')?.classList.remove('hidden');
    getById('logoutBtn')?.classList.remove('hidden');
    const badge = getById('userBadge');
    if (badge) badge.textContent = user.user_metadata?.pilot_name || user.email;
    if (window.gameAPI?.buildLevel) window.gameAPI.buildLevel(1);
  }

  async function save() {
    if (!client || !currentUser) return;
    const game = window.gameAPI?.game;
    if (!game) return;
    await client.from('player_progress').upsert({
      id: currentUser.id,
      level: game.level,
      best_score: game.score,
      health: Math.round(game.health),
      energy: Math.round(game.energy),
      skin: game.skin
    });
  }

  function renderShop() {
    const box = getById('skinGrid');
    if (!box) return;
    box.innerHTML = skins.map(([id, name, color, price]) => `<button class="skin" data-skin="${id}" style="--skin:${color}"><i></i><b>${name}</b><small>${price === 0 ? 'Free' : price + ' shards'}</small></button>`).join('');
    box.querySelectorAll('.skin').forEach(button => {
      button.addEventListener('click', () => window.gameAPI?.setSkin?.(button.dataset.skin));
    });
  }

  async function report(event) {
    event.preventDefault();
    const message = getById('reportMessage');
    if (!currentUser) {
      if (message) message.textContent = 'Sign in first.';
      return;
    }
    const result = await client.from('bug_reports').insert({
      user_id: currentUser.id,
      title: getById('reportTitle')?.value,
      body: getById('reportBody')?.value
    });
    if (message) message.textContent = result.error ? result.error.message : 'Transmission received.';
  }

  window.addEventListener('DOMContentLoaded', init, { once: true });
})();