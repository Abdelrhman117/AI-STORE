// ═══════════════════════════════════════════
//  js/maintenance.js — Maintenance Module
// ═══════════════════════════════════════════

const Maintenance = {
  items: [],
  _listenersSet: false,

  async load() {
    this.items = await DB.getAll('maintenance');
    this._applyFilter();
    if (!this._listenersSet) {
      this._setupListeners();
      this._listenersSet = true;
    }
  },

  _applyFilter() {
    const filter = document.getElementById('maintenance-status-filter').value;
    const filtered = filter === 'all'
      ? this.items
      : this.items.filter(i => i.status === filter);
    this.render(filtered);
  },

  render(items) {
    const tbody = document.getElementById('maintenance-tbody');

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">🛠️ لا توجد طلبات صيانة</td></tr>';
      return;
    }

    const BADGE = {
      in_progress: '<span class="badge badge-warning">⏳ قيد الإصلاح</span>',
      ready:       '<span class="badge badge-info">✅ جاهز للاستلام</span>',
      delivered:   '<span class="badge badge-success">🏁 تم الاستلام</span>'
    };

    const NEXT_STATUS = {
      in_progress: { value: 'ready',     label: '✅ جاهز' },
      ready:       { value: 'delivered', label: '🏁 تم الاستلام' },
      delivered:   null
    };

    tbody.innerHTML = items.map(item => {
      const next = NEXT_STATUS[item.status];
      return `
        <tr>
          <td>
            <div class="fw-semi">${App.fmtDate(item.createdAt)}</div>
            <div class="fs-small">${App.fmtTime(item.createdAt)}</div>
          </td>
          <td>
            <div class="fw-bold">${item.customerName}</div>
            <div class="fs-small">${item.phone || '—'}</div>
          </td>
          <td>
            <div class="fw-bold">${item.deviceType}</div>
            <div class="fs-small" style="max-width:200px;white-space:normal;">${item.problem}</div>
          </td>
          <td class="text-muted">${App.fmt(item.partsCost)}</td>
          <td>${App.fmt(item.serviceFee)}</td>
          <td class="${(item.profit || 0) >= 0 ? 'text-profit' : 'text-loss'}">
            +${App.fmt(item.profit)}
          </td>
          <td>${BADGE[item.status] || item.status}</td>
          <td>
            ${next ? `<button class="action-btn action-btn-status"
              onclick="Maintenance.updateStatus('${item.id}', '${next.value}')">${next.label}</button>` : ''}
            <button class="action-btn action-btn-edit"
              onclick="Maintenance.edit('${item.id}')">✏️</button>
            <button class="action-btn action-btn-delete"
              onclick="Maintenance.remove('${item.id}')">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  _setupListeners() {
    document.getElementById('add-maintenance-btn').addEventListener('click', () => {
      this.openModal();
    });

    document.getElementById('maintenance-status-filter').addEventListener('change', () => {
      this._applyFilter();
    });

    // Profit preview
    const calcProfit = () => {
      const parts = parseFloat(document.getElementById('maintenance-parts-cost').value) || 0;
      const fee   = parseFloat(document.getElementById('maintenance-fee').value)        || 0;
      const profit = fee - parts;
      const el = document.getElementById('maintenance-profit-value');
      el.textContent = `${profit >= 0 ? '+' : ''}${App.fmt(profit)}`;
      el.className   = profit >= 0 ? 'text-profit' : 'text-loss';
    };

    document.getElementById('maintenance-parts-cost').addEventListener('input', calcProfit);
    document.getElementById('maintenance-fee').addEventListener('input', calcProfit);

    document.getElementById('maintenance-form').addEventListener('submit', async e => {
      e.preventDefault();
      await this.save();
    });
  },

  openModal(item = null) {
    document.getElementById('maintenance-modal-title').textContent =
      item ? '✏️ تعديل طلب الصيانة' : '🛠️ طلب صيانة جديد';

    document.getElementById('maintenance-id').value         = item?.id || '';
    document.getElementById('maintenance-customer').value   = item?.customerName || '';
    document.getElementById('maintenance-phone').value      = item?.phone || '';
    document.getElementById('maintenance-device').value     = item?.deviceType || '';
    document.getElementById('maintenance-problem').value    = item?.problem || '';
    document.getElementById('maintenance-parts-cost').value = item?.partsCost ?? 0;
    document.getElementById('maintenance-fee').value        = item?.serviceFee || '';
    document.getElementById('maintenance-status').value     = item?.status || 'in_progress';

    // Reset profit preview
    const profit = (item?.serviceFee || 0) - (item?.partsCost || 0);
    const el = document.getElementById('maintenance-profit-value');
    el.textContent = `${profit >= 0 ? '+' : ''}${App.fmt(profit)}`;
    el.className   = profit >= 0 ? 'text-profit' : 'text-loss';

    App.showModal('maintenance-modal');
  },

  edit(id) {
    const item = this.items.find(i => i.id === id);
    if (item) this.openModal(item);
  },

  async updateStatus(id, newStatus) {
    try {
      await DB.update('maintenance', id, { status: newStatus });
      const labels = { ready: 'جاهز للاستلام', delivered: 'تم الاستلام' };
      App.showToast(`✅ تم التحديث: ${labels[newStatus] || newStatus}`);
      await this.load();
    } catch (err) {
      App.showToast('حدث خطأ أثناء التحديث', 'error');
    }
  },

  remove(id) {
    App.confirmDelete(async () => {
      try {
        await DB.delete('maintenance', id);
        this.items = this.items.filter(i => i.id !== id);
        this._applyFilter();
        App.showToast('تم حذف طلب الصيانة');
      } catch (err) {
        App.showToast('حدث خطأ أثناء الحذف', 'error');
      }
    });
  },

  async save() {
    const id        = document.getElementById('maintenance-id').value;
    const partsCost = parseFloat(document.getElementById('maintenance-parts-cost').value) || 0;
    const serviceFee = parseFloat(document.getElementById('maintenance-fee').value);

    if (isNaN(serviceFee) || serviceFee < 0) {
      App.showToast('أدخل سعر صيانة صحيح', 'error');
      return;
    }

    const data = {
      customerName: document.getElementById('maintenance-customer').value.trim(),
      phone:        document.getElementById('maintenance-phone').value.trim(),
      deviceType:   document.getElementById('maintenance-device').value.trim(),
      problem:      document.getElementById('maintenance-problem').value.trim(),
      partsCost,
      serviceFee,
      profit:       serviceFee - partsCost,
      status:       document.getElementById('maintenance-status').value,
    };

    try {
      if (id) {
        await DB.update('maintenance', id, data);
        App.showToast('✅ تم تحديث طلب الصيانة');
      } else {
        await DB.add('maintenance', data);
        App.showToast(`✅ تم إضافة طلب الصيانة! ربح: ${App.fmt(data.profit)}`);
      }
      App.hideModal('maintenance-modal');
      await this.load();
    } catch (err) {
      App.showToast('حدث خطأ أثناء الحفظ', 'error');
      console.error(err);
    }
  }
};
