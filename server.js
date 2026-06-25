const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 中间件 ====================
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// CORS 配置
const corsOptions = {
  origin: function (origin, callback) {
    // 允许所有来源（工具站无需严格限制）
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// ==================== 工具 API ====================

// IP 查询（代理 ip-api.com 的免费接口）
app.get('/api/tools/ip', async (req, res) => {
  try {
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.headers['x-real-ip'] ||
                     req.ip ||
                     req.socket.remoteAddress;

    // 调用 ip-api.com 免费 API（每分钟 45 次）
    const response = await fetch(`http://ip-api.com/json/${clientIP}?lang=zh-CN&fields=query,country,city,regionName,isp,org,timezone,lat,lon`);
    const data = await response.json();

    res.json({
      ip: data.query || clientIP,
      country: data.country || '未知',
      region: data.regionName || '未知',
      city: data.city || '未知',
      isp: data.isp || '未知',
      org: data.org || '未知',
      timezone: data.timezone || '未知',
      location: data.lat && data.lon ? { lat: data.lat, lon: data.lon } : null,
    });
  } catch (err) {
    res.json({ error: 'IP 查询失败，请稍后重试', message: err.message });
  }
});

// User-Agent 解析
app.post('/api/tools/ua', async (req, res) => {
  try {
    const UAParser = require('ua-parser-js');
    const uaString = req.body.ua || req.headers['user-agent'];
    const parser = new UAParser(uaString);
    const result = parser.getResult();

    res.json({
      browser: result.browser.name || '未知',
      browserVersion: result.browser.version || '未知',
      engine: result.engine.name || '未知',
      os: result.os.name || '未知',
      osVersion: result.os.version || '未知',
      device: result.device.model || (result.device.type || '桌面端'),
      cpu: result.cpu.architecture || '未知',
      raw: uaString,
    });
  } catch (err) {
    // 如果 ua-parser-js 没装，返回简单的手动解析
    const ua = (req.body.ua || req.headers['user-agent']).toLowerCase();
    const browser =
      ua.includes('edg/') ? 'Edge' :
      ua.includes('chrome/') ? 'Chrome' :
      ua.includes('safari/') && !ua.includes('chrome') ? 'Safari' :
      ua.includes('firefox/') ? 'Firefox' : '未知';
    const os =
      ua.includes('windows') ? 'Windows' :
      ua.includes('mac os') ? 'macOS' :
      ua.includes('linux') ? 'Linux' :
      ua.includes('android') ? 'Android' :
      ua.includes('ios') || ua.includes('iphone') ? 'iOS' : '未知';

    res.json({
      browser,
      browserVersion: '未知',
      engine: '未知',
      os,
      osVersion: '未知',
      device: '未知',
      cpu: '未知',
      raw: req.body.ua || req.headers['user-agent'],
    });
  }
});

// 完整请求头信息
app.get('/api/tools/headers', (req, res) => {
  res.json({
    ip: req.headers['x-forwarded-for'] || req.ip,
    userAgent: req.headers['user-agent'],
    language: req.headers['accept-language'],
    encoding: req.headers['accept-encoding'],
    host: req.headers.host,
    method: req.method,
    protocol: req.protocol,
    https: req.secure,
    headers: req.headers,
  });
});

// ==================== 兜底路由 ====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== 启动 ====================
app.listen(PORT, () => {
  console.log(`\n🚀 Dev工具箱 已启动！`);
  console.log(`   本地访问: http://localhost:${PORT}`);
  console.log(`   IP 查询:  http://localhost:${PORT}/api/tools/ip`);
  console.log(`   UA 解析:  http://localhost:${PORT}/api/tools/ua`);
  console.log(`   请求头:   http://localhost:${PORT}/api/tools/headers\n`);
});
