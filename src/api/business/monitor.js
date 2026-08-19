import axios from 'axios'
import { ElMessage } from 'element-plus'

/**
 * 大屏监控数据请求实例
 * 后端 /api/** 系列接口（ApiResult：code=0 成功，非0失败），与后台管理接口（code=200）约定不同，
 * 故不使用 @/utils/request 的通用拦截器，单独实例处理。
 */
const monitorService = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 10000
})

monitorService.interceptors.response.use(
  res => {
    const body = res.data
    if (body && body.code === 0) {
      return body.data
    }
    const msg = (body && body.message) || '接口异常'
    ElMessage.error(msg)
    return Promise.reject(new Error(msg))
  },
  error => {
    let { message } = error
    if (message === 'Network Error') {
      message = '后端接口连接异常'
    } else if (message.includes('timeout')) {
      message = '系统接口请求超时'
    } else if (message.includes('Request failed with status code')) {
      message = '系统接口' + message.slice(-3) + '异常'
    }
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

/**
 * 人流热力图：返回赛事全部摄像头点位（真实GPS）+ 各点位到达人数
 * @param {number} eventId 赛事ID
 */
export function getHeatmap(eventId) {
  return monitorService({
    url: '/api/monitor/heatmap',
    method: 'get',
    params: { eventId }
  })
}