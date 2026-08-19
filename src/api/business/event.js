import request from '@/utils/request'

export function listEvent(query) {
  return request({
    url: '/business/event/list',
    method: 'get',
    params: query
  })
}

export function getEvent(id) {
  return request({
    url: '/business/event/' + id,
    method: 'get'
  })
}

export function addEvent(data) {
  return request({
    url: '/business/event',
    method: 'post',
    data: data
  })
}

export function updateEvent(data) {
  return request({
    url: '/business/event',
    method: 'put',
    data: data
  })
}

export function delEvent(id) {
  return request({
    url: '/business/event/' + id,
    method: 'delete'
  })
}

export function updateEventStatus(id, status) {
  return request({
    url: '/business/event/' + id + '/status',
    method: 'put',
    params: { status: status }
  })
}
