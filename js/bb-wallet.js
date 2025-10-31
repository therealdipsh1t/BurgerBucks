;(() => {
  // ========= Config from <script data-*> =========
  const me = document.currentScript || document.querySelector('script[src*="bb-wallet.js"]');
  const WC_PROJECT_ID = me?.dataset?.wcProject || 'YOUR_WALLETCONNECT_PROJECT_ID';
  const DASHBOARD_PATH = me?.dataset?.dashboard || './burger-bucks-dashboard.html';
  const CHAINS = (me?.dataset?.chains || '1,137,56,42161').split(',').map(n => Number(n.trim())).filter(Boolean);
  const AUTO_REDIRECT = String(me?.dataset?.autoRedirect || 'false').toLowerCase() === 'true';

  // Map custom RPCs if needed (example shown, keep empty by default)
  const RPC_MAP = {
    // 12345: 'https://YOUR-LIGHTCHAINAI-RPC.example'
  };

  // ========= Helpers =========
  const loadScript = (src) => new Promise((res, rej) => {
    if ([...document.scripts].some(s => s.src === src)) return res();
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = res; s.onerror = () => rej(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });

  const css = `
  .bbw-wrap{position:fixed;top:14px;right:14px;z-index:9999;display:flex;gap:8px;align-items:center}
  .bbw-btn{appearance:none;border:1px solid rgba(255,255,255,.18);
    background:linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.03));
    color:#f6f6f7;padding:9px 12px;border-radius:12px;cursor:pointer;font-weight:700}
  .bbw-btn:hover{transform:translateY(-1px);border-color:#ffffff55}
  .bbw-btn.primary{border-color:transparent;background:linear-gradient(180deg,#ffd166,#ffb703);color:#3a1600}
  .bbw-label{font:500 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;opacity:.9}
  /* chooser modal */
  .bbw-chooser{position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.55);z-index:10000}
  .bbw-chooser.open{display:grid}
  .bbw-card{min-width:280px;max-width:90vw;border-radius:14px;padding:14px;border:1px solid rgba(255,255,255,.18);
    background:linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.03));backdrop-filter:blur(10px);color:#f6f6f7}
  .bbw-card h3{margin:.25rem 0 8px}
  .bbw-row{display:flex;gap:10px;flex-wrap:wrap}
  .bbw-opt{flex:1 1 140px;display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 12px;border-radius:10px;
    border:1px solid rgba(255,255,255,.18);background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02))}
  .bbw-opt:hover{border-color:#ffffff60;transform:translateY(-1px)}
  .bbw-close{margin-top:10px;display:block;margin-left:auto}
  `;
  const injectCSS = () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); };

  const shortAddr = (addr) => addr ? addr.slice(0,6) + '…' + addr.slice(-4) : '';
  const setSession = (addr, providerType) => {
    try {
      if (addr) sessionStorage.setItem('bb:address', addr);
      if (providerType) sessionStorage.setItem('bb:provider', providerType);
    } catch (e) {}
  };

  // ========= UI =========
  function renderUI() {
    // Bar
    const wrap = document.createElement('div');
    wrap.className = 'bbw-wrap';
    wrap.innerHTML = `
      <span class="bbw-label" id="bbwLabel">Not connected</span>
      <button class="bbw-btn primary" id="bbwConnect">Connect Wallet</button>
      <a class="bbw-btn" id="bbwDash" href="${DASHBOARD_PATH}" style="display:none">Dashboard</a>
    `;
    document.body.appendChild(wrap);

    // Modal
    const chooser = document.createElement('div');
    chooser.className = 'bbw-chooser';
    chooser.innerHTML = `
      <div class="bbw-card" role="dialog" aria-modal="true" aria-labelledby="bbwTitle">
        <h3 id="bbwTitle">Connect Wallet</h3>
        <p style="margin-top:0;opacity:.9">Choose a connection method:</p>
        <div class="bbw-row">
          <button class="bbw-opt" id="bbwInjected">🧩 Browser Wallet<br><span style="font-size:12px;opacity:.85">MetaMask / Coinbase / Brave</span></button>
          <button class="bbw-opt" id="bbwWC">📱 WalletConnect<br><span style="font-size:12px;opacity:.85">QR for mobile self-custody wallets</span></button>
        </div>
        <button class="bbw-btn bbw-close" id="bbwClose">Close</button>
      </div>
    `;
    document.body.appendChild(chooser);

    return {
      label: wrap.querySelector('#bbwLabel'),
      connectBtn: wrap.querySelector('#bbwConnect'),
      dashBtn: wrap.querySelector('#bbwDash'),
      chooser,
      optInjected: chooser.querySelector('#bbwInjected'),
      optWC: chooser.querySelector('#bbwWC'),
      closeBtn: chooser.querySelector('#bbwClose'),
    };
  }

  // ========= State =========
  let currentProvider = null; // EIP-1193 provider (injected or walletconnect)
  let wcProvider = null;      // WalletConnect provider
  const APP_METADATA = {
    name: 'Burger Bucks',
    description: 'Burger Bucks — Wallet',
    url: location.origin,
    icons: ['https://walletconnect.com/meta/favicon.ico']
  };

  // ========= Logic =========
  async function ensureLibs() {
    await loadScript('https://unpkg.com/ethers@6.13.2/dist/ethers.umd.min.js');
    await loadScript('https://unpkg.com/@walletconnect/modal@2.6.2/dist/index.umd.js');
    await loadScript('https://unpkg.com/@walletconnect/ethereum-provider@2.11.2/dist/index.umd.js');
  }

  async function connectInjected(els) {
    if (!window.ethereum) { alert('No browser wallet found. Try WalletConnect.'); return; }
    currentProvider = window.ethereum;
    try {
      const provider = new ethers.BrowserProvider(currentProvider, 'any');
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      els.label.textContent = 'Connected: ' + shortAddr(addr);
      els.dashBtn.style.display = 'inline-block';
      setSession(addr, 'injected');
      if (AUTO_REDIRECT) window.location.href = DASHBOARD_PATH;
      wireProviderEvents(currentProvider, els);
    } catch (err) {
      console.error('Injected connect error:', err);
      alert('Connection failed.');
    }
  }

  async function connectWalletConnect(els) {
    if (!WC_PROJECT_ID || /YOUR_WALLETCONNECT_PROJECT_ID/i.test(WC_PROJECT_ID)) {
      alert('Set your WalletConnect Project ID on the script tag (data-wc-project).');
      return;
    }
    try {
      if (!wcProvider) {
        wcProvider = await window.WalletConnectEthereumProvider.default.init({
          projectId: WC_PROJECT_ID,
          chains: CHAINS,
          rpcMap: RPC_MAP,
          showQrModal: true,
          metadata: APP_METADATA,
        });
      }
      await wcProvider.connect();
      currentProvider = wcProvider;

      const provider = new ethers.BrowserProvider(currentProvider, 'any');
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      els.label.textContent = 'Connected: ' + shortAddr(addr);
      els.dashBtn.style.display = 'inline-block';
      setSession(addr, 'walletconnect');
      if (AUTO_REDIRECT) window.location.href = DASHBOARD_PATH;
      wireProviderEvents(currentProvider, els);
    } catch (err) {
      console.error('WalletConnect error:', err);
      alert('WalletConnect failed.');
    }
  }

  function wireProviderEvents(eip1193, els) {
    eip1193.on?.('accountsChanged', (a) => {
      const addr = a?.[0] || '';
      els.label.textContent = addr ? 'Connected: ' + shortAddr(addr) : 'Not connected';
      if (addr) setSession(addr);
      els.dashBtn.style.display = addr ? 'inline-block' : 'none';
    });
    eip1193.on?.('disconnect', () => {
      els.label.textContent = 'Not connected';
      els.dashBtn.style.display = 'none';
      try { sessionStorage.removeItem('bb:address'); } catch(e){}
    });
  }

  function restoreSession(els) {
    try {
      const addr = sessionStorage.getItem('bb:address');
      if (addr) {
        els.label.textContent = 'Connected: ' + shortAddr(addr);
        els.dashBtn.style.display = 'inline-block';
      }
    } catch(e){}
  }

  // ========= Boot =========
  (async function init() {
    injectCSS();
    const els = renderUI();
    restoreSession(els);

    await ensureLibs();

    // open/close chooser
    els.connectBtn.addEventListener('click', () => els.chooser.classList.add('bbw-chooser', 'open'));
    els.closeBtn.addEventListener('click', () => els.chooser.classList.remove('open'));
    els.chooser.addEventListener('click', (e) => { if (e.target === els.chooser) els.chooser.classList.remove('open'); });

    // connect flows
    els.optInjected.addEventListener('click', async () => { els.chooser.classList.remove('open'); await connectInjected(els); });
    els.optWC.addEventListener('click', async () => { els.chooser.classList.remove('open'); await connectWalletConnect(els); });

    // Expose tiny API if you ever need it
    window.BBWallet = {
      open: () => els.chooser.classList.add('open'),
      address: () => sessionStorage.getItem('bb:address') || null,
      providerType: () => sessionStorage.getItem('bb:provider') || null,
      dashboard: () => (location.href = DASHBOARD_PATH),
    };
  })();
})();
