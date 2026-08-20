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

export function addRegistration(data) {
  return request({
    url: '/business/registration',
    method: 'post',
    data: data
  })
}

export function updateRegistration(data) {
  return request({
    url: '/business/registration',
    method: 'put',
    data: data
  })
}

export function delRegistration(id) {
  return request({
    url: '/business/registration/' + id,
    method: 'delete'
  })
}

export function reviewRegistration(id, status) {
  return request({
    url: '/business/registration/' + id + '/review',
    method: 'put',
    params: { status: status }
  })
}

export function refundRegistration(id) {
  return request({
    url: '/business/registration/' + id + '/refund',
    method: 'put'
  })
}

export function exportRegistration(query) {
  return request({
    url: '/business/registration/export',
    method: 'post',
    params: query,
    responseType: 'blob'
  })
}
