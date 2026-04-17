// ==========================================
// ORI ACADEMY — CLASS MANAGEMENT DASHBOARD
// Connects to Google Sheets for live data
// ==========================================

const SHEET_ID = '19hkkfwrK0elsf6p0WGpyesbA-lexQqHI81nPXkq4GAg';

// ===== DATA STORES =====
let data = {
  lopHoc: [],    // Classes
  hocVien: [],   // Students
  hocPhi: [],    // Enrollments/Payments
  diemDanh: [],  // Attendance
  khoaHoc: [],   // Courses
  choHoc: [],    // Leads
  giaoDich: [],  // Transactions
};

let currentClassId = null;

// Apps Script Web App URL — Cần cập nhật sau khi deploy Apps Script
// Để trống = chỉ lưu local, không sync lên Sheet
let APPS_SCRIPT_URL = localStorage.getItem('ori_apps_script_url') || '';

// ===== SYNC TO GOOGLE SHEET =====
async function syncToSheet(payload) {
  if (!APPS_SCRIPT_URL) {
    console.log('[Sync] No APPS_SCRIPT_URL configured, skipping sync');
    return { success: false, message: 'Chưa cấu hình URL' };
  }

  try {
    showSyncStatus('syncing');
    const actorName = localStorage.getItem('ori_user_name') || '';
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ source: 'dashboard', actorName, ...payload }),
    });
    const result = await res.json();
    if (result.success) {
      showSyncStatus('saved');
      console.log('[Sync] ✅', result.message);
    } else {
      showSyncStatus('error');
      console.warn('[Sync] ⚠️', result.message);
    }
    return result;
  } catch (err) {
    showSyncStatus('error');
    console.error('[Sync] ❌', err);
    return { success: false, message: err.message };
  }
}

function showSyncStatus(status) {
  const el = document.getElementById('globalStatus');
  if (!el) return;
  const prevText = el.dataset.prevText || el.textContent;
  if (status === 'syncing') {
    el.dataset.prevText = prevText;
    el.textContent = '⏳ Đang lưu...';
    el.style.color = 'var(--orange)';
  } else if (status === 'saved') {
    el.textContent = '✅ Đã lưu lên Sheet';
    el.style.color = 'var(--green)';
    setTimeout(() => { el.textContent = prevText; el.style.color = ''; }, 3000);
  } else if (status === 'error') {
    el.textContent = '⚠️ Lưu lỗi (dữ liệu local OK)';
    el.style.color = 'var(--red)';
    setTimeout(() => { el.textContent = prevText; el.style.color = ''; }, 4000);
  }
}

// ===== INIT / AUTH =====
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
});

function checkSession() {
  const role = localStorage.getItem('ori_user_role');
  const name = localStorage.getItem('ori_user_name');
  if (role && name) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    document.getElementById('lblUserName').textContent = name;
    document.getElementById('lblUserRole').textContent = "Role: " + role;
    
    applyRolePermissions(role);

    setToday();
    updateQAToday();
    refreshData();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
  }
}

async function submitLogin() {
  const u = document.getElementById('loginUsername').value;
  const p = document.getElementById('loginPassword').value;
  const btn = document.getElementById('btnLogin');
  
  if (!APPS_SCRIPT_URL) {
    showToast("Bạn chưa cài đặt APPS_SCRIPT_URL!", "error");
    return;
  }

  btn.textContent = "Đang kiểm tra...";
  btn.style.opacity = "0.7";

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ source: 'dashboard', action: 'login', username: u, password: p }),
    });
    const result = await res.json();
    if (result.success) {
      localStorage.setItem('ori_user_role', result.role);
      localStorage.setItem('ori_user_name', result.name);
      showToast(result.message, "success");
      checkSession();
    } else {
      showToast(result.message, "error");
    }
  } catch (err) {
    showToast("Lỗi kết nối", "error");
  } finally {
    btn.textContent = "🔓 Đăng Nhập";
    btn.style.opacity = "1";
  }
}

function logout() {
  localStorage.removeItem('ori_user_role');
  localStorage.removeItem('ori_user_name');
  window.location.reload();
}

function applyRolePermissions(role) {
  const isGiaoVien = role === 'GiaoVien';
  const isLeTan = role === 'LeTan';

  // 1. Sidebar items (display: none if restricted)
  const navPayments = document.querySelector('[data-view="payments"]');
  const navTransactions = document.querySelector('[data-view="transactions"]');
  const navLeads = document.querySelector('[data-view="leads"]');
  
  if (isGiaoVien) {
     if (navPayments) navPayments.style.display = 'none';
     if (navTransactions) navTransactions.style.display = 'none';
     if (navLeads) navLeads.style.display = 'none';
  } else if (isLeTan) {
     if (navTransactions) navTransactions.style.display = 'none';
  }

  // Set style flag for UI actions in rest of JS
  document.body.dataset.role = role;
}

// ===== DATE HELPERS =====
function setToday() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const el = document.getElementById('attendanceDate');
  if (el) el.value = dateStr;
}

function updateQAToday() {
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const el = document.getElementById('qaToday');
  if (el) el.textContent = today.toLocaleDateString('vi-VN', options);
}

function formatDateVN(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// ===== NAVIGATION =====
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const viewId = viewName === 'classDetail' ? 'viewClassDetail' :
                 viewName === 'classes' ? 'viewClasses' :
                 viewName === 'students' ? 'viewStudents' :
                 viewName === 'attendance' ? 'viewAttendance' :
                 viewName === 'payments' ? 'viewPayments' :
                 viewName === 'leads' ? 'viewLeads' :
                 viewName === 'transactions' ? 'viewTransactions' : 'viewClasses';

  const view = document.getElementById(viewId);
  if (view) view.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');

  // Render view-specific content
  if (viewName === 'attendance') renderQuickAttendance();
  if (viewName === 'students') renderAllStudents();
  if (viewName === 'payments') renderPaymentDashboard();
  if (viewName === 'leads') renderLeadsList();
  if (viewName === 'transactions') renderTransactions();
}

function renderTransactions() {
  const tbody = document.getElementById('transactionListBody');
  if (!tbody) return;

  if (!data.giaoDich || data.giaoDich.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px;">Chưa có dữ liệu giao dịch</td></tr>`;
    return;
  }

  // Sort by date descending (assuming format dd/MM/yyyy HH:mm:ss or similar that can be parsed, or simply reverse original order since usually appendRow is sequential)
  const sorted = [...data.giaoDich].reverse();

  tbody.innerHTML = sorted.map(gd => {
    const maGD = gd['Mã GD'] || gd['Ma GD'] || '—';
    const time = gd['Thời gian'] || gd['Thoi gian'] || '—';
    const maHV = gd['Mã HV'] || gd['Ma HV'] || '—';
    const maLop = gd['Mã Lớp'] || gd['Ma Lop'] || '—';
    const soTien = parseNum(gd['Số tiền'] || gd['So tien'] || 0);
    const hinhThuc = gd['Hình thức'] || gd['Hinh thuc'] || '—';
    const ghiChu = gd['Ghi chú'] || gd['Ghi chu'] || '—';
    
    const name = getStudentNameByMaHV(maHV);

    return `
      <tr>
        <td style="color:var(--text-muted); font-size:0.85rem;">${escapeHtml(maGD)}</td>
        <td style="font-size:0.9rem;">${escapeHtml(time)}</td>
        <td>
          <div style="font-weight:600; color:var(--text-primary); cursor:pointer;" onclick="openStudentProfileModal('${escapeHtml(maHV)}')">${escapeHtml(name)}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(maHV)}</div>
        </td>
        <td><span style="background:var(--teal-soft); color:var(--teal); padding:2px 8px; border-radius:4px; font-size:0.8rem;">${escapeHtml(maLop)}</span></td>
        <td style="color:var(--green); font-weight:bold;">+${formatVND(soTien)}</td>
        <td><span style="border:1px solid var(--border); padding:2px 6px; border-radius:4px; font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(hinhThuc)}</span></td>
        <td style="font-size:0.85rem; color:var(--text-muted);">${escapeHtml(ghiChu)}</td>
      </tr>`;
  }).join('');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function switchTab(btn) {
  const tabId = btn.dataset.tab;
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
}

// ===== DATA LOADING =====
async function refreshData() {
  const btn = document.querySelector('.btn-refresh');
  const status = document.getElementById('globalStatus');
  if (btn) btn.classList.add('loading');
  status.textContent = 'Đang tải...';

  try {
    const results = await Promise.all([
      fetchSheetData('LopHoc'),
      fetchSheetData('HocVien'),
      fetchSheetData('HocPhi'),
      fetchSheetData('DiemDanh'),
      fetchSheetData('KhoaHoc'),
      fetchSheetData('ChoHoc'),
      fetchSheetData('GiaoDich'),
    ]);

    data.lopHoc = results[0];
    data.hocVien = results[1];
    data.hocPhi = results[2];
    data.diemDanh = results[3];
    data.khoaHoc = results[4];
    data.choHoc = results[5];
    data.giaoDich = results[6];

    // Update badges
    document.getElementById('badgeClasses').textContent = data.lopHoc.length;
    document.getElementById('badgeStudents').textContent = data.hocVien.length;
    
    const activeLeads = (data.choHoc || []).filter(l => (l['Trạng thái'] || l['Trang thai']) === 'Đang chăm sóc').length;
    document.getElementById('badgeLeads').textContent = activeLeads;

    const debtCount = data.hocPhi.filter(hp => parseNum(hp['Còn nợ'] || hp['Con no']) > 0).length;
    const debtBadge = document.getElementById('badgeDebt');
    if (debtCount > 0) {
      debtBadge.textContent = debtCount;
      debtBadge.style.display = 'inline';
    } else {
      debtBadge.style.display = 'none';
    }

    const total = data.lopHoc.length + data.hocVien.length + data.hocPhi.length + data.diemDanh.length;
    status.textContent = `✅ ${total} records • ${new Date().toLocaleTimeString('vi-VN')}`;

    showToast(`✅ Đã tải: ${data.lopHoc.length} lớp, ${data.hocVien.length} HV, ${data.hocPhi.length} đăng ký`);

    // Render current view
    renderClasses();
    if (currentClassId) openClassDetail(currentClassId);

  } catch (err) {
    console.error('Load error:', err);
    status.textContent = '❌ Lỗi tải dữ liệu';
    showToast('❌ Không tải được dữ liệu. Kiểm tra Sheet đã publish chưa.', 'error');
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

async function fetchSheetData(sheetName) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1`;
    const res = await fetch(url);
    const text = await res.text();

    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?/);
    if (!jsonStr) return [];

    const json = JSON.parse(jsonStr[1]);
    let cols = json.table.cols.map(c => c.label || '');
    const rows = json.table.rows || [];

    if (rows.length === 0) return [];

    const hasEmptyLabels = cols.every(c => !c);
    if (hasEmptyLabels && rows.length > 0) {
      cols = rows[0].c.map(cell => cell ? String(cell.v || '') : '');
      return rows.slice(1).map(row => parseRow(row, cols));
    }

    return rows.map(row => parseRow(row, cols));
  } catch (e) {
    console.warn(`Failed to fetch ${sheetName}:`, e);
    return [];
  }
}

function parseRow(row, cols) {
  const obj = {};
  row.c.forEach((cell, i) => {
    if (cols[i]) {
      if (cell && cell.f) {
        // Use formatted value for dates
        obj[cols[i]] = cell.f;
      } else {
        obj[cols[i]] = cell ? (cell.v != null ? String(cell.v) : '') : '';
      }
    }
  });
  return obj;
}

// ===== HELPERS =====
function parseNum(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
}

function formatVND(num) {
  if (!num || isNaN(num)) return '0đ';
  return Number(num).toLocaleString('vi-VN') + 'đ';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getStudentNameByMaHV(maHV) {
  const hv = data.hocVien.find(h => (h['Mã HV'] || h['Ma HV']) === maHV);
  return hv ? (hv['Họ Tên'] || hv['Ho Ten'] || hv['Họ tên'] || '') : maHV;
}

function getStudentPhoneByMaHV(maHV) {
  const hv = data.hocVien.find(h => (h['Mã HV'] || h['Ma HV']) === maHV);
  return hv ? (hv['SĐT'] || hv['SDT'] || '') : '';
}

function getCourseNameByMaKH(maKH) {
  const kh = data.khoaHoc.find(k => (k['Mã KH'] || k['Ma KH']) === maKH);
  return kh ? (kh['Tên Khóa Học'] || kh['Ten Khoa Hoc'] || kh['Tên KH'] || kh['Ten KH'] || '') : '';
}

function getClassDisplayName(lop) {
  // Ưu tiên hiển thị Tên Lớp nếu có (từ cấu trúc Sheet mới)
  const tenLop = lop['Tên Lớp'] || lop['Ten Lop'] || '';
  if (tenLop) return tenLop;

  // Fallback về Tên Khóa Học
  const maLop = lop['Mã Lớp'] || lop['Ma Lop'] || lop['Mã lớp'] || '';
  const maKH = lop['Mã KH'] || lop['Ma KH'] || '';
  const courseName = getCourseNameByMaKH(maKH);
  
  if (courseName && courseName !== '') {
    return courseName;
  }
  return maLop || maKH;
}

function getClassDisplayNameByMaLop(maLop) {
  const lop = data.lopHoc.find(l => (l['Mã Lớp'] || l['Ma Lop'] || l['Mã lớp']) === maLop);
  return lop ? getClassDisplayName(lop) : maLop;
}

function getClassStatusStyle(status) {
  if (!status) return { cls: 'active', label: 'Đang học' };
  const s = status.toLowerCase();
  if (s.includes('kết thúc') || s.includes('ket thuc') || s.includes('xong')) return { cls: 'ended', label: status };
  if (s.includes('sắp') || s.includes('sap') || s.includes('chưa') || s.includes('chua')) return { cls: 'upcoming', label: status };
  return { cls: 'active', label: status || 'Đang học' };
}

function getStudentsInClass(maLop) {
  return data.hocPhi.filter(hp => (hp['Mã Lớp'] || hp['Ma Lop'] || hp['Mã lớp']) === maLop);
}

function getAttendanceForClass(maLop) {
  return data.diemDanh.filter(dd => (dd['Mã Lớp'] || dd['Ma Lop'] || dd['Mã lớp']) === maLop);
}

// ===== RENDER: CLASSES =====
function renderClasses() {
  const grid = document.getElementById('classGrid');
  if (data.lopHoc.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <span>📭</span>
        <p>Chưa có dữ liệu lớp học.<br>Kiểm tra Google Sheet đã publish chưa.</p>
      </div>`;
    return;
  }

  grid.innerHTML = data.lopHoc.map(lop => {
    const maLop = lop['Mã Lớp'] || lop['Ma Lop'] || lop['Mã lớp'] || '';
    const maKH = lop['Mã KH'] || lop['Ma KH'] || '';
    const courseName = getCourseNameByMaKH(maKH);
    const ngayKG = lop['Ngày khai giảng'] || lop['Ngay khai giang'] || '';
    const trangThai = lop['Trạng thái'] || lop['Trang thai'] || 'Đang học';
    const statusInfo = getClassStatusStyle(trangThai);
    const students = getStudentsInClass(maLop);
    const totalDebt = students.reduce((sum, hp) => sum + parseNum(hp['Còn nợ'] || hp['Con no']), 0);

    const displayName = getClassDisplayName(lop);

    return `
      <div class="class-card" onclick="openClassDetail('${escapeHtml(maLop)}')" data-status="${escapeHtml(trangThai)}" data-name="${escapeHtml(maLop)} ${escapeHtml(courseName)} ${escapeHtml(displayName)}">
        <div class="class-card-header">
          <div>
            <div class="class-name">${escapeHtml(displayName)}</div>
            <div class="class-course">${escapeHtml(maLop)}</div>
          </div>
          <span class="class-status ${statusInfo.cls}">${escapeHtml(statusInfo.label)}</span>
        </div>
        <div class="class-stats">
          <div class="class-stat">
            <span class="class-stat-value">${students.length}</span>
            <span class="class-stat-label">Học viên</span>
          </div>
          <div class="class-stat">
            <span class="class-stat-value" style="color: ${totalDebt > 0 ? 'var(--red)' : 'var(--green)'}">${totalDebt > 0 ? formatVND(totalDebt) : '✓'}</span>
            <span class="class-stat-label">${totalDebt > 0 ? 'Tổng nợ' : 'Đã đóng đủ'}</span>
          </div>
          <div class="class-date">
            <div class="class-date-label">Khai giảng</div>
            <div>${formatDateVN(ngayKG)}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function filterClasses() {
  const search = (document.getElementById('searchClasses').value || '').toLowerCase();
  const statusFilter = document.getElementById('filterClassStatus').value;

  document.querySelectorAll('.class-card').forEach(card => {
    const name = (card.dataset.name || '').toLowerCase();
    const status = card.dataset.status || '';
    const matchSearch = !search || name.includes(search);
    const matchStatus = !statusFilter || status === statusFilter;
    card.style.display = (matchSearch && matchStatus) ? '' : 'none';
  });
}

// ===== RENDER: CLASS DETAIL =====
function openClassDetail(maLop) {
  currentClassId = maLop;
  switchView('classDetail');

  const lop = data.lopHoc.find(l => (l['Mã Lớp'] || l['Ma Lop'] || l['Mã lớp']) === maLop);
  if (!lop) return;

  const maKH = lop['Mã KH'] || lop['Ma KH'] || '';
  const courseName = getCourseNameByMaKH(maKH);
  const ngayKG = lop['Ngày khai giảng'] || lop['Ngay khai giang'] || '';
  const trangThai = lop['Trạng thái'] || lop['Trang thai'] || 'Đang học';
  const statusInfo = getClassStatusStyle(trangThai);

  const displayName = getClassDisplayName(lop);
  document.getElementById('classDetailTitle').textContent = `📚 ${displayName}`;
  document.getElementById('classDetailSubtitle').textContent = maLop;

  // Class info card
  document.getElementById('classInfoCard').innerHTML = `
    <div class="detail-info-row">
      <div class="detail-info-item">
        <span class="detail-info-label">Mã Lớp</span>
        <span class="detail-info-value">${escapeHtml(maLop)}</span>
      </div>
      <div class="detail-info-item">
        <span class="detail-info-label">Khóa Học</span>
        <span class="detail-info-value">${escapeHtml(courseName || maKH)}</span>
      </div>
      <div class="detail-info-item">
        <span class="detail-info-label">Khai Giảng</span>
        <span class="detail-info-value">${formatDateVN(ngayKG)}</span>
      </div>
      <div class="detail-info-item">
        <span class="detail-info-label">Trạng Thái</span>
        <span class="detail-info-value"><span class="class-status ${statusInfo.cls}">${escapeHtml(statusInfo.label)}</span></span>
      </div>
    </div>`;

  // Students in class
  const enrollments = getStudentsInClass(maLop);
  document.getElementById('countStudents').textContent = enrollments.length;

  renderStudentList(enrollments);
  renderAttendanceTab(maLop, enrollments);
  renderPaymentTab(enrollments);

  // Reset to first tab
  document.querySelectorAll('.tab-btn')[0].click();

  // Set date to today
  setToday();
}

function renderStudentList(enrollments) {
  const container = document.getElementById('studentList');

  if (enrollments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span>👥</span>
        <p>Chưa có học viên nào trong lớp này</p>
      </div>`;
    return;
  }

  container.innerHTML = enrollments.map((hp, i) => {
    const maHV = hp['Mã HV'] || hp['Ma HV'] || hp['Mã hv'] || '';
    const maDK = hp['Mã ĐK'] || hp['Ma DK'] || '';
    const name = getStudentNameByMaHV(maHV);
    const phone = getStudentPhoneByMaHV(maHV);
    const debt = parseNum(hp['Còn nợ'] || hp['Con no']);
    const phoneClean = String(phone).replace(/[^\d]/g, '');
    const status = hp['Trạng thái HV'] || hp['Trang thai HV'] || '';
    const isTrial = status === 'Học thử';

    return `
      <div class="student-row">
        <span class="student-index">${i + 1}</span>
        <div class="student-info" style="cursor:pointer;" onclick="openStudentProfileModal('${escapeHtml(maHV)}')">
          <div class="student-name" style="color:var(--teal);">
            ${escapeHtml(name || maHV)}
            ${isTrial
              ? '<span class="student-status-badge trial">📝 Học thử</span>'
              : (status === 'Chính thức' ? '<span class="student-status-badge official">✅ Chính thức</span>' : '')}
          </div>
          <div class="student-phone">
            ${phone ? `<a href="tel:${phoneClean}">📱 ${escapeHtml(phone)}</a>` : '<span style="color:var(--text-muted)">Chưa có SĐT</span>'}
          </div>
        </div>
        ${isTrial ? `
          <button class="btn-convert" onclick="convertToOfficial('${escapeHtml(maDK || maHV)}', '${escapeHtml(maHV)}')">
            🎓 Chuyển chính thức
          </button>
        ` : `
          <div class="student-debt">
            <div class="student-debt-amount ${debt > 0 ? 'has-debt' : 'paid'}">
              ${debt > 0 ? formatVND(debt) : '✅ Đã đóng đủ'}
            </div>
            <div class="student-debt-label">${debt > 0 ? 'Còn nợ' : 'Học phí'}</div>
          </div>
        `}
        ${phone ? `
          <div class="student-zalo">
            <a class="btn-zalo" href="https://zalo.me/${phoneClean}" target="_blank">💬 Zalo</a>
          </div>
        ` : ''}
        <div style="display:flex; flex-direction:column; gap:4px; margin-left:8px;">
          <button style="background:var(--bg-card); border:1px solid #ddd; padding:4px 8px; border-radius:4px; font-size:0.8rem; cursor:pointer;" onclick="openEditStudentModal('${escapeHtml(maHV)}')">✏️ Sửa</button>
          <button style="background:var(--bg-card); border:1px solid #ddd; padding:4px 8px; border-radius:4px; font-size:0.8rem; cursor:pointer; color:var(--red);" onclick="confirmRemoveStudent('${escapeHtml(maDK)}', '${escapeHtml(maHV)}')">🗑️ Xóa</button>
        </div>
      </div>`;
  }).join('');
}

// ===== RENDER: ATTENDANCE TAB =====
function renderAttendanceTab(maLop, enrollments) {
  // Attendance list for today
  const container = document.getElementById('attendanceList');

  if (enrollments.length === 0) {
    container.innerHTML = `<div class="empty-state"><span>📋</span><p>Không có học viên</p></div>`;
    return;
  }

  container.innerHTML = enrollments.map((hp, i) => {
    const maHV = hp['Mã HV'] || hp['Ma HV'] || '';
    const name = getStudentNameByMaHV(maHV);
    const phone = getStudentPhoneByMaHV(maHV);

    // Check if already marked today
    const todayStr = getTodayStr();
    const existingDD = data.diemDanh.find(dd => {
      const ddMaLop = dd['Mã Lớp'] || dd['Ma Lop'] || '';
      const ddMaHV = dd['Mã HV'] || dd['Ma HV'] || '';
      const ddNgay = dd['Ngày'] || dd['Ngay'] || '';
      return ddMaLop === maLop && ddMaHV === maHV && ddNgay.includes(todayStr);
    });

    const currentStatus = existingDD ? (existingDD['Trạng thái'] || existingDD['Trang thai'] || '') : '';

    return `
      <div class="attendance-row" data-mahv="${escapeHtml(maHV)}" data-malop="${escapeHtml(maLop)}">
        <span class="student-index">${i + 1}</span>
        <div class="student-info" style="cursor:pointer;" onclick="openStudentProfileModal('${escapeHtml(maHV)}')">
          <div class="student-name" style="color:var(--teal);">${escapeHtml(name || maHV)}</div>
          <div class="student-phone">${escapeHtml(phone)}</div>
        </div>
        <div class="attendance-actions">
          <button class="att-btn present ${currentStatus.includes('mặt') || currentStatus.includes('mat') ? 'selected' : ''}" 
                  onclick="markAttendance(this, '${escapeHtml(maHV)}', 'Có mặt')">✓ Có mặt</button>
          <button class="att-btn late ${currentStatus.includes('Trễ') || currentStatus.includes('tre') ? 'selected' : ''}"
                  onclick="markAttendance(this, '${escapeHtml(maHV)}', 'Trễ')">⏰ Trễ</button>
          <button class="att-btn absent ${currentStatus.includes('Vắng') || currentStatus.includes('vang') ? 'selected' : ''}"
                  onclick="markAttendance(this, '${escapeHtml(maHV)}', 'Vắng')">✗ Vắng</button>
        </div>
      </div>`;
  }).join('');

  // Attendance history
  renderAttendanceHistory(maLop);
}

function markAttendance(btn, maHV, status) {
  // Visual feedback - toggle selected
  const row = btn.closest('.attendance-row');
  row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  // Store locally (will need to sync with Google Sheet via Apps Script)
  const date = document.getElementById('attendanceDate').value || getTodayStr();
  const maLop = row.dataset.malop;

  // Update local data
  const existing = data.diemDanh.findIndex(dd => {
    const ddMaLop = dd['Mã Lớp'] || dd['Ma Lop'] || '';
    const ddMaHV = dd['Mã HV'] || dd['Ma HV'] || '';
    const ddNgay = dd['Ngày'] || dd['Ngay'] || '';
    return ddMaLop === maLop && ddMaHV === maHV && ddNgay.includes(date);
  });

  if (existing >= 0) {
    data.diemDanh[existing]['Trạng thái'] = status;
  } else {
    data.diemDanh.push({
      'Ngày': date,
      'Mã Lớp': maLop,
      'Mã HV': maHV,
      'Trạng thái': status,
    });
  }

  const name = getStudentNameByMaHV(maHV);
  const emoji = status === 'Có mặt' ? '✅' : status === 'Trễ' ? '⏰' : '❌';
  showToast(`${emoji} ${name}: ${status}`);

  // Sync to Google Sheet
  syncToSheet({
    action: 'markAttendance',
    ngay: date,
    maLop: maLop,
    maHV: maHV,
    trangThai: status,
  });
}

function createAttendanceForClass() {
  const rows = document.querySelectorAll('#attendanceList .attendance-row');
  let count = 0;

  rows.forEach(row => {
    const selectedBtn = row.querySelector('.att-btn.selected');
    if (!selectedBtn) {
      // Auto-mark as "Có mặt" if no selection
      const presentBtn = row.querySelector('.att-btn.present');
      if (presentBtn) {
        presentBtn.click();
        count++;
      }
    }
  });

  if (count > 0) {
    showToast(`✅ Đã điểm danh ${count} học viên (mặc định: Có mặt)`);
  } else {
    showToast(`✅ Tất cả đã được điểm danh rồi!`);
  }

  // Update history
  if (currentClassId) renderAttendanceHistory(currentClassId);
}

function renderAttendanceHistory(maLop) {
  const container = document.getElementById('attendanceHistory');
  const classDD = getAttendanceForClass(maLop);

  if (classDD.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Chưa có dữ liệu điểm danh</p>';
    return;
  }

  // Group by date
  const byDate = {};
  classDD.forEach(dd => {
    const ngay = dd['Ngày'] || dd['Ngay'] || 'Không rõ';
    if (!byDate[ngay]) byDate[ngay] = [];
    byDate[ngay].push(dd);
  });

  // Sort dates descending
  const sortedDates = Object.keys(byDate).sort().reverse().slice(0, 7);

  container.innerHTML = sortedDates.map(date => {
    const entries = byDate[date];
    const chips = entries.map(dd => {
      const maHV = dd['Mã HV'] || dd['Ma HV'] || '';
      const name = getStudentNameByMaHV(maHV);
      const status = dd['Trạng thái'] || dd['Trang thai'] || '';
      const cls = status.includes('mặt') || status.includes('mat') ? 'present' :
                  status.includes('Trễ') || status.includes('tre') ? 'late' : 'absent';
      const emoji = cls === 'present' ? '✓' : cls === 'late' ? '⏰' : '✗';
      return `<span class="history-chip ${cls}">${emoji} ${escapeHtml(name || maHV)}</span>`;
    }).join('');

    return `
      <div class="history-day">
        <div class="history-date">📅 ${formatDateVN(date)}</div>
        <div class="history-entries">${chips}</div>
      </div>`;
  }).join('');
}

// ===== RENDER: PAYMENT TAB =====
function renderPaymentTab(enrollments) {
  const summary = document.getElementById('paymentSummary');
  const list = document.getElementById('paymentList');

  if (enrollments.length === 0) {
    summary.innerHTML = '';
    list.innerHTML = `<div class="empty-state"><span>💰</span><p>Không có dữ liệu học phí</p></div>`;
    return;
  }

  const totalAmount = enrollments.reduce((s, hp) => s + parseNum(hp['Tổng tiền'] || hp['Tong tien']), 0);
  const totalPaid = enrollments.reduce((s, hp) => s + parseNum(hp['Đã đóng'] || hp['Da dong']), 0);
  const totalDebt = enrollments.reduce((s, hp) => s + parseNum(hp['Còn nợ'] || hp['Con no']), 0);

  summary.innerHTML = `
    <div class="pay-stat">
      <div class="pay-stat-value" style="color:var(--teal)">${formatVND(totalAmount)}</div>
      <div class="pay-stat-label">Tổng học phí</div>
    </div>
    <div class="pay-stat">
      <div class="pay-stat-value" style="color:var(--green)">${formatVND(totalPaid)}</div>
      <div class="pay-stat-label">Đã thu</div>
    </div>
    <div class="pay-stat">
      <div class="pay-stat-value" style="color:${totalDebt > 0 ? 'var(--red)' : 'var(--green)'}">${totalDebt > 0 ? formatVND(totalDebt) : '✓ Đủ'}</div>
      <div class="pay-stat-label">Còn nợ</div>
    </div>`;

  list.innerHTML = enrollments.map(hp => {
    const maHV = hp['Mã HV'] || hp['Ma HV'] || '';
    const name = getStudentNameByMaHV(maHV);
    const phone = getStudentPhoneByMaHV(maHV);
    const total = parseNum(hp['Tổng tiền'] || hp['Tong tien']);
    const paid = parseNum(hp['Đã đóng'] || hp['Da dong']);
    const debt = parseNum(hp['Còn nợ'] || hp['Con no']);
    const dueDate = hp['Ngày đến hạn tiếp theo'] || hp['Ngay den han tiep theo'] || '';
    const payType = hp['Loại thanh toán'] || hp['Loai thanh toan'] || '';

    return `
      <div class="payment-row">
        <div class="student-info">
          <div class="student-name">${escapeHtml(name || maHV)}</div>
          <div class="student-phone">${escapeHtml(phone)} ${payType ? '• ' + escapeHtml(payType) : ''}</div>
        </div>
        <div class="pay-amounts">
          <div class="pay-col">
            <span class="pay-col-value" style="color:var(--text-primary)">${formatVND(total)}</span>
            <span class="pay-col-label">Tổng</span>
          </div>
          <div class="pay-col">
            <span class="pay-col-value" style="color:var(--green)">${formatVND(paid)}</span>
            <span class="pay-col-label">Đã đóng</span>
          </div>
          <div class="pay-col">
            <span class="pay-col-value" style="color:${debt > 0 ? 'var(--red)' : 'var(--green)'}">${debt > 0 ? formatVND(debt) : '✓'}</span>
            <span class="pay-col-label">${debt > 0 ? 'Còn nợ' : 'Đủ'}</span>
          </div>
        </div>
        ${debt > 0 ? `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          ${dueDate ? `<div style="font-size:0.72rem;color:var(--orange);white-space:nowrap;">Hạn: ${formatDateVN(dueDate)}</div>` : '<div></div>'}
          <button class="btn-primary" style="padding:4px 10px; font-size:0.75rem;" onclick="openPaymentModal('${hp['Mã ĐK'] || hp['Ma DK'] || ''}', '${maHV}', ${debt})">💳 Thu tiền</button>
        </div>` : ''}
      </div>`;
  }).join('');
}

// ===== RENDER: ALL STUDENTS =====
function renderAllStudents() {
  const tbody = document.getElementById('allStudentsBody');

  if (data.hocVien.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px;">Chưa có dữ liệu học viên</td></tr>`;
    return;
  }

  tbody.innerHTML = data.hocVien.map(hv => {
    const maHV = hv['Mã HV'] || hv['Ma HV'] || '';
    const name = hv['Họ Tên'] || hv['Ho Ten'] || hv['Họ tên'] || '';
    const phone = hv['SĐT'] || hv['SDT'] || '';
    const phanLoai = hv['Phân loại'] || hv['Phan loai'] || '';

    // Find classes for this student
    const classes = data.hocPhi
      .filter(hp => (hp['Mã HV'] || hp['Ma HV']) === maHV)
      .map(hp => hp['Mã Lớp'] || hp['Ma Lop'] || '')
      .filter(Boolean);

    const totalDebt = data.hocPhi
      .filter(hp => (hp['Mã HV'] || hp['Ma HV']) === maHV)
      .reduce((s, hp) => s + parseNum(hp['Còn nợ'] || hp['Con no']), 0);

    return `
      <tr data-search="${escapeHtml((name + ' ' + phone + ' ' + maHV).toLowerCase())}" style="cursor:pointer;" onclick="openStudentProfileModal('${escapeHtml(maHV)}')">
        <td style="color:var(--text-muted);font-size:0.82rem;">${escapeHtml(maHV)}</td>
        <td style="color:var(--teal);"><strong>${escapeHtml(name)}</strong></td>
        <td>${phone ? `<a href="tel:${phone}" style="color:var(--teal);text-decoration:none;">${escapeHtml(phone)}</a>` : '—'}</td>
        <td><span style="font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(phanLoai)}</span></td>
        <td>${classes.length > 0 ? classes.map(c => `<span style="background:var(--teal-soft);color:var(--teal);padding:2px 8px;border-radius:4px;font-size:0.75rem;margin-right:4px;">${escapeHtml(c)}</span>`).join('') : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td style="color:${totalDebt > 0 ? 'var(--red)' : 'var(--green)'}; font-weight:600;">
          ${totalDebt > 0 ? formatVND(totalDebt) : '✓'}
        </td>
      </tr>`;
  }).join('');
}

function filterStudents() {
  const search = (document.getElementById('searchStudents').value || '').toLowerCase();
  document.querySelectorAll('#allStudentsBody tr').forEach(row => {
    const text = row.dataset.search || '';
    row.style.display = !search || text.includes(search) ? '' : 'none';
  });
}

// ===== RENDER: QUICK ATTENDANCE / HOME =====
function renderQuickAttendance() {
  updateQAToday();
  const container = document.getElementById('qaClassList');
  const homeStats = document.getElementById('homeStatCards');

  // Generate Home Stats
  const activeClassesCount = data.lopHoc.filter(lop => {
    const status = (lop['Trạng thái'] || lop['Trang thai'] || '').toLowerCase();
    return !status.includes('kết thúc') && !status.includes('ket thuc') && !status.includes('xong');
  }).length;
  
  const debtStudents = data.hocPhi.filter(hp => parseNum(hp['Còn nợ'] || hp['Con no']) > 0).length;
  const totalDebtAmount = data.hocPhi.reduce((s, hp) => s + parseNum(hp['Còn nợ'] || hp['Con no']), 0);

  if (homeStats) {
    homeStats.innerHTML = `
      <div class="stat-card teal">
        <div class="stat-value">${activeClassesCount}</div>
        <div class="stat-label">Lớp đang mở</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value">${data.hocVien.length}</div>
        <div class="stat-label">Tổng học viên</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-value">${debtStudents}</div>
        <div class="stat-label">HV nợ học phí</div>
      </div>
      <div class="stat-card red">
        <div class="stat-value">${formatVND(totalDebtAmount)}</div>
        <div class="stat-label">Tổng số tiền nợ</div>
      </div>
    `;
  }

  if (data.lopHoc.length === 0) {
    container.innerHTML = `<div class="empty-state"><span>📚</span><p>Chưa có lớp nào</p></div>`;
    return;
  }

  // Only show active classes
  const activeClasses = data.lopHoc.filter(lop => {
    const status = (lop['Trạng thái'] || lop['Trang thai'] || '').toLowerCase();
    return !status.includes('kết thúc') && !status.includes('ket thuc') && !status.includes('xong');
  });

  container.innerHTML = activeClasses.map(lop => {
    const maLop = lop['Mã Lớp'] || lop['Ma Lop'] || '';
    const maKH = lop['Mã KH'] || lop['Ma KH'] || '';
    const courseName = getCourseNameByMaKH(maKH);
    const students = getStudentsInClass(maLop);

    // Check if already have attendance today
    const todayStr = getTodayStr();
    const todayDD = data.diemDanh.filter(dd => {
      const ddMaLop = dd['Mã Lớp'] || dd['Ma Lop'] || '';
      const ddNgay = dd['Ngày'] || dd['Ngay'] || '';
      return ddMaLop === maLop && ddNgay.includes(todayStr);
    });

    const attendedToday = todayDD.length > 0;

    const displayName = getClassDisplayName(lop);

    return `
      <button class="qa-class-btn" onclick="openClassAndGoAttendance('${escapeHtml(maLop)}')" style="${attendedToday ? 'border-left: 3px solid var(--green);' : ''}">
        <div>
          <strong>${escapeHtml(displayName)}</strong>
          <span style="color:var(--text-muted);margin-left:8px;font-size:0.8rem;">${escapeHtml(maLop)}</span>
        </div>
        <div>
          <span class="qa-class-students">${students.length} HV</span>
          ${attendedToday ? '<span style="color:var(--green);margin-left:8px;font-size:0.8rem;">✅ Đã ĐD</span>' : '<span style="color:var(--orange);margin-left:8px;font-size:0.8rem;">📋 Chưa ĐD</span>'}
        </div>
      </button>`;
  }).join('');
}

function openClassAndGoAttendance(maLop) {
  openClassDetail(maLop);
  // Switch to attendance tab
  setTimeout(() => {
    const attTab = document.querySelector('.tab-btn[data-tab="tabAttendance"]');
    if (attTab) attTab.click();
  }, 100);
}

// ===== RENDER: PAYMENT DASHBOARD =====
function renderPaymentDashboard() {
  const statCards = document.getElementById('paymentStatCards');
  const debtList = document.getElementById('debtList');

  const totalStudents = data.hocPhi.length;
  const totalAmount = data.hocPhi.reduce((s, hp) => s + parseNum(hp['Tổng tiền'] || hp['Tong tien']), 0);
  const totalPaid = data.hocPhi.reduce((s, hp) => s + parseNum(hp['Đã đóng'] || hp['Da dong']), 0);
  const totalDebt = data.hocPhi.reduce((s, hp) => s + parseNum(hp['Còn nợ'] || hp['Con no']), 0);
  const debtStudents = data.hocPhi.filter(hp => parseNum(hp['Còn nợ'] || hp['Con no']) > 0);

  statCards.innerHTML = `
    <div class="stat-card teal">
      <div class="stat-value">${formatVND(totalAmount)}</div>
      <div class="stat-label">Tổng học phí</div>
    </div>
    <div class="stat-card green">
      <div class="stat-value">${formatVND(totalPaid)}</div>
      <div class="stat-label">Đã thu</div>
    </div>
    <div class="stat-card red">
      <div class="stat-value">${formatVND(totalDebt)}</div>
      <div class="stat-label">Còn nợ</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-value">${debtStudents.length}/${totalStudents}</div>
      <div class="stat-label">HV còn nợ</div>
    </div>`;

  if (debtStudents.length === 0) {
    debtList.innerHTML = `<div class="empty-state"><span>🎉</span><p>Tất cả học viên đã đóng đủ!</p></div>`;
    return;
  }

  // Sort by debt amount descending
  const sorted = [...debtStudents].sort((a, b) => parseNum(b['Còn nợ'] || b['Con no']) - parseNum(a['Còn nợ'] || a['Con no']));

  debtList.innerHTML = sorted.map(hp => {
    const maHV = hp['Mã HV'] || hp['Ma HV'] || '';
    const maLop = hp['Mã Lớp'] || hp['Ma Lop'] || '';
    const name = getStudentNameByMaHV(maHV);
    const phone = getStudentPhoneByMaHV(maHV);
    const debt = parseNum(hp['Còn nợ'] || hp['Con no']);
    const dueDate = hp['Ngày đến hạn tiếp theo'] || hp['Ngay den han tiep theo'] || '';
    const phoneClean = String(phone).replace(/[^\d]/g, '');

    return `
      <div class="debt-row">
        <div class="student-info">
          <div class="student-name">${escapeHtml(name || maHV)}</div>
          <div class="student-phone">${escapeHtml(phone)} • Lớp: ${escapeHtml(getClassDisplayNameByMaLop(maLop))}</div>
        </div>
        <div style="text-align:right;">
          <div class="debt-amount">${formatVND(debt)}</div>
          ${dueDate ? `<div class="debt-due">Hạn: ${formatDateVN(dueDate)}</div>` : ''}
        </div>
        <div style="display:flex; flex-direction:column; gap:4px; margin-left:8px;">
          ${phone ? `<a class="btn-zalo" style="margin:0;" href="https://zalo.me/${phoneClean}" target="_blank">💬 Nhắn</a>` : ''}
          <button class="btn-primary" style="padding:4px 8px; font-size:0.7rem; margin:0;" onclick="openPaymentModal('${hp['Mã ĐK'] || hp['Ma DK'] || ''}', '${maHV}', ${debt})">💳 Thu tiền</button>
        </div>
      </div>`;
  }).join('');
}

// ===== ADD STUDENT TO CLASS =====
function openAddStudentModal() {
  if (!currentClassId) return;
  document.getElementById('modalClassName').textContent = currentClassId;
  document.getElementById('modalAddStudent').classList.add('open');
  document.getElementById('searchExistingStudent').value = '';
  document.getElementById('existingStudentResults').innerHTML = '<p class="modal-hint">Gõ để tìm học viên trong hệ thống</p>';
  // Reset new form
  document.getElementById('newStudentName').value = '';
  document.getElementById('newStudentPhone').value = '';
  document.getElementById('newStudentType').value = '';
  document.getElementById('newStudentFee').value = '';
  // Reset trial toggle to checked (default = trial)
  document.getElementById('trialCheckbox').checked = true;
  toggleTrialMode();
  // Focus search
  switchAddMode('existing');
  setTimeout(() => document.getElementById('searchExistingStudent').focus(), 200);
}

function closeAddStudentModal() {
  document.getElementById('modalAddStudent').classList.remove('open');
}

function closeModalOnOverlay(e) {
  if (e.target === e.currentTarget) closeAddStudentModal();
}

function switchAddMode(mode) {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');
  document.getElementById('modeExisting').style.display = mode === 'existing' ? 'block' : 'none';
  document.getElementById('modeNew').style.display = mode === 'new' ? 'block' : 'none';
  if (mode === 'existing') {
    setTimeout(() => document.getElementById('searchExistingStudent').focus(), 100);
  } else {
    setTimeout(() => document.getElementById('newStudentName').focus(), 100);
  }
}

function searchExistingStudents() {
  const query = (document.getElementById('searchExistingStudent').value || '').toLowerCase().trim();
  const container = document.getElementById('existingStudentResults');

  if (query.length < 2) {
    container.innerHTML = '<p class="modal-hint">Gõ ít nhất 2 ký tự để tìm</p>';
    return;
  }

  // Search in HocVien
  const matches = data.hocVien.filter(hv => {
    const name = (hv['Họ Tên'] || hv['Ho Ten'] || hv['Họ tên'] || '').toLowerCase();
    const phone = (hv['SĐT'] || hv['SDT'] || '').replace(/[^\d]/g, '');
    const maHV = (hv['Mã HV'] || hv['Ma HV'] || '').toLowerCase();
    return name.includes(query) || phone.includes(query) || maHV.includes(query);
  });

  if (matches.length === 0) {
    container.innerHTML = `
      <p class="modal-hint">Không tìm thấy "${escapeHtml(query)}"</p>
      <p class="modal-hint" style="padding-top:0;">
        <button class="btn-primary" style="font-size:0.82rem;padding:8px 16px;" onclick="switchAddMode('new')">🆕 Tạo học viên mới</button>
      </p>`;
    return;
  }

  // Check which are already in this class
  const classEnrollments = getStudentsInClass(currentClassId);
  const enrolledMaHVs = new Set(classEnrollments.map(hp => hp['Mã HV'] || hp['Ma HV'] || ''));

  container.innerHTML = matches.slice(0, 10).map(hv => {
    const maHV = hv['Mã HV'] || hv['Ma HV'] || '';
    const name = hv['Họ Tên'] || hv['Ho Ten'] || hv['Họ tên'] || '';
    const phone = hv['SĐT'] || hv['SDT'] || '';
    const phanLoai = hv['Phân loại'] || hv['Phan loai'] || '';
    const isAlready = enrolledMaHVs.has(maHV);

    return `
      <div class="modal-result-item ${isAlready ? '' : ''}" onclick="${isAlready ? '' : `addExistingStudentToClass('${escapeHtml(maHV)}')`}" style="${isAlready ? 'opacity:0.5;cursor:not-allowed;' : ''}">
        <div class="student-info">
          <div class="student-name">${escapeHtml(name)}</div>
          <div class="student-phone">📱 ${escapeHtml(phone)} ${phanLoai ? '• ' + escapeHtml(phanLoai) : ''}</div>
        </div>
        <span class="modal-result-badge ${isAlready ? 'already' : 'available'}">
          ${isAlready ? '⚠️ Đã trong lớp' : '✓ Chọn'}
        </span>
      </div>`;
  }).join('');
}

function addExistingStudentToClass(maHV) {
  if (!currentClassId || !maHV) return;

  // Check duplicate
  const existing = data.hocPhi.find(hp => {
    const hpMaLop = hp['Mã Lớp'] || hp['Ma Lop'] || '';
    const hpMaHV = hp['Mã HV'] || hp['Ma HV'] || '';
    return hpMaLop === currentClassId && hpMaHV === maHV;
  });

  if (existing) {
    showToast('⚠️ Học viên này đã ở trong lớp rồi!', 'error');
    return;
  }

  // Create new HocPhi entry
  const newMaDK = 'DK' + String(data.hocPhi.length + 1).padStart(4, '0');
  const newEnrollment = {
    'Mã ĐK': newMaDK,
    'Mã HV': maHV,
    'Mã Lớp': currentClassId,
    'Loại thanh toán': '',
    'Tổng tiền': '0',
    'Đã đóng': '0',
    'Còn nợ': '0',
    'Ngày đến hạn tiếp theo': '',
  };

  data.hocPhi.push(newEnrollment);

  const name = getStudentNameByMaHV(maHV);
  closeAddStudentModal();
  openClassDetail(currentClassId);
  showConfirmation(`✅ Đã thêm "${name}" vào lớp ${currentClassId}`);
  showToast(`✅ ${name} → ${currentClassId}`);

  // Sync enrollment to Google Sheet
  syncToSheet({
    action: 'addEnrollment',
    maDK: newMaDK,
    maHV: maHV,
    maLop: currentClassId,
    tongTien: 0,
    daDong: 0,
    conNo: 0,
  });
}

function addNewStudentToClass() {
  const name = document.getElementById('newStudentName').value.trim();
  const phone = document.getElementById('newStudentPhone').value.trim();
  const phanLoai = document.getElementById('newStudentType').value;
  const isTrial = document.getElementById('trialCheckbox').checked;
  const fee = isTrial ? 0 : parseMoney(document.getElementById('newStudentFee').value);

  if (!name) {
    showToast('⚠️ Vui lòng nhập họ tên!', 'error');
    document.getElementById('newStudentName').focus();
    return;
  }

  if (!phone) {
    showToast('⚠️ Vui lòng nhập SĐT!', 'error');
    document.getElementById('newStudentPhone').focus();
    return;
  }

  // Create new HocVien
  const newMaHV = 'HV' + String(data.hocVien.length + 1).padStart(4, '0');
  const newStudent = {
    'Mã HV': newMaHV,
    'Họ Tên': name,
    'SĐT': phone,
    'Phân loại': phanLoai,
    'CCCD': '',
    'Email': '',
  };
  data.hocVien.push(newStudent);

  // Create new HocPhi entry
  const newMaDK = 'DK' + String(data.hocPhi.length + 1).padStart(4, '0');
  const newEnrollment = {
    'Mã ĐK': newMaDK,
    'Mã HV': newMaHV,
    'Mã Lớp': currentClassId,
    'Loại thanh toán': '',
    'Tổng tiền': String(fee),
    'Đã đóng': '0',
    'Còn nợ': String(fee),
    'Trạng thái HV': isTrial ? 'Học thử' : 'Chính thức',
    'Ngày đến hạn tiếp theo': '',
  };
  data.hocPhi.push(newEnrollment);

  // Update badges
  document.getElementById('badgeStudents').textContent = data.hocVien.length;

  const statusLabel = isTrial ? '📝 Học thử' : '✅ Chính thức';
  closeAddStudentModal();
  openClassDetail(currentClassId);
  showConfirmation(`${statusLabel} — Đã thêm "${name}" vào lớp ${currentClassId}`);
  showToast(`${statusLabel} ${name} → ${currentClassId}`);

  // Sync student + enrollment to Google Sheet
  syncToSheet({
    action: 'addStudent',
    maHV: newMaHV,
    hoTen: name,
    sdt: phone,
    phanLoai: phanLoai,
  });
  syncToSheet({
    action: 'addEnrollment',
    maDK: newMaDK,
    maHV: newMaHV,
    maLop: currentClassId,
    tongTien: fee,
    daDong: 0,
    conNo: fee,
  });
}

function toggleTrialMode() {
  const isTrialChecked = document.getElementById('trialCheckbox').checked;
  const feeRow = document.getElementById('feeRow');
  const toggleRow = document.querySelector('.trial-toggle-row');
  const hint = document.getElementById('trialHint');
  const label = document.querySelector('.trial-label');

  if (isTrialChecked) {
    feeRow.style.display = 'none';
    toggleRow.classList.remove('official');
    hint.textContent = 'Không cần nhập học phí';
    label.textContent = '📝 Học thử';
  } else {
    feeRow.style.display = 'flex';
    toggleRow.classList.add('official');
    hint.textContent = 'Nhập học phí bên dưới';
    label.textContent = '🎓 Chính thức';
  }
}

function convertToOfficial(maDK, maHV) {
  // Find the enrollment
  const hp = data.hocPhi.find(h => {
    const hMaDK = h['Mã ĐK'] || h['Ma DK'] || '';
    const hMaHV = h['Mã HV'] || h['Ma HV'] || '';
    const hMaLop = h['Mã Lớp'] || h['Ma Lop'] || '';
    return (hMaDK === maDK || hMaHV === maHV) && hMaLop === currentClassId;
  });

  if (!hp) {
    showToast('⚠️ Không tìm thấy đăng ký!', 'error');
    return;
  }

  // Update status
  hp['Trạng thái HV'] = 'Chính thức';

  const name = getStudentNameByMaHV(maHV);
  openClassDetail(currentClassId);
  showConfirmation(`🎓 "${name}" đã chuyển thành Chính thức!`);
  showToast(`🎓 ${name}: Học thử → Chính thức`);

  // Sync status change to Google Sheet
  syncToSheet({
    action: 'updateEnrollmentStatus',
    maHV: maHV,
    maLop: currentClassId,
    trangThai: 'Chính thức',
  });
}

// ===== EDIT STUDENT =====
function openEditStudentModal(maHV) {
  const hv = data.hocVien.find(h => (h['Mã HV'] || h['Ma HV']) === maHV);
  if (!hv) return;
  
  document.getElementById('editStuMaHV').value = maHV;
  document.getElementById('editStuName').value = hv['Họ Tên'] || hv['Ho Ten'] || hv['Họ tên'] || '';
  document.getElementById('editStuPhone').value = hv['SĐT'] || hv['SDT'] || '';
  
  document.getElementById('modalEditStudent').classList.add('open');
}

function closeEditStudentModal() {
  document.getElementById('modalEditStudent').classList.remove('open');
}

function submitEditStudent() {
  const maHV = document.getElementById('editStuMaHV').value;
  const name = document.getElementById('editStuName').value.trim();
  const phone = document.getElementById('editStuPhone').value.trim();

  if (!name || !phone) {
    showToast('⚠️ Vui lòng nhập đủ thông tin!', 'error');
    return;
  }

  const hv = data.hocVien.find(h => (h['Mã HV'] || h['Ma HV']) === maHV);
  if (hv) {
    if ('Họ Tên' in hv) hv['Họ Tên'] = name;
    if ('Ho Ten' in hv) hv['Ho Ten'] = name;
    if ('Họ tên' in hv) hv['Họ tên'] = name;
    
    if ('SĐT' in hv) hv['SĐT'] = phone;
    if ('SDT' in hv) hv['SDT'] = phone;
  }

  closeEditStudentModal();
  showToast(`✅ Đã cập nhật TT học viên`);
  
  // Refresh current view
  if (document.getElementById('viewClassDetail').classList.contains('active')) {
    openClassDetail(currentClassId);
  } else if (document.getElementById('viewStudents').classList.contains('active')) {
    renderAllStudents();
  }

  // Sync to Google Sheet
  syncToSheet({
    action: 'editStudent',
    maHV: maHV,
    hoTen: name,
    sdt: phone
  });
}

// ===== REMOVE STUDENT =====
function confirmRemoveStudent(maDK, maHV) {
  const name = getStudentNameByMaHV(maHV);
  if (confirm(`Bạn có chắc chắn muốn xóa học viên "${name}" khỏi lớp ${currentClassId} không?\n\nHành động này sẽ xóa dữ liệu học phí của học viên tại lớp này.`)) {
    // Xóa trong local data (bảng hocPhi)
    const idx = data.hocPhi.findIndex(h => {
      const hMaDK = h['Mã ĐK'] || h['Ma DK'] || '';
      const hMaHV = h['Mã HV'] || h['Ma HV'] || '';
      const hMaLop = h['Mã Lớp'] || h['Ma Lop'] || '';
      return (hMaDK === maDK || hMaHV === maHV) && hMaLop === currentClassId;
    });

    if (idx !== -1) {
      data.hocPhi.splice(idx, 1);
      
      showToast(`🗑️ Đã xóa ${name} khỏi lớp`);
      openClassDetail(currentClassId);

      // Sync to Google Sheet
      syncToSheet({
        action: 'removeEnrollment',
        maDK: maDK,
        maHV: maHV,
        maLop: currentClassId
      });
    }
  }
}

function parseMoney(str) {
  if (!str) return 0;
  return parseInt(String(str).replace(/[^\d]/g, '')) || 0;
}

function formatMoneyInput(input) {
  let val = input.value.replace(/[^\d]/g, '');
  if (val) {
    input.value = new Intl.NumberFormat('vi-VN').format(val);
  } else {
    input.value = '';
  }
}

// ===== RECORD PAYMENT =====
function openPaymentModal(maDK, maHV, currentDebt) {
  const name = getStudentNameByMaHV(maHV);
  document.getElementById('payStudentName').textContent = name;
  document.getElementById('payDebtAmount').textContent = formatVND(currentDebt);
  document.getElementById('payMaDK').value = maDK;
  document.getElementById('payMaHV').value = maHV;
  document.getElementById('payAmount').value = '';
  document.getElementById('payMethod').value = 'Chuyển khoản';
  
  document.getElementById('modalPayment').classList.add('open');
}

function closePaymentModal() {
  document.getElementById('modalPayment').classList.remove('open');
}

function submitPayment() {
  const maDK = document.getElementById('payMaDK').value;
  const maHV = document.getElementById('payMaHV').value;
  const amountStr = document.getElementById('payAmount').value;
  const payMethod = document.getElementById('payMethod').value;
  const amount = parseMoney(amountStr);

  if (!amount || amount <= 0) {
    showToast('⚠️ Vui lòng nhập số tiền hợp lệ!', 'error');
    return;
  }

  // Find the enrollment
  const hp = data.hocPhi.find(h => {
    const hMaDK = h['Mã ĐK'] || h['Ma DK'] || '';
    const hMaHV = h['Mã HV'] || h['Ma HV'] || '';
    return hMaDK === maDK || hMaHV === maHV;
  });

  if (!hp) {
    showToast('⚠️ Không tìm thấy bảng kê học phí!', 'error');
    return;
  }

  // Update local data
  const currentPaid = parseNum(hp['Đã đóng'] || hp['Da dong']);
  const currentDebt = parseNum(hp['Còn nợ'] || hp['Con no']);
  
  hp['Đã đóng'] = String(currentPaid + amount);
  const newDebt = Math.max(0, currentDebt - amount);
  hp['Còn nợ'] = String(newDebt);

  closePaymentModal();
  
  const name = getStudentNameByMaHV(maHV);
  showConfirmation(`💰 Đã thu ${formatVND(amount)} từ "${name}"`);
  showToast(`✅ Đã thu ${formatVND(amount)}`);

  // Refresh current view
  if (document.getElementById('viewClassDetail').classList.contains('active')) {
    openClassDetail(currentClassId);
  } else if (document.getElementById('viewPayments').classList.contains('active')) {
    renderPaymentDashboard();
  } else {
    // If we're on global students view, we just leave it or refresh
    renderAllStudents();
  }

  // Sync to Google Sheet
  syncToSheet({
    action: 'recordPayment',
    maDK: maDK,
    maHV: maHV,
    soTienThu: amount,
    hinhThuc: payMethod
  });
}

// ===== RENDER LEADS =====
function renderLeadsList() {
  const container = document.getElementById('leadsGrid');
  if (!container) return; // if section isn't loaded

  let leads = data.choHoc || [];
  
  const statusFilter = document.getElementById('filterLeadStatus').value;
  const searchFilter = (document.getElementById('searchLeads').value || '').toLowerCase();

  const filtered = leads.filter(l => {
    const status = l['Trạng thái'] || l['Trang thai'] || '';
    if (statusFilter && status !== statusFilter) return false;
    
    const name = (l['Họ Tên'] || '').toLowerCase();
    const phone = (l['SĐT'] || '').toLowerCase();
    if (searchFilter && !name.includes(searchFilter) && !phone.includes(searchFilter)) return false;
    
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><span>🤝</span><p>Không có khách hàng nào</p></div>`;
    return;
  }

  container.innerHTML = filtered.map((l, i) => {
    const name = l['Họ Tên'] || '';
    const phone = l['SĐT'] || '';
    const phoneClean = String(phone).replace(/[^\d]/g, '');
    const need = l['Nhu cầu'] || '';
    const status = l['Trạng thái'] || '';
    const source = l['Phân loại'] || '';

    // Reverse finding index. The index needed by Code.gs is relative to the sheet row.
    // However, Code.gs will search by phone number instead.

    let statusStyle = 'var(--bg-card)';
    let statusText = status;
    if (status === 'Đang chăm sóc') {
      statusStyle = 'var(--orange)';
      statusText = '⏳ Đang chăm sóc';
    } else if (status === 'Đã chốt') {
      statusStyle = 'var(--green)';
      statusText = '✅ Đã chốt';
    } else if (status === 'Hủy') {
      statusStyle = 'var(--red)';
      statusText = '❌ Hủy';
    }

    return `
      <div class="class-card" style="border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div class="class-card-header" style="background: rgba(255,255,255,0.03); border-bottom: 1px solid var(--border);">
          <div class="class-title" style="flex:1;">
            <h3 style="color: var(--text-primary); font-weight: 600;">${escapeHtml(name)}</h3>
            <span style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(source)}</span>
          </div>
          <span style="background:${statusStyle}; color:white; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">${escapeHtml(statusText)}</span>
        </div>
        <div class="class-card-body" style="padding:14px; font-size:0.95rem; color: var(--text-primary);">
          <div style="margin-bottom:10px;">
            <span style="color:var(--text-muted); font-size: 0.85rem;">SĐT:</span> 
            ${phone ? `<a href="tel:${phoneClean}" style="font-weight: 500; font-size: 1rem;">${escapeHtml(phone)}</a>` : '—'}
          </div>
          <div style="line-height:1.5;">
            <span style="color:var(--text-muted); font-size: 0.85rem; display:block; margin-bottom:2px;">Nhu cầu:</span> 
            <span style="font-weight: 500;">${escapeHtml(need) || 'Chưa ghi chú'}</span>
          </div>
        </div>
        <div class="class-card-footer" style="padding:12px; display:flex; gap:8px;">
          ${phone ? `<a class="btn-zalo" style="flex:1; text-align:center;" href="https://zalo.me/${phoneClean}" target="_blank">💬 Nhắn</a>` : '<div style="flex:1;"></div>'}
          
          ${status === 'Đang chăm sóc' ? `
            <button class="btn-primary" style="flex:1;" onclick="convertLead('${phoneClean}')">✅ Chốt</button>
            <button class="btn-cancel" style="padding: 0 10px;" onclick="cancelLead('${phoneClean}')">❌ Hủy</button>
          ` : '<div style="flex:1;"></div>'}
        </div>
      </div>
    `;
  }).join('');
}

// ===== ADD LEAD MODAL =====
function openAddLeadModal() {
  document.getElementById('newLeadName').value = '';
  document.getElementById('newLeadPhone').value = '';
  document.getElementById('newLeadCCCD').value = '';
  document.getElementById('newLeadEmail').value = '';
  document.getElementById('newLeadNeed').value = '';
  document.getElementById('newLeadSource').value = 'Facebook';
  document.getElementById('modalAddLead').classList.add('open');
}

function closeAddLeadModal() {
  document.getElementById('modalAddLead').classList.remove('open');
}

function submitAddLead() {
  const name = document.getElementById('newLeadName').value.trim();
  const phone = document.getElementById('newLeadPhone').value.trim();
  const cccd = document.getElementById('newLeadCCCD').value.trim();
  const email = document.getElementById('newLeadEmail').value.trim();
  const need = document.getElementById('newLeadNeed').value.trim();
  const source = document.getElementById('newLeadSource').value;

  if (!name || !phone) {
    showToast('⚠️ Vui lòng nhập Tên và SĐT!', 'error');
    return;
  }

  // Generate random Ma Khach for front-end tracking (optional)
  const maKhach = 'KH' + Date.now().toString().slice(-6);

  data.choHoc.push({
    'Mã Khách': maKhach,
    'Họ Tên': name,
    'SĐT': phone,
    'Nhu cầu': need,
    'Phân loại': source,
    'Ngày muốn học': getTodayStr(),
    'Trạng thái': 'Đang chăm sóc',
    'CCCD': cccd,
    'Email': email
  });

  closeAddLeadModal();
  showToast(`✅ Đã thêm khách: ${name}`);
  renderLeadsList();

  syncToSheet({
    action: 'addLead',
    maKhach: maKhach,
    hoTen: name,
    sdt: phone,
    nhuCau: need,
    phanLoai: source,
    ngayMuonHoc: getTodayStr(),
    cccd: cccd,
    email: email
  });
}

// ===== CONVERT / CANCEL LEAD =====
function convertLead(phone) {
  if (confirm('Bạn có chắc chắn khách hàng này ĐÃ CHỐT HỌC và muốn tạo Hồ sơ Học Viên mới?')) {
    updateLeadLocalState(phone, 'Đã chốt');
  }
}

function cancelLead(phone) {
  if (confirm('Bạn có chắc chắn muốn HỦY tư vấn khách này không?')) {
    updateLeadLocalState(phone, 'Hủy');
  }
}

function updateLeadLocalState(phone, newStatus) {
  const leadParam = phone.toString().replace(/[^\d]/g, '');
  const idx = data.choHoc.findIndex(l => String(l['SĐT']).replace(/[^\d]/g, '') === leadParam);
  if (idx !== -1) {
    data.choHoc[idx]['Trạng thái'] = newStatus;
    
    if (newStatus === 'Đã chốt') {
      showToast(`🎉 Xin chúc mừng! Đã chốt thành công.`);
    } else {
      showToast(`❌ Đã chuyển khách sang trạng thái Hủy.`);
    }
    
    renderLeadsList();

    // Trigger sync
    syncToSheet({
      action: 'updateLeadStatus',
      sdt: leadParam,
      status: newStatus
    }).then(res => {
       if (res && res.success && newStatus === 'Đã chốt') {
         // Auto-refresh after 2 seconds to get the new Student & Registration generated by backend
         setTimeout(() => { showToast('🔄 Đang tải dữ liệu Mới nhất từ Máy chủ...'); refreshData(); }, 2000);
       }
    });
  }
}

// ===== ADD CLASS MODAL =====
function openAddClassModal() {
  document.getElementById('newClassId').value = '';
  document.getElementById('newClassTeacher').value = '';
  document.getElementById('newClassDate').value = getTodayStr().split('/').reverse().join('-');
  
  const courseSelect = document.getElementById('newClassCourseId');
  courseSelect.innerHTML = (data.khoaHoc || []).map(kh => {
    const ma = kh['Mã KH'] || kh['Ma KH'];
    const ten = kh['Tên Khóa Học'] || kh['Ten Khoa Hoc'] || ma;
    return `<option value="${escapeHtml(ma)}">${escapeHtml(ma)} - ${escapeHtml(ten)}</option>`;
  }).join('');
  
  document.getElementById('modalAddClass').classList.add('open');
}

function closeAddClassModal() {
  document.getElementById('modalAddClass').classList.remove('open');
}

function submitAddClass() {
  const maLop = document.getElementById('newClassId').value.trim();
  const maKH = document.getElementById('newClassCourseId').value;
  const gv = document.getElementById('newClassTeacher').value.trim();
  const dateStr = document.getElementById('newClassDate').value;

  if (!maLop) {
    showToast('⚠️ Vui lòng nhập Mã Lớp', 'error');
    return;
  }

  // format yyyy-mm-dd to dd/mm/yyyy
  let formattedDate = getTodayStr();
  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  // Optimistic update
  data.lopHoc.push({
    'Mã Lớp': maLop,
    'Tên Lớp': maLop,
    'Giáo Viên': gv,
    'Mã KH': maKH,
    'Ngày khai giảng': formattedDate,
    'Trạng thái': 'Đang học',
  });

  closeAddClassModal();
  showToast(`✅ Mở lớp mới: ${maLop}`);
  
  // Refresh views
  renderClasses();
  document.getElementById('badgeClasses').textContent = data.lopHoc.length;

  // Sync to Sheet
  syncToSheet({
    action: 'addClass',
    maLop: maLop,
    tenLop: maLop,
    giaoVien: gv,
    maKH: maKH,
    ngayKhaiGiang: formattedDate
  });
}

// ===== ADD GLOBAL STUDENT MODAL =====
function openAddGlobalStudentModal() {
  document.getElementById('globalStuName').value = '';
  document.getElementById('globalStuPhone').value = '';
  document.getElementById('globalStuEmail').value = '';
  document.getElementById('modalAddGlobalStudent').classList.add('open');
}

function closeAddGlobalStudentModal() {
  document.getElementById('modalAddGlobalStudent').classList.remove('open');
}

function submitAddGlobalStudent() {
  const name = document.getElementById('globalStuName').value.trim();
  const phone = document.getElementById('globalStuPhone').value.trim();
  const email = document.getElementById('globalStuEmail').value.trim();

  if (!name || !phone) {
    showToast('⚠️ Vui lòng nhập Tên và SĐT', 'error');
    return;
  }

  const maHV = 'HV' + Date.now().toString().slice(-5);

  data.hocVien.push({
    'Mã HV': maHV,
    'Họ Tên': name,
    'SĐT': phone,
    'Email': email,
    'Ngày sinh': '',
    'Phân loại': 'Học viên',
    'CCCD': ''
  });

  closeAddGlobalStudentModal();
  showToast(`✅ Đã thêm hồ sơ học viên: ${name}`);
  
  if (document.getElementById('viewStudents').classList.contains('active')) {
    renderAllStudents();
    document.getElementById('badgeStudents').textContent = data.hocVien.length;
  }

  // Sync to Sheet
  syncToSheet({
    action: 'addStudent',
    maHV: maHV,
    hoTen: name,
    sdt: phone,
    email: email
  });
}

// ===== STUDENT PROFILE 360 =====
function openStudentProfileModal(maHV) {
  const hv = data.hocVien.find(h => (h['Mã HV'] || h['Ma HV']) === maHV);
  if (!hv) {
    showToast('⚠️ Không tìm thấy học viên!', 'error');
    return;
  }

  const name = hv['Họ Tên'] || hv['Ho Ten'] || hv['Họ tên'] || '—';
  const phone = hv['SĐT'] || hv['SDT'] || '—';
  const email = hv['Email'] || '';
  const cccd = hv['CCCD'] || '';
  
  // Lấy các lớp học viên tham gia
  const enrolledClasses = data.hocPhi.filter(hp => (hp['Mã HV'] || hp['Ma HV']) === maHV);
  
  let totalDebt = 0;
  let classesHtml = '';
  
  if (enrolledClasses.length === 0) {
    classesHtml = `<p style="color:var(--text-muted); font-size:0.9rem;">Chưa tham gia lớp nào.</p>`;
  } else {
    classesHtml = enrolledClasses.map(hp => {
      const maLop = hp['Mã Lớp'] || hp['Ma Lop'] || '—';
      const no = parseNum(hp['Còn nợ'] || hp['Con no']);
      totalDebt += no;
      
      // Tính chuyên cần cho lớp này
      let diemDanhLop = data.diemDanh.filter(d => 
        ((d['Mã HV'] || d['Ma HV']) === maHV) && 
        ((d['Mã Lớp'] || d['Ma Lop']) === maLop)
      );
      
      let present = 0;
      let totalAtt = diemDanhLop.length;
      diemDanhLop.forEach(d => {
        const v = d['Trạng thái'] || d['Trang thai'] || '';
        if (v === 'Có mặt' || v === 'Đi trễ') present++;
      });
      
      let attRate = totalAtt > 0 ? Math.round((present/totalAtt)*100) : 0;
      let attColor = attRate >= 80 ? 'var(--green)' : (attRate >= 50 ? 'var(--orange)' : 'var(--red)');
      if (totalAtt === 0) attColor = 'var(--text-muted)';
      
      return `
        <div style="background:var(--bg-input); padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:600; color:var(--teal);">${escapeHtml(maLop)}</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Chuyên cần: <strong style="color:${attColor}">${totalAtt > 0 ? attRate + '%' : 'N/A'}</strong> (${present}/${totalAtt})</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.8rem; color:var(--text-muted);">Còn nợ</div>
            <div style="font-weight:bold; color:${no > 0 ? 'var(--red)' : 'var(--green)'}">${no > 0 ? formatVND(no) : '0đ'}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  const html = `
    <div style="display:flex; gap:16px; margin-bottom:20px;">
      <div style="width:60px; height:60px; border-radius:50%; background:var(--teal-soft); color:var(--teal); display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:bold;">
        ${name.charAt(0).toUpperCase()}
      </div>
      <div>
        <h4 style="font-size:1.2rem; margin-bottom:4px; color:var(--text-primary);">${escapeHtml(name)}</h4>
        <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:2px;">Mã HV: ${escapeHtml(maHV)}</div>
        <div style="font-size:0.9rem; color:var(--text-primary);">SĐT: ${escapeHtml(phone)}</div>
      </div>
    </div>
    
    ${(email || cccd) ? `
    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:20px; font-size:0.9rem;">
      ${email ? `<div style="margin-bottom:4px;"><span style="color:var(--text-muted);">Email:</span> ${escapeHtml(email)}</div>` : ''}
      ${cccd ? `<div><span style="color:var(--text-muted);">CCCD:</span> ${escapeHtml(cccd)}</div>` : ''}
    </div>
    ` : ''}

    <h5 style="font-size:1rem; margin-bottom:12px; color:var(--text-primary); border-bottom:1px solid var(--border); padding-bottom:8px;">📚 Khóa Học & Công Nợ</h5>
    <div style="max-height: 250px; overflow-y:auto; padding-right:4px;">
      ${classesHtml}
    </div>
    
    <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
      <span style="font-weight:600; color:var(--text-secondary);">Tổng nợ trung tâm:</span>
      <span style="font-size:1.2rem; font-weight:bold; color:${totalDebt > 0 ? 'var(--red)' : 'var(--green)'}">${totalDebt > 0 ? formatVND(totalDebt) : 'Hoàn tất'}</span>
    </div>
  `;

  document.getElementById('studentProfileContent').innerHTML = html;
  document.getElementById('modalStudentProfile').classList.add('open');
}

function closeStudentProfileModal() {
  document.getElementById('modalStudentProfile').classList.remove('open');
}

// ===== EDIT CLASS STATUS =====
function openEditClassModal() {
  if (!currentClassId) return;
  const lop = data.lopHoc.find(l => (l['Mã Lớp'] || l['Ma Lop']) === currentClassId);
  if (!lop) return;

  document.getElementById('editClassTeacher').value = lop['Giáo Viên'] || lop['Giao Vien'] || '';
  document.getElementById('editClassStatus').value = lop['Trạng thái'] || lop['Trang thai'] || 'Đang học';
  
  document.getElementById('modalEditClass').classList.add('open');
}

function closeEditClassModal() {
  document.getElementById('modalEditClass').classList.remove('open');
}

function submitEditClass() {
  const gv = document.getElementById('editClassTeacher').value.trim();
  const status = document.getElementById('editClassStatus').value;

  const lop = data.lopHoc.find(l => (l['Mã Lớp'] || l['Ma Lop']) === currentClassId);
  if (lop) {
    if ('Giáo Viên' in lop) lop['Giáo Viên'] = gv;
    if ('Giao Vien' in lop) lop['Giao Vien'] = gv;
    if ('Trạng thái' in lop) lop['Trạng thái'] = status;
    if ('Trang thai' in lop) lop['Trang thai'] = status;
  }

  closeEditClassModal();
  showToast(`✅ Đã cập nhật lớp ${currentClassId}`);
  
  // Refresh views
  openClassDetail(currentClassId);
  if (document.getElementById('viewClasses').classList.contains('active')) {
    renderClasses();
  } else if (document.getElementById('viewAttendance').classList.contains('active')) {
    renderQuickAttendance();
  }

  // Sync to Sheet
  syncToSheet({
    action: 'editClass',
    maLop: currentClassId,
    giaoVien: gv,
    status: status
  });
}

function showConfirmation(text) {
  const existing = document.querySelector('.confirm-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = 'confirm-toast';
  el.innerHTML = `
    <span class="confirm-icon">🎉</span>
    <div class="confirm-text">${text}</div>
    <div class="confirm-sub">Nhớ cập nhật trên Google Sheet / AppSheet</div>
  `;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== SETTINGS =====
function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  const isHidden = panel.style.display === 'none';
  panel.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    document.getElementById('appsScriptUrlInput').value = APPS_SCRIPT_URL || '';
  }
}

function saveSettings() {
  const url = document.getElementById('appsScriptUrlInput').value.trim();
  APPS_SCRIPT_URL = url;
  localStorage.setItem('ori_apps_script_url', url);
  document.getElementById('settingsPanel').style.display = 'none';
  if (url) {
    showToast('✅ Đã lưu URL — Sync đã bật!');
  } else {
    showToast('⚠️ URL trống — Chỉ lưu local', 'error');
  }
}
