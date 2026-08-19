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

export function addAlarm(data) {
  return request({
    url: '/business/alarm',
    method: 'post',
    data: data
  })
}

export function updateAlarm(data) {
  return request({
    url: '/business/alarm',
    method: 'put',
    data: data
  })
}

export function delAlarm(id) {
  return request({
    url: '/business/alarm/' + id,
    method: 'delete'
  })
}