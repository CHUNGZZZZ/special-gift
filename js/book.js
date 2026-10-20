var flip = document.querySelector('.book-content');
var uno = document.querySelectorAll('.book');

var contZindex = 2;
var customZindex = 1;

// Debug CTA (bật/tắt log)
var DEBUG_CTA = true;

// ===== Page indicator (số lần lật) =====
var currentFlip = 0; // Số lần lật hiện tại (0 = chưa lật, chỉ mở bìa)
var totalFlips = 3; // Tổng số lần lật có nội dung (không tính lần lật đến bìa sau)
var pageIndicator = document.getElementById('pageIndicator');
var currentPageEl = document.getElementById('currentPage');

// Hàm để cập nhật totalFlips từ bên ngoài (từ load-valentine-data.js)
function setTotalFlips(count) {
    totalFlips = count;
    // Cập nhật totalPages indicator nếu chưa được cập nhật
    const totalPagesEl = document.getElementById('totalPages');
    if (totalPagesEl && totalPagesEl.textContent !== String(count)) {
        totalPagesEl.textContent = count;
    }
}

// Expose hàm để có thể gọi từ bên ngoài
if (typeof window !== 'undefined') {
    window.setTotalFlips = setTotalFlips;
    window.totalFlips = totalFlips; // Expose biến để có thể đọc
}

function updatePageIndicator(flip) {
	currentFlip = flip;
	if (currentPageEl) {
		currentPageEl.textContent = currentFlip;
	}
	// Chỉ hiện indicator sau lần lật đầu tiên (khi flip >= 1)
	if (pageIndicator) {
		if (currentFlip >= 1) {
			// Hiện indicator sau khi lật xong
			setTimeout(function(){
				pageIndicator.classList.add('show');
			}, 600);
		} else {
			// Ẩn indicator khi chưa lật (chỉ mở bìa)
			pageIndicator.classList.remove('show');
		}
	}
}


// Hàm quản lý dịch book khi lật tờ cuối
function shiftBookFinal(direction, delay) {
	delay = delay || 500;
	setTimeout(function(){
		if (direction === 'right') {
			// Dịch thêm 128px sang phải
			flip.classList.remove("trnsf-reset", "trnsf");
			flip.classList.add("trnsf-final");
		} else if (direction === 'left') {
			// Dịch lại về vị trí trnsf (vị trí khi mở bìa)
			flip.classList.remove("trnsf-final", "trnsf-reset");
			flip.classList.add("trnsf");
		}
	}, delay);
}

// ===== Final CTA: doubleHeart và cupids trượt xuống, sau đó hiện giftBox riêng =====
var bookContent = document.querySelector('.book-content');
var doubleHeart = document.getElementById('doubleHeart');
var doubleHeartGlow = document.getElementById('doubleHeartGlow');
var giftBox = document.getElementById('giftBox');
var noFinalGiftImg = document.getElementById('noFinalGiftImg');
var giftBoxGlow = document.getElementById('giftBoxGlow');
var doubleHeartOriginalSrc = doubleHeart ? doubleHeart.getAttribute('src') : null;
var finalCtaTimers = [];
var dropAnim = null;

// ===== Cupids converge: leftCupid và rightCupid trượt chéo về giữa =====
var leftCupid = document.getElementById('leftCupid');
var rightCupid = document.getElementById('rightCupid');
var leftCupidAnim = null;
var rightCupidAnim = null;
var cupidsConverged = false;
var doubleHeartDropped = false;

function ctaSetTimeout(fn, ms) {
	var id = setTimeout(fn, ms);
	finalCtaTimers.push(id);
	return id;
}
function clearFinalCtaTimers() {
	while (finalCtaTimers.length) {
		clearTimeout(finalCtaTimers.pop());
	}
}

function clearDropAnim() {
	try {
		if (dropAnim) dropAnim.cancel();
	} catch (e) {}
	dropAnim = null;
}

function clearCupidsAnims() {
	try {
		if (leftCupidAnim) leftCupidAnim.cancel();
		if (rightCupidAnim) rightCupidAnim.cancel();
	} catch (e) {}
	leftCupidAnim = null;
	rightCupidAnim = null;
	cupidsConverged = false;
}

function resetFinalCta() {
	clearFinalCtaTimers();
	clearDropAnim();
	clearCupidsAnims();
	cupidsConverged = false;
	doubleHeartDropped = false;
	
	if (doubleHeart) {
		doubleHeart.classList.remove('cta-drop', 'cta-heart', 'fade-out', 'show');
		// clear inline fade overrides
		doubleHeart.style.opacity = '';
		doubleHeart.style.transition = '';
		doubleHeart.style.display = '';
		if (doubleHeartOriginalSrc) doubleHeart.setAttribute('src', doubleHeartOriginalSrc);
	}
	if (doubleHeartGlow) {
		doubleHeartGlow.classList.remove('show');
		doubleHeartGlow.style.display = 'none';
	}
	
	// Reset cupids về vị trí ban đầu
	if (leftCupid) {
		leftCupid.style.display = '';
		leftCupid.style.left = '';
		leftCupid.style.top = '';
		leftCupid.style.right = '';
		leftCupid.style.width = '';
		leftCupid.style.height = '';
		leftCupid.style.transform = '';
		leftCupid.style.transition = '';
		leftCupid.style.opacity = '';
		leftCupid.classList.remove('cupid-converge', 'cupid-fade-out');
	}
	if (rightCupid) {
		rightCupid.style.display = '';
		rightCupid.style.left = '';
		rightCupid.style.top = '';
		rightCupid.style.right = '';
		rightCupid.style.width = '';
		rightCupid.style.height = '';
		rightCupid.style.transform = '';
		rightCupid.style.transition = '';
		rightCupid.style.opacity = '';
		rightCupid.classList.remove('cupid-converge', 'cupid-fade-out');
	}
	
	// Ẩn giftBox và noFinalGiftImg
	if (giftBox) {
		giftBox.style.display = 'none';
		giftBox.classList.remove('show');
		giftBox.style.opacity = '';
		giftBox.style.transform = '';
		giftBox.style.transition = '';
	}
	if (noFinalGiftImg) {
		noFinalGiftImg.style.display = 'none';
		noFinalGiftImg.classList.remove('show');
		noFinalGiftImg.style.opacity = '';
		noFinalGiftImg.style.transform = '';
		noFinalGiftImg.style.transition = '';
		noFinalGiftImg.style.position = '';
		noFinalGiftImg.style.top = '';
		noFinalGiftImg.style.left = '';
		noFinalGiftImg.style.width = '';
		noFinalGiftImg.style.zIndex = '';
	}
	if (giftBoxGlow) {
		giftBoxGlow.style.display = 'none';
		giftBoxGlow.classList.remove('show');
		giftBoxGlow.style.opacity = '';
	}
	
	var prevBtn = document.getElementById('bookPrevBtn');
	var nextBtn = document.getElementById('bookNextBtn');
	if (prevBtn) prevBtn.style.display = 'flex';
	if (nextBtn) nextBtn.style.display = 'flex';

	document.body.classList.remove('final-cta');
}

function showGiftBox() {
	var hasFinalGift = typeof window.hasFinalGift !== 'undefined' ? window.hasFinalGift : true;

	var prevBtn = document.getElementById('bookPrevBtn');
	var nextBtn = document.getElementById('bookNextBtn');
	if (prevBtn) prevBtn.style.display = 'none';
	if (nextBtn) nextBtn.style.display = 'none';

	var container = document.getElementById('giftBoxContainer');
	var giftBoxEl = document.getElementById('giftBox');
	var giftBoxGlowEl = document.getElementById('giftBoxGlow');
	var openSphereBtnEl = document.getElementById('openSphereBtn');

	if (container) {
		container.style.display = 'flex';
		container.classList.add('show');
	}
	if (giftBoxEl) {
		giftBoxEl.style.display = 'block';
		giftBoxEl.classList.add('show');
		giftBoxEl.style.opacity = '1';
		giftBoxEl.onclick = function() {
			if (typeof window.openSphereScreen === 'function') window.openSphereScreen();
		};
		giftBoxEl.ontouchend = function(e) {
			if (e) e.preventDefault();
			if (typeof window.openSphereScreen === 'function') window.openSphereScreen();
		};
	}
	if (giftBoxGlowEl) {
		giftBoxGlowEl.style.display = 'block';
		giftBoxGlowEl.classList.add('show');
		giftBoxGlowEl.style.opacity = '1';
	}
	if (openSphereBtnEl) {
		openSphereBtnEl.style.display = 'inline-block';
		openSphereBtnEl.onclick = function() {
			if (typeof window.openSphereScreen === 'function') window.openSphereScreen();
		};
		openSphereBtnEl.ontouchend = function(e) {
			if (e) e.preventDefault();
			if (typeof window.openSphereScreen === 'function') window.openSphereScreen();
		};
	}

	// Tự động chuyển màn sau 4.5s nếu người dùng chưa bấm
	setTimeout(function() {
		if (typeof isSphereActive !== 'undefined' && !isSphereActive) {
			if (typeof window.openSphereScreen === 'function') {
				console.log('Auto transitioning to sphere screen...');
				window.openSphereScreen();
			}
		}
	}, 4500);
}

function startCupidsConverge() {
	if (!leftCupid || !rightCupid) return;

	// Reset để chạy lại animation từ đầu
	clearCupidsAnims();

	// ===== Left Cupid: từ góc trên trái → trượt chéo xuống về bên phải → giữa màn hình =====
	var leftRect = leftCupid.getBoundingClientRect();
	var rightRect = rightCupid.getBoundingClientRect();
	
	// Vị trí giữa màn hình (cùng với double heart)
	var centerX = window.innerWidth / 2;
	var centerY = window.innerHeight / 2;
	
	// Left cupid: từ góc trên trái → giữa màn hình (trượt chéo xuống về bên phải)
	var leftDx = centerX - leftRect.left - leftRect.width / 2;
	var leftDy = centerY - leftRect.top - leftRect.height / 2;
	
	// Right cupid: từ góc trên phải → giữa màn hình (trượt chéo xuống về bên trái)
	var rightDx = centerX - rightRect.left - rightRect.width / 2;
	var rightDy = centerY - rightRect.top - rightRect.height / 2;

	// Freeze vị trí hiện tại cho leftCupid
	leftCupid.style.left = leftRect.left + 'px';
	leftCupid.style.top = leftRect.top + 'px';
	leftCupid.style.right = '';
	leftCupid.style.width = leftRect.width + 'px';
	leftCupid.style.height = leftRect.height + 'px';
	leftCupid.style.transform = 'translate3d(0,0,0)';
	leftCupid.style.transition = 'none';
	leftCupid.classList.add('cupid-converge');
	void leftCupid.offsetWidth;

	// Freeze vị trí hiện tại cho rightCupid
	rightCupid.style.right = '';
	rightCupid.style.left = rightRect.left + 'px';
	rightCupid.style.top = rightRect.top + 'px';
	rightCupid.style.width = rightRect.width + 'px';
	rightCupid.style.height = rightRect.height + 'px';
	rightCupid.style.transform = 'translate3d(0,0,0)';
	rightCupid.style.transition = 'none';
	rightCupid.classList.add('cupid-converge');
	void rightCupid.offsetWidth;

	// Animate cả hai cùng lúc
	var animDuration = 1800; // Hơi lâu hơn double heart một chút để tạo hiệu ứng đẹp
	var animEasing = 'cubic-bezier(0.16, 1, 0.3, 1)';
	
	try {
		// Left cupid animation
		leftCupidAnim = leftCupid.animate(
			[
				{ transform: 'translate3d(0,0,0)' },
				{ transform: 'translate3d(' + leftDx + 'px,' + leftDy + 'px,0)' }
			],
			{ duration: animDuration, easing: animEasing, fill: 'forwards' }
		);

		// Right cupid animation
		rightCupidAnim = rightCupid.animate(
			[
				{ transform: 'translate3d(0,0,0)' },
				{ transform: 'translate3d(' + rightDx + 'px,' + rightDy + 'px,0)' }
			],
			{ duration: animDuration, easing: animEasing, fill: 'forwards' }
		);

		// Đếm số animation hoàn thành
		var completedCount = 0;
		var checkAllComplete = function() {
			completedCount++;
			if (completedCount === 2) {
				cupidsConverged = true;
				// Cleanup freeze styles
				leftCupid.style.left = '';
				leftCupid.style.top = '';
				leftCupid.style.width = '';
				leftCupid.style.height = '';
				leftCupid.style.transform = '';
				leftCupid.style.transition = '';
				
				rightCupid.style.left = '';
				rightCupid.style.top = '';
				rightCupid.style.width = '';
				rightCupid.style.height = '';
				rightCupid.style.transform = '';
				rightCupid.style.transition = '';
				
				// Đặt về giữa màn hình bằng CSS
				leftCupid.style.left = '50%';
				leftCupid.style.top = '50%';
				leftCupid.style.transform = 'translate(-50%, -50%)';
				
				rightCupid.style.left = '50%';
				rightCupid.style.top = '50%';
				rightCupid.style.transform = 'translate(-50%, -50%)';
				
				// Chỉ clear tham chiếu animation, KHÔNG gọi clearCupidsAnims() vì nó reset cupidsConverged = false
				leftCupidAnim = null;
				rightCupidAnim = null;
				
				// KHÔNG ẩn cupids ngay, đợi fade-out cùng doubleHeart
				checkAndFadeOutAll();
			}
		};

		leftCupidAnim.onfinish = checkAllComplete;
		rightCupidAnim.onfinish = checkAllComplete;
	} catch (e) {
		// Fallback nếu WAAPI không có
		if (DEBUG_CTA) console.warn('cupids converge WAAPI failed, using fallback:', e);
		cupidsConverged = true;
		// KHÔNG ẩn cupids ngay, đợi fade-out cùng doubleHeart
		checkAndFadeOutAll();
	}
}

function checkAndFadeOutAll() {
	// Chờ cả cupids và doubleHeart đều trượt xong rồi mới fade-out đồng thời
	// Kiểm tra: cupids đã tụ hợp xong VÀ doubleHeart đã trượt xong
	if (cupidsConverged && doubleHeartDropped && !dropAnim) {
		// Fade-out cả 3 cùng lúc
		fadeOutAllTogether();
	}
}

function fadeOutAllTogether() {
	// Fade-out cả 3: leftCupid, rightCupid, và doubleHeart cùng lúc
	var fadeDuration = 800; // 0.8s
	
	if (leftCupid) {
		leftCupid.style.transition = 'opacity ' + (fadeDuration / 1000) + 's ease';
		leftCupid.style.opacity = '0';
		leftCupid.classList.add('cupid-fade-out');
	}
	if (rightCupid) {
		rightCupid.style.transition = 'opacity ' + (fadeDuration / 1000) + 's ease';
		rightCupid.style.opacity = '0';
		rightCupid.classList.add('cupid-fade-out');
	}
	if (doubleHeart) {
		doubleHeart.style.transition = 'opacity ' + (fadeDuration / 1000) + 's ease';
		doubleHeart.style.opacity = '0';
	}
	if (doubleHeartGlow) {
		doubleHeartGlow.style.transition = 'opacity ' + (fadeDuration / 1000) + 's ease';
		doubleHeartGlow.style.opacity = '0';
	}
	
	// Sau khi fade-out xong, ẩn hoàn toàn và hiện giftBox
	ctaSetTimeout(function(){
		if (leftCupid) {
			leftCupid.style.display = 'none';
		}
		if (rightCupid) {
			rightCupid.style.display = 'none';
		}
		if (doubleHeart) {
			doubleHeart.style.display = 'none';
		}
		if (doubleHeartGlow) {
			doubleHeartGlow.style.display = 'none';
		}
		
		// Hiện giftBox sau khi fade-out xong
		showGiftBox();
	}, fadeDuration + 50); // Đợi fade out animation xong + buffer
}

function startFinalCtaDrop() {
	if (!doubleHeart) return;
	document.body.classList.add('final-cta');

	// reset để chạy lại animation từ đầu
	clearFinalCtaTimers();
	clearDropAnim();
	doubleHeart.classList.remove('cta-drop', 'cta-gift', 'cta-heart', 'fade-out', 'show');
	if (doubleHeartOriginalSrc) doubleHeart.setAttribute('src', doubleHeartOriginalSrc);
	// clear inline fade overrides
	doubleHeart.style.opacity = '';
	doubleHeart.style.transition = '';

	// ===== Slide to center dựa trên kích thước/position đang hiển thị =====
	var rect = doubleHeart.getBoundingClientRect();
	var targetLeft = (window.innerWidth - rect.width) / 2;
	var targetTop = (window.innerHeight - rect.height) / 2;
	var dx = targetLeft - rect.left;
	var dy = targetTop - rect.top;

	// Freeze đúng vị trí hiện tại bằng px + size đang hiển thị
	doubleHeart.style.left = rect.left + 'px';
	doubleHeart.style.top = rect.top + 'px';
	doubleHeart.style.width = rect.width + 'px';
	doubleHeart.style.height = rect.height + 'px';
	doubleHeart.style.transform = 'translate3d(0,0,0)';
	doubleHeart.style.transition = 'none';
	void doubleHeart.offsetWidth;


	// Animate bằng transform (mượt) nhưng mốc tính từ size/pos thật
	try {
		dropAnim = doubleHeart.animate(
			[
				{ transform: 'translate3d(0,0,0)' },
				{ transform: 'translate3d(' + dx + 'px,' + dy + 'px,0)' }
			],
			{ duration: 1700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
		);
		dropAnim.onfinish = function(){
			// Cleanup freeze styles để quay về dùng CSS class (top/left 50%)
			doubleHeart.style.left = '';
			doubleHeart.style.top = '';
			doubleHeart.style.width = '';
			doubleHeart.style.height = '';
			doubleHeart.style.transform = '';
			doubleHeart.style.transition = '';
			clearDropAnim();
			
			// Đánh dấu doubleHeart đã trượt xong
			doubleHeartDropped = true;
			
			// Đặt doubleHeart ở giữa màn hình (để fade-out sau)
			doubleHeart.style.left = '50%';
			doubleHeart.style.top = '50%';
			doubleHeart.style.transform = 'translate(-50%, -50%)';
			doubleHeart.classList.add('cta-heart');
			
			// Kiểm tra xem cupids đã xong chưa, nếu rồi thì fade-out cùng nhau
			checkAndFadeOutAll();
		};
	} catch (e) {
		// Fallback: nếu WAAPI không có
		if (DEBUG_CTA) console.warn('drop(slide) WAAPI failed, using fallback:', e);
		doubleHeartDropped = true;
		// Đặt doubleHeart ở giữa màn hình
		if (doubleHeart) {
			doubleHeart.style.left = '50%';
			doubleHeart.style.top = '50%';
			doubleHeart.style.transform = 'translate(-50%, -50%)';
			doubleHeart.classList.add('cta-heart');
		}
		checkAndFadeOutAll();
	}
}

// Click vào gift-box để mở quả cầu 3D món quà nhỏ
if (giftBox) {
	giftBox.addEventListener('click', function(){
		if (typeof window.openSphereScreen === 'function') {
			window.openSphereScreen();
		}
	});
}

function showFinalCta(show, delay) {
	delay = delay || 0;
	setTimeout(function(){
		if (show) {
			clearFinalCtaTimers();
			// Ẩn page indicator khi hiện gift box
			if (pageIndicator) {
				pageIndicator.classList.remove('show');
			}
			// Ẩn sách trước
			if (bookContent) {
				bookContent.classList.add('hide-for-gift');

				// Bắt đầu trượt xuống NGAY khi fade-out sách xong (không delay thủ công)
				var started = false;
				var startDropOnce = function(){
					if (started) return;
					started = true;
					// Bắt đầu cả cupids và double heart cùng lúc
					startCupidsConverge();
					startFinalCtaDrop();
				};
				var onEnd = function(ev){
					if (ev && ev.propertyName && ev.propertyName !== 'opacity') return;
					bookContent.removeEventListener('transitionend', onEnd);
					startDropOnce();
				};
				bookContent.addEventListener('transitionend', onEnd);
				// Fallback nếu transitionend không fire
				ctaSetTimeout(function(){
					bookContent.removeEventListener('transitionend', onEnd);
					startDropOnce();
				}, 900);
			} else {
				// Bắt đầu cả cupids và double heart cùng lúc
				startCupidsConverge();
				startFinalCtaDrop();
			}
		} else {
			// Ẩn CTA và hiện lại sách
			resetFinalCta();
			// Đợi CTA fade-out xong rồi mới hiện sách lại cho mượt
			setTimeout(function(){
				if (bookContent) bookContent.classList.remove('hide-for-gift');
				// Hiện lại page indicator
				if (pageIndicator) {
					pageIndicator.classList.add('show');
				}
			}, 850);
		}
	}, delay);
}

// Hàm để khởi tạo event listeners cho các book elements
function initializeBookFlip() {
	// Lấy lại danh sách book elements (có thể đã được tạo động)
	uno = document.querySelectorAll('.book');
	flip = document.querySelector('.book-content');
	
	// Reset z-index counters
	contZindex = 2;
	customZindex = 1;
	
	
	for (var i = 0; i < uno.length; i++) {
		uno[i].style.zIndex = customZindex;
		customZindex--;

		uno[i].addEventListener('click', function(e){

			var tgt = e.target;
			var unoThis = this;
			var frontEl = tgt.closest && tgt.closest('.face-front');
			var backEl = tgt.closest && tgt.closest('.face-back');
			var portadaEl = tgt.closest && tgt.closest('#portada');
			var trsfEl = tgt.closest && tgt.closest('#trsf');
			var portadaBackEl = unoThis.querySelector('#portada-back'); // Check xem có phải tờ cuối không

			unoThis.style.zIndex = contZindex;
			contZindex++;

			if (frontEl && unoThis.contains(frontEl)) {
				unoThis.style.zIndex = contZindex;
				contZindex +=20;
				setTimeout(function(){
					unoThis.style.transform = 'rotateY(-180deg)';
					// Nếu là tờ cuối (có portada-back), không tăng số lần lật (vì đó là bìa sau, không có nội dung)
					if (portadaBackEl) {
						// Không cập nhật số lần lật, vì đây là bìa sau (không có nội dung)
						shiftBookFinal('right', 500);
						// Sau khi trang cuối hiện ra: ẩn sách -> doubleHeart rơi xuống -> đổi thành gift-box
						showFinalCta(true, 1000);
					} else {
						// Tính toán số lần lật mới: lật từ front sang back = tăng 1 lần lật
						var newFlip = currentFlip + 1;
						if (newFlip <= totalFlips) {
							updatePageIndicator(newFlip);
						}
					}
				}, 500);
			}
			if (backEl && unoThis.contains(backEl)) {
				unoThis.style.zIndex = contZindex;
				contZindex +=20;

				// Nếu đang ở bìa sau (portada-back) thì cho CTA fade-out ngay khi click
				var isPortadaBack = tgt.closest && tgt.closest('#portada-back');
				if (isPortadaBack) {
					showFinalCta(false, 0);
				}

				setTimeout(function(){
					unoThis.style.transform = 'rotateY(0deg)';
					// Nếu là mặt sau tờ cuối (portada-back), dịch lại 128px về trái và không giảm số lần lật
					if (isPortadaBack) {
						shiftBookFinal('left', 500);
						// Giữ nguyên số lần lật là totalFlips (vì đang quay lại từ bìa sau)
						updatePageIndicator(totalFlips);
					} else {
						// Tính toán số lần lật mới: lật từ back sang front = giảm 1 lần lật
						var newFlip = currentFlip - 1;
						if (newFlip >= 0) {
							updatePageIndicator(newFlip);
						}
					}
				}, 500);
			}

			if (portadaEl) {
				flip.classList.remove("trnsf-reset");
				flip.classList.add("trnsf");
				// Đang ở bìa (chưa lật) = 0 lần lật
				updatePageIndicator(0);
			}
			if (trsfEl) {
				flip.classList.remove("trnsf");
				flip.classList.add("trnsf-reset");
				// Đã lật lần 1 (mặt sau bìa)
				updatePageIndicator(1);
			}

		});
	}
}

// Hàm lật trang kế tiếp (Next)
function flipNextPage() {
	if (!uno || !uno.length) uno = document.querySelectorAll('.book');
	if (!uno.length) return;

	if (currentFlip === 0) {
		// Lật mở bìa sách
		var b = uno[0];
		b.style.zIndex = contZindex;
		contZindex += 20;
		flip.classList.remove("trnsf-reset");
		flip.classList.add("trnsf");
		b.style.transform = 'rotateY(-180deg)';
		updatePageIndicator(1);
	} else if (currentFlip < uno.length - 1) {
		// Lật các trang bên trong
		var b = uno[currentFlip];
		b.style.zIndex = contZindex;
		contZindex += 20;
		b.style.transform = 'rotateY(-180deg)';
		updatePageIndicator(currentFlip + 1);
	} else if (currentFlip === uno.length - 1) {
		// Lật trang cuối đến bìa sau -> Hiện quà tặng
		var b = uno[uno.length - 1];
		b.style.zIndex = contZindex;
		contZindex += 20;
		b.style.transform = 'rotateY(-180deg)';
		shiftBookFinal('right', 500);
		showFinalCta(true, 1000);
	}
}

// Hàm lật trang trước (Prev)
function flipPrevPage() {
	if (!uno || !uno.length) uno = document.querySelectorAll('.book');
	if (!uno.length) return;

	// Nếu đang ở màn hình quà tặng cuối
	if (document.body.classList.contains('final-cta')) {
		showFinalCta(false, 0);
		var lastBook = uno[uno.length - 1];
		lastBook.style.zIndex = contZindex;
		contZindex += 20;
		lastBook.style.transform = 'rotateY(0deg)';
		shiftBookFinal('left', 500);
		updatePageIndicator(totalFlips);
		return;
	}

	if (currentFlip > 1) {
		var prevBook = uno[currentFlip - 1];
		prevBook.style.zIndex = contZindex;
		contZindex += 20;
		prevBook.style.transform = 'rotateY(0deg)';
		updatePageIndicator(currentFlip - 1);
	} else if (currentFlip === 1) {
		var coverBook = uno[0];
		coverBook.style.zIndex = contZindex;
		contZindex += 20;
		coverBook.style.transform = 'rotateY(0deg)';
		flip.classList.remove("trnsf");
		flip.classList.add("trnsf-reset");
		updatePageIndicator(0);
	}
}

// Tự động mở bìa sách sau 1.5 giây để người dùng thấy ngay trang 1 lung linh
var autoOpenTimer = null;
function checkAutoOpenBook() {
	if (autoOpenTimer) clearTimeout(autoOpenTimer);
	autoOpenTimer = setTimeout(function() {
		var secScreen = document.getElementById('secondScreen');
		if (secScreen && secScreen.classList.contains('is-visible') && currentFlip === 0) {
			console.log('Auto opening book cover...');
			flipNextPage();
		}
	}, 1500);
}

// Hàm để re-initialize (gọi lại khi book được tạo động)
function reinitializeBookFlip() {
	initializeBookFlip();
	var prevBtn = document.getElementById('bookPrevBtn');
	var nextBtn = document.getElementById('bookNextBtn');
	if (prevBtn) {
		prevBtn.onclick = function(e) {
			e.stopPropagation();
			flipPrevPage();
		};
	}
	if (nextBtn) {
		nextBtn.onclick = function(e) {
			e.stopPropagation();
			flipNextPage();
		};
	}
}

// Expose hàm để có thể gọi từ bên ngoài
if (typeof window !== 'undefined') {
	window.reinitializeBookFlip = reinitializeBookFlip;
	window.flipNextPage = flipNextPage;
	window.flipPrevPage = flipPrevPage;
	window.checkAutoOpenBook = checkAutoOpenBook;
}

// Khởi tạo lần đầu
initializeBookFlip();
var prevBtn = document.getElementById('bookPrevBtn');
var nextBtn = document.getElementById('bookNextBtn');
if (prevBtn) {
	prevBtn.onclick = function(e) {
		e.stopPropagation();
		flipPrevPage();
	};
}
if (nextBtn) {
	nextBtn.onclick = function(e) {
		e.stopPropagation();
		flipNextPage();
	};
}
if (window.GIFT_DATA && window.GIFT_DATA.book && Array.isArray(window.GIFT_DATA.book.pages)) {
	setTotalFlips(window.GIFT_DATA.book.pages.length);
}

