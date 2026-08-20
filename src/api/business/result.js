import request from '@/utils/request'
import { download } from '@/utils/request'

export function listResult(query) {
  return request({
    url: '/business/result/list',
    method: 'get',
    params: query
  })
}

export function getResult(id) {
  return request({
    url: '/business/result/' + id,
    method: 'get'
  })
}

// 导出成绩列表（Excel，按当前查询条件过滤）
export function exportResult(query) {
  return download('/business/result/export', query, `成绩数据_${new Date().getTime()}.xlsx`)
}
