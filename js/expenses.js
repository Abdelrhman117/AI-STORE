// ═══════════════════════════════════════════
//  js/expenses.js — Expenses Module
// ═══════════════════════════════════════════

const Expenses = {
  _listenersSet: false,

  async load() {
    const items = await DB.getAll('expenses');
    this.render(items);
    if (!this._listenersSet) {
      this._setupListeners();
      this._listenersSet = true;
    }
  },

  render(items) {
    const tbody = document.getElementById('expenses-tbody');

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">💸 لا توجد مصاريف مسجلة بعد</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td>
          <div class="fw-semi">${App.fmtDate(item.createdAt)}</div>
          <div class="fs-small">${App.fmtTime(item.createdAt)}</div>
        </td>
        <td><span class="badge badge-warning">${item.type}</span></td>
        <td class="text-loss fw-bold">${App.fmt(item.amount)}</td>
        <td class="text-muted">${item.notes || '—'}</td>
        <td class="fs-small">${item.createdBy?.split('@')[0] || '—'}</td>
        <td>
          <button class="action-btn action-btn-delete"
            onclick="Expenses.remove('${item.id}')">🗑️ حذف</button>
        </td>
      </tr>
    `).join('');
  },

  _setupListeners() {
    // Add expense button
    document.getElementById('add-expense-btn').addEventListener('click', () => {
      document.getElementById('expense-form').reset();
      App.showModal('expense-modal');
    });

    // Date filter
    document.getElementById('expenses-date-filter').addEventListener('change', async e => {
      if (e.target.value) {
        const items = await DB.getByDateRange('expenses', e.target.value, e.target.value);
        this.render(items);
      } else {
        const items = await DB.getAll('expenses');
        this.render(items);
      }
    });

    // Form submit
    document.getElementById('expense-form').addEventListener('submit', async e => {
      e.preventDefault();
      await this.save();
    });
  },

  remove(id) {
    App.confirmDelete(async () => {
      try {
        await DB.delete('expenses', id);
        App.showToast('تم حذف المصروف');
        await this.load();
      } catch (err) {
        App.showToast('حدث خطأ أثناء الحذف', 'error');
      }
    });
  },

  async save() {
    const amount = parseFloat(document.getElementById('expense-amount').value);
    if (isNaN(amount) || amount <= 0) {
      App.showToast('أدخل مبلغاً صحيحاً', 'error');
      return;
    }

    const data = {
      type:   document.getElementById('expense-type').value,
      amount,
      notes:  document.getElementById('expense-notes').value.trim(),
    };

    try {
      await DB.add('expenses', data);
      App.showToast(`✅ تم تسجيل المصروف: ${App.fmt(amount)}`);
      App.hideModal('expense-modal');
      await this.load();
    } catch (err) {
      App.showToast('حدث خطأ أثناء الحفظ', 'error');
      console.error(err);
    }
  }
};
