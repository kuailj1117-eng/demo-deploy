const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'demo_secret_key_123';

// ==================== 中间件 ====================
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// CORS 配置：允许前端跨域访问（当你把前端单独部署到 GitHub Pages 时有用）
// 如果前后端都在同一个 Render 服务上，这段其实不会触发
const corsOptions = {
  origin: function (origin, callback) {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:5500',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5500',
      'https://localhost:3000',
    ];
    // 如果前端部署到 GitHub Pages，把地址加进来：
    // allowed.push('https://你的用户名.github.io');

    // 允许没有 origin 的请求（Postman、curl、同源请求）
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    callback(null, true); // 演示环境暂时全放行，生产环境要严格限制
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};
app.use(cors(corsOptions));

// ==================== 模拟用户数据（代替数据库） ====================
const USERS = {
  admin: { password: '123456', name: '管理员', role: 'admin' },
  zhangsan: { password: '123456', name: '张三', role: 'user' },
};

// ==================== API 接口 ====================

// ---------- 1. Cookie 演示 ----------
// 后端设置 Cookie
app.get('/api/set-cookie', (req, res) => {
  res.cookie('demo_cookie', 'server_set_value', {
    maxAge: 3600 * 1000,
    httpOnly: false,   // false 方便前端用 JS 看到
    sameSite: 'lax',
  });
  res.json({ message: '✅ 后端已设置 Cookie: demo_cookie=server_set_value' });
});

// 后端读取前端发来的 Cookie
app.get('/api/read-cookie', (req, res) => {
  res.json({
    message: '后端成功读取到 Cookie',
    receivedCookies: req.cookies,
    hasDemoCookie: !!req.cookies.demo_cookie,
  });
});

// ---------- 2. Token / JWT 演示 ----------
// 登录 → 返回 JWT
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];

  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }

  // 生成 JWT（1小时过期）
  const token = jwt.sign(
    { username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({
    success: true,
    message: `欢迎 ${user.name}！登录成功`,
    token,
    note: '后续请求请将 token 放在 Authorization: Bearer <token> 头中',
  });
});

// 需要 Token 才能访问的受保护接口
app.get('/api/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '❌ 未提供 Token，请先登录' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      success: true,
      message: `Token 验证通过！`,
      user: decoded,
      note: 'JWT 验证成功：签名正确、未过期',
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      message: '❌ Token 无效或已过期',
      error: err.message,
    });
  }
});

// ---------- 3. CORS 演示 ----------
app.get('/api/data', (req, res) => {
  res.json({
    success: true,
    message: '跨域请求成功！（或同源请求）',
    origin: req.headers.origin || '同源（无 Origin 头）',
    time: new Date().toISOString(),
    tips: '打开浏览器 F12 → Network 查看请求头和响应头',
  });
});

app.post('/api/data', (req, res) => {
  res.json({
    success: true,
    message: 'POST 跨域成功！注意浏览器先发了 OPTIONS 预检请求',
    received: req.body,
  });
});

// ---------- 4. 综合演示：Cookie + Token + CORS ----------
app.get('/api/all-demo', (req, res) => {
  const authHeader = req.headers.authorization;
  let tokenInfo = '未提供 Token';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      tokenInfo = `Token 有效，用户: ${decoded.name}`;
    } catch (e) {
      tokenInfo = `Token 无效: ${e.message}`;
    }
  }

  res.json({
    cookie: req.cookies,
    tokenStatus: tokenInfo,
    origin: req.headers.origin || '同源',
    message: '这是一个综合演示：同时测试 Cookie + Token + CORS',
  });
});

// ==================== 兜底路由 ====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== 启动 ====================
app.listen(PORT, () => {
  console.log(`\n🚀 服务器已启动！`);
  console.log(`   本地访问: http://localhost:${PORT}`);
  console.log(`   API 接口: http://localhost:${PORT}/api/data\n`);
});
