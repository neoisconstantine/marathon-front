<template>
  <div class="screen-wrap">
    <div class="screen">
      <!-- ==================== 头部 ==================== -->
      <header class="screen-header">
        <div class="header-title">
          <div class="title-main">赛道监控指挥中心</div>
          <div class="title-sub">{{ currentEvent.eventName }}</div>
        </div>
        <div class="header-right">
          <!-- 赛事切换（演示数据；对接后改为 listEvent 后端列表） -->
          <select v-model="currentEventId" class="event-select" @change="onEventChange">
            <option v-for="e in eventList" :key="e.eventId" :value="e.eventId">{{ e.eventName }}</option>
          </select>
          <!-- 热力图时间窗切换 -->
          <div class="window-switch">
            <span
              v-for="w in windowOptions"
              :key="w.value"
              :class="{ active: windowType === w.value }"
              @click="onWindowChange(w.value)"
            >{{ w.label }}</span>
          </div>
          <span class="clock">{{ now }}</span>
          <span v-if="isDemo" class="demo-badge">演示数据</span>
        </div>
      </header>

      <!-- ==================== 主体 ==================== -->
      <main class="screen-main">
        <!-- 赛事核心数据统计 + 实时榜单 -->
        <section class="col col-left">
          <div class="panel panel-overview">
            <dv-border-box-8 class="panel-frame">
              <div class="panel-inner">
                <div class="panel-title">赛事核心数据统计</div>
                <div class="overview-body">
                  <div class="ov-item">
                    <span class="ov-label">总里程</span>
                    <span class="ov-num ov-km">{{ totalKm }}<span class="ov-unit">km</span></span>
                  </div>
                  <div class="ov-item">
                    <span class="ov-label">参赛人数</span>
                    <dv-digital-flop :config="{ number: [overview.participantCount || 0], textAlign: 'right' }" class="ov-num" />
                  </div>
                  <div class="ov-item">
                    <span class="ov-label">完赛人数</span>
                    <dv-digital-flop :config="{ number: [overview.finishCount || 0], textAlign: 'right' }" class="ov-num" />
                  </div>
                  <div class="ov-item">
                    <span class="ov-label">在途人数</span>
                    <dv-digital-flop :config="{ number: [overview.onlineCount || 0], textAlign: 'right' }" class="ov-num" />
                  </div>
                  <div class="ov-item">
                    <span class="ov-label">完赛率</span>
                    <span class="ov-num ov-rate-num">{{ finishRateText }}<span class="ov-unit">%</span></span>
                  </div>
                </div>
              </div>
            </dv-border-box-8>
          </div>

          <div class="panel panel-ranking">
            <dv-border-box-8 class="panel-frame">
              <div class="panel-inner">
                <div class="panel-title">实时成绩榜单</div>
                <dv-scroll-ranking-board :config="rankingConfig" class="board" />
              </div>
            </dv-border-box-8>
          </div>
        </section>

        <!-- 中央：人流热力图 -->
        <section class="col col-center">
          <div class="panel panel-map">
            <dv-border-box-11 class="panel-frame">
              <div class="panel-inner map-inner">
                <div class="panel-title">人流热力图
                  <span class="panel-sub">{{ windowLabel }} · 更新 {{ heatmap.updatedAt || '--' }}</span>
                </div>
                <div ref="heatmapRef" class="map-chart"></div>
              </div>
            </dv-border-box-11>
          </div>
        </section>

        <!-- 右列：配速统计 -->
        <section class="col col-right">
          <div class="panel panel-pace">
            <dv-border-box-12 class="panel-frame">
              <div class="panel-inner">
                <div class="panel-title">分区间平均配速</div>
                <div ref="paceRef" class="chart"></div>
              </div>
            </dv-border-box-12>
          </div>

          <div class="panel panel-pass">
            <dv-border-box-12 class="panel-frame">
              <div class="panel-inner">
                <div class="panel-title">各分段通过人数</div>
                <div ref="barRef" class="chart"></div>
              </div>
            </dv-border-box-12>
          </div>
        </section>
      </main>

      <!-- ==================== 底部：实时报警 ==================== -->
      <footer class="screen-footer">
        <div class="panel panel-alarm">
          <dv-border-box-8 class="panel-frame">
            <div class="panel-inner alarm-inner">
              <div class="panel-title">实时报警</div>
              <dv-scroll-board :config="alarmConfig" class="alarm-board" />
            </div>
          </dv-border-box-8>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { listEvent } from '@/api/business/event'
import { getHeatmap } from '@/api/business/monitor'
import {
  COURSE_ROUTE,
  mockEventList,
  deriveOverview,
  derivePaceStats,
  deriveLeaderboard,
  deriveHeatmap,
  deriveAlarms,
  paceFormat,
  paceToSeconds
} from './mockData'

/* ==================== 状态 ==================== */
const eventList = ref(mockEventList())
const currentEventId = ref(eventList.value[0]?.eventId ?? 1)
const currentEvent = computed(() => eventList.value.find(e => e.eventId === currentEventId.value) || eventList.value[0] || {})

const windowOptions = [
  { label: '5分钟', value: '5min' },
  { label: '10分钟', value: '10min' },
  { label: '累计', value: 'total' }
]
const windowType = ref('10min')
const windowLabel = computed(() => windowOptions.find(w => w.value === windowType.value)?.label || '')

/** 对接真实后端后，由接口成败决定该标记并隐藏角标 */
const isDemo = ref(true)

const now = ref('')
const overview = ref({ participantCount: 0, finishCount: 0, onlineCount: 0, finishRate: 0 })
const paceStats = ref({ segments: [] })
const leaderboard = ref({ list: [] })
const heatmap = ref({ route: COURSE_ROUTE, points: [], updatedAt: '' })
const alarms = ref([])

let tick = 0
let pollTimer = null
let heatTimer = null
let clockTimer = null

/* ==================== 后端真实数据（赛事/参赛人数） ==================== */
/**
 * 查询正在进行中的比赛（status=2），用真实赛事替换 mock 列表。
 * 参赛人数来自报名表实时统计（后端 selectEventList 关联 registration，排除退赛），
 * 一次查询即返回全部赛事的 registrationCount，无需循环调用。
 * 成功且返回数据 → 隐藏"演示数据"角标；失败 → 沿用 mockEventList 兜底。
 */
async function loadRunningEvents() {
  try {
    const res = await listEvent({ status: 2, pageNum: 1, pageSize: 100 })
    const rows = (res && res.rows) || []
    if (!rows.length) return
    const prevId = currentEventId.value
    eventList.value = rows.map(e => ({
      eventId: e.id,
      eventName: e.name,
      status: e.status,
      registered: e.registrationCount ?? 0,
      mileage: e.mileage ?? null
    }))
    // 保持当前选中赛事；若原选中不在进行中列表里，则切到第一场
    if (!eventList.value.some(e => e.eventId === prevId)) {
      currentEventId.value = eventList.value[0].eventId
    }
    isDemo.value = false
  } catch (err) {
    // 接口不可用时保持 mock 数据，大屏仍可演示
    console.warn('[bigScreen] 加载进行中赛事失败，使用演示数据', err)
  }
}

/* ==================== 数据加载（对接替换点） ==================== */
// 接入真实后端时：将下方 deriveXxx 调用替换为后端接口即可，例如
//   getMonitorOverview(eventId).then(d => { overview.value = d })
// 接口返回结构需与 mockData.js 中 deriveXxx 的返回结构保持一致。
// 当前 deriveXxx 内部：模拟摄像头/计时系统上传的点位通过记录(pass_record)，
// 并按文档推导 —— 热度值=时间窗通过人数÷最大通过人数；分段配速=分段距离÷通过时间差。
async function loadAll() {
  tick++
  const ev = currentEvent.value
  const base = deriveOverview(tick, ev.eventName)
  // 参赛人数 = 后端 selectEventList 关联报名表的 registrationCount（排除退赛）；完赛数/在途/完赛率按真实基数联动
  const participantCount = ev.registered > 0 ? ev.registered : base.participantCount
  const finishCount = Math.min(base.finishCount, participantCount)
  overview.value = {
    ...base,
    eventId: ev.eventId,
    participantCount,
    finishCount,
    finishRate: Number((finishCount / participantCount).toFixed(4)),
    onlineCount: Math.max(0, participantCount - finishCount - 320)
  }
  paceStats.value = derivePaceStats(tick)
  leaderboard.value = deriveLeaderboard(tick)
  alarms.value = deriveAlarms(tick)
  renderCharts()
}

/** 热力图数据加载：真实数据（camera 表点位 GPS + pass_record 到达人数），无人经过的点位 count=0 无热力。
 *  独立于 loadAll 轮询，按 60 秒/次刷新，保证摄像头节点颜色深浅随当前人数变化。 */
async function loadHeatmap() {
  const ev = currentEvent.value
  try {
    const data = await getHeatmap(ev.eventId)
    heatmap.value = {
      route: data.route && data.route.length ? data.route : COURSE_ROUTE,
      points: data.points || [],
      updatedAt: fmtNow()
    }
  } catch (e) {
    // 接口异常时回退模拟数据，保证大屏可用
    heatmap.value = deriveHeatmap(tick, windowType.value)
  }
  // 数据更新后重建热力图层（赛道线/热力晕圈/摄像头节点）
  renderHeatmap(heatmap.value)
}

/* ==================== 地图（Leaflet + 高德瓦片） ==================== */
const heatmapRef = ref(null)
const paceRef = ref(null)
const barRef = ref(null)
let heatmapMap = null
let routeLayer = null
let heatLayer = null
let pointLayer = null
let mapFitted = false
let paceChart = null
let barChart = null

/**
 * WGS-84 → GCJ-02 坐标转换。
 * 摄像头 GPS 为 WGS-84（原始卫星坐标），高德瓦片使用 GCJ-02（火星坐标）加密坐标，
 * 不转换会整体偏移约 100~600 米，赛道/热力点与道路对不上。
 */
function wgs84ToGcj02(lng, lat) {
  const PI = Math.PI
  const A = 6378245.0
  const EE = 0.00669342162296594323
  const outOfChina = (lng, lat) => lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
  const transformLat = (x, y) => {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0
    return ret
  }
  const transformLng = (x, y) => {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0
    return ret
  }
  if (outOfChina(lng, lat)) return [lng, lat]
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = lat / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI)
  return [lng + dLng, lat + dLat]
}

/** 初始化 Leaflet 地图（高德瓦片，无 Key），仅首次调用时创建一次 */
function initHeatmapMap() {
  if (heatmapMap || !heatmapRef.value) return
  heatmapMap = L.map(heatmapRef.value, {
    zoomControl: true,
    attributionControl: false,
    minZoom: 3,
    maxZoom: 18,
    zoomSnap: 0.5
  })
  // 默认视图定位到赛道区域（芒市），真实热力数据到达后 renderHeatmap 会 fitBounds 精确校准
  heatmapMap.setView([24.43, 98.59], 12)
  // 高德路网瓦片（style=8 透明底，契合深色大屏；style=7 为完整地图可切换）
  L.tileLayer(
    'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    { subdomains: ['1', '2', '3', '4'], maxZoom: 18, attribution: '高德地图' }
  ).addTo(heatmapMap)
}

/** 摄像头节点颜色：按 heat(0~1) 在 绿→黄→红 之间线性渐变；无人员经过(count=0)显示蓝色 */
function heatColor(heat) {
  const stops = [
    [0.0, [16, 226, 139]],   // #10e28b 绿（人数少）
    [0.5, [255, 210, 31]],   // #ffd21f 黄
    [1.0, [255, 77, 79]]     // #ff4d4f 红（人数多）
  ]
  const h = Math.max(0, Math.min(1, heat || 0))
  let a = stops[0], b = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (h >= stops[i][0] && h <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break }
  }
  const t = b[0] === a[0] ? 0 : (h - a[0]) / (b[0] - a[0])
  const rgb = a[1].map((v, i) => Math.round(v + (b[1][i] - v) * t))
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
}

/** 渲染赛道线 + 热力 + 点位到 Leaflet（每次数据更新重建图层） */
function renderHeatmap(data) {
  initHeatmapMap()
  if (!heatmapMap) return
  // WGS-84 → GCJ-02：camera GPS 需转换才能与高德瓦片对齐
  const route = (data.route || []).map(p => {
    const [lng, lat] = wgs84ToGcj02(p[0], p[1])
    return [lat, lng] // Leaflet 使用 [lat, lng]
  })
  const all = (data.points || []).map(p => {
    const [lng, lat] = wgs84ToGcj02(p.lng, p.lat)
    return { ...p, lat, lng }
  })
  const active = all.filter(p => (p.count || 0) > 0)

  // 移除旧图层
  if (routeLayer) { heatmapMap.removeLayer(routeLayer); routeLayer = null }
  if (heatLayer) { heatmapMap.removeLayer(heatLayer); heatLayer = null }
  if (pointLayer) { heatmapMap.removeLayer(pointLayer); pointLayer = null }

  // 赛道线
  if (route.length > 1) {
    routeLayer = L.polyline(route, {
      color: '#35c4ff',
      weight: 3,
      opacity: 0.9
    }).addTo(heatmapMap)
  }

  // 热力层（leaflet.heat: [[lat, lng, intensity], ...]）
  if (active.length) {
    heatLayer = L.heatLayer(active.map(p => [p.lat, p.lng, p.heat]), {
      radius: 30,
      blur: 20,
      maxZoom: 17,
      minOpacity: 0.4,
      gradient: { 0.2: '#10e28b', 0.5: '#ffd21f', 0.9: '#ff4d4f' }
    }).addTo(heatmapMap)
  }

  // 摄像头点位（circleMarker + 悬浮提示）——颜色深浅按当前节点人数(heat)渐变
  pointLayer = L.layerGroup(all.map(p => {
    const active = (p.count || 0) > 0
    const color = active ? heatColor(p.heat) : '#35c4ff'
    const m = L.circleMarker([p.lat, p.lng], {
      radius: active ? 4 + (p.heat || 0) * 10 : 4,
      color: '#ffffff',
      weight: 1.5,
      fillColor: color,
      fillOpacity: active ? 0.55 + (p.heat || 0) * 0.45 : 0.85
    })
    m.bindTooltip(buildPointTooltip(p), {
      direction: 'top',
      offset: [0, -6],
      className: 'hm-tooltip'
    })
    return m
  })).addTo(heatmapMap)

  // 首次真实数据到达时 fitBounds 到赛道范围（之后保留用户手动缩放/拖拽状态）
  // data.updatedAt 非空表示来自 loadHeatmap 的真实/回退数据，初始 mock 渲染不触发定位
  if (route.length > 1 && !mapFitted && data.updatedAt) {
    heatmapMap.fitBounds(L.latLngBounds(route), { padding: [40, 40], maxZoom: 15 })
    mapFitted = true
  }
}

/** 点位悬浮提示 HTML（沿用原 ECharts tooltip 内容） */
function buildPointTooltip(p) {
  let html = `<div class="hm-tip-name">${p.name || ''}</div>`
  html += `<div class="hm-tip-row">通过人数：<b style="color:#35c4ff">${p.count ?? '--'}</b></div>`
  const users = p.users || []
  if (users.length) {
    const list = users.slice(0, 5).map(u =>
      `&nbsp;&nbsp;${u.bib || '--'} ${u.name || ''} <span style="color:#8fb8e8">${u.passTime ? String(u.passTime).slice(11) : ''}</span>`
    ).join('<br/>')
    html += `<div class="hm-tip-row">最近到达：<br/>${list}</div>`
  }
  return html
}

const darkTooltip = {
  backgroundColor: 'rgba(6, 20, 48, 0.92)',
  borderColor: 'rgba(64, 158, 255, 0.5)',
  textStyle: { color: '#cfe4ff', fontSize: 13 }
}

function buildPaceOption(stats) {
  const names = stats.segments.map(s => s.segment)
  const values = stats.segments.map(s => paceToSeconds(s.avgPace))
  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...darkTooltip,
      trigger: 'axis',
      formatter: params => {
        const p = params[0]
        return `${p.name}<br/>平均配速：<b style="color:#35c4ff">${paceFormat(p.value)}/km</b>`
      }
    },
    grid: { top: 26, left: 58, right: 18, bottom: 28 },
    xAxis: {
      type: 'category',
      data: names,
      axisLine: { lineStyle: { color: 'rgba(64,158,255,0.35)' } },
      axisLabel: { color: '#8fb8e8', fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      inverse: true,
      min: value => Math.floor(value.min - 20),
      axisLine: { show: false },
      axisLabel: { color: '#8fb8e8', fontSize: 11, formatter: v => paceFormat(v) },
      splitLine: { lineStyle: { color: 'rgba(64,158,255,0.12)' } }
    },
    series: [{
      name: '平均配速',
      type: 'line',
      smooth: true,
      data: values,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { color: '#35c4ff', width: 3 },
      itemStyle: { color: '#35c4ff', borderColor: '#fff', borderWidth: 1 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(53, 196, 255, 0.35)' },
          { offset: 1, color: 'rgba(53, 196, 255, 0)' }
        ])
      }
    }]
  }
}

function buildBarOption(stats) {
  const names = stats.segments.map(s => s.segment.replace('KM', ''))
  const values = stats.segments.map(s => s.passCount)
  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...darkTooltip,
      trigger: 'axis',
      formatter: params => {
        const p = params[0]
        return `${stats.segments[p.dataIndex].segment}<br/>通过人数：<b style="color:#35c4ff">${p.value}</b>`
      }
    },
    grid: { top: 26, left: 58, right: 18, bottom: 28 },
    xAxis: {
      type: 'category',
      data: names,
      axisLine: { lineStyle: { color: 'rgba(64,158,255,0.35)' } },
      axisLabel: { color: '#8fb8e8', fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#8fb8e8', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(64,158,255,0.12)' } }
    },
    series: [{
      name: '通过人数',
      type: 'bar',
      data: values,
      barWidth: 14,
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#10e28b' },
          { offset: 1, color: '#ffd21f' }
        ])
      }
    }]
  }
}

function renderCharts() {
  renderHeatmap(heatmap.value)
  if (!paceChart && paceRef.value) paceChart = echarts.init(paceRef.value)
  if (paceChart) paceChart.setOption(buildPaceOption(paceStats.value), true)
  if (!barChart && barRef.value) barChart = echarts.init(barRef.value)
  if (barChart) barChart.setOption(buildBarOption(paceStats.value), true)
}

function onResize() {
  heatmapMap && heatmapMap.invalidateSize()
  paceChart && paceChart.resize()
  barChart && barChart.resize()
}

/* ==================== 概览面板计算 ==================== */
/** 完赛率百分比文本（保留 1 位小数，如 42.5%） */
const finishRateText = computed(() => {
  const pct = Number(((overview.value.finishRate || 0) * 100).toFixed(1))
  return pct
})

/**
 * 赛事总里程（km）：
 * 优先使用后端 Event.mileage 字段（数据库中配置的真实赛道里程）；
 * 为空时回退解析摄像头点位编码（CP-05KM → 5、CP-HALF → 21.0975 等，取最大值）；
 * 再兜底用赛道 GPS 折线距离（haversine）估算。
 */
const totalKm = computed(() => {
  const ev = currentEvent.value
  const dbKm = Number(ev.mileage)
  if (dbKm > 0) return Math.round(dbKm * 1000) / 1000
  const points = heatmap.value.points || []
  let maxKm = 0
  for (const p of points) {
    const id = p.cameraId || ''
    let m = /CP-(\d+(?:\.\d+)?)\s*KM/i.exec(id)
    if (m) {
      maxKm = Math.max(maxKm, parseFloat(m[1]))
      continue
    }
    if (/CP-HALF/i.test(id)) maxKm = Math.max(maxKm, 21.0975)
  }
  if (maxKm > 0) return Math.round(maxKm * 1000) / 1000
  // 兜底：GPS 折线距离
  const route = heatmap.value.route || []
  const R = 6371
  const toRad = d => (d * Math.PI) / 180
  let sum = 0
  for (let i = 1; i < route.length; i++) {
    const [lng1, lat1] = route[i - 1]
    const [lng2, lat2] = route[i]
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    sum += 2 * R * Math.asin(Math.sqrt(a))
  }
  return Math.round(sum * 1000) / 1000
})

const rankingConfig = computed(() => ({
  data: leaderboard.value.list.map(r => ({ name: `${r.bib} · ${r.name}`, value: r.netTime })),
  carousel: 'single',
  rowNum: 8
}))

const LEVEL_TEXT = { 1: '提示', 2: '警告', 3: '严重' }

const alarmConfig = computed(() => ({
  header: ['级别', '时间', '报警内容'],
  data: alarms.value.map(a => [
    LEVEL_TEXT[a.level] || '提示',
    a.createTime,
    `【${a.title}】${a.content}`
  ]),
  rowNum: 2,
  waitTime: 3000,
  align: ['center', 'center', 'left'],
  headerBGC: 'rgba(64, 158, 255, 0.18)',
  oddRowBGC: 'rgba(9, 28, 60, 0.35)',
  evenRowBGC: 'rgba(7, 22, 48, 0.35)'
}))

/* ==================== 交互 ==================== */
function onEventChange() {
  tick = 0
  loadAll()
}

function onWindowChange(value) {
  windowType.value = value
  loadAll()
}

function updateClock() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  now.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 当前时刻 HH:mm:ss（热力图更新时间） */
function fmtNow() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/* ==================== 生命周期 ==================== */
onMounted(async () => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  // 赛事列表仅在刷新页面时查询一次；轮询只更新模拟的实时数据
  await loadRunningEvents()
  loadAll()
  pollTimer = setInterval(loadAll, 5000)
  // 热力图独立刷新：摄像头节点颜色深浅按当前人数，每分钟更新一次
  loadHeatmap()
  heatTimer = setInterval(loadHeatmap, 60000)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  clearInterval(pollTimer)
  clearInterval(heatTimer)
  clearInterval(clockTimer)
  window.removeEventListener('resize', onResize)
  heatmapMap && heatmapMap.remove()
  heatmapMap = null
  paceChart && paceChart.dispose()
  barChart && barChart.dispose()
  paceChart = barChart = null
})
</script>

<style lang="scss" scoped>
.screen-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000; /* 低于侧边栏(1001)，保证菜单悬浮在大屏之上不被遮盖 */
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: linear-gradient(180deg, #050b1e 0%, #0a1e44 60%, #061530 100%);
}

.screen {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 让出侧边栏宽度（200px），大屏内容不被左侧菜单遮挡 */
  padding: 12px 16px 14px;
  padding-left: 216px;
  color: #cfe4ff;
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
}

/* ---------- 头部 ---------- */
.screen-header {
  height: 86px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(64, 158, 255, 0.6), transparent);
  }
}

.header-title {
  display: flex;
  align-items: baseline;
  gap: 18px;
}

.title-main {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: 6px;
  background: linear-gradient(180deg, #ffffff 10%, #6ee7ff 45%, #35a4ff 80%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 24px rgba(53, 196, 255, 0.45);
}

.title-sub {
  font-size: 15px;
  color: #7db4ff;
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.event-select {
  height: 28px;
  padding: 0 8px;
  border: 1px solid rgba(64, 158, 255, 0.4);
  border-radius: 4px;
  background: rgba(6, 20, 48, 0.7);
  color: #cfe4ff;
  font-size: 13px;
  outline: none;
  option { background: #0a1e44; color: #cfe4ff; }
}

.window-switch {
  display: flex;
  border: 1px solid rgba(64, 158, 255, 0.4);
  border-radius: 4px;
  overflow: hidden;
  span {
    padding: 4px 14px;
    font-size: 13px;
    color: #8fb8e8;
    cursor: pointer;
    transition: all 0.25s;
    &.active {
      background: linear-gradient(180deg, rgba(53, 196, 255, 0.35), rgba(53, 196, 255, 0.15));
      color: #6ee7ff;
    }
    &:hover:not(.active) { color: #cfe4ff; }
  }
}

.clock {
  font-size: 15px;
  color: #6ee7ff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

.demo-badge {
  font-size: 12px;
  color: #ffd21f;
  border: 1px solid rgba(255, 210, 31, 0.5);
  border-radius: 3px;
  padding: 2px 8px;
}

/* ---------- 主体布局 ---------- */
.screen-main {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 16px;
  padding: 14px 0;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.col-left,
.col-right {
  width: 24%;
  flex-shrink: 0;
}

.col-center {
  flex: 1;
  min-width: 0;
}

/* ---------- 面板 ---------- */
.panel {
  position: relative;
  min-height: 0;
}

.panel-frame {
  width: 100%;
  height: 100%;
}

.panel-inner {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 36px 16px 14px;
  overflow: hidden;
}

.panel-title {
  position: absolute;
  top: 10px;
  left: 22px;
  z-index: 2;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  color: #6ee7ff;
  text-shadow: 0 0 10px rgba(64, 158, 255, 0.7);
  display: flex;
  align-items: center;
  gap: 8px;
  &::before {
    content: '';
    width: 4px;
    height: 16px;
    background: linear-gradient(180deg, #6ee7ff, #35a4ff);
    border-radius: 2px;
  }
}

.panel-sub {
  font-size: 12px;
  font-weight: 400;
  color: #7db4ff;
  letter-spacing: 0;
  text-shadow: none;
}

/* 概览面板 */
.panel-overview {
  height: 292px;
  flex-shrink: 0;
}

.overview-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.ov-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ov-label {
  font-size: 14px;
  color: #8fb8e8;
  white-space: nowrap;
}

.ov-num {
  font-size: 30px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #6ee7ff;
  text-shadow: 0 0 12px rgba(53, 196, 255, 0.6);
}

/* dv-digital-flop 内部 canvas 默认高 150px 会撑开行高，这里压回紧凑高度 */
.ov-item :deep(.dv-digital-flop) {
  height: 32px;
}

/* 总里程（数字略小于人数统计，单位小字） */
.ov-km {
  font-size: 24px;
}

.ov-unit {
  font-size: 13px;
  font-weight: 400;
  color: #8fb8e8;
  margin-left: 2px;
}

/* 榜单面板 */
.panel-ranking {
  flex: 1;
  min-height: 0;
}

.board {
  flex: 1;
  min-height: 0;
  margin-top: 4px;
}

/* 热力图 */
.panel-map {
  flex: 1;
  min-height: 0;
}

.map-inner {
  padding-left: 18px;
  padding-right: 18px;
}

.map-chart {
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 0;
  background: rgba(4, 14, 38, 0.6);
}

/* Leaflet 缩放控件（深色主题） */
.map-chart :deep(.leaflet-control-zoom a) {
  background: rgba(9, 28, 60, 0.85);
  color: #7db4ff;
  border-color: rgba(64, 158, 255, 0.35);
}
.map-chart :deep(.leaflet-control-zoom a:hover) {
  background: rgba(16, 44, 88, 0.95);
  color: #35c4ff;
}
.map-chart :deep(.leaflet-control-zoom) {
  border-radius: 4px;
  overflow: hidden;
}

/* 点位悬浮提示（深色主题） */
.map-chart :deep(.leaflet-tooltip.hm-tooltip) {
  background: rgba(6, 20, 48, 0.92);
  border: 1px solid rgba(64, 158, 255, 0.5);
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(64, 158, 255, 0.3);
  color: #cfe4ff;
  font-size: 12px;
  padding: 6px 8px;
  line-height: 1.6;
}
.map-chart :deep(.leaflet-tooltip-top.hm-tooltip::before) {
  border-top-color: rgba(64, 158, 255, 0.5);
}
.hm-tip-name {
  color: #6ee7ff;
  font-weight: 600;
  margin-bottom: 2px;
}
.hm-tip-row {
  white-space: nowrap;
}

/* 右侧图表 */
.panel-pace {
  height: 46%;
  flex-shrink: 0;
}

.panel-pass {
  flex: 1;
  min-height: 0;
}

.chart {
  flex: 1;
  min-height: 0;
}

/* ---------- 底部报警 ---------- */
.screen-footer {
  height: 108px;
  flex-shrink: 0;
}

.panel-alarm {
  height: 100%;
}

.alarm-inner {
  padding-top: 30px;
}

.alarm-board {
  flex: 1;
  min-height: 0;
}
</style>
