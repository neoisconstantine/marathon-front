import request from '@/utils/request'

export function listAlarm(query) {
  return request({
    url: '/business/alarm/list',
    method: 'get',
    params: query
  })
}

export function getAlarm(id) {
  return request({
    url: '/business/alarm/' + id,
    method: 'get'
  })
}
