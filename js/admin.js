// =============================================
// 后台管理逻辑（仅管理员可登录）
// =============================================

// ----- 管理员白名单 -----
const ADMIN_ALLOWLIST = ['TYDS2013'];

// ----- 用户管理工具（与 common.js 共用）-----
// 如果 common.js 未加载，提供后备实现
if (typeof getUsers === 'undefined') {
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
}

// 初始化默认管理员（仅当无用户时）
async function initDefaultUser() {
    const users = getUsers();
    if (Object.keys(users).length === 0) {
        const hashed = await hashPassword('XZC520czq');
        users.TYDS2013 = { hash: hashed, created: Date.now() };
        saveUsers(users);
        console.log('默认管理员已创建: TYDS2013 / XZC520czq');
    }
}

// ----- GitHub 配置 -----
let githubConfig = { token: '', repo: '', branch: 'main' };
let postsData = [];

function loadConfig() {
    const saved = localStorage.getItem('githubConfig');
    if (saved) {
        try {
            githubConfig = JSON.parse(saved);
            document.getElementById('githubToken').value = githubConfig.token || '';
            document.getElementById('repoInfo').value = githubConfig.repo || '';
            document.getElementById('repoBranch').value = githubConfig.branch || 'main';
        } catch(e) {}
    }
}

function saveConfig() {
    const token = document.getElementById('githubToken').value.trim();
    const repo = document.getElementById('repoInfo').value.trim();
    const branch = document.getElementById('repoBranch').value.trim() || 'main';
    if (!token || !repo) {
        showMsg('configMsg', '请填写 Token 和仓库信息', 'error');
        return;
    }
    githubConfig.token = token;
    githubConfig.repo = repo;
    githubConfig.branch = branch;
    localStorage.setItem('githubConfig', JSON.stringify(githubConfig));
    showMsg('configMsg', '配置已保存', 'success');
}

function showMsg(elementId, text, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = text;
    el.className = 'status-msg ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ----- 后台登录（仅白名单）-----
async function handleAdminLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!ADMIN_ALLOWLIST.includes(username)) {
        showMsg('loginMsg', '您没有权限访问后台', 'error');
        return;
    }
    const users = getUsers();
    if (!users[username]) {
        showMsg('loginMsg', '用户不存在', 'error');
        return;
    }
    const hashedInput = await hashPassword(password);
    if (users[username].hash !== hashedInput) {
        showMsg('loginMsg', '密码错误', 'error');
        return;
    }
    // 登录成功
    sessionStorage.setItem('adminLogged', 'true');
    sessionStorage.setItem('loginUser', username);
    sessionStorage.setItem('isAdmin', 'true');
    document.getElementById('loginArea').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    loadConfig();
    renderUserList();
    updateDashboard();
}

function logoutAdmin() {
    sessionStorage.removeItem('adminLogged');
    sessionStorage.removeItem('loginUser');
    sessionStorage.removeItem('isAdmin');
    document.getElementById('loginArea').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
}

// ----- 用户管理（仅管理员可见）-----
function renderUserList() {
    const users = getUsers();
    const container = document.getElementById('userList');
    if (!container) return;
    if (Object.keys(users).length === 0) {
        container.innerHTML = '<p>暂无用户</p>';
        return;
    }
    container.innerHTML = Object.entries(users).map(([username, data]) => `
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
            <span><strong>${username}</strong> (创建于 ${new Date(data.created).toLocaleDateString()})</span>
            ${username !== 'TYDS2013' ? `<button class="btn btn-danger" onclick="deleteUser('${username}')" style="padding:2px 12px; font-size:0.8rem;">删除</button>` : '<span style="color:var(--text-secondary);font-size:0.8rem;">默认管理员</span>'}
        </div>
    `).join('');
}

async function addUser() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();
    if (!username || !password) {
        showMsg('userMsg', '请填写用户名和密码', 'error');
        return;
    }
    if (username.length < 3 || password.length < 6) {
        showMsg('userMsg', '用户名至少3字符，密码至少6字符', 'error');
        return;
    }
    const users = getUsers();
    if (users[username]) {
        showMsg('userMsg', '用户名已存在', 'error');
        return;
    }
    const hashed = await hashPassword(password);
    users[username] = { hash: hashed, created: Date.now() };
    saveUsers(users);
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    renderUserList();
    showMsg('userMsg', '用户添加成功', 'success');
}

function deleteUser(username) {
    if (username === 'TYDS2013') {
        showMsg('userMsg', '不能删除默认管理员', 'error');
        return;
    }
    if (!confirm(`确定要删除用户 "${username}" 吗？`)) return;
    const users = getUsers();
    delete users[username];
    saveUsers(users);
    renderUserList();
    showMsg('userMsg', '用户已删除', 'success');
}

// ----- 仪表盘更新（文章、评论、浏览数）-----
async function updateDashboard() {
    try {
        const res = await fetch('post/posts.json?' + Date.now());
        postsData = await res.json();
        const views = JSON.parse(localStorage.getItem('views') || '{}');
        let totalViews = 0;
        for (let k in views) totalViews += views[k];
        document.getElementById('viewCount').textContent = totalViews;
        document.getElementById('postCount').textContent = postsData.length;

        const comments = JSON.parse(localStorage.getItem('comments') || '{}');
        let allComments = [];
        for (let k in comments) {
            comments[k].forEach(c => allComments.push({ ...c, articleId: k }));
        }
        const container = document.getElementById('adminComments');
        if (!allComments.length) {
            container.innerHTML = '<p>暂无评论</p>';
        } else {
            container.innerHTML = allComments.map(c => `
                <div style="border-bottom:1px solid var(--border-color); padding:6px 0;">
                    <strong>${c.user}</strong> (文章 ${c.articleId})：${c.text}
                    <span style="color:var(--text-secondary);font-size:0.8rem;">${c.time}</span>
                </div>
            `).join('');
        }
        renderPostList();
    } catch(e) {
        console.error('更新仪表盘失败', e);
        document.getElementById('adminPostList').innerHTML = '<p>加载失败</p>';
    }
}

function renderPostList() {
    const list = document.getElementById('adminPostList');
    if (!postsData.length) {
        list.innerHTML = '<p>暂无文章</p>';
        return;
    }
    list.innerHTML = postsData.map(p => `
        <div class="post-item-admin">
            <span><strong>${p.title}</strong> (${p.date})</span>
            <div class="actions">
                <button class="btn btn-secondary" onclick="openEditor(${p.id})">编辑</button>
                <button class="btn btn-danger" onclick="deletePost(${p.id})">删除</button>
            </div>
        </div>
    `).join('');
}

// ----- 文章编辑器（复用原有代码）-----
function openEditor(id) { /* ... 原有实现 ... */ }
function closeEditor() { /* ... 原有实现 ... */ }
function updatePreview() { /* ... 原有实现 ... */ }
async function savePost() { /* ... 原有实现 ... */ }
async function deletePost(id) { /* ... 原有实现 ... */ }
function insertMarkdown(prefix, suffix, wrapLine) { /* ... 原有实现 ... */ }

// 键盘快捷键（复用原有代码）
document.addEventListener('keydown', function(e) {
    // ... 原有实现 ...
});

// ----- 初始化 -----
document.addEventListener('DOMContentLoaded', async function() {
    await initDefaultUser();

    // 如果已登录，直接显示仪表盘
    if (sessionStorage.getItem('adminLogged') === 'true') {
        document.getElementById('loginArea').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadConfig();
        renderUserList();
        updateDashboard();
    }

    // 绑定登录按钮
    const loginBtn = document.getElementById('adminLoginBtn');
    if (loginBtn) loginBtn.addEventListener('click', handleAdminLogin);
});

// 暴露全局函数
window.handleAdminLogin = handleAdminLogin;
window.logoutAdmin = logoutAdmin;
window.addUser = addUser;
window.deleteUser = deleteUser;
window.openEditor = openEditor;
window.closeEditor = closeEditor;
window.savePost = savePost;
window.deletePost = deletePost;
window.saveConfig = saveConfig;
window.insertMarkdown = insertMarkdown;