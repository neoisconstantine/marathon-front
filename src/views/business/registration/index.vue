<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="赛事" prop="eventId">
        <el-select v-model="queryParams.eventId" placeholder="请选择赛事" clearable style="width: 200px">
          <el-option v-for="item in eventOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="姓名" prop="personName">
        <el-input v-model="queryParams.personName" placeholder="请输入姓名" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="queryParams.phone" placeholder="请输入手机号" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="报名状态" clearable style="width: 200px">
          <el-option v-for="dict in registration_status" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['business:registration:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="registrationList">
      <el-table-column label="赛事" align="center" prop="eventName" :show-overflow-tooltip="true" />
      <el-table-column label="姓名" align="center" prop="personName" />
      <el-table-column label="手机号" align="center" prop="phone" />
      <el-table-column label="参赛号" align="center" prop="bib" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="regStatusType(scope.row.status)">{{ regStatusLabel(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="报名时间" align="center" prop="createTime" width="180" />
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="Registration" lang="ts">
import { listRegistration, exportRegistration } from '@/api/business/registration'
import { listEvent } from '@/api/business/event'
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'

const { proxy } = getCurrentInstance()
const registration_status = [
  { label: '待审核', value: 0 },
  { label: '已审核', value: 1 },
  { label: '已退赛', value: 2 },
  { label: '已驳回', value: 3 }
]
const eventOptions = ref([])
const registrationList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, eventId: null, personName: null, phone: null, status: null }
})
const { queryParams } = toRefs(data)

function regStatusType(s) { return ['warning', 'success', 'danger', 'info'][s] || 'info' }
function regStatusLabel(s) { return ['待审核', '已审核', '已退赛', '已驳回'][s] || '未知' }

function getList() {
  loading.value = true
  listRegistration(queryParams.value).then(response => {
    registrationList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { queryParams.value = { pageNum: 1, pageSize: 10, eventId: null, personName: null, phone: null, status: null }; handleQuery() }

function handleExport() {
  proxy.$modal.confirm('是否确认导出报名数据？').then(() => exportRegistration(queryParams.value)).then(response => {
    const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '报名数据.xlsx'
    link.click()
    window.URL.revokeObjectURL(url)
    proxy.$modal.msgSuccess('导出成功')
  }).catch(() => {})
}

listEvent({ pageNum: 1, pageSize: 100 }).then(response => { eventOptions.value = response.rows })
getList()
</script>
