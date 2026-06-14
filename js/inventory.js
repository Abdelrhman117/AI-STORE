// ═══════════════════════════════════════════
//  js/inventory.js — Inventory Module
// ═══════════════════════════════════════════

const Inventory = {
  items: [],
  _listenersSet: false,

  async load() {
    this.items = await DB.getAll('inventory');
    this.render(this.items);
    if (!this._listenersSet) {
      this._setupListeners();
      this._listenersSet = true;
    }
    this.populateSaleDropdown();
  },

  render(items) {
    const tbody = document.getElementById('inventory-tbody');

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">📦 لا يوجد منتجات في المخزون بعد</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(item => {
      const profit = (item.sellPrice || 0) - (item.buyPrice || 0);
      const margin = item.buyPrice > 0
        ? ((profit / item.buyPrice) * 100).toFixed(0)
        : 0;

      let qtyClass = '';
      if (item.quantity === 0) qtyClass = 'no-stock';
      else if (item.quantity <= 2) qtyClass = 'low-stock';

      return `
        <tr>
          <td>
            <div class="fw-bold">${item.name}</div>
            <div class="fs-small">${item.model || '—'}</div>
            ${item.imei ? `<div class="fs-small">IMEI: ${item.imei}</div>` : ''}
          </td>
          <td>${App.fmt(item.buyPrice)}</td>
          <td>${App.fmt(item.sellPrice)}</td>
          <td>
            <span class="text-profit">+${App.fmt(profit)}</span>
            <span class="fs-small"> (${margin}%)</span>
          </td>
          <td><span class="${qtyClass}">${item.quantity}</span></td>
          <td>
            <button class="action-btn action-btn-edit"
              onclick="Inventory.edit('${item.id}')">✏️ تعديل</button>
            <button class="action-btn action-btn-delete"
              onclick="Inventory.remove('${item.id}')">🗑️ حذف</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  _setupListeners() {
    // Add button
    document.getElementById('add-product-btn').addEventListener('click', () => {
      this.openModal();
    });

    // Search
    document.getElementById('inventory-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) { this.render(this.items); return; }
      const filtered = this.items.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.model?.toLowerCase().includes(q) ||
        i.imei?.toLowerCase().includes(q)
      );
      this.render(filtered);
    });

    // Product form submit
    document.getElementById('product-form').addEventListener('submit', async e => {
      e.preventDefault();
      await this.save();
    });

    // Profit margin preview in modal
    const updateMarginPreview = () => {
      const buy  = parseFloat(document.getElementById('product-buy-price').value) || 0;
      const sell = parseFloat(document.getElementById('product-sell-price').value) || 0;
      const preview = document.getElementById('product-margin-preview');
      const el = document.getElementById('product-margin-value');

      if (buy > 0 && sell > 0) {
        const margin = sell - buy;
        preview.style.display = 'flex';
        el.textContent = `${App.fmt(margin)} (${((margin/buy)*100).toFixed(0)}%)`;
        el.className = margin >= 0 ? 'text-profit' : 'text-loss';
      } else {
        preview.style.display = 'none';
      }
    };

    document.getElementById('product-buy-price').addEventListener('input', updateMarginPreview);
    document.getElementById('product-sell-price').addEventListener('input', updateMarginPreview);
  },

  openModal(item = null) {
    document.getElementById('product-modal-title').textContent =
      item ? '✏️ تعديل المنتج' : '➕ إضافة منتج جديد';
    document.getElementById('product-id').value         = item?.id || '';
    document.getElementById('product-name').value       = item?.name || '';
    document.getElementById('product-model').value      = item?.model || '';
    document.getElementById('product-buy-price').value  = item?.buyPrice || '';
    document.getElementById('product-sell-price').value = item?.sellPrice || '';
    document.getElementById('product-quantity').value   = item?.quantity || '';
    document.getElementById('product-imei').value       = item?.imei || '';
    document.getElementById('product-margin-preview').style.display = 'none';
    App.showModal('product-modal');
  },

  edit(id) {
    const item = this.items.find(i => i.id === id);
    if (item) this.openModal(item);
  },

  remove(id) {
    App.confirmDelete(async () => {
      try {
        await DB.delete('inventory', id);
        this.items = this.items.filter(i => i.id !== id);
        this.render(this.items);
        this.populateSaleDropdown();
        App.showToast('تم حذف المنتج بنجاح');
      } catch (err) {
        App.showToast('حدث خطأ أثناء الحذف', 'error');
      }
    });
  },

  async save() {
    const id = document.getElementById('product-id').value;
    const data = {
      name:      document.getElementById('product-name').value.trim(),
      model:     document.getElementById('product-model').value.trim(),
      buyPrice:  parseFloat(document.getElementById('product-buy-price').value),
      sellPrice: parseFloat(document.getElementById('product-sell-price').value),
      quantity:  parseInt(document.getElementById('product-quantity').value),
      imei:      document.getElementById('product-imei').value.trim(),
    };

    if (!data.name || isNaN(data.buyPrice) || isNaN(data.sellPrice) || isNaN(data.quantity)) {
      App.showToast('يرجى تعبئة جميع الحقول المطلوبة', 'error');
      return;
    }

    try {
      if (id) {
        await DB.update('inventory', id, data);
        App.showToast('✅ تم تحديث المنتج بنجاح');
      } else {
        await DB.add('inventory', data);
        App.showToast('✅ تم إضافة المنتج بنجاح');
      }
      App.hideModal('product-modal');
      await this.load();
    } catch (err) {
      App.showToast('حدث خطأ أثناء الحفظ', 'error');
      console.error(err);
    }
  },

  // Populate the sale modal product dropdown
  populateSaleDropdown() {
    const select = document.getElementById('sale-product');
    const prev   = select.value;
    select.innerHTML = '<option value="">اختر منتج من المخزون...</option>';

    const available = this.items.filter(i => i.quantity > 0);
    available.forEach(item => {
      const opt   = document.createElement('option');
      opt.value   = JSON.stringify({
        id: item.id, name: item.name, model: item.model || '',
        buyPrice: item.buyPrice, sellPrice: item.sellPrice, quantity: item.quantity
      });
      opt.textContent = `${item.name}${item.model ? ' — ' + item.model : ''} (متاح: ${item.quantity})`;
      if (opt.value === prev) opt.selected = true;
      select.appendChild(opt);
    });
  }
};
