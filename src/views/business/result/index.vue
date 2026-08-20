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
      <el-form-item label="参赛号" prop="bib">
        <el-input v-model="queryParams.bib" placeholder="请输入参赛号" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="成绩状态" clearable style="width: 200px">
          <el-option v-for="dict in result_status" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['business:result:export']">导出</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="resultList">
      <el-table-column label="赛事" align="center" prop="eventName" :show-overflow-tooltip="true" />
      <el-table-column label="姓名" align="center" prop="personName" />
      <el-table-column label="参赛号" align="center" prop="bib" />
      <el-table-column label="枪声成绩" align="center" prop="gunTime" />
      <el-table-column label="净成绩" align="center" prop="netTime" />
      <el-table-column label="平均配速" align="center" prop="avgPace" />
      <el-table-column label="总排名" align="center" prop="totalRank" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status == 1 ? 'success' : 'info'">{{ resultStatusLabel(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="100">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog title="成绩详情" v-model="detailOpen" width="700px" append-to-body>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="赛事">{{ detailData.eventName }}</el-descriptions-item>
        <el-descriptions-item label="姓名">{{ detailData.personName }}</el-descriptions-item>
        <el-descriptions-item label="参赛号">{{ detailData.bib }}</el-descriptions-item>
        <el-descriptions-item label="总排名">{{ detailData.totalRank }}</el-descriptions-item>
        <el-descriptions-item label="枪声成绩">{{ detailData.gunTime }}</el-descriptions-item>
        <el-descriptions-item label="净成绩">{{ detailData.netTime }}</el-descriptions-item>
        <el-descriptions-item label="平均配速">{{ detailData.avgPace }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ resultStatusLabel(detailData.status) }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="splitsData.length > 0" style="margin-top: 20px">
        <h4>分段成绩</h4>
        <el-table :data="splitsData" border size="small">
          <el-table-column label="分段" align="center" prop="name" />
          <el-table-column label="用时" align="center" prop="time" />
          <el-table-column label="配速" align="center" prop="pace" />
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup name="Result" lang="ts">
import { listResult, getResult, exportResult } from '@/api/business/result'
import { listEvent } from '@/api/business/event'
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'

const { proxy } = getCurrentInstance()

const result_status = [
  { label: '未完赛', value: 0 },
  { label: '已完赛', value: 1 },
  { label: '成绩无效', value: 2 }
]
const eventOptions = ref([])
const resultList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const detailOpen = ref(false)
const detailData = ref({})
const splitsData = ref([])

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, eventId: null, personName: null, bib: null, status: null }
})
const { queryParams } = toRefs(data)

function resultStatusLabel(s) { return ['未完赛', '已完赛', '成绩无效'][s] || '未知' }

function getList() {
  loading.value = true
  listResult(queryParams.value).then(response => {
    resultList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { queryParams.value = { pageNum: 1, pageSize: 10, eventId: null, personName: null, bib: null, status: null }; handleQuery() }

// 导出当前查询条件下的成绩 Excel
function handleExport() {
  proxy.$modal.confirm('是否确认导出当前查询条件下的成绩数据？').then(() => {
    return exportResult(queryParams.value)
  }).then(() => {
    proxy.$modal.msgSuccess('导出成功')
  }).catch(() => {})
}

function handleDetail(row) {
  getResult(row.id).then(response => {
    detailData.value = response.data
    try {
      splitsData.value = JSON.parse(response.data.splits || '[]')
    } catch { splitsData.value = [] }
    detailOpen.value = true
  })
}

listEvent({ pageNum: 1, pageSize: 100 }).then(response => { eventOptions.value = response.rows })
getList()
</script>
