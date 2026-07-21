// =============================================
// 独立 Markdown 编辑器逻辑
// 功能：加载/保存文章、本地缓存、Typora 风格快捷键、实时预览
// =============================================

// ----- 全局状态 -----
let currentPostId = null;          // 当前编辑的文章ID
let currentFile = null;            // 对应的 .md 文件名
let githubConfig = { token: '', repo: '', branch: 'main' };
let sourceMode = false;            // 源码模式（隐藏预览）
let wordWrap = true;              // 自动换行
let isUsingLocal = false;         // 是否使用本地缓存

// =============================================
// 1. 配置与加载
// =============================================

/** 加载 GitHub 配置（从 localStorage） */
function loadConfig() {
    const saved = localStorage.getItem('githubConfig');
    if (saved) {
        try {
            githubConfig = JSON.parse(saved);
        } catch(e) {}
    }
}

/** 加载文章（优先网络，回退本地缓存） */
async function loadEditor() {
    loadConfig();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('editorTitle').textContent = '❌ 缺少文章ID';
        return;
    }
    currentPostId = id;

    // 尝试从 GitHub 获取最新数据
    try {
        const res = await fetch('post/posts.json?' + Date.now());
        const posts = await res.json();
        const post = posts.find(p => p.id == id);
        if (post) {
            await loadPostData(post);
            // 清除本地缓存（已同步）
            localStorage.removeItem('newPost_' + id);
            localStorage.removeItem('newPostContent_' + id);
            return;
        }
    } catch(e) {
        console.warn('网络加载失败，尝试本地缓存', e);
    }

    // 网络未找到，检查本地缓存
    const localPost = localStorage.getItem('newPost_' + id);
    const localContent = localStorage.getItem('newPostContent_' + id);
    if (localPost && localContent) {
        const post = JSON.parse(localPost);
        isUsingLocal = true;
        document.getElementById('editorTitle').textContent = `📝 编辑：${post.title} (本地缓存)`;
        document.getElementById('editorContent').value = localContent;
        updatePreview();
        showMsg('editorMsg', '⏳ 文章正在同步到服务器，请稍候...', 'success');
        // 3秒后尝试重新从网络加载
        setTimeout(async () => {
            try {
                const res = await fetch('post/posts.json?' + Date.now());
                const posts = await res.json();
                const updated = posts.find(p => p.id == id);
                if (updated) {
                    document.getElementById('editorTitle').textContent = `📝 编辑：${updated.title}`;
                    isUsingLocal = false;
                    showMsg('editorMsg', '✅ 文章已同步到服务器', 'success');
                    localStorage.removeItem('newPost_' + id);
                    localStorage.removeItem('newPostContent_' + id);
                }
            } catch(e) {}
        }, 3000);
        return;
    }

    // 都没有，报错
    document.getElementById('editorTitle').textContent = '❌ 文章未找到';
    showMsg('editorMsg', '❌ 无法加载文章，请检查网络或重新创建', 'error');
}

/** 从网络加载文章数据 */
async function loadPostData(post) {
    currentFile = post.file;
    document.getElementById('editorTitle').textContent = `📝 编辑：${post.title}`;
    const mdRes = await fetch(`post/${post.file}`);
    const mdText = await mdRes.text();
    document.getElementById('editorContent').value = mdText;
    updatePreview();
    isUsingLocal = false;
}

// =============================================
// 2. 预览与工具栏
// =============================================

/** 更新预览区 */
function updatePreview() {
    const content = document.getElementById('editorContent').value;
    try {
        document.getElementById('previewArea').innerHTML = marked.parse(content);
    } catch(e) {
        document.getElementById('previewArea').innerHTML = '<span style="color:red;">Markdown 解析错误</span>';
    }
}

/**
 * 插入 Markdown 语法（工具栏与快捷键共用）
 * @param {string} prefix - 前缀
 * @param {string} suffix - 后缀
 * @param {boolean} lineStart - 是否插入到行首
 */
function insertMarkdown(prefix, suffix, lineStart = false) {
    const textarea = document.getElementById('editorContent');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    if (lineStart) {
        const lineStartPos = before.lastIndexOf('\n') + 1;
        const lineContent = textarea.value.substring(lineStartPos);
        const newLine = prefix + lineContent;
        textarea.value = before.substring(0, lineStartPos) + newLine + after;
        const newCursor = lineStartPos + prefix.length;
        textarea.selectionStart = textarea.selectionEnd = newCursor;
    } else if (selected) {
        const insertText = prefix + selected + suffix;
        textarea.value = before + insertText + after;
        const newCursor = start + insertText.length;
        textarea.selectionStart = textarea.selectionEnd = newCursor;
    } else {
        const insertText = prefix + suffix;
        textarea.value = before + insertText + after;
        const newCursor = start + prefix.length;
        textarea.selectionStart = textarea.selectionEnd = newCursor;
    }

    textarea.focus();
    updatePreview();
}

/** 插入表格 (Ctrl+T) */
function insertTable() {
    const textarea = document.getElementById('editorContent');
    if (!textarea) return;
    const table = `
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容 | 内容 | 内容 |
| 内容 | 内容 | 内容 |
`;
    const start = textarea.selectionStart;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(start);
    textarea.value = before + table + after;
    textarea.selectionStart = textarea.selectionEnd = start + table.length;
    textarea.focus();
    updatePreview();
}

/** 切换源码/预览模式 */
function toggleSourceMode() {
    sourceMode = !sourceMode;
    const preview = document.getElementById('previewArea');
    const textarea = document.getElementById('editorContent');
    if (sourceMode) {
        preview.style.display = 'none';
        textarea.style.flex = '2';
    } else {
        preview.style.display = 'block';
        textarea.style.flex = '1';
    }
}

/** 切换自动换行 */
function toggleWordWrap() {
    wordWrap = !wordWrap;
    const textarea = document.getElementById('editorContent');
    textarea.style.whiteSpace = wordWrap ? 'pre-wrap' : 'pre';
    textarea.style.overflowX = wordWrap ? 'auto' : 'scroll';
}

// =============================================
// 3. 键盘快捷键（Typora 风格）
// =============================================

document.addEventListener('keydown', function(e) {
    const textarea = document.getElementById('editorContent');
    if (document.activeElement !== textarea) return;

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    // 标题 (Ctrl+1~6)
    if (ctrl && !shift && !alt && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const level = '#'.repeat(parseInt(e.key));
        insertMarkdown(level + ' ', '', true);
        return;
    }
    if (ctrl && !shift && !alt && e.key === '0') {
        e.preventDefault();
        insertMarkdown('', '', true);
        return;
    }

    // 格式
    if (ctrl && !shift && !alt && e.key === 'b') { e.preventDefault(); insertMarkdown('**', '**'); return; }
    if (ctrl && !shift && !alt && e.key === 'i') { e.preventDefault(); insertMarkdown('*', '*'); return; }
    if (ctrl && !shift && !alt && e.key === 'u') { e.preventDefault(); insertMarkdown('<u>', '</u>'); return; }
    if (ctrl && shift && !alt && e.key === '`') { e.preventDefault(); insertMarkdown('`', '`'); return; }
    if (alt && shift && e.key === '5') { e.preventDefault(); insertMarkdown('~~', '~~'); return; }

    // 列表
    if (ctrl && shift && !alt && e.key === '[') { e.preventDefault(); insertMarkdown('1. ', '', true); return; }
    if (ctrl && shift && !alt && e.key === ']') { e.preventDefault(); insertMarkdown('- ', '', true); return; }
    if (ctrl && shift && !alt && e.key === 'q') { e.preventDefault(); insertMarkdown('> ', '', true); return; }

    // 插入
    if (ctrl && !shift && !alt && e.key === 'k') { e.preventDefault(); insertMarkdown('[', '](url)'); return; }
    if (ctrl && shift && !alt && e.key === 'i') { e.preventDefault(); insertMarkdown('![', '](url)'); return; }
    if (ctrl && shift && !alt && e.key === 'k') { e.preventDefault(); insertMarkdown('```\n', '\n```'); return; }
    if (ctrl && shift && !alt && e.key === 'm') { e.preventDefault(); insertMarkdown('$$\n', '\n$$'); return; }
    if (ctrl && !shift && !alt && e.key === 't') { e.preventDefault(); insertTable(); return; }

    // 视图
    if (ctrl && !shift && !alt && e.key === '/') { e.preventDefault(); toggleSourceMode(); return; }

    // Tab 缩进
    if (e.key === 'Tab') {
        e.preventDefault();
        if (shift) {
            insertMarkdown('', '', true);
        } else {
            insertMarkdown('  ', '', true);
        }
        return;
    }
});

// 实时预览（输入时触发）
document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'editorContent') updatePreview();
});

// =============================================
// 4. 保存到 GitHub + 本地缓存
// =============================================

/** 保存文章内容 */
async function saveEditorContent() {
    const content = document.getElementById('editorContent').value;
    if (!content.trim()) {
        showMsg('editorMsg', '内容不能为空', 'error');
        return;
    }
    if (!githubConfig.token || !githubConfig.repo) {
        showMsg('editorMsg', '请先在后台配置 GitHub Token 和仓库信息', 'error');
        return;
    }

    const btn = document.getElementById('saveEditorBtn');
    btn.disabled = true;
    btn.textContent = '提交中...';

    try {
        await updateFileOnGitHub(`post/${currentFile}`, content, `更新文章内容 ${currentFile}`);
        // 更新本地缓存（如有）
        if (isUsingLocal) {
            localStorage.setItem('newPostContent_' + currentPostId, content);
        }
        showMsg('editorMsg', '✅ 保存成功，Pages 将自动重新部署', 'success');
        if (isUsingLocal) {
            localStorage.removeItem('newPost_' + currentPostId);
            localStorage.removeItem('newPostContent_' + currentPostId);
            isUsingLocal = false;
            const titleEl = document.getElementById('editorTitle');
            titleEl.textContent = titleEl.textContent.replace(' (本地缓存)', '');
        }
    } catch(err) {
        showMsg('editorMsg', '❌ 保存失败：' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 保存并提交';
    }
}

/** GitHub API 更新文件（复用 admin.js 逻辑） */
async function updateFileOnGitHub(path, content, commitMsg) {
    if (!githubConfig.token || !githubConfig.repo) {
        throw new Error('请配置 GitHub Token 和仓库信息');
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

/** 显示消息 */
function showMsg(elementId, text, type) {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.className = 'status-msg ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// =============================================
// 5. 初始化
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    // 检查后台登录状态
    if (!sessionStorage.getItem('adminLogged')) {
        alert('请先登录后台');
        window.location.href = 'admin.html';
        return;
    }
    loadEditor();
    // 默认开启自动换行
    document.getElementById('editorContent').style.whiteSpace = 'pre-wrap';
});

// 暴露全局函数供 HTML onclick 调用
window.insertMarkdown = insertMarkdown;
window.insertTable = insertTable;
window.toggleSourceMode = toggleSourceMode;
window.toggleWordWrap = toggleWordWrap;
window.saveEditorContent = saveEditorContent;