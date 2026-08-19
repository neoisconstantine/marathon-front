import request from '@/utils/request'

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
