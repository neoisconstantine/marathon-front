import request from '@/utils/request'

export function listPerson(query) {
  return request({
    url: '/business/person/list',
    method: 'get',
    params: query
  })
}

export function getPerson(id) {
  return request({
    url: '/business/person/' + id,
    method: 'get'
  })
}

export function addPerson(data) {
  return request({
    url: '/business/person',
    method: 'post',
    data: data
  })
}

export function updatePerson(data) {
  return request({
    url: '/business/person',
    method: 'put',
    data: data
  })
}

export function delPerson(id) {
  return request({
    url: '/business/person/' + id,
    method: 'delete'
  })
}
