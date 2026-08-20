<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="所属赛事" prop="eventId">
        <el-select v-model="queryParams.eventId" placeholder="请选择赛事" clearable filterable style="width: 200px">
          <el-option v-for="item in eventOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="摄像头名称" prop="name">
        <el-input v-model="queryParams.name" placeholder="请输入摄像头名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="摄像头状态" clearable style="width: 200px">
          <el-option label="启用" value="1" />
          <el-option label="停用" value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['business:camera:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['business:camera:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['business:camera:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['business:camera:export']">导出</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Upload" @click="handleImport" v-hasPermi="['business:camera:import']">导入</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="cameraList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="赛事名称" align="center" prop="eventName" :show-overflow-tooltip="true" />
      <el-table-column label="摄像头编码" align="center" prop="cameraId" width="120" />
      <el-table-column label="摄像头名称" align="center" prop="name" :show-overflow-tooltip="true" />
      <el-table-column label="安装位置" align="center" prop="location" :show-overflow-tooltip="true" />
      <el-table-column label="经度" align="center" prop="lng" width="100" />
      <el-table-column label="纬度" align="center" prop="lat" width="100" />
      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="scope">
          <el-switch v-model="scope.row.status" :active-value="1" :inactive-value="0" @change="handleStatusChange(scope.row)" v-hasPermi="['business:camera:edit']" />
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="200" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['business:camera:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['business:camera:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="cameraRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属赛事" prop="eventId">
          <el-select v-model="form.eventId" placeholder="请选择赛事" filterable style="width: 100%">
            <el-option v-for="item in eventOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="摄像头编码" prop="cameraId">
          <el-input v-model="form.cameraId" placeholder="如 CP-05KM（同一赛事下不可重复）" maxlength="50" />
        </el-form-item>
        <el-form-item label="摄像头名称" prop="name">
          <el-input v-model="form.name" placeholder="如 5公里计时点" maxlength="100" />
        </el-form-item>
        <el-form-item label="安装位置" prop="location">
          <el-input v-model="form.location" placeholder="如 5公里折返点旁" maxlength="200" />
        </el-form-item>
        <el-form-item label="经度" prop="lng">
          <el-input-number v-model="form.lng" :min="-180" :max="180" :precision="6" :step="0.000001" controls-position="right" style="width: 100%" placeholder="大屏地图/热力图定位用" />
        </el-form-item>
        <el-form-item label="纬度" prop="lat">
          <el-input-number v-model="form.lat" :min="-90" :max="90" :precision="6" :step="0.000001" controls-position="right" style="width: 100%" placeholder="大屏地图/热力图定位用" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </template>
    </el-dialog>

    <!-- 导入摄像头弹窗 -->
    <el-dialog title="导入摄像头数据" v-model="upload.open" width="400px" append-to-body>
      <!-- 原生文件选择：浏览器原生 API，不依赖 el-upload 内部状态 -->
      <input ref="fileInputRef" type="file" accept=".xlsx, .xls" style="display: none" @change="onFileInputChange" />
      <div class="upload-area" @click="fileInputRef.click()">
        <el-icon><upload-filled /></el-icon>
        <div class="upload-area-text">{{ selectedFile ? selectedFile.name : '点击选择文件（xls/xlsx）' }}</div>
      </div>
      <div style="text-align: center; margin: 16px 0">
        <el-checkbox v-model="upload.updateSupport" /> 是否更新已经存在的摄像头数据（同赛事同编码）
        <div style="margin-top: 8px">
          <el-link type="primary" :underline="false" @click="handleImportTemplate">下载导入模板</el-link>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" :loading="upload.isUploading" @click="doImport">确 定</el-button>
        <el-button @click="upload.open = false">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Camera" lang="ts">
import { listCamera, getCamera, addCamera, updateCamera, delCamera, exportCamera, importTemplate } from '@/api/business/camera'
import { listEvent } from '@/api/business/event'
import { getToken } from '@/utils/auth'
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'

const { proxy } = getCurrentInstance()

const cameraList = ref([])
const eventOptions = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')
const open = ref(false)

const data = reactive({
  form: {},
  queryParams: { pageNum: 1, pageSize: 10, eventId: null, name: null, status: null },
  rules: {
    eventId: [{ required: true, message: '请选择所属赛事', trigger: 'change' }],
    cameraId: [{ required: true, message: '摄像头编码不能为空', trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

// 导入弹窗状态：原生 input 选文件 + 原生 XMLHttpRequest 上传，
// 完全绕开 el-upload 内部状态与 axios 全局 Content-Type，浏览器自动处理 multipart boundary
const fileInputRef = ref(null)
const selectedFile = ref(null)
const upload = reactive({
  open: false,
  isUploading: false,
  updateSupport: true,
  url: import.meta.env.VITE_APP_BASE_API + '/business/camera/import'
})

/** 赛事下拉数据（新增/编辑选赛事用） */
function loadEvents() {
  listEvent({ pageNum: 1, pageSize: 100 }).then(response => {
    eventOptions.value = response.rows || []
  })
}

function getList() {
  loading.value = true
  listCamera(queryParams.value).then(response => {
    cameraList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { queryParams.value = { pageNum: 1, pageSize: 10, eventId: null, name: null, status: null }; handleQuery() }
function handleSelectionChange(selection) { ids.value = selection.map(item => item.id); single.value = selection.length != 1; multiple.value = !selection.length }

function handleAdd() { reset(); open.value = true; title.value = '新增摄像头' }
function handleUpdate(row) { reset(); const id = row.id || ids.value[0]; getCamera(id).then(response => { form.value = response.data; open.value = true; title.value = '修改摄像头' }) }
function handleDelete(row) { const id = row.id || ids.value; proxy.$modal.confirm('是否确认删除该摄像头？').then(() => delCamera(id)).then(() => { getList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {}) }

function handleStatusChange(row) {
  updateCamera({ id: row.id, status: row.status }).then(() => {
    proxy.$modal.msgSuccess(row.status === 1 ? '已启用' : '已停用')
  }).catch(() => {
    row.status = row.status === 1 ? 0 : 1 // 失败回滚
  })
}

function submitForm() {
  proxy.$refs.cameraRef.validate(valid => {
    if (valid) {
      if (form.value.id) { updateCamera(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('修改成功') }) }
      else { addCamera(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('新增成功') }) }
    }
  })
}

function cancel() { open.value = false; reset() }
function reset() { form.value = { id: null, eventId: null, cameraId: null, name: null, location: null, lng: null, lat: null, status: 1 }; proxy.$refs.cameraRef?.resetFields() }

// ===== 导入导出 =====
// 导出：按当前筛选条件导出 Excel
function handleExport() {
  proxy.$modal.confirm('是否确认导出摄像头数据？').then(() => {
    return exportCamera(queryParams.value)
  }).then(() => {
    proxy.$modal.msgSuccess('导出成功')
  }).catch(() => {})
}

// 打开导入弹窗
function handleImport() {
  upload.open = true
  upload.isUploading = false
  upload.updateSupport = true
  selectedFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

// 原生文件选择回调：浏览器原生 API，选择的文件直接可用
function onFileInputChange(e) {
  const file = e.target.files && e.target.files[0]
  selectedFile.value = file || null
}

// 下载导入模板
function handleImportTemplate() {
  importTemplate().then(() => {
    proxy.$modal.msgSuccess('模板下载成功')
  }).catch(() => {})
}

// 提交导入：原生 XHR 发送 FormData（浏览器自动设置 multipart/form-data + boundary）
function doImport() {
  if (!selectedFile.value) {
    proxy.$modal.msgWarning('请先选择要导入的文件')
    return
  }
  upload.isUploading = true
  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('updateSupport', upload.updateSupport)
  const xhr = new XMLHttpRequest()
  xhr.open('POST', upload.url)
  xhr.setRequestHeader('Authorization', 'Bearer ' + getToken())
  xhr.onload = () => {
    upload.isUploading = false
    let res = null
    try {
      res = JSON.parse(xhr.responseText)
    } catch (e) {
      res = null
    }
    if (res && res.code === 200) {
      upload.open = false
      selectedFile.value = null
      proxy.$modal.msgSuccess(res.msg || '导入成功')
      getList()
    } else {
      // 业务失败（如"赛事不存在"）：保留弹窗和已选文件，展示具体错误
      proxy.$modal.msgError((res && res.msg) || '导入失败（HTTP ' + xhr.status + '）')
    }
  }
  xhr.onerror = () => {
    upload.isUploading = false
    proxy.$modal.msgError('网络错误，导入失败')
  }
  xhr.send(formData)
}

loadEvents()
getList()
</script>

<style scoped>
/* 导入文件选择区域 */
.upload-area {
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  color: #909399;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.upload-area:hover {
  border-color: #409eff;
  color: #409eff;
}
.upload-area-text {
  margin-top: 8px;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>