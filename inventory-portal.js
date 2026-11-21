(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  document.querySelectorAll('input[type="password"]').forEach(input => {
    if (input.parentElement.classList.contains('password-field')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'password-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.setAttribute('aria-label', 'Show password');
    toggle.setAttribute('title', 'Show password');
    toggle.textContent = '👁';
    toggle.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      toggle.textContent = visible ? '👁' : '🙈';
      toggle.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
      toggle.setAttribute('title', visible ? 'Show password' : 'Hide password');
      input.focus();
    });
    wrapper.appendChild(toggle);
  });
  const apiUrl = 'api/index.php';
  let csrf = '';
  let searchTimer;
  let toastTimer;
  let reportRows = [];
  let inventoryItems = [];
  let stockWorkbookImportAttempted = false;

  async function api(action, method = 'GET', data = null, query = {}) {
    const options = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (data !== null) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['X-CSRF-Token'] = csrf;
      options.body = JSON.stringify(data);
    }
    const parameters = new URLSearchParams({ action, ...query });
    let response;
    try {
      response = await fetch(`${apiUrl}?${parameters}`, options);
    } catch (error) {
      const message = window.location.protocol === 'file:'
        ? 'Open Inventory through the PHP server (http://localhost:8000/inventory.html), not as a local file. Start PHP and MySQL first.'
        : 'Cannot reach the Aadya API. Check that the PHP server is running and MySQL is available.';
      throw new Error(message, { cause: error });
    }
    const result = await response.json().catch(() => ({ error: 'Invalid server response.' }));
    if (!response.ok) throw new Error(result.error || 'Request failed.');
    if (result.csrf) csrf = result.csrf;
    return result;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function formatQuantity(value) {
    return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
  }

  function showToast(message) {
    const toast = $('portal-toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function showAuth(mode) {
    const otp = mode === 'otp';
    $('portal-login').hidden = false;
    $('portal-dashboard').hidden = true;
    $('portal-login-form').hidden = otp;
    $('portal-otp-form').hidden = !otp;
    $('portal-login-error').textContent = '';
    $('portal-otp-error').textContent = '';
  }

  function showDashboard(session) {
    $('portal-login').hidden = true;
    $('portal-dashboard').hidden = false;
    $('portal-user-name').textContent = session.username || '';
    const now = new Date();
    $('portal-to').value = localDate(now);
    $('portal-from').value = localDate(new Date(now.getFullYear(), now.getMonth(), 1));
    $('portal-inward-date').value = localDate(now);
    $('portal-outward-date').value = localDate(now);
    refreshDashboard();
    showPortalView('overview');
  }

  function showPortalView(view) {
    document.querySelectorAll('[data-portal-view]').forEach(element => {
      element.hidden = element.dataset.portalView !== view;
    });
    document.querySelectorAll('.portal-nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.portalViewTarget === view);
    });
  }

  document.querySelectorAll('.portal-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      showPortalView(link.dataset.portalViewTarget);
    });
  });

  function localDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function dateQuery() {
    return { from: $('portal-from').value, to: $('portal-to').value };
  }

  function emptyRow(columns, message) {
    return `<tr><td class="portal-empty" colspan="${columns}">${escapeHtml(message)}</td></tr>`;
  }

  function renderItems(items) {
    renderStockItems(items);
    const categories = [...new Set(items.map(item => item.category || 'General'))];
    ['portal-inward-category', 'portal-outward-category'].forEach(id => {
      const select = $(id);
      const current = select.value;
      select.innerHTML = `<option value="">All categories</option>${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}`;
      if (categories.includes(current)) select.value = current;
    });
    populateMovementItems('inward');
    populateMovementItems('outward');
  }

  function renderStockItems(items) {
    const selectedCategory = $('portal-stock-category-filter').value;
    const search = $('portal-stock-items-search').value.trim().toLowerCase();
    let filteredItems = selectedCategory
      ? items.filter(item => (item.category || 'General') === selectedCategory)
      : items;
    if (search) {
      filteredItems = filteredItems.filter(item =>
        String(item.part_number || '').toLowerCase().includes(search) ||
        String(item.description || '').toLowerCase().includes(search)
      );
    }
    $('portal-items').innerHTML = filteredItems.length ? filteredItems.map(item => `<tr>
      <td>${escapeHtml(item.category || 'General')}</td><td>${escapeHtml(item.part_number)}</td><td>${escapeHtml(item.description)}</td>
      <td>${escapeHtml(formatQuantity(item.current_stock))}</td><td>${escapeHtml(formatQuantity(item.reorder_level))} ${escapeHtml(item.unit)}</td>
      <td><button class="portal-table-action" type="button" data-edit-item="${Number(item.id)}">Edit</button><button class="portal-table-action archive" type="button" data-archive-item="${Number(item.id)}">Archive</button></td>
    </tr>`).join('') : emptyRow(6, selectedCategory ? `No ${selectedCategory} stock items found.` : 'No stock items found.');
  }

  function populateMovementItems(direction) {
    const categoryId = `portal-${direction}-category`;
    const itemId = `portal-${direction}-item`;
    const category = $(categoryId).value;
    const items = inventoryItems.filter(item => !category || (item.category || 'General') === category);
    $(itemId).innerHTML = items.length
      ? `<option value="">Select stock item</option>${items.map(item => `<option value="${Number(item.id)}">${escapeHtml(item.category || 'General')} · ${escapeHtml(item.part_number)} — ${escapeHtml(item.description)} (${escapeHtml(formatQuantity(item.current_stock))} ${escapeHtml(item.unit)})</option>`).join('')}`
      : '<option value="">No items in this category</option>';
  }

  function renderSearch(items) {
    $('portal-search-results').innerHTML = items.length ? items.map(item => `<tr>
      <td>${escapeHtml(item.part_number)}</td><td>${escapeHtml(item.description)}</td><td>${escapeHtml(formatQuantity(item.current_stock))}</td><td>${escapeHtml(item.unit)}</td>
    </tr>`).join('') : emptyRow(4, $('portal-search').value.trim() ? 'No matching part number or description.' : 'Enter a search term to find stock.');
  }

  function renderMovements(rows) {
    $('portal-recent-movements').innerHTML = rows.length ? rows.map(row => `<tr>
      <td>${escapeHtml(row.movement_date)}</td><td>${escapeHtml(row.movement_type === 'inward' ? 'Inward' : 'Outward')}</td>
      <td>${escapeHtml(row.part_number)}</td><td>${escapeHtml(formatQuantity(row.quantity))} ${escapeHtml(row.unit)}</td>
      <td>${escapeHtml([row.party_name, row.reference_number].filter(Boolean).join(' · ') || '—')}</td>
    </tr>`).join('') : emptyRow(5, 'No movements recorded yet.');
  }

  function renderCategoryStocks(categoryStocks) {
    const categoryNames = [
      'Kaeser Office Stock',
      'Everest Vacuum Pumps',
      'Hormann',
      'Shift Air',
      'Godrej',
      'Other material'
    ];
    const totals = new Map((categoryStocks || []).map(row => [
      row.category || 'General',
      { stock: row.current_stock, items: row.item_count }
    ]));
    $('portal-category-stocks').innerHTML = categoryNames.map(category => {
      const values = totals.get(category) || { stock: 0, items: 0 };
      return `<article>
        <span>${escapeHtml(category)} stock</span>
        <strong>${escapeHtml(formatQuantity(values.stock))}</strong>
        <small>${escapeHtml(values.items)} stock item${Number(values.items) === 1 ? '' : 's'}</small>
      </article>`;
    }).join('');
  }

  async function refreshDashboard() {
    try {
      const dashboardSearch = $('portal-dashboard-search').value.trim();
      const search = dashboardSearch || $('portal-search').value.trim();
      let result = await api('inventory-data', 'GET', null, { ...dateQuery(), search });
      if (!search && !stockWorkbookImportAttempted) {
        stockWorkbookImportAttempted = true;
        if (!result.items.length) {
          await api('inventory-import-workbook', 'POST', {});
          result = await api('inventory-data', 'GET', null, { ...dateQuery() });
        }
      }
      inventoryItems = result.items;
      $('portal-current-stock').textContent = formatQuantity(result.currentStock);
      $('portal-inward').textContent = formatQuantity(result.summary.inward);
      $('portal-outward').textContent = formatQuantity(result.summary.outward);
      renderCategoryStocks(result.categoryStocks);
      renderItems(inventoryItems);
      renderSearch(inventoryItems);
      renderMovements(result.recentMovements);
      await runReport(false);
    } catch (error) {
      showToast(error.message);
    }
  }

  async function refreshSearch() {
    const search = $('portal-search').value.trim();
    if (!search) {
      renderSearch([]);
      return;
    }
    try {
      const result = await api('inventory-data', 'GET', null, { ...dateQuery(), search });
      renderSearch(result.items);
    } catch (error) {
      showToast(error.message);
    }
  }

  async function runReport(showMessage = true) {
    try {
      const result = await api('inventory-report', 'GET', null, {
        ...dateQuery(),
        type: $('portal-report-type').value,
        search: $('portal-report-search').value.trim()
      });
      reportRows = result.rows;
      $('portal-report-rows').innerHTML = reportRows.length ? reportRows.map(row => `<tr>
        <td>${escapeHtml(row.movement_date)}</td><td>${escapeHtml(row.movement_type === 'inward' ? 'Inward' : 'Outward')}</td>
        <td>${escapeHtml(row.part_number)}</td><td>${escapeHtml(row.description)}</td>
        <td>${escapeHtml(formatQuantity(row.quantity))}</td><td>${escapeHtml(row.unit)}</td><td>${escapeHtml(row.party_name)}</td>
        <td>${escapeHtml(row.reference_number)}</td><td>${escapeHtml(row.notes)}</td>
      </tr>`).join('') : emptyRow(9, 'No movements match these report filters.');
      $('portal-report-status').textContent = `${reportRows.length} transaction${reportRows.length === 1 ? '' : 's'} · ${result.from} to ${result.to}${reportRows.length === 5000 ? ' · Showing the first 5,000 rows' : ''}`;
      return true;
    } catch (error) {
      $('portal-report-status').textContent = error.message;
      if (showMessage) showToast(error.message);
      return false;
    }
  }

  function resetItemForm() {
    $('portal-item-form').reset();
    $('portal-item-id').value = '';
    $('portal-category').value = 'General';
    $('portal-unit').value = 'pcs';
    $('portal-reorder').value = '0';
    $('portal-opening').value = '0';
    $('portal-opening').disabled = false;
    $('portal-item-form-heading').textContent = 'Add stock item';
    $('portal-cancel-edit').hidden = true;
  }

  function editItem(itemId) {
    const item = inventoryItems.find(candidate => Number(candidate.id) === itemId);
    if (!item) return;
    $('portal-item-id').value = item.id;
    $('portal-category').value = item.category || 'General';
    $('portal-part').value = item.part_number;
    $('portal-description').value = item.description;
    $('portal-unit').value = item.unit;
    $('portal-reorder').value = item.reorder_level;
    $('portal-opening').value = '0';
    $('portal-opening').disabled = true;
    $('portal-item-form-heading').textContent = 'Edit stock item';
    $('portal-cancel-edit').hidden = false;
    $('portal-part').focus();
  }

  function xmlEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
    }[character]));
  }

  function columnName(index) {
    let name = '';
    for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
      name = String.fromCharCode(65 + (value - 1) % 26) + name;
    }
    return name;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeXlsx(matrix) {
    const encoder = new TextEncoder();
    const rows = matrix.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, colIndex) => {
      const ref = `${columnName(colIndex)}${rowIndex + 1}`;
      return typeof value === 'number'
        ? `<c r="${ref}"><v>${Number.isFinite(value) ? value : 0}</v></c>`
        : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const files = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Inventory report" sheetId="1" r:id="rId1"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
      ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData><autoFilter ref="A1:I${matrix.length}"/></worksheet>`]
    ].map(([name, text]) => ({ name: encoder.encode(name), data: encoder.encode(text) }));
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const write16 = (view, at, value) => view.setUint16(at, value, true);
    const write32 = (view, at, value) => view.setUint32(at, value >>> 0, true);
    files.forEach(file => {
      const crc = crc32(file.data);
      const local = new Uint8Array(30 + file.name.length);
      const localView = new DataView(local.buffer);
      write32(localView, 0, 0x04034b50); write16(localView, 4, 20); write16(localView, 6, 0x0800);
      write32(localView, 14, crc); write32(localView, 18, file.data.length); write32(localView, 22, file.data.length);
      write16(localView, 26, file.name.length); local.set(file.name, 30);
      localParts.push(local, file.data);
      const central = new Uint8Array(46 + file.name.length);
      const centralView = new DataView(central.buffer);
      write32(centralView, 0, 0x02014b50); write16(centralView, 4, 20); write16(centralView, 6, 20); write16(centralView, 8, 0x0800);
      write32(centralView, 16, crc); write32(centralView, 20, file.data.length); write32(centralView, 24, file.data.length);
      write16(centralView, 28, file.name.length); write32(centralView, 42, offset); central.set(file.name, 46);
      centralParts.push(central);
      offset += local.length + file.data.length;
    });
    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    write32(endView, 0, 0x06054b50); write16(endView, 8, files.length); write16(endView, 10, files.length);
    write32(endView, 12, centralSize); write32(endView, 16, offset);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function reportMatrix() {
    const headers = ['Date', 'Type', 'Part number', 'Description', 'Quantity', 'Unit', 'Supplier / customer', 'Reference', 'Notes'];
    const rows = reportRows.map(row => [
      row.movement_date, row.movement_type === 'inward' ? 'Inward' : 'Outward',
      row.part_number, row.description, Number(row.quantity), row.unit, row.party_name || '',
      row.reference_number || '', row.notes || ''
    ]);
    return [headers, ...rows];
  }

  function downloadReport() {
    if (!reportRows.length) { showToast('Run a report with results before downloading.'); return; }
    const url = URL.createObjectURL(makeXlsx(reportMatrix()));
    const link = document.createElement('a');
    link.href = url;
    link.download = `aadya-inventory-report-${$('portal-from').value}-to-${$('portal-to').value}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function printReport() {
    if (!reportRows.length) { showToast('Run a report with results before printing.'); return; }
    const popup = window.open('', '_blank');
    if (!popup) { showToast('Allow pop-ups to print or save this report as PDF.'); return; }
    const rows = reportRows.map(row => `<tr><td>${escapeHtml(row.movement_date)}</td><td>${escapeHtml(row.movement_type === 'inward' ? 'Inward' : 'Outward')}</td><td>${escapeHtml(row.part_number)}</td><td>${escapeHtml(row.description)}</td><td>${escapeHtml(formatQuantity(row.quantity))} ${escapeHtml(row.unit)}</td><td>${escapeHtml(row.party_name)}</td><td>${escapeHtml(row.reference_number)}</td><td>${escapeHtml(row.notes)}</td></tr>`).join('');
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Aadya inventory report</title><style>body{font:12px Arial,sans-serif;color:#18252a;padding:20px}h1{font-size:20px}p{color:#566}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccd4d5;padding:6px;text-align:left;vertical-align:top}th{background:#edf2f2}@media print{body{padding:0}}</style></head><body><h1>Aadya Engineering Equipment — Inventory report</h1><p>${escapeHtml($('portal-from').value)} to ${escapeHtml($('portal-to').value)} · ${reportRows.length} transactions</p><table><thead><tr><th>Date</th><th>Type</th><th>Part number</th><th>Description</th><th>Quantity</th><th>Party</th><th>Reference</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`);
    popup.document.close();
  }

  async function initialize() {
    $('portal-year').textContent = new Date().getFullYear();
    try {
      const session = await api('session');
      csrf = session.csrf;
      if (session.authenticated) showDashboard(session);
      else if (session.otp_pending) {
        $('portal-otp-email').textContent = session.pending_email || 'your email';
        showAuth('otp');
      }
      else showAuth('password');
    } catch (error) {
      $('portal-login-error').textContent = error.message;
    }
  }

  $('portal-login-form').addEventListener('submit', async event => {
    event.preventDefault();
    $('portal-login-error').textContent = '';
    try {
      const result = await api('login', 'POST', {
        identity: $('portal-identity').value.trim(),
        password: $('portal-password').value
      });
      $('portal-otp-email').textContent = result.email || 'your email';
      $('portal-otp').value = '';
      showAuth('otp');
      $('portal-otp').focus();
    } catch (error) {
      $('portal-login-error').textContent = error.message;
    }
  });

  $('portal-otp-form').addEventListener('submit', async event => {
    event.preventDefault();
    $('portal-otp-error').textContent = '';
    try {
      const result = await api('verify-otp', 'POST', { otp: $('portal-otp').value.trim() });
      showDashboard({ username: result.username });
    } catch (error) {
      $('portal-otp-error').textContent = error.message;
    }
  });

  $('portal-resend-otp').addEventListener('click', async () => {
    $('portal-otp-error').textContent = '';
    try {
      const result = await api('resend-otp', 'POST', {});
      showToast(result.message || 'A new code has been emailed.');
    } catch (error) {
      $('portal-otp-error').textContent = error.message;
    }
  });

  $('portal-logout').addEventListener('click', async () => {
    try {
      await api('logout', 'POST', {});
      inventoryItems = [];
      reportRows = [];
      window.location.assign('index.html#home');
    } catch (error) {
      showToast(error.message);
    }
  });

  $('portal-refresh').addEventListener('click', refreshDashboard);
  $('portal-from').addEventListener('change', refreshDashboard);
  $('portal-to').addEventListener('change', refreshDashboard);
  $('portal-dashboard-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refreshDashboard, 220);
  });
  $('portal-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refreshSearch, 220);
  });
  $('portal-stock-category-filter').addEventListener('change', () => {
    renderStockItems(inventoryItems);
  });
  $('portal-stock-items-search').addEventListener('input', () => {
    renderStockItems(inventoryItems);
  });
  $('portal-run-report').addEventListener('click', () => runReport());
  $('portal-print-report').addEventListener('click', printReport);
  $('portal-download-report').addEventListener('click', downloadReport);
  $('portal-cancel-edit').addEventListener('click', resetItemForm);
  $('portal-inward-category').addEventListener('change', () => populateMovementItems('inward'));
  $('portal-outward-category').addEventListener('change', () => populateMovementItems('outward'));

  $('portal-item-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await api('inventory-item', 'POST', {
        id: $('portal-item-id').value || undefined,
        category: $('portal-category').value,
        partNumber: $('portal-part').value.trim(),
        description: $('portal-description').value.trim(),
        unit: $('portal-unit').value.trim(),
        reorderLevel: $('portal-reorder').value,
        openingStock: $('portal-opening').value
      });
      resetItemForm();
      await refreshDashboard();
      showToast('Stock item saved.');
    } catch (error) {
      showToast(error.message);
    }
  });

  $('portal-items').addEventListener('click', async event => {
    const editButton = event.target.closest('[data-edit-item]');
    if (editButton) { editItem(Number(editButton.dataset.editItem)); return; }
    const archiveButton = event.target.closest('[data-archive-item]');
    if (!archiveButton || !window.confirm('Archive this stock item? Its movement history will remain in reports.')) return;
    try {
      await api('inventory-archive-item', 'POST', { id: Number(archiveButton.dataset.archiveItem) });
      await refreshDashboard();
      showToast('Stock item archived.');
    } catch (error) {
      showToast(error.message);
    }
  });

  $('portal-import-workbook').addEventListener('click', async () => {
    if (!window.confirm('Import the attached Office Stock workbook data into the five product categories? Existing items will not have their current stock overwritten.')) return;
    try {
      const result = await api('inventory-import-workbook', 'POST', {});
      await refreshDashboard();
      showToast(`Workbook imported: ${result.inserted} new items, ${result.updated} updated.`);
    } catch (error) { showToast(error.message); }
  });

  $('portal-inward-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await api('inventory-movement', 'POST', {
        itemId: $('portal-inward-item').value,
        type: 'inward',
        quantity: $('portal-inward-quantity').value,
        date: $('portal-inward-date').value,
        partyName: $('portal-inward-party').value.trim(),
        referenceNumber: $('portal-inward-reference').value.trim(),
        notes: $('portal-inward-notes').value.trim()
      });
      $('portal-inward-form').reset();
      $('portal-inward-date').value = localDate(new Date());
      await refreshDashboard();
      showToast('Stock inward recorded.');
    } catch (error) { showToast(error.message); }
  });

  $('portal-outward-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await api('inventory-movement', 'POST', {
        itemId: $('portal-outward-item').value,
        type: 'outward',
        quantity: $('portal-outward-quantity').value,
        date: $('portal-outward-date').value,
        partyName: $('portal-outward-party').value.trim(),
        referenceNumber: $('portal-outward-reference').value.trim(),
        notes: $('portal-outward-notes').value.trim()
      });
      $('portal-outward-form').reset();
      $('portal-outward-date').value = localDate(new Date());
      $('portal-outward-reference').required = false;
      await refreshDashboard();
      showToast('Stock outward recorded.');
    } catch (error) { showToast(error.message); }
  });

  initialize();
})();
