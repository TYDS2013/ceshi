// =============================================
// 后台管理逻辑（完整版）
// 功能：管理员白名单登录、用户管理、文章管理、GitHub 同步、本地缓存
// =============================================

// ----- 管理员白名单（只有以下用户可登录后台）-----
const ADMIN_ALLOWLIST = ['TYDS2013'];

// ----- 用户管理工具（与 common.js 共用，提供后备）-----
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

// ----- GitHub 配置 -----
let githubConfig = { token: '', repo: '', branch: 'main' };
let postsData = [];

// =============================================
// 1. 初始化默认管理员（仅当无用户时）
// =============================================
async function initDefaultUser() {
    const users = getUsers();
    if (Object.keys(users).length === 0) {
        const hashed = await hashPassword('XZC520czq');
        users.TYDS2013 = { hash: hashed, created: Date.now() };
        saveUsers(users);
        console.log('默认管理员已创建: TYDS2013 / XZC520czq');
    }
}

// =============================================
// 2. GitHub 配置
// =============================================
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

// =============================================
// 3. 消息提示
// =============================================
function showMsg(elementId, text, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = text;
    el.className = 'status-msg ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// =============================================
// 4. 后台登录（仅白名单用户）
// =============================================
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

// =============================================
// 5. 用户管理（仅管理员可见）
// =============================================
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

// =============================================
// 6. 仪表盘更新（最近3篇文章 + 文章管理）
// =============================================
async function updateDashboard() {
    try {
        const res = await fetch('post/posts.json?' + Date.now());
        postsData = await res.json();
        updateRecentPosts();
        renderPostList();
    } catch(e) {
        console.error('更新仪表盘失败', e);
        document.getElementById('adminPostList').innerHTML = '<p>加载失败</p>';
    }
}

function updateRecentPosts() {
    const views = JSON.parse(localStorage.getItem('views') || '{}');
    const sorted = [...postsData].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 3);
    const container = document.getElementById('recentPosts');
    if (!recent.length) {
        container.innerHTML = '<p>暂无文章</p>';
    } else {
        container.innerHTML = recent.map(p => `
            <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
                <span><strong>${p.title}</strong> (${p.date})</span>
                <span>👁️ ${views[p.id] || 0} 次浏览</span>
            </div>
        `).join('');
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
                <a href="editor.html?id=${p.id}" class="btn btn-secondary" style="display:inline-block; padding:2px 14px; border-radius:30px; text-decoration:none;">编辑</a>
                <button class="btn btn-danger" onclick="deletePost(${p.id})">删除</button>
            </div>
        </div>
    `).join('');
}

// =============================================
// 7. 新建文章（先保存本地，再异步上传）
// =============================================
async function createAndEdit() {
    const title = document.getElementById('newTitle').value.trim();
    const date = document.getElementById('newDate').value.trim() || new Date().toISOString().slice(0,10);
    const category = document.getElementById('newCategory').value;

    if (!title) {
        showMsg('newPostMsg', '请填写标题', 'error');
        return;
    }

    const adminUser = sessionStorage.getItem('loginUser') || '管理员';
    const maxId = postsData.reduce((max, p) => Math.max(max, p.id), 0);
    const newId = maxId + 1;
    const file = newId + '.md';
    const defaultContent = '# ' + title + '\n\n开始书写...';

    const newPost = {
        id: newId,
        title,
        date,
        category: category || 'uncategorized',
        excerpt: '',
        tags: [],
        file,
        author: adminUser
    };

    // 1. 先保存到本地 localStorage
    localStorage.setItem('newPost_' + newId, JSON.stringify(newPost));
    localStorage.setItem('newPostContent_' + newId, defaultContent);

    // 2. 更新内存中的 postsData
    postsData.push(newPost);

    // 3. 异步上传到 GitHub（不等待，立即跳转）
    const jsonContent = JSON.stringify(postsData, null, 4);
    updateFileOnGitHub('post/posts.json', jsonContent, `新建文章: ${title}`)
        .then(() => console.log('元数据上传成功'))
        .catch(err => console.error('元数据上传失败', err));
    updateFileOnGitHub(`post/${file}`, defaultContent, `初始化文章 ${title}`)
        .then(() => console.log('内容上传成功'))
        .catch(err => console.error('内容上传失败', err));

    // 4. 立即跳转到编辑器
    window.location.href = `editor.html?id=${newId}`;
}

// ----- 新建标签（添加到下拉框）-----
function addNewTag() {
    const input = document.getElementById('newTagInput');
    const tag = input.value.trim();
    if (!tag) return;
    const select = document.getElementById('newCategory');
    for (let opt of select.options) {
        if (opt.value === tag) {
            alert('标签已存在');
            return;
        }
    }
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    select.appendChild(option);
    select.value = tag;
    input.value = '';
}

// =============================================
// 8. 删除文章（立即本地删除，异步远程删除）
// =============================================
async function deletePost(id) {
    if (!confirm('确定要删除这篇文章吗？')) return;

    const post = postsData.find(p => p.id === id);
    if (!post) return;

    // 1. 从本地数据中移除
    const index = postsData.indexOf(post);
    postsData.splice(index, 1);

    // 2. 立即更新 UI
    renderPostList();
    updateRecentPosts();

    // 3. 清理 localStorage 中该文章的数据
    removeLocalPostData(id);

    // 4. 异步删除 GitHub 上的文件
    const jsonContent = JSON.stringify(postsData, null, 4);
    try {
        await updateFileOnGitHub('post/posts.json', jsonContent, `删除文章 ${post.title}`);
        try {
            await updateFileOnGitHub(`post/${post.file}`, '', `删除文章内容 ${post.title}`);
        } catch(e) {
            console.warn('删除 .md 文件失败（可能已被删除）', e);
        }
        alert('文章已从本地和仓库删除，Pages 将自动重新部署。');
    } catch(err) {
        console.error('远程删除失败', err);
        alert('文章已从本地删除，但远程删除失败（可能网络问题）。请稍后检查仓库或重试。');
    }

    // 5. 清理本地缓存的新文章标记（如有）
    localStorage.removeItem('newPost_' + id);
    localStorage.removeItem('newPostContent_' + id);
}

function removeLocalPostData(id) {
    const views = JSON.parse(localStorage.getItem('views') || '{}');
    if (views[id]) {
        delete views[id];
        localStorage.setItem('views', JSON.stringify(views));
    }
    const comments = JSON.parse(localStorage.getItem('comments') || '{}');
    if (comments[id]) {
        delete comments[id];
        localStorage.setItem('comments', JSON.stringify(comments));
    }
}

// =============================================
// 9. GitHub API 辅助（更新文件）
// =============================================
async function updateFileOnGitHub(path, content, commitMsg) {
    if (!githubConfig.token || !githubConfig.repo) {
        throw new Error('请先在后台配置 GitHub Token 和仓库信息');
    }
    const url = `https://api.github.com/repos/${githubConfig.repo}/contents/${path}`;
    let sha = null;
    try {
        const getRes = await fetch(url, {
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        } else if (getRes.status !== 404) {
            const err = await getRes.json();
            throw new Error(err.message || '获取文件信息失败');
        }
    } catch(e) {
        if (!e.message.includes('404')) throw e;
    }

    const payload = {
        message: commitMsg || 'Update file via API',
        content: btoa(unescape(encodeURIComponent(content))),
        branch: githubConfig.branch
    };
    if (sha) payload.sha = sha;

    const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${githubConfig.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
    });
    if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.message || '更新文件失败');
    }
    return await putRes.json();
}

// =============================================
// 10. 初始化
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    await initDefaultUser();

    if (sessionStorage.getItem('adminLogged') === 'true') {
        document.getElementById('loginArea').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadConfig();
        renderUserList();
        updateDashboard();
    }

    const loginBtn = document.getElementById('adminLoginBtn');
    if (loginBtn) loginBtn.addEventListener('click', handleAdminLogin);
});

// ----- 暴露全局函数供 HTML 调用 -----
window.handleAdminLogin = handleAdminLogin;
window.logoutAdmin = logoutAdmin;
window.addUser = addUser;
window.deleteUser = deleteUser;
window.saveConfig = saveConfig;
window.createAndEdit = createAndEdit;
window.addNewTag = addNewTag;
window.deletePost = deletePost;