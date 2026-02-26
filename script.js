let bookings = JSON.parse(localStorage.getItem('gskf_car_bookings') || '{}');

const carName = {
  car1: "1270 กทม.",
  car2: "1370 กทม.",
  car3: "8046 กทม."
};

const thaiMonths = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

const ADMIN_USER = "472930";
const ADMIN_PASS = "28052517";

function toThaiDate(dateStr) {
  if (!dateStr) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${thaiMonths[m-1]} ${y + 543}`;
}

function saveBookings() {
  localStorage.setItem('gskf_car_bookings', JSON.stringify(bookings));
}

function getDateRange(start, end) {
  const dates = [];
  let current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function hasActiveCar(booker, excludeKey = "") {
  const today = new Date().toISOString().split('T')[0];
  for (const date in bookings) {
    if (date < today) continue;
    for (const b of bookings[date] || []) {
      if (b.booker === booker && b.key !== excludeKey && b.end >= today) {
        return b;
      }
    }
  }
  return null;
}

function carIsConflict(start, end, car, excludeKey = "") {
  const range = getDateRange(start, end);
  for (const date of range) {
    for (const b of bookings[date] || []) {
      if (excludeKey && b.key === excludeKey) continue;
      if (b.car !== car) continue;
      const bRange = getDateRange(b.start, b.end);
      if (range.some(r => bRange.includes(r))) return true;
    }
  }
  return false;
}

function handleSubmit(e) {
  e.preventDefault();

  const start  = document.getElementById('startDate').value;
  const end    = document.getElementById('endDate').value;
  const car    = document.getElementById('car').value;
  const booker = document.getElementById('booker').value.trim();
  const editKey = document.getElementById('editKey').value;

  if (!start || !end || !car || !booker || new Date(start) > new Date(end)) {
    alert("กรุณากรอกข้อมูลให้ครบและวันที่ถูกต้อง");
    return;
  }

  const active = hasActiveCar(booker, editKey);
  if (active && !editKey) {
    alert(`คุณยังยืม ${carName[active.car]} อยู่ (จนถึง ${toThaiDate(active.end)})\nต้องคืนรถก่อนถึงจะจองคันใหม่ได้`);
    return;
  }

  if (carIsConflict(start, end, car, editKey)) {
    alert(`รถ ${carName[car]} ถูกจองช่วงนี้แล้ว`);
    return;
  }

  if (editKey) {
    for (const d in bookings) {
      bookings[d] = (bookings[d] || []).filter(b => b.key !== editKey);
      if (!bookings[d].length) delete bookings[d];
    }
  }

  const key = `${start}|${end}|${car}|${booker}`;
  getDateRange(start, end).forEach(date => {
    if (!bookings[date]) bookings[date] = [];
    bookings[date].push({
      key, start, end, car, booker,
      status: editKey ? (bookings[date].find(b=>b.key===editKey)?.status || "รออนุมัติ") : "รออนุมัติ"
    });
  });

  saveBookings();
  renderList();
  resetForm();
  alert("ส่งคำขอจองเรียบร้อย รออนุมัติจากผู้มีอำนาจ");
}

function resetForm() {
  document.getElementById('bookingForm').reset();
  document.getElementById('formTitle').textContent = "จองรถ";
  document.getElementById('submitBtn').textContent = "ส่งคำขอจอง";
  document.getElementById('cancelBtn').style.display = "none";
  document.getElementById('editKey').value = "";
}

function showApproveModal(key, infoText) {
  document.getElementById('approveInfo').textContent = infoText;
  document.getElementById('adminUser').value = "";
  document.getElementById('adminPass').value = "";
  document.getElementById('approveModal').style.display = "flex";

  document.getElementById('confirmApprove').onclick = () => {
    const user = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value;

    if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
      alert("รหัสพนักงานหรือวันเดือนปีเกิดไม่ถูกต้อง");
      return;
    }

    for (const d in bookings) {
      bookings[d] = (bookings[d] || []).map(b => {
        if (b.key === key) b.status = "อนุมัติแล้ว";
        return b;
      });
    }

    saveBookings();
    renderList();
    document.getElementById('approveModal').style.display = "none";
    alert("อนุมัติสำเร็จ");
  };
}

function cancelBooking(key) {
  if (!confirm("คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?")) return;

  for (const date in bookings) {
    bookings[date] = (bookings[date] || []).filter(b => b.key !== key);
    if (!bookings[date].length) delete bookings[date];
  }

  saveBookings();
  renderList();
  alert("ยกเลิกการจองเรียบร้อย");
}

function renderList() {
  const container = document.getElementById('bookingList');
  container.innerHTML = "";

  const unique = [];
  const seen = new Set();

  for (const date in bookings) {
    for (const b of bookings[date] || []) {
      if (!seen.has(b.key)) {
        seen.add(b.key);
        unique.push(b);
      }
    }
  }

  unique.sort((a,b) => new Date(b.start) - new Date(a.start));

  if (unique.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#777; padding:40px 0;">ยังไม่มีรายการจอง</p>';
    return;
  }

  unique.forEach(b => {
    const isApproved = b.status === "อนุมัติแล้ว";
    const statusClass = isApproved ? "status-approved" : "status-wait";
    const statusText  = isApproved ? "อนุมัติแล้ว" : "รออนุมัติ";

    const approveBtn = !isApproved
      ? `<button class="btn-approve" onclick="showApproveModal('${b.key}', '${b.booker} ขอใช้ ${carName[b.car]} ${toThaiDate(b.start)} – ${toThaiDate(b.end)}')">อนุมัติ</button>`
      : '';

    const cancelBtn = isApproved
      ? `<button class="btn-cancel" onclick="cancelBooking('${b.key}')">ยกเลิกการจอง</button>`
      : '';

    const editDeleteBtns = !isApproved
      ? `
        <button class="btn-edit" onclick="editBooking('${b.key}','${b.start}','${b.end}','${b.car}','${b.booker.replace(/'/g,"\\'")}')">แก้ไข</button>
        <button class="btn-delete" onclick="deleteBooking('${b.key}')">ลบ</button>
      `
      : '';

    const item = document.createElement('div');
    item.className = `booking-item ${b.car}`;
    item.innerHTML = `
      <div class="booking-info">
        <strong>${b.booker}</strong><br>
        ${carName[b.car]} • ${toThaiDate(b.start)} – ${toThaiDate(b.end)}<br>
        สถานะ: <span class="${statusClass}">${statusText}</span>
      </div>
      <div class="booking-actions">
        ${editDeleteBtns}
        ${approveBtn}
        ${cancelBtn}
      </div>
    `;
    container.appendChild(item);
  });
}

function editBooking(key, start, end, car, booker) {
  document.getElementById('startDate').value = start;
  document.getElementById('endDate').value = end;
  document.getElementById('car').value = car;
  document.getElementById('booker').value = booker;
  document.getElementById('editKey').value = key;
  document.getElementById('formTitle').textContent = "แก้ไขการจอง";
  document.getElementById('submitBtn').textContent = "บันทึกการแก้ไข";
  document.getElementById('cancelBtn').style.display = "inline-block";
}

function deleteBooking(key) {
  if (!confirm("ยืนยันการลบการจองนี้?")) return;

  for (const date in bookings) {
    bookings[date] = (bookings[date] || []).filter(b => b.key !== key);
    if (!bookings[date].length) delete bookings[date];
  }

  saveBookings();
  renderList();
}

// Event Listeners
document.getElementById('bookingForm').addEventListener('submit', handleSubmit);
document.getElementById('cancelBtn').addEventListener('click', resetForm);
document.getElementById('cancelApprove').addEventListener('click', () => {
  document.getElementById('approveModal').style.display = 'none';
});

renderList();
