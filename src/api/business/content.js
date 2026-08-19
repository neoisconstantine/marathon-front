import request from '@/utils/request'

export function listContent(query) {
  return request({
    url: '/business/content/list',
    method: 'get',
    params: query
  })
}

export function getContent(id) {
  return request({
    url: '/business/content/' + id,
    method: 'get'
  })
}

export function addContent(data) {
  return request({
    url: '/business/content',
    method: 'post',
    data: data
  })
}

export function updateContent(data) {
  return request({
    url: '/business/content',
    method: 'put',
    data: data
  })
}

export function delContent(id) {
  return request({
    url: '/business/content/' + id,
    method: 'delete'
  })
}
