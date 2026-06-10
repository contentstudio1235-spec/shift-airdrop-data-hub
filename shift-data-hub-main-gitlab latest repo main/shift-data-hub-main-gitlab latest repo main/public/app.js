// SHIFT RWA Cross-Channel Data Hub Frontend Engine

// ── API Configuration ──
const API_BASE = 'https://shift-airdrop-backend.onrender.com';
const ADMIN_KEY = 'ShiftRwa2026@@$$Key';

async function fetchLiveKPIs() {
    try {
        const [kpiRes, adminRes] = await Promise.allSettled([
            fetch(`${API_BASE}/api/analytics/kpis`).then(r => r.json()),
            fetch(`${API_BASE}/api/admin/dashboard`, {
                headers: { 'x-admin-key': ADMIN_KEY }
            }).then(r => r.json()),
        ]);

        const kpiData = kpiRes.status === 'fulfilled' && kpiRes.value?.success ? kpiRes.value.data : null;
        const adminData = adminRes.status === 'fulfilled' && !adminRes.value?.error ? adminRes.value : null;

        return { kpiData, adminData };
    } catch (err) {
        console.warn('[SHIFT Hub] Live data fetch failed, using demo mode:', err.message);
        return { kpiData: null, adminData: null };
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Fetch live data from backend
    const { kpiData, adminData } = await fetchLiveKPIs();
    const isLive = !!(kpiData || adminData);

    // Update status indicator
    const statusEl = document.querySelector('.status-value');
    const pulseEl = document.querySelector('.pulse-indicator');
    if (statusEl) statusEl.textContent = isLive ? 'Live · Connected' : 'Demo Mode';
    if (pulseEl) {
        pulseEl.classList.toggle('status-online', isLive);
        pulseEl.classList.toggle('status-demo', !isLive);
    }

    // App State — seeded with real data if available
    const state = {
        activeTab: 'overview',
        kpiData: {
            users: adminData?.stats?.totalUsers || kpiData?.growth?.totalUsers || 12450,
            tvl: kpiData?.volume?.totalUSD || 8419250,
            conversion: kpiData?.snag?.linkedAccounts
                ? ((kpiData.snag.linkedAccounts / Math.max(kpiData.growth?.totalUsers || 1, 1)) * 100).toFixed(1) * 1
                : 87.2,
            engagement: 64.8
        },
        timeRange: '7D',
        channelMetric: 'clicks',
        userSearchQuery: '',
        statusFilter: 'all',
        channelFilter: 'all',
        pagination: {
            currentPage: 1,
            pageSize: 10,
            totalItems: 0
        }
    };


    // --- DOM ELEMENTS ---
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabTitle = document.getElementById('tab-title');
    const tabDescription = document.getElementById('tab-description');
    const timeBtns = document.querySelectorAll('.time-btn');
    const btnRefresh = document.getElementById('btn-refresh');

    // KPI Counters
    const kpiUsersVal = document.getElementById('kpi-users');
    const kpiTvlVal = document.getElementById('kpi-tvl');
    const kpiConversionVal = document.getElementById('kpi-conversion');
    const kpiEngagementVal = document.getElementById('kpi-engagement');

    // Live Feed
    const eventStreamList = document.getElementById('event-stream-list');

    // Chart Containers
    const funnelContainer = document.getElementById('funnel-container');
    const comparisonChart = document.getElementById('comparison-chart');
    const chartToggleBtns = document.querySelectorAll('.chart-toggle-btn');

    // User Table Elements
    const userSearch = document.getElementById('user-search');
    const filterStatus = document.getElementById('filter-status');
    const filterChannel = document.getElementById('filter-channel');
    const usersTableBody = document.getElementById('users-table-body');
    const paginationText = document.getElementById('pagination-text');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    // Compliance Linter Mockup
    const linterTextarea = document.getElementById('linter-textarea');
    const btnLintCheck = document.getElementById('btn-lint-check');
    const linterResults = document.getElementById('linter-results');

    // --- DATA MOCKS ---
    const mockEventsPool = [
        { type: 'page_view', channel: 'ga4', desc: 'User viewed <strong>/legal-hub</strong> on <em>loyalty.shiftrwa.xyz</em>' },
        { type: 'page_view', channel: 'ga4', desc: 'User clicked <strong>Trade</strong> on <em>pro.shiftrwa.xyz</em>' },
        { type: 'wallet_connected', channel: 'snag', desc: 'Wallet connected: <strong>{wallet}</strong> verified via Snag' },
        { type: 'series_token_trade', channel: 'snag', desc: 'Solana trade: <strong>{wallet}</strong> bought 20 <strong>TSL2L</strong> (Series 12)' },
        { type: 'series_token_trade', channel: 'snag', desc: 'Solana trade: <strong>{wallet}</strong> bought 50 <strong>SOX3L</strong> (Series 14)' },
        { type: 'series_token_trade', channel: 'snag', desc: 'Solana trade: <strong>{wallet}</strong> bought 10 <strong>SPX3S</strong> (Series 18)' },
        { type: 'social_follow', channel: 'x', desc: 'New follower <strong>@{handle}</strong> linked via Snag challenge' },
        { type: 'social_follow', channel: 'telegram', desc: 'User <strong>@{handle}</strong> joined community channels' },
        { type: 'social_follow', channel: 'discord', desc: 'User <strong>@{handle}</strong> joined server and linked wallet' },
        { type: 'snag_referral_sign', channel: 'snag', desc: 'Snag reward claimed: <strong>{wallet}</strong> earned 500 pts via <strong>{code}</strong>' }
    ];

    // Helper to generate a Solana wallet
    function randWallet() {
        const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let wallet = '';
        for (let i = 0; i < 4; i++) wallet += chars[Math.floor(Math.random() * chars.length)];
        wallet += '...';
        for (let i = 0; i < 4; i++) wallet += chars[Math.floor(Math.random() * chars.length)];
        return wallet;
    }

    // Helper to generate social handles
    const mockHandles = ['sol_whale', 'rwa_pioneer', 'alpha_dao', 'mi_stocks', 'token_god', 'yield_hunter', 'crypt_lord', 'st_trader'];
    const mockCodes = ['MINT_RWA', 'DAO2026', 'SOLANA_HUB', 'ALPACAS', 'CHAINLINK_POR'];

    // 50 Resolved User Profiles for Table & Ingestion Search
    const resolvedUsers = [];
    const statuses = ['verified', 'pending', 'flagged'];
    
    // Seed Users
    for (let i = 0; i < 64; i++) {
        const handle = mockHandles[i % mockHandles.length] + Math.floor(Math.random() * 90 + 10);
        resolvedUsers.push({
            wallet: randWallet() + (i % 3 === 0 ? 'Sol' : 'RWA'),
            gaId: `ga.1.2.${Math.floor(Math.random() * 10000000)}.${Math.floor(Math.random() * 100000)}`,
            x: `@${handle}_x`,
            telegram: `@${handle}_tg`,
            discord: `@${handle}#${Math.floor(Math.random() * 9000 + 1000)}`,
            code: i % 4 === 0 ? mockCodes[i % mockCodes.length] : 'organic',
            status: i % 15 === 0 ? 'flagged' : (i % 3 === 0 ? 'pending' : 'verified')
        });
    }

    // --- MAIN INITIALIZATION & ROUTING ---
    function init() {
        renderFunnel();
        renderComparisonChart();
        renderTable();
        seedInitialFeed();
        
        // Start simulated live ingestion pipeline
        setInterval(ingestLiveEvent, 4000);
    }

    // Tab Navigation switching
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            item.classList.add('active');
            const targetEl = document.getElementById(`tab-${targetTab}`);
            targetEl.classList.add('active');
            
            state.activeTab = targetTab;
            
            // Adjust title metadata
            if (targetTab === 'overview') {
                tabTitle.innerText = 'Omnichannel Overview';
                tabDescription.innerText = 'Real-time cross-channel marketing KPIs and user attribution.';
                renderFunnel();
            } else if (targetTab === 'campaigns') {
                tabTitle.innerText = 'Campaign Performance';
                tabDescription.innerText = 'Analyze social click-throughs, community metrics, and Snag activities.';
                renderComparisonChart();
            } else if (targetTab === 'users') {
                tabTitle.innerText = 'User Identity Resolution';
                tabDescription.innerText = 'Direct verification of unified social, web, and Web3 address bindings.';
                renderTable();
            } else if (targetTab === 'legal') {
                tabTitle.innerText = 'Legal Compliance Center';
                tabDescription.innerText = 'Interactive marketing compliance rules and automatic copy auditing.';
            }
        });
    });

    // Time Range buttons
    timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.timeRange = btn.innerText;
            
            // Emulate data fluctuation on time range click
            animateKpis();
        });
    });

    // Refresh metrics sync click
    btnRefresh.addEventListener('click', () => {
        btnRefresh.disabled = true;
        const icon = btnRefresh.querySelector('i');
        icon.style.animation = 'spin 1s infinite linear';
        
        setTimeout(() => {
            icon.style.animation = 'none';
            btnRefresh.disabled = false;
            animateKpis();
            ingestLiveEvent(true); // Force custom verified trade event
        }, 1200);
    });

    // Dynamic scale helper
    function animateKpis() {
        const mod = state.timeRange === '7D' ? 1 : (state.timeRange === '30D' ? 4 : 12);
        
        // Target random bounds
        const targetUsers = Math.floor(12450 * mod + (Math.random() - 0.5) * 500);
        const targetTvl = Math.floor(8419250 * mod + (Math.random() - 0.5) * 100000);
        const targetConv = (87.2 + (Math.random() - 0.5) * 5).toFixed(1);
        const targetEng = (64.8 + (Math.random() - 0.5) * 4).toFixed(1);

        animateCounter(kpiUsersVal, targetUsers, true);
        animateCounter(kpiTvlVal, targetTvl, false, true);
        kpiConversionVal.innerText = targetConv + '%';
        kpiEngagementVal.innerText = targetEng + '%';
    }

    function animateCounter(el, target, isInt, isCurrency) {
        let current = parseInt(el.innerText.replace(/[^0-9]/g, ''));
        const steps = 15;
        const increment = Math.ceil((target - current) / steps);
        let stepCount = 0;
        
        const timer = setInterval(() => {
            current += increment;
            stepCount++;
            
            if (stepCount >= steps) {
                current = target;
                clearInterval(timer);
            }
            
            if (isCurrency) {
                el.innerText = '$' + current.toLocaleString();
            } else {
                el.innerText = current.toLocaleString();
            }
        }, 30);
    }

    // --- RENDER DYNAMIC SVG FUNNEL ---
    function renderFunnel() {
        if (!funnelContainer) return;
        
        // Define steps data
        const funnelSteps = [
            { name: 'GA4 Web Traffic', value: '12,450', percent: '100%', subtitle: 'shiftrwa.xyz subdomains' },
            { name: 'Subdomain Activities', value: '8,092', percent: '65.0%', subtitle: 'app / loyalty visits' },
            { name: 'Linked Wallets', value: '5,229', percent: '42.0%', subtitle: 'Verified Solana accounts' },
            { name: 'Series Trades', value: '3,486', percent: '28.0%', subtitle: 'Executed a transaction' }
        ];

        // Draw horizontal high-fidelity glass polygonal segments in SVG
        let svgHtml = `
            <svg viewBox="0 0 600 240" class="funnel-svg" style="width:100%; height: 100%;">
                <defs>
                    <linearGradient id="mintGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#0EA5E9" stop-opacity="0.1" />
                        <stop offset="100%" stop-color="#5FE1B5" stop-opacity="0.3" />
                    </linearGradient>
                    <linearGradient id="mintLine" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#0EA5E9" stop-opacity="0.2" />
                        <stop offset="100%" stop-color="#5FE1B5" stop-opacity="1" />
                    </linearGradient>
                </defs>
        `;

        const startX = 20;
        const width = 560;
        const segmentWidth = width / 4;
        const gap = 8;
        
        // Bounds for funnel depth
        const heights = [200, 150, 100, 60];
        
        for (let i = 0; i < 4; i++) {
            const curX = startX + i * segmentWidth;
            const nextX = curX + segmentWidth - gap;
            
            const curH = heights[i];
            const nextH = heights[i + 1] || heights[i] * 0.7; // virtual next

            const topY = 120 - curH / 2;
            const bottomY = 120 + curH / 2;
            
            const nextTopY = 120 - nextH / 2;
            const nextBottomY = 120 + nextH / 2;
            
            // Build segment polygon path
            const path = `M ${curX} ${topY} L ${nextX} ${nextTopY} L ${nextX} ${nextBottomY} L ${curX} ${bottomY} Z`;
            
            svgHtml += `
                <g class="funnel-segment" data-step="${i}">
                    <path d="${path}" fill="url(#mintGrad)" stroke="url(#mintLine)" stroke-width="1.5" />
                    <!-- Visual glow inside active segment -->
                    <circle cx="${curX + segmentWidth / 2 - gap / 2}" cy="120" r="4" fill="#5FE1B5" />
                </g>
            `;
            
            // Text nodes (placed above/below polygons cleanly)
            const textX = curX + 10;
            const textY = topY - 12;
            
            // Title
            svgHtml += `
                <text x="${textX}" y="40" class="funnel-label">${funnelSteps[i].name}</text>
                <text x="${textX}" y="210" class="funnel-sublabel">${funnelSteps[i].subtitle}</text>
                <text x="${textX}" y="125" class="funnel-percent">${funnelSteps[i].percent}</text>
                <text x="${textX}" y="145" class="funnel-sublabel" fill="#fff" style="font-weight: 500;">${funnelSteps[i].value}</text>
            `;
        }
        
        svgHtml += `</svg>`;
        funnelContainer.innerHTML = svgHtml;
    }

    // --- RENDER DYNAMIC SVG COMPARISON CHART ---
    function renderComparisonChart() {
        if (!comparisonChart) return;
        
        const metrics = {
            clicks: [
                { name: 'Google Analytics', val: 9800, color: '#E29B3E' },
                { name: 'X / Twitter', val: 7400, color: '#FFF' },
                { name: 'Telegram Link', val: 4900, color: '#0EA5E9' },
                { name: 'Discord Invites', val: 3200, color: '#6366F1' },
                { name: 'Snag campaign', val: 6500, color: '#5FE1B5' }
            ],
            members: [
                { name: 'Main Analytics', val: 12450, color: '#E29B3E' },
                { name: 'X Followers', val: 24500, color: '#FFF' },
                { name: 'Telegram Members', val: 18900, color: '#0EA5E9' },
                { name: 'Discord Users', val: 14200, color: '#6366F1' },
                { name: 'Snag Participants', val: 9100, color: '#5FE1B5' }
            ]
        };

        const activeList = metrics[state.channelMetric];
        const maxVal = Math.max(...activeList.map(item => item.val));
        
        let svg = `
            <svg viewBox="0 0 600 240" style="width:100%; height: 100%;">
        `;
        
        const startY = 20;
        const totalHeight = 200;
        const barHeight = 26;
        const gap = 12;
        
        for (let i = 0; i < activeList.length; i++) {
            const item = activeList[i];
            const curY = startY + i * (barHeight + gap);
            const barWidth = (item.val / maxVal) * 380;
            
            svg += `
                <!-- Channel Label -->
                <text x="10" y="${curY + barHeight / 2 + 4}" fill="#9CA3AF" style="font-family: var(--font-outfit); font-size: 12px; font-weight: 500;">
                    ${item.name}
                </text>
                
                <!-- Bar Track -->
                <rect x="150" y="${curY}" width="380" height="${barHeight}" rx="4" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1" />
                
                <!-- Bar Fill -->
                <rect x="150" y="${curY}" width="${barWidth}" height="${barHeight}" rx="4" fill="${item.color}" opacity="0.3" />
                <rect x="150" y="${curY}" width="${Math.max(barWidth - 4, 0)}" height="2" rx="1" fill="${item.color}" opacity="0.8" />
                
                <!-- Value tag -->
                <text x="${160 + barWidth}" y="${curY + barHeight / 2 + 4}" fill="${item.color}" style="font-family: var(--font-outfit); font-size: 12px; font-weight: 700;">
                    ${item.val.toLocaleString()}
                </text>
            `;
        }
        
        svg += `</svg>`;
        comparisonChart.innerHTML = svg;
    }

    // Comparison metric toggle buttons binding
    chartToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chartToggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.channelMetric = btn.getAttribute('data-metric');
            renderComparisonChart();
        });
    });

    // --- SIMULATED REAL-TIME INGESTION LIVE STREAM ---
    function seedInitialFeed() {
        for (let i = 0; i < 4; i++) {
            ingestLiveEvent(false, true);
        }
    }

    function ingestLiveEvent(isSpecial = false, isSeed = false) {
        if (!eventStreamList) return;

        // Choose random base event
        let baseEvent = mockEventsPool[Math.floor(Math.random() * mockEventsPool.length)];
        
        if (isSpecial) {
            baseEvent = {
                type: 'series_token_trade',
                channel: 'snag',
                desc: 'Solana trade: <strong>7x8s...TSL2</strong> bought 150 <strong>TSL2L</strong> (Series 12) via Snag referral'
            };
        }

        // Hydrate variables
        let desc = baseEvent.desc;
        desc = desc.replace('{wallet}', randWallet());
        desc = desc.replace('{handle}', mockHandles[Math.floor(Math.random() * mockHandles.length)] + Math.floor(Math.random() * 90 + 10));
        desc = desc.replace('{code}', mockCodes[Math.floor(Math.random() * mockCodes.length)]);

        // Map icons based on channel
        const icons = {
            ga4: 'line-chart',
            x: 'twitter',
            telegram: 'message-circle',
            discord: 'hash',
            snag: 'gift'
        };

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const row = document.createElement('div');
        row.className = `event-row`;
        
        row.innerHTML = `
            <div class="event-icon-box ${baseEvent.channel}">
                <i data-lucide="${icons[baseEvent.channel] || 'activity'}"></i>
            </div>
            <div class="event-meta">
                <span class="event-desc">${desc}</span>
                <span class="event-channel-badge">${baseEvent.channel} pipeline</span>
            </div>
            <span class="event-time">${timeStr}</span>
        `;

        // Prepend to top
        if (eventStreamList.firstChild) {
            eventStreamList.insertBefore(row, eventStreamList.firstChild);
        } else {
            eventStreamList.appendChild(row);
        }

        lucide.createIcons();

        // Increment stats on overview if live updates occur
        if (!isSeed) {
            state.kpiData.users += Math.floor(Math.random() * 2 + 1);
            state.kpiData.tvl += Math.floor(Math.random() * 1500 + 100);
            kpiUsersVal.innerText = state.kpiData.users.toLocaleString();
            kpiTvlVal.innerText = '$' + state.kpiData.tvl.toLocaleString();
        }

        // Cap children length to preserve browser performance
        if (eventStreamList.children.length > 8) {
            eventStreamList.removeChild(eventStreamList.lastChild);
        }
    }

    // --- IDENTITY TABLE IMPLEMENTATION ---
    function renderTable() {
        if (!usersTableBody) return;

        // Perform compound filters
        const filtered = resolvedUsers.filter(user => {
            const matchesSearch = 
                user.wallet.toLowerCase().includes(state.userSearchQuery) ||
                user.gaId.toLowerCase().includes(state.userSearchQuery) ||
                user.x.toLowerCase().includes(state.userSearchQuery) ||
                user.telegram.toLowerCase().includes(state.userSearchQuery) ||
                user.discord.toLowerCase().includes(state.userSearchQuery) ||
                user.code.toLowerCase().includes(state.userSearchQuery);

            const matchesStatus = state.statusFilter === 'all' || user.status === state.statusFilter;
            
            const matchesChannel = state.channelFilter === 'all' || 
                (state.channelFilter === 'organic' && user.code === 'organic') ||
                (state.channelFilter === 'code' && user.code !== 'organic');

            return matchesSearch && matchesStatus && matchesChannel;
        });

        state.pagination.totalItems = filtered.length;
        
        // Paginate items
        const start = (state.pagination.currentPage - 1) * state.pagination.pageSize;
        const paginated = filtered.slice(start, start + state.pagination.pageSize);

        let tableRows = '';
        
        if (paginated.length === 0) {
            tableRows = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 40px 0;">
                        No matching resolved profiles found in Neon DB active branch.
                    </td>
                </tr>
            `;
        } else {
            paginated.forEach(user => {
                const statusBadges = {
                    verified: '<span class="badge badge-mint">Verified</span>',
                    pending: '<span class="badge badge-amber">Pending Link</span>',
                    flagged: '<span class="badge badge-danger">Flagged Bot</span>'
                };

                const referralCell = user.code === 'organic' ? 
                    '<span style="color: var(--text-muted);">Organic</span>' : 
                    `<strong>${user.code}</strong>`;

                tableRows += `
                    <tr>
                        <td style="font-family: monospace; letter-spacing: 0.5px;">${user.wallet}</td>
                        <td style="font-size: 12px; color: var(--text-secondary);">${user.gaId}</td>
                        <td>${user.x}</td>
                        <td>${user.telegram}</td>
                        <td>${user.discord}</td>
                        <td>${referralCell}</td>
                        <td>${statusBadges[user.status] || ''}</td>
                    </tr>
                `;
            });
        }

        usersTableBody.innerHTML = tableRows;
        
        // Sync pagination displays
        const end = Math.min(start + state.pagination.pageSize, filtered.length);
        paginationText.innerText = `Showing ${filtered.length > 0 ? start + 1 : 0}-${end} of ${filtered.length} resolved profiles`;
        
        btnPrev.disabled = state.pagination.currentPage === 1;
        btnNext.disabled = end >= filtered.length;
    }

    // Hook filters
    userSearch.addEventListener('input', (e) => {
        state.userSearchQuery = e.target.value.toLowerCase().trim();
        state.pagination.currentPage = 1;
        renderTable();
    });

    filterStatus.addEventListener('change', (e) => {
        state.statusFilter = e.target.value;
        state.pagination.currentPage = 1;
        renderTable();
    });

    filterChannel.addEventListener('change', (e) => {
        state.channelFilter = e.target.value;
        state.pagination.currentPage = 1;
        renderTable();
    });

    // Hook pagination click bounds
    btnPrev.addEventListener('click', () => {
        if (state.pagination.currentPage > 1) {
            state.pagination.currentPage--;
            renderTable();
        }
    });

    btnNext.addEventListener('click', () => {
        const totalPages = Math.ceil(state.pagination.totalItems / state.pagination.pageSize);
        if (state.pagination.currentPage < totalPages) {
            state.pagination.currentPage++;
            renderTable();
        }
    });


    // --- LEGAL COMPLIANCE COPY LINTER WIDGET ---
    if (btnLintCheck) {
        btnLintCheck.addEventListener('click', () => {
            const copy = linterTextarea.value.trim();
            if (!copy) {
                alert('Please enter some text in the copy input box to test compliance rules.');
                return;
            }

            // Run linter simulations
            const findings = [];
            let score = 0; // AI detection tell score

            // 1. Check for banned promotional terms (BLOCKS)
            const blockTerms = [
                { term: 'guaranteed returns', rule: 'Banned yield guarantees' },
                { term: 'risk-free', rule: 'Banned risk-free promises (except risk-free rate references)' },
                { term: 'moon', rule: 'Banned moon/hype expressions' },
                { term: 'no kyc', rule: 'Banned promotional regulatory bypass phrasing' },
                { term: 'bank-grade', rule: 'Banned bank-grade comparisons' },
                { term: 'interest', rule: 'Banned interest metrics (yield product phrasing)' },
                { term: 'profit', rule: 'Banned profit guarantees' }
            ];

            blockTerms.forEach(item => {
                if (copy.toLowerCase().includes(item.term)) {
                    findings.push({
                        type: 'block',
                        msg: `✖ [BLOCK] "${item.term}" detected. Reason: ${item.rule}`
                    });
                }
            });

            // 2. Check for Entity Distinctions (BLOCKS)
            const badEntityPhrases = [
                { term: 'shift platform', correction: 'Shift Stocks Series Tokens' },
                { term: 'shift is the issuer', correction: 'SHIFT DAO LLC is the issuer' },
                { term: 'shift tokenizes', correction: 'Series Tokens issue value backing' }
            ];

            badEntityPhrases.forEach(item => {
                if (copy.toLowerCase().includes(item.term)) {
                    findings.push({
                        type: 'block',
                        msg: `✖ [BLOCK] "${item.term}" phrasing. Replace with: "${item.correction}"`
                    });
                }
            });

            // 3. Warn level checks (WARNINGS)
            const warnTerms = [
                { term: 'underlying assets', replace: 'backing/reserve assets' },
                { term: 'tokenized tesla', replace: 'tokenized exposure of TSLA' }
            ];

            warnTerms.forEach(item => {
                if (copy.toLowerCase().includes(item.term)) {
                    findings.push({
                        type: 'warn',
                        msg: `✦ [WARN] "${item.term}" detected. Suggested phrasing: "${item.replace}"`
                    });
                }
            });

            // 4. Heuristic AI Tell Score Analysis
            // Common AI boilerplate words
            const aiWords = ['in conclusion', 'moreover', 'furthermore', 'delve into', 'unleash', 'harness the power of', 'testament to'];
            let aiTellsFound = 0;
            aiWords.forEach(word => {
                if (copy.toLowerCase().includes(word)) {
                    aiTellsFound++;
                    findings.push({
                        type: 'warn',
                        msg: `✦ [WARN] AI structural tell: "${word}" sounds mechanical. Rewrite cleanly.`
                    });
                }
            });

            // AI openings tell (Double consecutive starts)
            if (copy.toLowerCase().startsWith('a traditional') || copy.toLowerCase().startsWith('a bank')) {
                aiTellsFound += 2;
                findings.push({
                    type: 'warn',
                    msg: `✦ [WARN] Avoid opening sentences like "A traditional..." - flags AI filters.`
                });
            }

            // Compute score
            score = Math.min(100, Math.floor((aiTellsFound * 20) + (findings.filter(f => f.type === 'block').length * 25)));
            if (score === 0) score = 4; // Natural variation

            // Render Results Area
            let resultsHtml = `
                <div class="linter-score-row">
                    <span class="linter-score-label">AI-Tell Probability Indicator:</span>
                    <span class="linter-score-value" style="color: ${score > 25 ? 'var(--accent-amber)' : 'var(--accent-mint)'};">
                        ${score}% ${score > 25 ? '⚠️ High' : '✓ Human'}
                    </span>
                </div>
                <div class="linter-findings-list">
            `;

            if (findings.length === 0) {
                resultsHtml += `
                    <div class="finding-row pass">
                        <i data-lucide="check-circle-2"></i>
                        <span>✓ PASS. Zero compliance blocks or AI Tells found. Ready for Strategy approval.</span>
                    </div>
                `;
            } else {
                findings.forEach(item => {
                    const icon = item.type === 'block' ? 'alert-triangle' : 'alert-circle';
                    resultsHtml += `
                        <div class="finding-row ${item.type}">
                            <i data-lucide="${icon}"></i>
                            <span>${item.msg}</span>
                        </div>
                    `;
                });
            }

            resultsHtml += `</div>`;
            linterResults.innerHTML = resultsHtml;
            linterResults.style.display = 'flex';
            lucide.createIcons();
        });
    }

    // Boot execution
    init();
});
