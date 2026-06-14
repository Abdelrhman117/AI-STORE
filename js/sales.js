// ═══════════════════════════════════════════
//  js/sales.js — Sales Module
// ═══════════════════════════════════════════

const Sales = {
  _listenersSet: false,

  async load() {
    // Ensure inventory is loaded for the dropdown
    if (!Inventory.items.length) await Inventory.load();
    else Inventory.populateSaleDropdown();

    const items = await DB.getAll('sales');
    this.render(items);

    if (!this._listenersSet) {
      this._setupListeners();
      this._listenersSet = true;
    }
  },

  render(items) {
    const tbody = document.getElementById('sales-tbody');

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">💰 لا توجد مبيعات مسجلة بعد</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td>
          <div class="fw-semi">${App.fmtDate(item.createdAt)}</div>
          <div class="fs-small">${App.fmtTime(item.createdAt)}</div>
        </td>
        <td>
          <div class="fw-bold">${item.productName || '—'}</div>
          <div class="fs-small">${item.productModel || ''}</div>
        </td>
        <td>${item.quantity || 1}</td>
        <td>${App.fmt((item.sellPrice || 0) * (item.quantity || 1))}</td>
        <td class="text-muted">${App.fmt((item.buyPrice || 0) * (item.quantity || 1))}</td>
        <td class="text-profit">+${App.fmt(item.profit)}</td>
        <td>${item.customerName || '—'}</td>
        <td class="fs-small">${item.createdBy?.split('@')[0] || '—'}</td>
      </tr>
    `).join('');
  },

  _setupListeners() {
    // Add Sale button
    document.getElementById('add-sale-btn').addEventListener('click', () => {
      this.openModal();
    });

    // Date filter
    document.getElementById('sales-date-filter').addEventListener('change', async e => {
      if (e.target.value) {
        const items = await DB.getByDateRange('sales', e.target.value, e.target.value);
        this.render(items);
      } else {
        const items = await DB.getAll('sales');
        this.render(items);
      }
    });

    // Product selection → auto-fill sell price + profit preview
    const saleProduct  = document.getElementById('sale-product');
    const saleSellPrice = document.getElementById('sale-sell-price');
    const saleQuantity  = document.getElementById('sale-quantity');

    const updateProfit = () => {
      try {
        const p       = JSON.parse(saleProduct.value || 'null');
        if (!p) return;
        const sell    = parseFloat(saleSellPrice.value) || 0;
        const qty     = parseInt(saleQuantity.value)    || 1;
        const profit  = (sell - p.buyPrice) * qty;
        const preview = document.getElementById('sale-profit-preview');
        const el      = document.getElementById('sale-profit-value');
        preview.style.display = 'flex';
        el.textContent = `${profit >= 0 ? '+' : ''}${App.fmt(profit)}`;
        el.className   = profit >= 0 ? 'text-profit' : 'text-loss';
      } catch {}
    };

    saleProduct.addEventListener('change', () => {
      try {
        const p = JSON.parse(saleProduct.value);
        if (p?.sellPrice) saleSellPrice.value = p.sellPrice;
        updateProfit();
      } catch {}
    });

    saleSellPrice.addEventListener('input', updateProfit);
    saleQuantity.addEventListener('input', updateProfit);

    // Sale form submit
    document.getElementById('sale-form').addEventListener('submit', async e => {
      e.preventDefault();
      await this.save();
    });
  },

  openModal() {
    document.getElementById('sale-form').reset();
    document.getElementById('sale-profit-preview').style.display = 'none';
    Inventory.populateSaleDropdown();
    App.showModal('sale-modal');
  },

  async save() {
    try {
      const productRaw = document.getElementById('sale-product').value;
      if (!productRaw) { App.showToast('اختر منتجاً أولاً', 'error'); return; }

      const product   = JSON.parse(productRaw);
      const quantity  = parseInt(document.getElementById('sale-quantity').value);
      const sellPrice = parseFloat(document.getElementById('sale-sell-price').value);

      if (isNaN(quantity) || quantity < 1) {
        App.showToast('أدخل كمية صحيحة', 'error'); return;
      }
      if (isNaN(sellPrice) || sellPrice < 0) {
        App.showToast('أدخل سعر بيع صحيح', 'error'); return;
      }
      if (quantity > product.quantity) {
        App.showToast(`الكمية المطلوبة (${quantity}) أكبر من المتاح (${product.quantity})`, 'error');
        return;
      }

      const profit = (sellPrice - product.buyPrice) * quantity;

      const saleData = {
        productId:    product.id,
        productName:  product.name,
        productModel: product.model || '',
        quantity,
        sellPrice,
        buyPrice:     product.buyPrice,
        profit,
        customerName: document.getElementById('sale-customer').value.trim(),
        notes:        document.getElementById('sale-notes').value.trim(),
      };

      // Deduct from inventory
      await DB.update('inventory', product.id, {
        quantity: product.quantity - quantity
      });

      await DB.add('sales', saleData);

      // Update local inventory cache
      const idx = Inventory.items.findIndex(i => i.id === product.id);
      if (idx !== -1) Inventory.items[idx].quantity -= quantity;

      App.showToast(`✅ تم تسجيل البيعة! الربح: ${App.fmt(profit)}`);
      App.hideModal('sale-modal');
      await this.load();
    } catch (err) {
      App.showToast('حدث خطأ أثناء التسجيل', 'error');
      console.error(err);
    }
  }
};
