import request from '@/utils/request'

export function listRegistration(query) {
  return request({
    url: '/business/registration/list',
    method: 'get',
    params: query
  })
}

export function getRegistration(id) {
  return request({
    url: '/business/registration/' + id,
    method: 'get'
  })
}

export function exportRegistration(query) {
  return request({
    url: '/business/registration/export',
    method: 'get',
    params: query,
    responseType: 'blob'
  })
}
