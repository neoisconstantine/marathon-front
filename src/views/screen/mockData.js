/**
 * 大屏演示数据（框架阶段）— 按《马拉松报名管理系统-技术方案》数据流模拟
 * ============================================================
 * 文档数据流（见 6.5 / 7.4 / 8.2 / 8.4）：
 *   对接层接收摄像头/计时系统推送的点位通过记录 pass_record：
 *     { bib, camera_id, pass_time, speed, camera_lng, camera_lat, extra }
 *   大屏展示数据由这些记录聚合推导：
 *     - 热度值   = 点位时间窗内通过人数 ÷ 全点位最大通过人数（归一化 0~1）
 *     - 分段配速 = 相邻分段距离 ÷ 相邻点位通过时间差
 *     - 完赛成绩 = 起点 → 终点通过时间差；平均配速 = 总用时 ÷ 全程距离
 * ============================================================
 * 对接替换说明：
 *   本文件中的 deriveXxx() 即“后端统计服务”的模拟（内部先模拟上传记录再聚合）。
 *   接入真实后端后，在 bigScreen.vue 的 loadAll() 中把 deriveXxx(tick, ...)
 *   替换为接口调用即可，返回结构保持一致：
 *     GET /api/monitor/overview?eventId=xx
 *     GET /api/monitor/pace-stats?eventId=xx
 *     GET /api/monitor/leaderboard?eventId=xx
 *     GET /api/monitor/heatmap?eventId=xx&windowType=5min|10min|total
 *     GET /api/monitor/alarm?eventId=xx
 * ============================================================
 */

/* ==================== 1. 摄像头设备信息（点位配置） ==================== */
/**
 * 摄像头/计时点位：camera_id 为对接编码（文档 pass_record.camera_id，如 CP-05KM），
 * km 为赛道里程（用于分段配速推导），lng/lat 为点位坐标（热力图定位）。
 * 文档 8.4：坐标由对接数据携带或在对接适配层维护点位坐标映射；未配置坐标不参与热力图。
 */
export const CAMERA_DEVICES = [
  { cameraId: 'CP-START', name: '起点',      km: 0,       lng: 120.1455, lat: 30.2455 },
  { cameraId: 'CP-05KM',  name: '5KM计时点',  km: 5,       lng: 120.1540, lat: 30.2405 },
  { cameraId: 'CP-10KM',  name: '10KM计时点', km: 10,      lng: 120.1605, lat: 30.2445 },
  { cameraId: 'CP-15KM',  name: '15KM计时点', km: 15,      lng: 120.1650, lat: 30.2500 },
  { cameraId: 'CP-HALF',  name: '半程计时点', km: 21.0975, lng: 120.1595, lat: 30.2560 },
  { cameraId: 'CP-25KM',  name: '25KM计时点', km: 25,      lng: 120.1505, lat: 30.2595 },
  { cameraId: 'CP-30KM',  name: '30KM计时点', km: 30,      lng: 120.1420, lat: 30.2590 },
  { cameraId: 'CP-35KM',  name: '35KM计时点', km: 35,      lng: 120.1365, lat: 30.2525 },
  { cameraId: 'CP-40KM',  name: '40KM计时点', km: 40,      lng: 120.1370, lat: 30.2345 },
  { cameraId: 'CP-FINISH', name: '终点',      km: 42.195,  lng: 120.1535, lat: 30.2335 }
]

/** 赛道折线（热力图绘制用） */
export const COURSE_ROUTE = CAMERA_DEVICES.map(c => [c.lng, c.lat])

/** 相邻点位构成的分段（分段配速 = 分段距离 ÷ 相邻点位通过时间差） */
export const SEGMENTS = CAMERA_DEVICES.slice(0, -1).map((c, i) => ({
  segment: `${Math.round(c.km)}-${Math.round(CAMERA_DEVICES[i + 1].km)}KM`,
  distance: +(CAMERA_DEVICES[i + 1].km - c.km).toFixed(4),
  startCamera: c.cameraId,
  endCamera: CAMERA_DEVICES[i + 1].cameraId
}))

/* ==================== 2. 模拟参数 ==================== */
/** 各分段基准配速（秒/公里，段序同 SEGMENTS，越靠后越慢） */
const SEG_PACE = [248, 254, 261, 269, 278, 289, 302, 318, 335, 340]
/** 各点位基准通过人数（人群随里程递减） */
const BASE_PASS = [1500, 1450, 1380, 1300, 1220, 1130, 1040, 950, 870, 800]
/** 每条模拟记录代表的人数（控制生成量，展示时乘回） */
const SCALE = 40
/** 开赛时间（演示基准） */
const RACE_START_TS = new Date('2026-08-18 07:30:00').getTime()

/** 榜单基准（选手 / 净成绩秒数） */
const FINISHERS = [
  { bib: 'A1001', name: '陈伟', base: 2 * 3600 + 42 * 60 + 15 },
  { bib: 'A1008', name: '刘洋', base: 2 * 3600 + 45 * 60 + 2 },
  { bib: 'A1012', name: '张明', base: 2 * 3600 + 46 * 60 + 38 },
  { bib: 'A1025', name: '王磊', base: 2 * 3600 + 48 * 60 + 11 },
  { bib: 'A1033', name: '李强', base: 2 * 3600 + 49 * 60 + 27 },
  { bib: 'A1046', name: '赵刚', base: 2 * 3600 + 51 * 60 + 3 },
  { bib: 'A1051', name: '孙鹏', base: 2 * 3600 + 52 * 60 + 19 },
  { bib: 'A1068', name: '周浩', base: 2 * 3600 + 53 * 60 + 44 },
  { bib: 'A1072', name: '吴超', base: 2 * 3600 + 55 * 60 + 8 },
  { bib: 'A1085', name: '郑凯', base: 2 * 3600 + 56 * 60 + 33 },
  { bib: 'A1090', name: '马涛', base: 2 * 3600 + 58 * 60 + 1 },
  { bib: 'A1099', name: '黄健', base: 2 * 3600 + 59 * 60 + 26 }
]

/* ==================== 3. 工具函数 ==================== */
function pad2(n) {
  return String(n).padStart(2, '0')
}

function fmt(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function fmtShort(ts) {
  const d = new Date(ts)
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function randBib() {
  return 'A' + String(1000 + Math.floor(Math.random() * 9000))
}

/** 秒 → 'm:ss' */
export function paceFormat(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${pad2(s === 60 ? 0 : s)}`
}

/** 'm:ss' → 秒 */
export function paceToSeconds(pace) {
  const [m, s] = pace.split(':').map(Number)
  return m * 60 + (s || 0)
}

function fmtNetTime(totalSec) {
  const t = new Date(totalSec * 1000)
  return `${pad2(t.getUTCHours())}:${pad2(t.getUTCMinutes())}:${pad2(t.getUTCSeconds())}`
}

/* ==================== 4. 模拟摄像头上传数据 ==================== */
/**
 * 人流记录流（热力图用）：
 *   - 5min/10min 窗口：只生成当前人流附近（波峰 ± 拖尾范围）的点位记录，
 *     密度按“跑者波次 + 人群拖尾”分布，时间戳落在当前时间窗内；
 *   - total（累计）：生成波峰已到达点位自开赛以来的全部记录。
 * @returns pass_record 数组
 */
function genHeatRecords(tick, windowType) {
  const nowTs = Date.now()
  const windowSec = { '5min': 300, '10min': 600, total: 1e9 }[windowType] || 600
  const isTotal = windowType === 'total'
  const waveKm = 6 + ((tick % 110) / 110) * 32 // 跑者波峰里程 6km → 38km 循环
  const raceElapsedSec = waveKm * 300 // 模拟比赛已进行秒数（按 5:00/km 折算）
  const tailKm = 9 // 人群拖尾范围（km）
  const leadKm = 3 // 波峰前方的领跑稀疏带（km）
  const records = []

  CAMERA_DEVICES.forEach((cam, i) => {
    if (cam.km > waveKm + leadKm) return // 波峰前方过远：暂无记录
    if (!isTotal && cam.km < waveKm - tailKm) return // 拖尾之外：当前时间窗无记录

    let n
    let tRange
    if (isTotal) {
      n = Math.round((BASE_PASS[i] / SCALE) * (1 + Math.sin(tick / 3 + i * 0.9) * 0.04))
      tRange = raceElapsedSec
    } else {
      const d = waveKm - cam.km // 点位落后波峰的距离（负=在波峰前方）
      const tailFactor = d < 0
        ? 0.35 * Math.exp(-(d * d) / 6)   // 领跑稀疏带
        : Math.exp(-(d * d) / 16)         // 人群拖尾衰减
      n = Math.max(2, Math.round((BASE_PASS[i] / SCALE) * 0.8 * tailFactor * (1 + Math.sin(tick / 3 + i * 0.9) * 0.05)))
      tRange = windowSec
    }

    for (let k = 0; k < n; k++) {
      const t = nowTs - Math.random() * tRange * 1000
      records.push({
        bib: randBib(),
        camera_id: cam.cameraId,
        pass_time: fmt(t),
        speed: +(3600 / 300).toFixed(2),
        camera_lng: cam.lng,
        camera_lat: cam.lat
      })
    }
  })
  return records
}

/**
 * 全程记录流（配速/通过人数用）：
 * 模拟 N 名跑者，每人按“累计时间 = Σ 分段距离 × 分段配速”逐点生成通过记录
 * （文档 8.2：分段配速 = 相邻分段距离 ÷ 通过时间差）。
 * 跑者个人配速略有差异，部分跑者在后半程退赛（点位通过人数随之递减）。
 */
function genPaceRecords(tick) {
  const runners = []
  const N = 40
  for (let b = 0; b < N; b++) {
    const pf = 0.97 + b * 0.0015 + Math.sin(tick / 4 + b) * 0.004 // 个人配速系数 0.97~1.03
    // 退赛点：0~10 表示最多通过到第几个点位（0=仅起点，10=全程）
    const cap = b < 20 ? 10 : b < 22 ? 9 : b < 24 ? 8 : b < 26 ? 7 : b < 28 ? 6 : b < 30 ? 5 : b < 32 ? 4 : b < 34 ? 3 : b < 36 ? 2 : b < 38 ? 1 : 0
    runners.push({ bib: 'R' + String(1000 + b), pf, cap })
  }

  const records = []
  CAMERA_DEVICES.forEach((cam, i) => {
    runners.forEach(r => {
      if (i > r.cap) return
      // 累计通过时间 = 起点 + Σ(分段距离 × 分段配速 × 个人系数 + 分段波动)
      let cumSec = 0
      for (let j = 0; j < i; j++) {
        const fluc = Math.sin(tick / 5 + j * 1.7) * 3 // 该分段整体快慢波动 ±3s/km
        cumSec += SEGMENTS[j].distance * (SEG_PACE[j] * r.pf + fluc)
      }
      const t = RACE_START_TS + cumSec * 1000 + (Math.random() - 0.5) * 40 * 1000
      records.push({
        bib: r.bib,
        camera_id: cam.cameraId,
        pass_time: fmt(t),
        speed: +(3600 / (SEG_PACE[Math.min(i, SEG_PACE.length - 1)] * r.pf)).toFixed(2),
        camera_lng: cam.lng,
        camera_lat: cam.lat
      })
    })
  })
  return records
}

/* ==================== 5. 聚合推导（对应后端统计服务） ==================== */

/** 赛事列表（对接：GET /business/event/list → rows） */
export function mockEventList() {
  return [
    { eventId: 1, eventName: '2026杭州西湖国际马拉松', status: 2 },
    { eventId: 2, eventName: '2026杭州钱塘江半程马拉松', status: 2 }
  ]
}

/** 赛事核心数据统计 */
export function deriveOverview(tick, eventName) {
  const participantCount = 5000
  const finishCount = Math.min(4200, 320 + tick * 30 + Math.floor(Math.sin(tick / 3) * 40))
  return {
    eventId: 1,
    eventName: eventName || '2026杭州西湖国际马拉松',
    participantCount,
    finishCount,
    finishRate: Number((finishCount / participantCount).toFixed(4)),
    startTime: fmt(RACE_START_TS),
    onlineCount: Math.max(0, participantCount - finishCount - 320)
  }
}

/** 分区间配速统计：按同一 bib 的相邻点位通过时间差计算分段配速（文档 8.2） */
export function derivePaceStats(tick) {
  const records = genPaceRecords(tick)
  // 按 bib 组织：bib → camera_id → 通过时间戳
  const bibMap = {}
  records.forEach(r => {
    const ts = new Date(r.pass_time.replace(' ', 'T')).getTime()
    if (!bibMap[r.bib]) bibMap[r.bib] = {}
    bibMap[r.bib][r.camera_id] = ts
  })

  const segments = SEGMENTS.map(seg => {
    // 收集在分段两端点均有记录（同一位选手）的通过时间差
    const diffs = []
    Object.keys(bibMap).forEach(bib => {
      const tStart = bibMap[bib][seg.startCamera]
      const tEnd = bibMap[bib][seg.endCamera]
      if (tStart && tEnd) diffs.push((tEnd - tStart) / 1000)
    })
    let paceSec = SEG_PACE[0]
    if (diffs.length) {
      paceSec = (diffs.reduce((a, b) => a + b, 0) / diffs.length) / seg.distance
    }
    const passCount = Math.round(
      Object.values(bibMap).filter(bib => bib[seg.endCamera]).length * SCALE *
      (1 + Math.sin(tick / 5 + 1) * 0.01)
    )
    return { segment: seg.segment, distance: seg.distance, avgPace: paceFormat(paceSec), passCount }
  })
  return { segments }
}

/** 实时成绩榜单：净成绩 = 起点→终点通过时间差，平均配速 = 净成绩 ÷ 全程距离 */
export function deriveLeaderboard(tick) {
  const list = FINISHERS
    .map((f, i) => {
      const jitter = Math.round(Math.sin(tick / 6 + i) * 3)
      const totalSec = f.base + jitter
      return {
        rank: 0,
        bib: f.bib,
        name: f.name,
        netTime: fmtNetTime(totalSec),
        avgPace: paceFormat(totalSec / 42.195)
      }
    })
    .sort((a, b) => paceToSeconds(a.netTime) - paceToSeconds(b.netTime))
  list.forEach((r, i) => { r.rank = i + 1 })
  return { list }
}

/**
 * 人流热力图：热度值 = 点位时间窗内通过人数 ÷ 全点位最大通过人数
 * 时间窗：5min / 10min / total（累计）
 */
export function deriveHeatmap(tick, windowType) {
  const records = genHeatRecords(tick, windowType)
  const countMap = {}
  records.forEach(r => { countMap[r.camera_id] = (countMap[r.camera_id] || 0) + 1 })

  const points = CAMERA_DEVICES.map(cam => {
    const count = (countMap[cam.cameraId] || 0) * SCALE
    return { cameraId: cam.cameraId, name: cam.name, lng: cam.lng, lat: cam.lat, count, heat: 0 }
  })
  const maxCount = Math.max(...points.map(p => p.count))
  points.forEach(p => { p.heat = maxCount ? Number((p.count / maxCount).toFixed(3)) : 0 })

  return { route: COURSE_ROUTE, points, maxCount, updatedAt: fmtShort(Date.now()) }
}

/** 实时报警（演示） */
const ALARM_POOL = [
  { level: 2, title: '人数异常', content: '30KM 点位通过人数 5 分钟内骤增 23%，请关注赛道拥堵' },
  { level: 3, title: '数据断流', content: 'CP-35KM 摄像头 3 分钟无数据推入，请检查设备状态' },
  { level: 1, title: '时间倒挂', content: 'CP-05KM 出现 2 条晚于 CP-10KM 的通过记录，已自动过滤' },
  { level: 2, title: '名额预警', content: '本赛事报名人数已达总名额 92%，即将关闭报名' },
  { level: 1, title: '审核异常', content: '2 条报名记录审核超时未处理，请及时复核' },
  { level: 2, title: '人数异常', content: '起点区域热度突降，可能为起跑拥挤缓解或数据延迟' }
]

export function deriveAlarms(tick) {
  const list = ALARM_POOL.map((a, i) => ({
    id: i + 1,
    level: a.level,
    title: a.title,
    content: a.content,
    createTime: fmtShort(Date.now())
  }))
  if (tick > 0 && tick % 8 === 0) {
    const extra = ALARM_POOL[Math.floor(Math.random() * ALARM_POOL.length)]
    list.unshift({ id: Date.now(), level: extra.level, title: extra.title, content: extra.content, createTime: fmtShort(Date.now()) })
  }
  return list
}
