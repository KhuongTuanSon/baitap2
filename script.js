/**
 * ═══════════════════════════════════════════════════════════
 * SCRIPT.JS — Logic ứng dụng Tìm kiếm Hình ảnh Unsplash
 * ═══════════════════════════════════════════════════════════
 *
 * ┌────────────────────────────────────────────────────────┐
 * │  HƯỚNG DẪN SỬ DỤNG:                                  │
 * │                                                        │
 * │  1. Truy cập https://unsplash.com/developers           │
 * │  2. Tạo tài khoản miễn phí & đăng ký ứng dụng mới    │
 * │  3. Sao chép "Access Key" của bạn                      │
 * │  4. Dán vào ô API Key trong ứng dụng                  │
 * │     (nhấn biểu tượng bánh răng ở header)              │
 * │                                                        │
 * │  Hoặc bạn có thể gán trực tiếp vào biến bên dưới:    │
 * │                                                        │
 * │  const DEFAULT_API_KEY = 'ACCESS_KEY_CUA_BAN';         │
 * │                                                        │
 * └────────────────────────────────────────────────────────┘
 */

// ──────────────────────────────────────────────────────────
// CẤU HÌNH
// ──────────────────────────────────────────────────────────

/**
 * ⬇️  DÁN UNSPLASH ACCESS KEY CỦA BẠN VÀO ĐÂY (tùy chọn).
 *     Nếu muốn, bạn cũng có thể nhập qua giao diện.
 *     Key nhập qua giao diện sẽ được ưu tiên và lưu
 *     vào localStorage để sử dụng lâu dài.
 */
const DEFAULT_API_KEY = '';

const API_BASE = 'https://api.unsplash.com/search/photos';
const PER_PAGE = 12;
const LOCAL_STORAGE_KEY = 'unsplash_api_key';

// ──────────────────────────────────────────────────────────
// CÁC PHẦN TỬ DOM
// ──────────────────────────────────────────────────────────

const $searchInput    = document.getElementById('search-input');
const $searchBtn      = document.getElementById('search-btn');
const $apiKeyInput    = document.getElementById('api-key-input');
const $saveKeyBtn     = document.getElementById('save-key-btn');
const $settingsToggle = document.getElementById('settings-toggle');
const $settingsPanel  = document.getElementById('settings-panel');
const $toggleKeyVis   = document.getElementById('toggle-key-visibility');
const $keyStatusDot   = document.getElementById('key-status-dot');

const $welcomeState   = document.getElementById('welcome-state');
const $loadingState   = document.getElementById('loading-state');
const $errorState     = document.getElementById('error-state');
const $emptyState     = document.getElementById('empty-state');
const $errorMessage   = document.getElementById('error-message');

const $resultsInfo    = document.getElementById('results-info');
const $resultsCount   = document.getElementById('results-count');
const $resultsQuery   = document.getElementById('results-query');

const $gallery        = document.getElementById('gallery');
const $skeletonGrid   = document.getElementById('skeleton-grid');

const $pagination     = document.getElementById('pagination');
const $prevBtn        = document.getElementById('prev-btn');
const $nextBtn        = document.getElementById('next-btn');
const $pageInfo       = document.getElementById('page-info');

const $toastContainer = document.getElementById('toast-container');

// ──────────────────────────────────────────────────────────
// TRẠNG THÁI ỨNG DỤNG
// ──────────────────────────────────────────────────────────

let currentQuery = '';
let currentPage  = 1;
let totalPages   = 1;

// ──────────────────────────────────────────────────────────
// QUẢN LÝ API KEY
// ──────────────────────────────────────────────────────────

/** Trả về API key đang hoạt động (ưu tiên key từ UI > key mặc định). */
function getApiKey() {
  return localStorage.getItem(LOCAL_STORAGE_KEY) || DEFAULT_API_KEY;
}

/** Cập nhật màu chấm trạng thái: xanh = đã có key, đỏ = chưa có. */
function updateKeyStatusDot() {
  const hasKey = !!getApiKey();
  $keyStatusDot.classList.toggle('bg-green-400', hasKey);
  $keyStatusDot.classList.toggle('bg-red-400', !hasKey);
}

/** Tải key đã lưu trước đó vào ô input khi khởi động. */
function loadSavedKey() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    $apiKeyInput.value = saved;
  }
  updateKeyStatusDot();
}

// ──────────────────────────────────────────────────────────
// QUẢN LÝ TRẠNG THÁI GIAO DIỆN
// ──────────────────────────────────────────────────────────

/**
 * Chỉ hiển thị container trạng thái được chỉ định và ẩn các container còn lại.
 * @param {'welcome'|'loading'|'error'|'empty'|'results'} state
 */
function showState(state) {
  $welcomeState.classList.toggle('hidden', state !== 'welcome');
  $loadingState.classList.toggle('hidden', state !== 'loading');
  $errorState.classList.toggle('hidden',   state !== 'error');
  $emptyState.classList.toggle('hidden',   state !== 'empty');
  $resultsInfo.classList.toggle('hidden',  state !== 'results');
  $gallery.classList.toggle('hidden',      state !== 'results');
  $pagination.classList.toggle('hidden',   state !== 'results');
}

// ──────────────────────────────────────────────────────────
// GIAO DIỆN TẢI (SKELETON)
// ──────────────────────────────────────────────────────────

function renderSkeletons() {
  $skeletonGrid.innerHTML = '';
  for (let i = 0; i < PER_PAGE; i++) {
    const heights = ['h-52', 'h-64', 'h-72', 'h-56', 'h-60'];
    const h = heights[i % heights.length];
    $skeletonGrid.innerHTML += `
      <div class="rounded-2xl overflow-hidden">
        <div class="skeleton-shimmer ${h} bg-white/[0.04] rounded-2xl"></div>
        <div class="flex items-center gap-3 mt-3 px-1">
          <div class="skeleton-shimmer w-8 h-8 rounded-full bg-white/[0.04]"></div>
          <div class="skeleton-shimmer h-3 w-24 rounded-full bg-white/[0.04]"></div>
        </div>
      </div>
    `;
  }
}

// ──────────────────────────────────────────────────────────
// HIỂN THỊ GALLERY HÌNH ẢNH
// ──────────────────────────────────────────────────────────

/**
 * Hiển thị các thẻ hình ảnh từ kết quả API.
 * @param {Array} photos — Mảng các đối tượng ảnh từ Unsplash API.
 */
function renderGallery(photos) {
  $gallery.innerHTML = '';

  photos.forEach((photo, index) => {
    const card = document.createElement('div');
    card.className = 'image-card card-enter relative group rounded-2xl overflow-hidden bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-black/20';
    card.style.animationDelay = `${index * 50}ms`;

    const authorName = photo.user?.name || 'Unknown';
    const authorLink = photo.user?.links?.html
      ? `${photo.user.links.html}?utm_source=unsplash_search_app&utm_medium=referral`
      : '#';
    const photoLink  = photo.links?.html
      ? `${photo.links.html}?utm_source=unsplash_search_app&utm_medium=referral`
      : '#';
    const imgSrc     = photo.urls?.regular || photo.urls?.small || '';
    const altDesc    = photo.alt_description || photo.description || `Ảnh bởi ${authorName}`;
    const blurHash   = photo.blur_hash || '';
    const color      = photo.color || '#1e293b';

    card.innerHTML = `
      <!-- Khung chứa hình ảnh -->
      <a href="${photoLink}" target="_blank" rel="noopener noreferrer" class="block relative overflow-hidden aspect-[4/3]" style="background-color: ${color}">
        <img
          src="${imgSrc}"
          alt="${altDesc}"
          loading="lazy"
          class="w-full h-full object-cover"
        />
        <!-- Lớp phủ khi hover -->
        <div class="card-overlay absolute inset-0"></div>
        <!-- Nút hành động góc trên bên phải -->
        <div class="card-actions absolute top-3 right-3 flex gap-2">
          <span class="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[10px] text-white/80 font-medium border border-white/10">
            Xem trên Unsplash ↗
          </span>
        </div>
      </a>
      <!-- Thông tin tác giả -->
      <div class="p-3 flex items-center gap-3">
        <a href="${authorLink}" target="_blank" rel="noopener noreferrer" class="flex-shrink-0">
          <img
            src="${photo.user?.profile_image?.small || ''}"
            alt="${authorName}"
            class="w-8 h-8 rounded-full object-cover border border-white/10 hover:border-accent-500/50 transition-colors duration-300"
            onerror="this.style.display='none'"
          />
        </a>
        <div class="min-w-0">
          <a
            href="${authorLink}"
            target="_blank"
            rel="noopener noreferrer"
            class="block text-sm font-medium text-white/70 hover:text-white transition-colors duration-200 truncate"
          >
            ${authorName}
          </a>
        </div>
        <div class="ml-auto flex items-center gap-1 text-white/20">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span class="text-xs">${photo.likes || 0}</span>
        </div>
      </div>
    `;

    $gallery.appendChild(card);
  });
}

// ──────────────────────────────────────────────────────────
// PHÂN TRANG
// ──────────────────────────────────────────────────────────

function updatePagination() {
  $pageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
  $prevBtn.disabled = currentPage <= 1;
  $nextBtn.disabled = currentPage >= totalPages;
}

// ──────────────────────────────────────────────────────────
// THÔNG BÁO TOAST
// ──────────────────────────────────────────────────────────

/**
 * Hiển thị thông báo toast.
 * @param {string} message — Nội dung hiển thị.
 * @param {'info'|'success'|'error'} type — Kiểu thông báo.
 * @param {number} duration — Tự động ẩn sau bao lâu (ms, mặc định 4000).
 */
function showToast(message, type = 'info', duration = 4000) {
  const colors = {
    info:    'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-200',
    success: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-200',
    error:   'from-red-500/20 to-red-600/10 border-red-500/30 text-red-200',
  };

  const icons = {
    info:    '<path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />',
    success: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />',
    error:   '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />',
  };

  const toast = document.createElement('div');
  toast.className = `toast-enter pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-xl bg-gradient-to-r ${colors[type]} border backdrop-blur-xl shadow-2xl text-sm max-w-sm`;
  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">${icons[type]}</svg>
    <span class="leading-snug">${message}</span>
  `;

  $toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ──────────────────────────────────────────────────────────
// TÌM KIẾM API
// ──────────────────────────────────────────────────────────

/**
 * Gọi API Unsplash để tìm kiếm hình ảnh.
 * @param {string} query — Từ khóa tìm kiếm.
 * @param {number} page  — Số trang (bắt đầu từ 1).
 */
async function searchImages(query, page = 1) {
  const apiKey = getApiKey();

  // Kiểm tra API key
  if (!apiKey) {
    showState('error');
    $errorMessage.textContent = 'Vui lòng thiết lập API key của Unsplash trước. Nhấn nút ⚙ API Key ở header để thêm.';
    showToast('Yêu cầu API key', 'error');
    // Tự động mở bảng cài đặt
    $settingsPanel.classList.remove('hidden');
    return;
  }

  // Kiểm tra từ khóa tìm kiếm
  if (!query.trim()) {
    showToast('Vui lòng nhập từ khóa tìm kiếm', 'info');
    $searchInput.focus();
    return;
  }

  currentQuery = query.trim();
  currentPage  = page;

  // Hiển thị trạng thái đang tải với skeleton
  showState('loading');
  renderSkeletons();

  try {
    const url = new URL(API_BASE);
    url.searchParams.set('query', currentQuery);
    url.searchParams.set('per_page', PER_PAGE);
    url.searchParams.set('page', currentPage);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Client-ID ${apiKey}`,
      },
    });

    // Xử lý lỗi HTTP
    if (!response.ok) {
      let errorMsg = '';

      switch (response.status) {
        case 401:
          errorMsg = 'API key không hợp lệ. Vui lòng kiểm tra lại Access Key của Unsplash và thử lại.';
          break;
        case 403:
          errorMsg = 'Đã vượt quá giới hạn truy vấn. API miễn phí của Unsplash cho phép 50 yêu cầu mỗi giờ. Vui lòng đợi và thử lại sau.';
          break;
        case 404:
          errorMsg = 'Không tìm thấy endpoint API. Vui lòng kiểm tra cấu hình.';
          break;
        case 500:
        case 502:
        case 503:
          errorMsg = 'Máy chủ Unsplash đang gặp sự cố. Vui lòng thử lại sau vài phút.';
          break;
        default:
          errorMsg = `Lỗi không mong đợi (HTTP ${response.status}). Vui lòng thử lại.`;
      }

      showState('error');
      $errorMessage.textContent = errorMsg;
      showToast(errorMsg, 'error', 6000);
      return;
    }

    const data = await response.json();
    const photos = data.results || [];
    totalPages = data.total_pages || 1;

    // Xử lý khi không có kết quả
    if (photos.length === 0) {
      showState('empty');
      return;
    }

    // Hiển thị kết quả
    showState('results');
    $resultsCount.textContent = `${data.total?.toLocaleString() || photos.length}`;
    $resultsQuery.textContent = currentQuery;

    renderGallery(photos);
    updatePagination();

    // Cuộn mượt đến kết quả khi chuyển trang (không áp dụng cho lần tìm đầu tiên)
    if (page > 1) {
      $resultsInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

  } catch (err) {
    console.error('Tìm kiếm thất bại:', err);
    showState('error');

    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      $errorMessage.textContent = 'Lỗi mạng — vui lòng kiểm tra kết nối internet và thử lại.';
    } else {
      $errorMessage.textContent = `Đã xảy ra lỗi không mong đợi: ${err.message}. Vui lòng thử lại.`;
    }
    showToast('Tìm kiếm thất bại — kiểm tra console để xem chi tiết', 'error');
  }
}

// ──────────────────────────────────────────────────────────
// CÁC SỰ KIỆN (EVENT LISTENERS)
// ──────────────────────────────────────────────────────────

// Nhấn nút Tìm kiếm
$searchBtn.addEventListener('click', () => {
  searchImages($searchInput.value);
});

// Nhấn phím Enter trong ô tìm kiếm
$searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchImages($searchInput.value);
  }
});

// Bật/tắt bảng cài đặt
$settingsToggle.addEventListener('click', () => {
  $settingsPanel.classList.toggle('hidden');
});

// Lưu API key
$saveKeyBtn.addEventListener('click', () => {
  const key = $apiKeyInput.value.trim();
  if (!key) {
    showToast('Vui lòng nhập API key', 'error');
    return;
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, key);
  updateKeyStatusDot();
  showToast('Đã lưu API key thành công!', 'success');
  // Tự động đóng bảng cài đặt sau một lúc
  setTimeout(() => {
    $settingsPanel.classList.add('hidden');
  }, 800);
});

// Nhấn Enter trong ô API key → lưu key
$apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $saveKeyBtn.click();
  }
});

// Bật/tắt hiển thị API key
$toggleKeyVis.addEventListener('click', () => {
  const isPassword = $apiKeyInput.type === 'password';
  $apiKeyInput.type = isPassword ? 'text' : 'password';
});

// Các nút gợi ý tìm kiếm
document.querySelectorAll('.suggestion-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    $searchInput.value = pill.textContent.trim();
    searchImages($searchInput.value);
  });
});

// Phân trang
$prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    searchImages(currentQuery, currentPage - 1);
  }
});

$nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    searchImages(currentQuery, currentPage + 1);
  }
});

// ──────────────────────────────────────────────────────────
// KHỞI TẠO ỨNG DỤNG
// ──────────────────────────────────────────────────────────

(function init() {
  showState('welcome');
  loadSavedKey();
  $searchInput.focus();
})();
