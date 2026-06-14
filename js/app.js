// ═══════════════════════════════════════════
//  js/app.js — Main Application Controller
// ═══════════════════════════════════════════

const App = {

  // ── Init (called after successful login) ──
  init() {
    this._setupNavigation();
    this._setupModals();
    this._setupDate();
    this.navigateTo('dashboard');
  },

  // ── Date badge ────────────────────────────
  _setupDate() {
    const now = new Date();
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent =
      now.toLocaleDateString('ar-EG', opts);
  },

  // ── Navigation ────────────────────────────
  _setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        this.navigateTo(item.dataset.view);
      });
    });
  },

  navigateTo(view) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    // Show the target view
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add('active');

    // Update page title
    const TITLES = {
      dashboard:   'لوحة التحكم',
      inventory:   'المخزون',
      sales:       'المبيعات',
      maintenance: 'الصيانة',
      expenses:    'المصاريف',
      reports:     'التقارير'
    };
    document.getElementById('page-title').textContent = TITLES[view] || view;

    // Load module data
    switch (view) {
      case 'dashboard':   Dashboard.load();   break;
      case 'inventory':   Inventory.load();   break;
      case 'sales':       Sales.load();       break;
      case 'maintenance': Maintenance.load(); break;
      case 'expenses':    Expenses.load();    break;
      case 'reports':     Reports.init();     break;
    }
  },

  // ── Modal Helpers ─────────────────────────
  _setupModals() {
    // Close via [data-close] buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.hideModal(btn.dataset.close);
      });
    });

    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.style.display = 'none';
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => {
          m.style.display = 'none';
        });
      }
    });
  },

  showModal(id) {
    document.getElementById(id).style.display = 'flex';
  },

  hideModal(id) {
    document.getElementById(id).style.display = 'none';
  },

  // ── Confirm Delete ────────────────────────
  _pendingDelete: null,

  confirmDelete(callback) {
    this._pendingDelete = callback;
    this.showModal('confirm-modal');

    const btn = document.getElementById('confirm-delete-btn');
    // Replace listener to avoid stacking
    const handler = async () => {
      btn.removeEventListener('click', handler);
      if (this._pendingDelete) {
        await this._pendingDelete();
        this._pendingDelete = null;
      }
      this.hideModal('confirm-modal');
    };
    btn.addEventListener('click', handler);
  },

  // ── Toast ─────────────────────────────────
  _toastTimer: null,

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    clearTimeout(this._toastTimer);
    toast.textContent = message;
    toast.className   = `toast ${type}`;
    toast.style.display = 'block';
    this._toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  },

  // ── Formatters ────────────────────────────
  fmt(amount) {
    const n = parseFloat(amount) || 0;
    return `${n.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م`;
  },

  fmtDate(timestamp) {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ar-EG', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  },

  fmtTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit', minute: '2-digit'
    });
  }
};

// ── Bootstrap ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
