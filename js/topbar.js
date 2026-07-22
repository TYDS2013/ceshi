// =============================================
// 顶部加载伪进度条 (Topbar)
// =============================================

(function() {
    // 创建进度条元素
    var bar = document.createElement('div');
    bar.id = 'topbar-progress';
    // 样式：固定在顶部，高度3px，使用主题色，带发光效果
    bar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        width: 0%;
        background: var(--accent, #2563eb);
        z-index: 10001;
        transition: width 0.2s ease;
        opacity: 0;
        box-shadow: 0 0 12px var(--accent, #2563eb);
        pointer-events: none;
    `;

    function appendBar() {
        if (document.body) {
            document.body.appendChild(bar);
            // 显示进度条
            bar.style.opacity = '1';
            var progress = 0;
            var interval = setInterval(function() {
                if (progress < 90) {
                    // 随机增量，模拟加载
                    var increment = Math.random() * 10 + 5;
                    progress = Math.min(progress + increment, 90);
                    bar.style.width = progress + '%';
                }
            }, 200);

            // 页面完全加载后完成进度
            window.addEventListener('load', function() {
                clearInterval(interval);
                progress = 100;
                bar.style.width = '100%';
                bar.style.transition = 'width 0.5s ease, opacity 0.6s ease';
                bar.style.opacity = '0';
                // 隐藏元素，避免遮挡点击
                setTimeout(function() {
                    bar.style.display = 'none';
                }, 600);
            });
        } else {
            // 如果 body 尚未加载，等待 DOMContentLoaded
            document.addEventListener('DOMContentLoaded', appendBar);
        }
    }
    appendBar();
})();