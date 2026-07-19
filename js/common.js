document.addEventListener('DOMContentLoaded', function() {
    // 导航高亮
    const links = document.querySelectorAll('.top-nav a');
    const current = window.location.pathname.split('/').pop() || 'index.html';
    links.forEach(link => {
        if (link.getAttribute('href') === current) link.classList.add('active');
    });

    // 返回顶部
    const backTop = document.getElementById('backTop');
    if (backTop) {
        window.addEventListener('scroll', () => {
            backTop.classList.toggle('show', window.scrollY > 300);
        });
        backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // 字体切换
    const fontBtns = document.querySelectorAll('.font-control button');
    fontBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            fontBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const font = this.dataset.font;
            document.body.style.fontFamily = font === 'serif' ? 'Georgia, serif' :
                                               font === 'sans' ? '"Segoe UI", sans-serif' : '';
        });
    });
});