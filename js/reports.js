// ═══════════════════════════════════════════
//  js/reports.js — Reports Module
// ═══════════════════════════════════════════

const Reports = {
  _listenersSet: false,
  _lastData: { sales: [], maintenance: [], expenses: [] },

  init() {
    if (!this._listenersSet) {
      this._setupListeners();
      this._listenersSet = true;
    }
    // Default to today on first load
    const today = new Date().toISOString().split('T')[0];
    if (!document.getElementById('report-from').value) {
      document.getElementById('report-from').value = today;
      document.getElementById('report-to').value   = today;
      this.generate();
    }
  },

  _setupListeners() {
    document.getElementById('generate-report-btn').addEventListener('click', () => this.generate());
    document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportPDF());

    // Quick filter buttons
    document.getElementById('report-today-btn').addEventListener('click', () => {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('report-from').value = today;
      document.getElementById('report-to').value   = today;
      this.generate();
    });

    document.getElementById('report-week-btn').addEventListener('click', () => {
      const today   = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      document.getElementById('report-from').value = weekAgo.toISOString().split('T')[0];
      document.getElementById('report-to').value   = today.toISOString().split('T')[0];
      this.generate();
    });

    document.getElementById('report-month-btn').addEventListener('click', () => {
      const today    = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      document.getElementById('report-from').value = firstDay.toISOString().split('T')[0];
      document.getElementById('report-to').value   = today.toISOString().split('T')[0];
      this.generate();
    });
  },

  async generate() {
    const from = document.getElementById('report-from').value;
    const to   = document.getElementById('report-to').value;

    if (!from || !to) {
      App.showToast('اختر فترة زمنية أولاً', 'error');
      return;
    }

    const generateBtn = document.getElementById('generate-report-btn');
    generateBtn.textContent = '⏳ جاري التحميل...';
    generateBtn.disabled = true;

    try {
      const [sales, maintenance, expenses] = await Promise.all([
        DB.getByDateRange('sales', from, to),
        DB.getByDateRange('maintenance', from, to),
        DB.getByDateRange('expenses', from, to)
      ]);

      this._lastData = { sales, maintenance, expenses };

      // ── Calculate totals ─────────────────
      const salesProfit    = sales.reduce((s, i)       => s + (i.profit || 0), 0);
      const maintProfit    = maintenance.reduce((s, i)  => s + (i.profit || 0), 0);
      const totalExpenses  = expenses.reduce((s, i)     => s + (i.amount || 0), 0);
      const netProfit      = salesProfit + maintProfit - totalExpenses;

      // ── Update stat cards ─────────────────
      const netEl = document.getElementById('report-net-profit');
      netEl.textContent = App.fmt(netProfit);
      netEl.className   = `stat-value ${netProfit >= 0 ? 'text-profit' : 'text-loss'}`;

      document.getElementById('report-sales-profit').textContent  = App.fmt(salesProfit);
      document.getElementById('report-maint-profit').textContent  = App.fmt(maintProfit);
      document.getElementById('report-total-expenses').textContent = App.fmt(totalExpenses);

      // ── Build table rows ──────────────────
      const rows = [];

      sales.forEach(i => rows.push({
        date:   i.createdAt,
        type:   '💰 مبيعات',
        desc:   `${i.productName}${i.productModel ? ' — ' + i.productModel : ''} (${i.quantity}x)`,
        amount: (i.sellPrice || 0) * (i.quantity || 1),
        profit: i.profit || 0
      }));

      maintenance.forEach(i => rows.push({
        date:   i.createdAt,
        type:   '🛠️ صيانة',
        desc:   `${i.deviceType} — ${i.customerName}`,
        amount: i.serviceFee || 0,
        profit: i.profit || 0
      }));

      expenses.forEach(i => rows.push({
        date:   i.createdAt,
        type:   '💸 مصروف',
        desc:   i.type + (i.notes ? ` (${i.notes})` : ''),
        amount: i.amount || 0,
        profit: -(i.amount || 0)
      }));

      // Sort by date descending
      rows.sort((a, b) => {
        const ta = a.date?.toDate?.() || 0;
        const tb = b.date?.toDate?.() || 0;
        return tb - ta;
      });

      const tbody = document.getElementById('report-tbody');

      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">لا توجد عمليات في هذه الفترة</td></tr>';
        return;
      }

      tbody.innerHTML = rows.map(r => `
        <tr>
          <td>${App.fmtDate(r.date)}</td>
          <td>${r.type}</td>
          <td>${r.desc}</td>
          <td>${App.fmt(r.amount)}</td>
          <td class="${r.profit >= 0 ? 'text-profit' : 'text-loss'}">
            ${r.profit >= 0 ? '+' : ''}${App.fmt(r.profit)}
          </td>
        </tr>
      `).join('');

    } catch (err) {
      App.showToast('حدث خطأ أثناء تحميل التقرير', 'error');
      console.error(err);
    } finally {
      generateBtn.textContent = '🔍 عرض التقرير';
      generateBtn.disabled = false;
    }
  },

  exportPDF() {
    if (!window.jspdf) {
      App.showToast('جاري تحميل مكتبة PDF...', 'info');
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc  = new jsPDF('p', 'mm', 'a4');
      const from = document.getElementById('report-from').value;
      const to   = document.getElementById('report-to').value;

      // ── Header ────────────────────────────
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('AI-STORE', 105, 18, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Mobile Shop Financial Report', 105, 28, { align: 'center' });
      doc.text(`Period: ${from}  to  ${to}`, 105, 36, { align: 'center' });

      // ── Summary Box ───────────────────────
      const netProfit    = parseFloat(document.getElementById('report-net-profit').textContent)    || 0;
      const salesProfit  = document.getElementById('report-sales-profit').textContent;
      const maintProfit  = document.getElementById('report-maint-profit').textContent;
      const expenses     = document.getElementById('report-total-expenses').textContent;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, 52);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const summaryData = [
        ['Net Profit',        document.getElementById('report-net-profit').textContent],
        ['Sales Profit',      salesProfit],
        ['Maintenance Profit', maintProfit],
        ['Total Expenses',    expenses],
      ];

      doc.autoTable({
        startY: 56,
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 11, cellPadding: 5, halign: 'right' },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left', fillColor: [245, 245, 255] },
          1: { halign: 'right' }
        }
      });

      // ── Transactions Table ────────────────
      const rows = [];
      this._lastData.sales.forEach(i => rows.push([
        App.fmtDate(i.createdAt), 'Sales',
        `${i.productName} (${i.quantity}x)`,
        App.fmt((i.sellPrice||0)*(i.quantity||1)),
        `+${App.fmt(i.profit)}`
      ]));
      this._lastData.maintenance.forEach(i => rows.push([
        App.fmtDate(i.createdAt), 'Maintenance',
        `${i.deviceType} - ${i.customerName}`,
        App.fmt(i.serviceFee),
        `+${App.fmt(i.profit)}`
      ]));
      this._lastData.expenses.forEach(i => rows.push([
        App.fmtDate(i.createdAt), 'Expense',
        i.type, App.fmt(i.amount),
        `-${App.fmt(i.amount)}`
      ]));

      if (rows.length) {
        const startY = doc.lastAutoTable.finalY + 12;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Transaction Details', 14, startY);

        doc.autoTable({
          startY: startY + 4,
          head: [['Date', 'Type', 'Description', 'Amount', 'Profit/Loss']],
          body: rows,
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 248, 255] }
        });
      }

      // ── Footer ────────────────────────────
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(
          `Generated by AI-STORE | ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
          105, 290, { align: 'center' }
        );
      }

      doc.save(`AI-STORE-Report-${from}-to-${to}.pdf`);
      App.showToast('📄 تم تصدير التقرير بنجاح!');
    } catch (err) {
      App.showToast('حدث خطأ أثناء التصدير', 'error');
      console.error(err);
    }
  }
};
