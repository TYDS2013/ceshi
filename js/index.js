let posts = [], currentCategory = 'all';

async function loadPosts() {
    try {
        const res = await fetch('post/posts.json');
        posts = await res.json();
        if (!localStorage.getItem('views')) {
            const views = {};
            posts.forEach(p => views[p.id] = 0);
            localStorage.setItem('views', JSON.stringify(views));
        }
        renderPosts(currentCategory, document.getElementById('searchInput').value.trim());
    } catch (e) {
        console.error('加载文章失败', e);
    }
}

function renderPosts(category, keyword) {
    const list = document.getElementById('postList');
    let filtered = posts;
    if (category !== 'all') filtered = filtered.filter(p => p.category === category);
    if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(kw) ||
            p.excerpt.toLowerCase().includes(kw) ||
            p.tags.some(t => t.toLowerCase().includes(kw))
        );
    }
    if (!filtered.length) {
        list.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:30px 0;">没有找到文章</p>';
        return;
    }
    const views = JSON.parse(localStorage.getItem('views') || '{}');
    list.innerHTML = filtered.map(p => `
        <div class="post-item">
            <h3><a href="article.html?id=${p.id}">${p.title}</a></h3>
            <div class="post-meta">
                <span>📅 ${p.date}</span>
                <span>🏷️ ${p.category}</span>
                <span>👁️ ${views[p.id] || 0} 次浏览</span>
            </div>
            <div class="post-excerpt">${p.excerpt}</div>
            <div class="post-tags">${p.tags.map(t => `<span>#${t}</span>`).join('')}</div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', function() {
    loadPosts();

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const catLinks = document.querySelectorAll('.category-tags a');

    function doSearch() {
        renderPosts(currentCategory, searchInput.value.trim());
    }
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') doSearch(); });

    catLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            catLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.cat;
            renderPosts(currentCategory, searchInput.value.trim());
        });
    });
});