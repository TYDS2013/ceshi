// =============================================
// 公共功能：时钟、主题、轮播、返回顶部、导航高亮、登录状态
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    // ----- 1. 实时时钟 -----
    function updateClock() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const wd = weekdays[now.getDay()];
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const clockEl = document.getElementById('clock');
        if (clockEl) {
            clockEl.textContent = `${year}-${month}-${day}  星期${wd}  ${hours}:${minutes}:${seconds}`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ----- 2. 亮/暗主题 -----
    const themeToggle = document.getElementById('themeToggle');
    const themeButtons = themeToggle ? themeToggle.querySelectorAll('button') : [];
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
    applyTheme(currentTheme);

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }
    themeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            applyTheme(this.dataset.theme);
        });
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    // ----- 3. 轮播图 -----
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dots span');
    let currentSlide = 0;
    let intervalId = null;
    if (slides.length > 0) {
        function showSlide(index) {
            slides.forEach((s, i) => s.classList.toggle('active', i === index));
            dots.forEach((d, i) => d.classList.toggle('active', i === index));
            currentSlide = index;
        }
        function nextSlide() { showSlide((currentSlide + 1) % slides.length); }
        function prevSlide() { showSlide((currentSlide - 1 + slides.length) % slides.length); }
        intervalId = setInterval(nextSlide, 5000);
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                clearInterval(intervalId);
                showSlide(i);
                intervalId = setInterval(nextSlide, 5000);
            });
        });
        document.querySelector('.carousel-arrow.left')?.addEventListener('click', () => {
            clearInterval(intervalId);
            prevSlide();
            intervalId = setInterval(nextSlide, 5000);
        });
        document.querySelector('.carousel-arrow.right')?.addEventListener('click', () => {
            clearInterval(intervalId);
            nextSlide();
            intervalId = setInterval(nextSlide, 5000);
        });
    }

    // ----- 4. 返回顶部 -----
    const backTop = document.getElementById('backTop');
    if (backTop) {
        window.addEventListener('scroll', () => {
            backTop.classList.toggle('show', window.scrollY > 300);
        });
        backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // ----- 5. 导航高亮 -----
    const navLinks = document.querySelectorAll('.top-nav a');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });

    // ----- 6. 登录状态 UI 更新 -----
    updateLoginUI();

    // ----- 7. 加载动画隐藏（若存在）-----
    const loader = document.getElementById('loader');
    if (loader) {
        // 如果页面已完全加载，立即隐藏；否则等待 load 事件
        if (document.readyState === 'complete') {
            loader.classList.add('hidden');
        } else {
            window.addEventListener('load', function() {
                setTimeout(() => {
                    loader.classList.add('hidden');
                }, 300);
            });
        }
    }
});

// =============================================
// 用户管理工具（全局可用）
// =============================================
window.getUsers = function() {
    const data = localStorage.getItem('users');
    return data ? JSON.parse(data) : {};
};
window.saveUsers = function(users) {
    localStorage.setItem('users', JSON.stringify(users));
};
window.hashPassword = async function(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// =============================================
// 导航栏登录状态显示
// =============================================
function updateLoginUI() {
    const loginNav = document.getElementById('loginNav');
    if (!loginNav) return;
    const user = sessionStorage.getItem('loginUser');
    if (user) {
        loginNav.innerHTML = `
            <span style="color:var(--text-secondary); margin-right:12px;">👤 ${user}</span>
            <button onclick="logoutUser()" style="background:transparent; border:1px solid var(--border-color); border-radius:30px; padding:4px 14px; cursor:pointer; color:var(--text-secondary);">退出</button>
        `;
    } else {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        loginNav.innerHTML = `
            <a href="login.html?redirect=${encodeURIComponent(currentPath)}" style="background:var(--accent); border:none; border-radius:30px; padding:4px 18px; cursor:pointer; color:#fff; font-weight:500; text-decoration:none;">登录</a>
        `;
    }
}

function logoutUser() {
    sessionStorage.removeItem('loginUser');
    sessionStorage.removeItem('isAdmin');
    updateLoginUI();
    location.reload();
}

// 确保函数暴露到全局
window.updateLoginUI = updateLoginUI;
window.logoutUser = logoutUser;