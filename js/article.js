async function loadArticle() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        document.getElementById('articleTitle').textContent = '无效的文章ID';
        return;
    }
    try {
        const res = await fetch('post/posts.json');
        const posts = await res.json();
        const post = posts.find(p => p.id == id);
        if (!post) {
            document.getElementById('articleTitle').textContent = '文章未找到';
            return;
        }
        // 加载 .md
        const mdRes = await fetch(`post/${post.file}`);
        const mdText = await mdRes.text();
        const html = marked.parse(mdText);
        document.getElementById('articleTitle').textContent = post.title;
        document.getElementById('articleContent').innerHTML = html;

        let views = JSON.parse(localStorage.getItem('views') || '{}');
        views[id] = (views[id] || 0) + 1;
        localStorage.setItem('views', JSON.stringify(views));

        document.getElementById('articleMeta').innerHTML = `
            <span>${post.date}</span>
            <span># ${post.category}</span>
            <span>👁️ ${views[id]} 次浏览</span>
        `;
        renderComments(id);
    } catch (e) {
        console.error('加载文章失败', e);
    }
}

function renderComments(articleId) {
    const comments = JSON.parse(localStorage.getItem('comments') || '{}');
    const list = comments[articleId] || [];
    const container = document.getElementById('commentList');
    if (!list.length) {
        container.innerHTML = '<p style="color:#94a3b8;">暂无评论，来说两句吧。</p>';
        return;
    }
    container.innerHTML = list.map(c => `
        <div class="comment-item">
            <strong>${c.user}</strong><span class="time">${c.time}</span>
            <p>${c.text}</p>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', function() {
    loadArticle();

    document.getElementById('submitComment').addEventListener('click', function() {
        const userInput = document.getElementById('commentUser');
        const textInput = document.getElementById('commentText');
        const user = userInput.value.trim();
        const text = textInput.value.trim();
        if (!user || !text) {
            alert('请填写昵称和评论内容。');
            return;
        }
        const id = new URLSearchParams(window.location.search).get('id');
        if (!id) return alert('文章ID无效');
        const comments = JSON.parse(localStorage.getItem('comments') || '{}');
        const articleComments = comments[id] || [];
        if (articleComments.some(c => c.user === user)) {
            alert('该昵称已被使用，请换一个。');
            return;
        }
        const now = new Date();
        const timeStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
        articleComments.push({ user, time: timeStr, text, ip: '模拟IP' });
        comments[id] = articleComments;
        localStorage.setItem('comments', JSON.stringify(comments));
        renderComments(id);
        textInput.value = '';
        alert('评论发布成功！');
    });
});