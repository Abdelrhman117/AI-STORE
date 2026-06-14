// ═══════════════════════════════════════════
//  js/dashboard.js — Dashboard Module
// ═══════════════════════════════════════════

const Dashboard = {
  chart: null,

  async load() {
    await Promise.all([
      this.loadTodayStats(),
      this.loadWeekChart(),
      this.loadRecentTransactions()
    ]);
  },

  // ── Today Summary ─────────────────────────
  async loadTodayStats() {
    const [sales, maintenance, expenses] = await Promise.all([
      DB.getToday('sales'),
      DB.getToday('maintenance'),
      DB.getToday('expenses')
    ]);

    const salesRevenue  = sales.reduce((s, i)       => s + ((i.sellPrice || 0) * (i.quantity || 1)), 0);
    const salesProfit   = sales.reduce((s, i)       => s + (i.profit || 0), 0);
    const maintRevenue  = maintenance.reduce((s, i)  => s + (i.serviceFee || 0), 0);
    const maintProfit   = maintenance.reduce((s, i)  => s + (i.profit || 0), 0);
    const totalExpenses = expenses.reduce((s, i)     => s + (i.amount || 0), 0);
    const netProfit     = salesProfit + maintProfit - totalExpenses;

    const profitEl = document.getElementById('today-profit');
    profitEl.textContent = App.fmt(netProfit);
    profitEl.className   = `stat-value ${netProfit >= 0 ? 'text-profit' : 'text-loss'}`;

    document.getElementById('today-sales').textContent       = App.fmt(salesRevenue);
    document.getElementById('today-maintenance').textContent = App.fmt(maintRevenue);
    document.getElementById('today-expenses').textContent    = App.fmt(totalExpenses);
  },

  // ── Weekly Chart ──────────────────────────
  async loadWeekChart() {
    const labels  = [];
    const profits = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const label = date.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' });
      labels.push(label);

      const [sales, maint, expenses] = await Promise.all([
        DB.getForDay('sales', date),
        DB.getForDay('maintenance', date),
        DB.getForDay('expenses', date)
      ]);

      const sp = sales.reduce((s, d)    => s + (d.profit || 0), 0);
      const mp = maint.reduce((s, d)    => s + (d.profit || 0), 0);
      const ex = expenses.reduce((s, d) => s + (d.amount || 0), 0);
      profits.push(parseFloat((sp + mp - ex).toFixed(2)));
    }

    const ctx = document.getElementById('profit-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'صافي الربح',
          data: profits,
          backgroundColor: profits.map(p => p >= 0
            ? 'rgba(16,185,129,0.55)'
            : 'rgba(239,68,68,0.55)'),
          borderColor: profits.map(p => p >= 0 ? '#10b981' : '#ef4444'),
          borderWidth: 2,
          borderRadius: 7,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(20,20,42,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleFont: { family: 'Cairo', size: 12 },
            bodyFont: { family: 'Cairo', size: 13, weight: 'bold' },
            callbacks: {
              label: ctx => `${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toLocaleString('ar-EG')} ج.م`
            }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#64748b',
              font: { family: 'Cairo', size: 11 },
              callback: v => `${v.toLocaleString('ar-EG')} ج`
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { family: 'Cairo', size: 11 } }
          }
        }
      }
    });
  },

  // ── Recent Transactions ───────────────────
  async loadRecentTransactions() {
    const [sales, maint, expenses] = await Promise.all([
      db.collection('sales').orderBy('createdAt', 'desc').limit(4).get(),
      db.collection('maintenance').orderBy('createdAt', 'desc').limit(3).get(),
      db.collection('expenses').orderBy('createdAt', 'desc').limit(3).get()
    ]);

    const all = [];

    sales.docs.forEach(d => {
      const data = d.data();
      all.push({
        icon: '💰', color: 'text-profit',
        name: `بيع: ${data.productName || ''}`,
        time: data.createdAt,
        amount: data.profit || 0,
        sign: '+'
      });
    });

    maint.docs.forEach(d => {
      const data = d.data();
      all.push({
        icon: '🛠️', color: 'text-profit',
        name: `صيانة: ${data.deviceType || ''} — ${data.customerName || ''}`,
        time: data.createdAt,
        amount: data.profit || 0,
        sign: '+'
      });
    });

    expenses.docs.forEach(d => {
      const data = d.data();
      all.push({
        icon: '💸', color: 'text-loss',
        name: `مصروف: ${data.type || ''}`,
        time: data.createdAt,
        amount: data.amount || 0,
        sign: '–'
      });
    });

    all.sort((a, b) => {
      const ta = a.time?.toDate?.() || 0;
      const tb = b.time?.toDate?.() || 0;
      return tb - ta;
    });

    const container = document.getElementById('recent-transactions');

    if (all.length === 0) {
      container.innerHTML = '<div class="empty-state">لا توجد عمليات بعد</div>';
      return;
    }

    container.innerHTML = all.slice(0, 9).map(t => `
      <div class="recent-item">
        <span class="recent-icon">${t.icon}</span>
        <div class="recent-info">
          <div class="recent-name">${t.name}</div>
          <div class="recent-time">${App.fmtDate(t.time)} ${App.fmtTime(t.time)}</div>
        </div>
        <span class="recent-amount ${t.color}">
          ${t.sign}${App.fmt(t.amount)}
        </span>
      </div>
    `).join('');
  }
};
