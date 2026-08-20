import request from '@/utils/request'
import { download } from '@/utils/request'

// 摄像头管理：对应后端 CameraController（/business/camera）
export function listCamera(query) {
  return request({
    url: '/business/camera/list',
    method: 'get',
    params: query
  })
}

export function getCamera(id) {
  return request({
    url: '/business/camera/' + id,
    method: 'get'
  })
}

export function addCamera(data) {
  return request({
    url: '/business/camera',
    method: 'post',
    data: data
  })
}

export function updateCamera(data) {
  return request({
    url: '/business/camera',
    method: 'put',
    data: data
  })
}

export function delCamera(id) {
  return request({
    url: '/business/camera/' + id,
    method: 'delete'
  })
}

// 导出摄像头列表（Excel）
export function exportCamera(query) {
  return download('/business/camera/export', query, `摄像头数据_${new Date().getTime()}.xlsx`)
}

// 下载摄像头导入模板（Excel）
export function importTemplate() {
  return download('/business/camera/importTemplate', {}, `摄像头导入模板_${new Date().getTime()}.xlsx`)
}

// 导入摄像头数据（上传文件）
export function importData(data) {
  return request({
    url: '/business/camera/import',
    method: 'post',
    data: data
  })
}