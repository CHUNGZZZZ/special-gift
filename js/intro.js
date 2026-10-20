const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stars = [];
const explosions = [];
const shootingStars = [];
// Lấy fullText từ config.js/index.html nếu có
let fullText = (typeof window !== 'undefined' && Array.isArray(window.fullText) && window.fullText.length)
    ? window.fullText
    : ["Happy Valentine"];
if (typeof window !== 'undefined') {
    window.fullText = fullText;
}
// Cấu hình phông chữ & khoảng cách hiển thị chữ intro
function getIntroFontFamily() {
  if (typeof window !== 'undefined' && window.GIFT_DATA && window.GIFT_DATA.intro && window.GIFT_DATA.intro.fontFamily) {
    return window.GIFT_DATA.intro.fontFamily;
  }
  return '"Montserrat", "Segoe UI", "Arial Rounded MT Bold", Arial, sans-serif';
}

function getIntroFontWeight() {
  if (typeof window !== 'undefined' && window.GIFT_DATA && window.GIFT_DATA.intro && window.GIFT_DATA.intro.fontWeight) {
    return window.GIFT_DATA.intro.fontWeight;
  }
  return '600'; // 600 (semi-bold) giúp nét chữ tròn trịa, thanh thoát, không bị bết dính như bold 900
}

function getFontString(size) {
  return `${getIntroFontWeight()} ${size}px ${getIntroFontFamily()}`;
}

function getIntroLetterSpacing(fs) {
  const currentFs = fs || (typeof fontSize !== 'undefined' ? fontSize : 40);
  if (typeof window !== 'undefined' && window.GIFT_DATA && window.GIFT_DATA.intro && typeof window.GIFT_DATA.intro.letterSpacing === 'number') {
    return window.GIFT_DATA.intro.letterSpacing;
  }
  return Math.max(6, Math.round(currentFs * 0.15));
}

function measureTextWithSpacing(tCtx, text, fs) {
  if (!text) return 0;
  const chars = getGraphemes(text);
  const spacing = getIntroLetterSpacing(fs);
  let totalW = 0;
  for (let i = 0; i < chars.length; i++) {
    totalW += tCtx.measureText(chars[i]).width;
    if (i < chars.length - 1) totalW += spacing;
  }
  return totalW;
}

function getViewportSize() {
  const vv = window.visualViewport;
  if (vv && vv.width && vv.height) {
    return { width: vv.width, height: vv.height };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

function isPortraitNarrowViewport() {
  const v = getViewportSize();
  return v.height > v.width && v.width <= 1024;
}

function isMobileLandscapeViewport() {
  const v = getViewportSize();
  return v.width <= 1024 && v.height < v.width;
}

function getIntroMaxTextWidth() {
  const w = canvas && canvas.width > 0 ? canvas.width : getViewportSize().width;
  if (isPortraitNarrowViewport()) {
    return w * 0.94;
  }
  return w * 0.86;
}

/** Trần cỡ chữ trước khi co để vừa khung (mỗi dòng = 1 phần tử fullText) */
function getIntroFontSizeCeiling() {
  const v = getViewportSize();
  const w = canvas && canvas.width > 0 ? canvas.width : v.width;
  if (isPortraitNarrowViewport()) {
    return Math.min(68, Math.round(w * 0.15));
  }
  if (isMobileLandscapeViewport()) {
    return 64;
  }
  return 100;
}

function getIntroFontSizeFallback() {
  const v = getViewportSize();
  const w = v.width || 360;
  if (isPortraitNarrowViewport()) {
    return Math.min(68, Math.round(w * 0.15));
  }
  if (isMobileLandscapeViewport()) {
    return 64;
  }
  return 100;
}

function getGraphemes(str) {
  try {
    if (window.Intl && Intl.Segmenter) {
      const seg = new Intl.Segmenter('vi', { granularity: 'grapheme' });
      return Array.from(seg.segment(String(str || '')), s => s.segment);
    }
  } catch (e) {}
  return Array.from(String(str || ''));
}

function greedyWrapWordsWithCtx(tempCtx, words, maxWidth) {
  const out = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const next = line ? (line + ' ' + words[i]) : words[i];
    if (tempCtx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      if (line) out.push(line);
      line = words[i];
    }
  }
  if (line) out.push(line);
  return out;
}

/** Portrait: thử cắt 2 dòng, ưu tiên >=3 từ trên dòng đầu khi câu dài */
function findPreferredTwoLineWrap(tempCtx, words, maxWidth) {
  if (words.length < 2) return null;

  const preferredSplits = [];
  if (words.length >= 5) {
    preferredSplits.push(3, 4, 2);
  } else if (words.length >= 4) {
    preferredSplits.push(2, 3);
  } else {
    preferredSplits.push(1);
  }

  function trySplit(splitAt) {
    if (splitAt < 1 || splitAt >= words.length) return null;
    const line1 = words.slice(0, splitAt).join(' ');
    const line2 = words.slice(splitAt).join(' ');
    if (
      tempCtx.measureText(line1).width <= maxWidth &&
      tempCtx.measureText(line2).width <= maxWidth
    ) {
      return [line1, line2];
    }
    return null;
  }

  for (let i = 0; i < preferredSplits.length; i++) {
    const hit = trySplit(preferredSplits[i]);
    if (hit) return hit;
  }

  for (let splitAt = words.length - 1; splitAt >= 1; splitAt--) {
    if (preferredSplits.indexOf(splitAt) !== -1) continue;
    const hit = trySplit(splitAt);
    if (hit) return hit;
  }

  return null;
}

function portraitSegmentWrapIsAcceptable(tempCtx, segment, maxWidth) {
  const words = String(segment || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 4) return true;

  const lines = wrapTextPortraitBalanced(tempCtx, segment, maxWidth);
  if (lines.length > 2) return false;
  if (lines.length === 2 && words.length >= 5) {
    const firstCount = lines[0].split(/\s+/).filter(Boolean).length;
    if (firstCount <= 2) return false;
  }
  return true;
}

/** Portrait: sau greedy wrap, gom từ dòng sau lên dòng đầu để tránh cắt quá sớm (vd. "Chúc em" → "Chúc em một") */
function refinePortraitWordWrap(tempCtx, lines, maxWidth) {
  lines = lines.map(function (l) { return String(l || '').trim(); }).filter(Boolean);
  if (lines.length < 2) return lines;

  const totalWords = lines.join(' ').split(/\s+/).filter(Boolean).length;
  let changed = true;

  while (changed) {
    changed = false;

    for (let i = 0; i < lines.length - 1; i++) {
      const leftWords = lines[i].split(/\s+/).filter(Boolean);
      const rightWords = lines[i + 1].split(/\s+/).filter(Boolean);
      if (rightWords.length === 0) continue;

      const shortFirstLine = leftWords.length <= 2 && totalWords >= 4;
      if (!shortFirstLine) continue;

      const candidate = lines[i] + ' ' + rightWords[0];
      if (tempCtx.measureText(candidate).width <= maxWidth) {
        rightWords.shift();
        lines[i] = candidate;
        lines[i + 1] = rightWords.join(' ');
        if (!lines[i + 1]) lines.splice(i + 1, 1);
        changed = true;
        break;
      }
    }

    if (changed) continue;

    for (let i = 0; i < lines.length - 1; i++) {
      const candidate = lines[i] + ' ' + lines[i + 1];
      if (tempCtx.measureText(candidate).width <= maxWidth) {
        lines[i] = candidate;
        lines.splice(i + 1, 1);
        changed = true;
        break;
      }
    }
  }

  return lines;
}

function wrapTextPortraitBalanced(tempCtx, text, maxWidth) {
  const s = String(text || '').trim();
  if (!s) return [];
  if (tempCtx.measureText(s).width <= maxWidth) return [s];

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [s];

  if (words.length >= 4) {
    const twoLine = findPreferredTwoLineWrap(tempCtx, words, maxWidth);
    if (twoLine) return twoLine;
  }

  const greedy = greedyWrapWordsWithCtx(tempCtx, words, maxWidth);
  const stillTooLong = greedy.some(function (l) { return tempCtx.measureText(l).width > maxWidth; });
  if (stillTooLong) return greedy;

  return refinePortraitWordWrap(tempCtx, greedy, maxWidth);
}

function wrapTextToWidthWithCtx(tempCtx, text, maxWidth) {
  const s = String(text || '').trim();
  if (!s) return [];
  if (tempCtx.measureText(s).width <= maxWidth) return [s];

  const hasSpaces = /\s/.test(s);
  if (hasSpaces) {
    const words = s.split(/\s+/).filter(Boolean);
    const out = greedyWrapWordsWithCtx(tempCtx, words, maxWidth);
    const stillTooLong = out.some(function(l) { return tempCtx.measureText(l).width > maxWidth; });
    if (!stillTooLong) return out;
  }

  const chars = getGraphemes(s);
  const out = [];
  let line = '';
  for (let i = 0; i < chars.length; i++) {
    const next = line + chars[i];
    if (tempCtx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      out.push(line);
      line = chars[i];
    }
  }
  if (line) out.push(line);
  return out;
}

function getIntroTextParts() {
  const sourceArr = (typeof window !== 'undefined' && Array.isArray(window.fullText) && window.fullText.length)
    ? window.fullText
    : (Array.isArray(fullText) ? fullText : []);
  const parts = sourceArr
    .map(function (s) {
      return String(s || '').trim();
    })
    .filter(Boolean);
  if (parts.length === 0) {
    parts.push('Happy Valentine');
  }
  return parts;
}

/** Portrait: luôn wrap theo từ từng segment; desktop: wrap khi câu dài để giữ chữ to và thoáng */
function buildIntroLinesForParts(tempCtx, parts, maxTextWidth, portraitWordWrap) {
  const lines = [];
  parts.forEach(function (segment) {
    if (portraitWordWrap) {
      wrapTextPortraitBalanced(tempCtx, segment, maxTextWidth).forEach(function (w) {
        lines.push(w);
      });
      return;
    }
    // Desktop: nếu câu dài hơn 18 ký tự và có từ 3 từ trở lên, ưu tiên ngắt 2 dòng cân đối để chữ to và không bị dính sát
    const words = segment.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 3 && (segment.length > 18 || measureTextWithSpacing(tempCtx, segment, fontSize) > maxTextWidth)) {
      const balanced = findPreferredTwoLineWrap(tempCtx, words, maxTextWidth);
      if (balanced) {
        balanced.forEach(function (w) { lines.push(w); });
        return;
      }
    }
    if (measureTextWithSpacing(tempCtx, segment, fontSize) <= maxTextWidth) {
      lines.push(segment);
    } else {
      wrapTextToWidthWithCtx(tempCtx, segment, maxTextWidth).forEach(function (w) {
        lines.push(w);
      });
    }
  });
  return lines;
}

function estimateIntroBlockHeight(lineCount, fs, lh) {
  if (lineCount <= 0) return 0;
  return (lineCount - 1) * lh + fs;
}

/**
 * Desktop & Portrait: tính toán cỡ chữ tối ưu, tính cả letter-spacing để chữ vừa vặn và thanh thoát
 */
function computeIntroFontSizeForCanvas() {
  const maxW = getIntroMaxTextWidth();
  if (maxW <= 0) {
    return getIntroFontSizeFallback();
  }

  const parts = getIntroTextParts();
  const tCtx = document.createElement('canvas').getContext('2d');
  let maxCandidate = getIntroFontSizeCeiling();

  if (isPortraitNarrowViewport()) {
    const minFont = 30;
    const maxBlockH = canvas.height * 0.48;

    for (let fs = maxCandidate; fs >= minFont; fs--) {
      tCtx.font = getFontString(fs);
      const lh = fs * 1.25;
      const lines = buildIntroLinesForParts(tCtx, parts, maxW, true);
      const blockH = estimateIntroBlockHeight(lines.length, fs, lh);
      if (blockH > maxBlockH) continue;

      var widthOk = true;
      for (var i = 0; i < lines.length; i++) {
        if (measureTextWithSpacing(tCtx, lines[i], fs) > maxW) {
          widthOk = false;
          break;
        }
      }
      if (!widthOk) continue;

      var wrapOk = true;
      for (var j = 0; j < parts.length; j++) {
        if (!portraitSegmentWrapIsAcceptable(tCtx, parts[j], maxW)) {
          wrapOk = false;
          break;
        }
      }
      if (wrapOk) return fs;
    }
    return minFont;
  }

  const minFont = 26;
  const maxBlockH = canvas.height * 0.52;
  for (let fs = maxCandidate; fs >= minFont; fs--) {
    tCtx.font = getFontString(fs);
    const lh = fs * 1.25;
    const lines = buildIntroLinesForParts(tCtx, parts, maxW, false);
    const blockH = estimateIntroBlockHeight(lines.length, fs, lh);
    if (blockH > maxBlockH) continue;

    var ok = true;
    for (var j = 0; j < lines.length; j++) {
      if (measureTextWithSpacing(tCtx, lines[j], fs) > maxW) {
        ok = false;
        break;
      }
    }
    if (ok) return fs;
  }
  return minFont;
}

function getIntroLineHeight(fs) {
  if (isPortraitNarrowViewport()) {
    return fs * 1.25;
  }
  if (isMobileLandscapeViewport()) {
    return fs * 1.35;
  }
  return fs * 1.25;
}

function getResponsiveDotSpacing() {
  if (isPortraitNarrowViewport()) {
    return Math.min(5, Math.max(3, Math.round(fontSize * 0.04)));
  }
  if (isMobileLandscapeViewport()) {
    return 4;
  }
  return 4;
}

function getResponsiveShootInterval() {
  if (isPortraitNarrowViewport()) {
    return 26;
  }
  if (isMobileLandscapeViewport()) {
    return 32;
  }
  return 22;
}

function getFlyingHeartDrawSize() {
  if (typeof window !== 'undefined' && window.GIFT_DATA && window.GIFT_DATA.intro && typeof window.GIFT_DATA.intro.heartSize === 'number') {
    return Number(window.GIFT_DATA.intro.heartSize);
  }
  // Kích thước hạt tim tinh tế, vừa vặn không làm thô bẹt các nét chữ
  const calculated = Math.round(fontSize * 0.15);
  if (isPortraitNarrowViewport()) {
    return Math.min(8, Math.max(6, calculated));
  }
  return Math.min(9, Math.max(7, calculated));
}

let fontSize = getIntroFontSizeFallback();
let lineHeight = getIntroLineHeight(fontSize);
let bearX = 70;
let bearY = canvas.height - 80;
let dots = [];
let targetDotsQueue = [];
let currentCharIndex = 0;
let animationDone = false;
let introFinishedOnce = false;
let bookMode = false;
let shootIntervalId = null;
let rafId = null;
var buttonShowFallbackTimer = null; // Hiện nút tối đa sau vài giây nếu dot chưa "ổn định"

function showOpenBookButton() {
  if (buttonShowFallbackTimer) {
    clearTimeout(buttonShowFallbackTimer);
    buttonShowFallbackTimer = null;
  }
  var btn = document.getElementById('openBookBtn');
  if (!btn) return;
  btn.style.display = 'flex';
  btn.style.opacity = '0';
  requestAnimationFrame(function() {
    btn.style.transition = 'opacity 0.5s ease';
    btn.style.opacity = '1';
  });
  btn.onclick = function() {
    enterBookMode();
  };
  btn.ontouchend = function(e) {
    e.preventDefault();
    enterBookMode();
  };
}

function enterBookMode() {
  if (bookMode) return;
  bookMode = true;
  var openBookBtn = document.getElementById('openBookBtn');
  if (openBookBtn) {
    openBookBtn.style.opacity = '0';
    openBookBtn.style.pointerEvents = 'none';
  }
  document.body.classList.add('book-mode');

  // Dừng các loop animation để "xóa" hiệu ứng tim-ghép-chữ (CPU nhẹ hơn)
  if (shootIntervalId) {
    clearInterval(shootIntervalId);
    shootIntervalId = null;
  }
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Ẩn canvas luôn (nền intro vẫn giữ video + png)
  if (canvas) canvas.style.display = 'none';

  // Hiện cuốn sách
  const secondScreen = document.getElementById('secondScreen');
  const bookContent = document.querySelector('.book-content');
  if (secondScreen) {
    secondScreen.classList.add('is-visible');
    secondScreen.setAttribute('aria-hidden', 'false');
  }
  // Cho bìa vẽ xong rồi mới hiện các tờ bên trong, tránh chớp trang chữ/ảnh
  if (bookContent) {
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        bookContent.classList.add('ready');
      });
    });
  }

  // Khởi tạo page indicator (0 lần lật - chỉ mở bìa, chưa hiện indicator)
  setTimeout(function(){
    if (typeof updatePageIndicator === 'function') {
      updatePageIndicator(0);
    }
  }, 600);

  // Tự động lật mở trang bìa sau 1.5s
  if (typeof window.checkAutoOpenBook === 'function') {
    window.checkAutoOpenBook();
  }
}

// Expose enterBookMode on window and attach listener immediately
if (typeof window !== 'undefined') {
  window.enterBookMode = enterBookMode;
  window.showOpenBookButton = showOpenBookButton;
}
var openBookBtnInit = document.getElementById('openBookBtn');
if (openBookBtnInit) {
  openBookBtnInit.addEventListener('click', enterBookMode);
  openBookBtnInit.addEventListener('touchend', function(e) {
    if (e.cancelable) e.preventDefault();
    enterBookMode();
  });
}

// Helper xác định prefix assets chính xác theo ngữ cảnh thư mục (root hay subfolder)
const isSubdirContext = window.location.pathname.indexOf('/create_gift/') !== -1 || window.location.pathname.indexOf('/intro_gift/') !== -1;
const assetPrefix = isSubdirContext ? "../assets/" : "assets/";

// Load heart image with cache busting
const heartImage = new Image();
let heartImageLoaded = false;
const heartImagePath = assetPrefix + "images/intro/heart_intro.png";
const heartCacheBuster = "?v=" + new Date().getTime();
heartImage.src = heartImagePath + heartCacheBuster;

heartImage.onload = function() {
  heartImageLoaded = true;
  // Show content after heart image is loaded
  showContent();
};

heartImage.onerror = function() {
  console.error('Failed to load heart image');
  // Still allow animation to proceed with emoji fallback
  heartImageLoaded = true;
  showContent();
};

function showContent() {
  const canvas = document.getElementById('canvas');
  const bear = document.getElementById('bear');
  const leftCupid = document.getElementById('leftCupid');
  const rightCupid = document.getElementById('rightCupid');
  const doubleHeart = document.getElementById('doubleHeart');
  const leftBottom = document.getElementById('leftBottom');
  const rightBottom = document.getElementById('rightBottom');
  
  if (canvas) canvas.classList.add('loaded');
  if (bear) bear.classList.add('loaded');
  if (leftCupid) leftCupid.classList.add('loaded');
  if (rightCupid) rightCupid.classList.add('loaded');
  if (doubleHeart) doubleHeart.classList.add('loaded');
  if (leftBottom) leftBottom.classList.add('loaded');
  if (rightBottom) rightBottom.classList.add('loaded');
}

var readyOverlayDismissed = (typeof window !== 'undefined' && window.readyOverlayDismissed) ? true : false;

function dismissReadyOverlay() {
  readyOverlayDismissed = true;
  if (typeof window !== 'undefined') {
    window.readyOverlayDismissed = true;
    window.userHasClickedReady = true;
  }
  var overlay = document.getElementById("readyToStartOverlay");
  if (overlay) {
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.transition = "opacity 0.35s ease";
    setTimeout(function() {
      overlay.style.display = "none";
    }, 350);
  }
  // Phát nhạc khi user đã tương tác (tránh browser chặn autoplay)
  if (window.backgroundMusic) {
    window.backgroundMusic.play().catch(function(err) {
      console.warn("[Ready] Không thể phát nhạc:", err);
    });
  }
  // Mở khóa phát video nền nếu đang bị trình duyệt chặn autoplay
  var bgVideo = document.getElementById("backgroundVideo");
  if (bgVideo && bgVideo.paused) {
    bgVideo.muted = true;
    bgVideo.play().catch(function(err) {
      console.warn("[Ready] Không thể phát video:", err);
    });
  }
  // Reset intro và bắt đầu hiệu ứng bắn tim từ đầu
  resetIntro();
  startAnimation();
}
window.dismissReadyOverlay = dismissReadyOverlay;

function checkOrientation() {
  // Khi đã vào book mode thì không hiện rotate notice/ready overlay nữa
  if (bookMode) return;

  const notice = document.getElementById("rotateNotice");
  const readyOverlay = document.getElementById("readyToStartOverlay");
  const video = document.getElementById("backgroundVideo");
  const leftCupid = document.getElementById("leftCupid");
  const rightCupid = document.getElementById("rightCupid");
  const doubleHeart = document.getElementById("doubleHeart");
  const leftBottom = document.getElementById("leftBottom");
  const rightBottom = document.getElementById("rightBottom");
  const bear = document.getElementById("bear");

  if (notice) notice.style.display = "none";
  if (canvas) canvas.style.display = "block";
  if (bear) bear.style.display = "block";
  if (video) video.style.display = "block";
  if (leftCupid) leftCupid.style.display = "block";
  if (rightCupid) rightCupid.style.display = "block";
  if (doubleHeart) doubleHeart.style.display = "block";
  if (leftBottom) leftBottom.style.display = "block";
  if (rightBottom) rightBottom.style.display = "block";

  // Hiện overlay Sẵn sàng (trừ khi user đã bấm rồi)
  if (readyOverlay && !readyOverlayDismissed) {
    readyOverlay.style.display = "flex";
    readyOverlay.style.opacity = "1";
    readyOverlay.style.pointerEvents = "auto";
  }
}

function resizeCanvas() {
  const viewport = getViewportSize();
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  if (isPortraitNarrowViewport()) {
    bearX = Math.max(32, Math.round(viewport.width * 0.055));
    bearY = canvas.height - 54;
  } else {
    bearX = 70;
    bearY = canvas.height - 80;
  }

  // Stars removed - using simple pink background
  checkOrientation();

  fontSize = computeIntroFontSizeForCanvas();
  lineHeight = getIntroLineHeight(fontSize);

  targetDotsQueue = [];
  currentCharIndex = 0;
  animationDone = false;
  generateAllTargetDots();
}

function resetIntro() {
  if (bookMode) return;
  if (buttonShowFallbackTimer) {
    clearTimeout(buttonShowFallbackTimer);
    buttonShowFallbackTimer = null;
  }
  animationDone = false;
  dots = [];
  explosions.length = 0;
  introFinishedOnce = false;
  var openBookBtn = document.getElementById('openBookBtn');
  if (openBookBtn) {
    openBookBtn.style.display = 'none';
    openBookBtn.style.opacity = '0';
  }
  var bear = document.getElementById('bear');
  if (bear) {
    bear.src = assetPrefix + "images/intro/shooting_heart.gif";
    delete bear.dataset.changed;
  }
  // Không gọi scheduleBearChange() ở đây nữa
  resizeCanvas();
}

var resizeDebounceTimer = null;
function onResizeOrOrientation() {
  if (bookMode) return;
  clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(function() {
    resetIntro();
  }, 150);
}

resizeCanvas();
window.addEventListener('resize', onResizeOrOrientation);
window.addEventListener('orientationchange', onResizeOrOrientation);

// Setup nút Sẵn sàng (tránh browser chặn nhạc autoplay)
(function setupReadyButton() {
  var btn = document.getElementById("readyToStartBtn");
  var overlay = document.getElementById("readyToStartOverlay");
  if (btn) {
    btn.onclick = function(e) {
      if (e) e.stopPropagation();
      dismissReadyOverlay();
    };
    btn.ontouchend = function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      dismissReadyOverlay();
    };
  }
  if (overlay) {
    overlay.onclick = function() {
      dismissReadyOverlay();
    };
  }
})();

function createExplosion(x, y) {
  const count = 20;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    explosions.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 60,
      opacity: 1
    });
  }
}

function drawStars() {
  for (let star of stars) {
    star.alpha += star.delta;
    if (star.alpha >= 1 || star.alpha <= 0) {
      star.delta = -star.delta;
    }

    ctx.save();
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#ffb6c1";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function createShootingStar() {
  const startX = Math.random() * canvas.width;
  const startY = Math.random() * canvas.height / 2;
  shootingStars.push({
    x: startX,
    y: startY,
    length: Math.random() * 300 + 100,
    speed: Math.random() * 10 + 6,
    angle: Math.PI / 4,
    opacity: 1
  });
}

function drawShootingStars() {
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    const endX = s.x - Math.cos(s.angle) * s.length;
    const endY = s.y - Math.sin(s.angle) * s.length;

    const gradient = ctx.createLinearGradient(s.x, s.y, endX, endY);
    gradient.addColorStop(0, `rgba(255, 182, 193, ${s.opacity})`);
    gradient.addColorStop(1, `rgba(255, 182, 193, 0)`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    s.x += Math.cos(s.angle) * s.speed;
    s.y += Math.sin(s.angle) * s.speed;
    s.opacity -= 0.01;

    if (s.opacity <= 0) {
      shootingStars.splice(i, 1);
    }
  }
}

function generateCharDots(char, x, y) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.font = getFontString(fontSize);
  tempCtx.fillStyle = "#ff69b4";
  tempCtx.textAlign = "left";
  tempCtx.fillText(char, x, y);

  const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;
  const charDots = [];

  const dotSpacing = getResponsiveDotSpacing();
  for (let dy = 0; dy < canvas.height; dy += dotSpacing) {
    for (let dx = 0; dx < canvas.width; dx += dotSpacing) {
      const index = (dy * canvas.width + dx) * 4;
      if (imageData[index + 3] > 140) {
        charDots.push({ x: dx, y: dy });
      }
    }
  }

  return charDots;
}

function generateAllTargetDots() {
  const tempCtx = document.createElement('canvas').getContext('2d');
  tempCtx.font = getFontString(fontSize);

  const maxTextWidth = getIntroMaxTextWidth();
  const parts = getIntroTextParts();
  const lines = buildIntroLinesForParts(
    tempCtx,
    parts,
    maxTextWidth,
    isPortraitNarrowViewport()
  );
  
  // Calculate total height of text container (from baseline of first line to baseline of last line)
  const totalTextHeight = (lines.length - 1) * lineHeight;
  const verticalOffset = 10; // Push text down by 10px
  const startY = canvas.height / 2 - totalTextHeight / 2 + verticalOffset;
  const charSpacing = getIntroLetterSpacing(fontSize);

  lines.forEach((line, lineIndex) => {
    const chars = getGraphemes(line);
    let totalLineWidth = 0;
    for (let i = 0; i < chars.length; i++) {
      totalLineWidth += tempCtx.measureText(chars[i]).width;
      if (i < chars.length - 1) totalLineWidth += charSpacing;
    }

    let xCursor = (canvas.width - totalLineWidth) / 2;
    const y = startY + lineIndex * lineHeight;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (char === " ") {
        xCursor += tempCtx.measureText(" ").width + charSpacing;
        targetDotsQueue.push([]);
        continue;
      }

      const charDots = generateCharDots(char, xCursor, y);
      targetDotsQueue.push(charDots);
      xCursor += tempCtx.measureText(char).width + charSpacing;
    }
  });
}

function shootDot() {
  if (animationDone) return;

  while (
    currentCharIndex < targetDotsQueue.length &&
    targetDotsQueue[currentCharIndex].length === 0
  ) {
    currentCharIndex++;
  }

  const targetDots = targetDotsQueue[currentCharIndex];
  if (!targetDots || targetDots.length === 0) return;

  const batch = 10;
  var spawnJitterX = isPortraitNarrowViewport() ? 14 : 20;
  var spawnOffX = isPortraitNarrowViewport() ? 28 : 40;
  for (let i = 0; i < batch; i++) {
    const target = targetDots.shift();
    if (!target) return;
    const angle = Math.random() * Math.PI / 6 - Math.PI / 12;
    const speed = 5 + Math.random() * 3;
    dots.push({
      x: bearX + spawnOffX + Math.random() * spawnJitterX,
      y: bearY - 18 + Math.random() * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      targetX: target.x,
      targetY: target.y
    });
  }

  if (targetDots.length === 0 && currentCharIndex < targetDotsQueue.length - 1) {
    currentCharIndex++;
  }
  
}

function animate() {
  if (bookMode) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  dots.forEach(dot => {
    const dx = dot.targetX - dot.x;
    const dy = dot.targetY - dot.y;
    dot.vx += dx * 0.005; // Tăng lực hướng tâm để kéo về nhanh hơn
    dot.vy += dy * 0.005;
    dot.vx *= 0.92; // Tăng damping để giảm tốc độ nhanh hơn
    dot.vy *= 0.88;
    dot.x += dot.vx;
    dot.y += dot.vy;

    if (heartImage.complete && heartImage.naturalWidth > 0) {
      const size = getFlyingHeartDrawSize();
      ctx.save();
      ctx.drawImage(heartImage, dot.x - size / 2, dot.y - size / 2, size, size);
      ctx.restore();
    } else {
      const em = getFlyingHeartDrawSize();
      ctx.font = em + "px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("❤️", dot.x, dot.y);
    }
  });

  for (let i = explosions.length - 1; i >= 0; i--) {
    const p = explosions[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life--;
    p.opacity -= 0.015;

    ctx.globalAlpha = Math.max(p.opacity, 0);
    ctx.fillStyle = "#ff69b4";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (p.life <= 0 || p.opacity <= 0) {
      explosions.splice(i, 1);
    }
  }

  if (!animationDone && currentCharIndex >= targetDotsQueue.length) {
    var allSettled = dots.every(function (dot) {
      return Math.abs(dot.targetX - dot.x) < 18 && Math.abs(dot.targetY - dot.y) < 18;
    });
    if (allSettled) {
      animationDone = true;
      if (buttonShowFallbackTimer) {
        clearTimeout(buttonShowFallbackTimer);
        buttonShowFallbackTimer = null;
      }
      if (!introFinishedOnce) {
        introFinishedOnce = true;
        showOpenBookButton();
      }
    } else if (!buttonShowFallbackTimer) {
      // Fallback: hiện nút sau tối đa 2.5s kể từ lúc bắn hết chữ, không cần đợi dot dừng hẳn
      buttonShowFallbackTimer = setTimeout(function () {
        buttonShowFallbackTimer = null;
        if (animationDone || introFinishedOnce) return;
        animationDone = true;
        introFinishedOnce = true;
        showOpenBookButton();
      }, 2500);
    }
  }

  rafId = requestAnimationFrame(animate);
}

canvas.addEventListener("click", (e) => {
  createExplosion(e.clientX, e.clientY);
});
canvas.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  if (touch) {
    createExplosion(touch.clientX, touch.clientY);
  }
  showOpenBookButton();
});

// Click vào canvas cũng tự động gợi ý hiện nút mở sổ
canvas.addEventListener("click", () => {
  showOpenBookButton();
});

// Wait for heart image to load AND overlay dismissed before starting animation
function startAnimation() {
  if (!heartImageLoaded && !heartImage.complete) {
    setTimeout(startAnimation, 50);
    return;
  }
  // Chỉ chạy khi user đã ấn Sẵn sàng (tránh chạy khi overlay đang hiển thị)
  var isDismissed = readyOverlayDismissed || (typeof window !== 'undefined' && window.readyOverlayDismissed);
  if (!isDismissed) {
    return;
  }
  readyOverlayDismissed = true;
  if (typeof window !== 'undefined') window.readyOverlayDismissed = true;

  if (shootIntervalId) return; // Đã chạy rồi
  
  // Chỉ bắt đầu timer thay đổi bear khi animation thực sự bắt đầu
  scheduleBearChange();
  shootIntervalId = setInterval(shootDot, getResponsiveShootInterval());
  animate();

  // TỰ ĐỘNG HIỆN NÚT "CHẠM ĐỂ MỞ SỔ ❤️" SAU 2 GIÂY ĐỂ NGƯỜI DÙNG KHÔNG BỊ CHỜ ĐỢI LÂU
  setTimeout(function() {
    showOpenBookButton();
  }, 2000);
}
window.startIntroAnimation = startAnimation;

// Start animation after heart image is loaded
startAnimation();

// Setup background video an toàn cho iOS / iPadOS và Desktop Safari
const backgroundVideo = document.getElementById("backgroundVideo");
const videoSource = document.getElementById("videoSource");
if (backgroundVideo) {
  // Cấu hình bắt buộc cho WebKit/Safari để được phép autoplay
  backgroundVideo.muted = true;
  backgroundVideo.defaultMuted = true;
  backgroundVideo.playsInline = true;
  backgroundVideo.setAttribute('muted', '');
  backgroundVideo.setAttribute('playsinline', '');
  backgroundVideo.setAttribute('webkit-playsinline', '');

  const videoPath = assetPrefix + "background_intro.mp4";
  
  // Thiết lập poster và src trực tiếp trên video element (chuẩn WebKit)
  if (!backgroundVideo.poster) {
    backgroundVideo.poster = assetPrefix + "background_intro_poster.jpg";
  }
  if (!backgroundVideo.src || backgroundVideo.src === window.location.href) {
    backgroundVideo.src = videoPath;
  }
  if (videoSource && !videoSource.src) {
    videoSource.src = videoPath;
  }

  function tryPlayBgVideo() {
    if (!backgroundVideo) return;
    backgroundVideo.muted = true;
    var promise = backgroundVideo.play();
    if (promise !== undefined) {
      promise.catch(function(err) {
        console.warn('[Video] Autoplay chưa được cấp quyền, chờ tương tác người dùng:', err);
      });
    }
  }

  // Thử phát ngay lập tức và tại các mốc sẵn sàng dữ liệu
  tryPlayBgVideo();
  backgroundVideo.addEventListener('loadedmetadata', tryPlayBgVideo);
  backgroundVideo.addEventListener('canplay', tryPlayBgVideo);
  backgroundVideo.addEventListener('loadeddata', tryPlayBgVideo);

  backgroundVideo.addEventListener('error', function(e) {
    console.error('Video loading error:', e);
  });

  // Tương tác chạm/click đầu tiên đảm bảo video được mở khóa nếu iPadOS chặn autoplay
  function unlockBgVideoOnUserGesture() {
    if (backgroundVideo && backgroundVideo.paused) {
      backgroundVideo.muted = true;
      backgroundVideo.play().catch(function() {});
    }
  }
  document.addEventListener('touchstart', unlockBgVideoOnUserGesture, { once: true, passive: true });
  document.addEventListener('click', unlockBgVideoOnUserGesture, { once: true });

  // Chặn context menu (right-click)
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });

  // Chặn long press (touch hold)
  let touchStartTime = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  const LONG_PRESS_DURATION = 500; // 500ms
  const MOVE_THRESHOLD = 10; // 10px

  document.addEventListener('touchstart', function(e) {
    touchStartTime = Date.now();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    // Reset nếu di chuyển quá nhiều
    if (touchStartTime > 0) {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
      if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
        touchStartTime = 0;
      }
    }
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (touchStartTime > 0) {
      const touchDuration = Date.now() - touchStartTime;
      if (touchDuration >= LONG_PRESS_DURATION) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      touchStartTime = 0;
    }
  });

  // Chặn text selection bằng cách chặn các event liên quan
  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  });

  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  });
}

// Change bear image after shooting animation (estimate ~7s for shooting all hearts)
var bearChangeTimer = null;
function scheduleBearChange() {
  if (bearChangeTimer) clearTimeout(bearChangeTimer);
  bearChangeTimer = setTimeout(function() {
    bearChangeTimer = null;
    var bear = document.getElementById("bear");
    if (bear && !bear.dataset.changed) {
      bear.src = assetPrefix + "images/intro/after_shooting.gif";
      bear.dataset.changed = "true";
    }
  }, 7000);  // 7000ms = 7 giây
}
