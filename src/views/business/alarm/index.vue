<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="报警类型" prop="type">
        <el-select v-model="queryParams.type" placeholder="报警类型" clearable style="width: 200px">
          <el-option v-for="dict in alarm_type" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="报警级别" prop="level">
        <el-select v-model="queryParams.level" placeholder="报警级别" clearable style="width: 200px">
          <el-option v-for="dict in alarm_level" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="处理状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="处理状态" clearable style="width: 200px">
          <el-option v-for="dict in alarm_status" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="alarmList">
      <el-table-column label="报警类型" align="center" prop="type">
        <template #default="scope">{{ alarmTypeLabel(scope.row.type) }}</template>
      </el-table-column>
      <el-table-column label="报警级别" align="center" prop="level">
        <template #default="scope">
          <el-tag :type="alarmLevelType(scope.row.level)">{{ alarmLevelLabel(scope.row.level) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="报警标题" align="center" prop="title" :show-overflow-tooltip="true" />
      <el-table-column label="报警内容" align="center" prop="content" :show-overflow-tooltip="true" />
      <el-table-column label="处理状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status == 0 ? 'danger' : 'success'">{{ scope.row.status == 0 ? '未处理' : '已处理' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="报警时间" align="center" prop="createTime" width="180" />
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="Alarm" lang="ts">
import { listAlarm } from '@/api/business/alarm'
import { reactive, ref, toRefs } from 'vue'

const alarm_type = [
  { label: '名额预警', value: 'quota' },
  { label: '重复报名', value: 'duplicate' }
]
const alarm_level = [
  { label: '提示', value: 1 },
  { label: '警告', value: 2 },
  { label: '严重', value: 3 }
]
const alarm_status = [
  { label: '未处理', value: 0 },
  { label: '已处理', value: 1 }
]
const alarmList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, type: null, level: null, status: null }
})
const { queryParams } = toRefs(data)

function alarmTypeLabel(t) { return { quota: '名额预警', duplicate: '重复报名' }[t] || t }
function alarmLevelType(l) { return ['info', 'warning', 'danger'][l - 1] || 'info' }
function alarmLevelLabel(l) { return ['提示', '警告', '严重'][l - 1] || '未知' }

function getList() {
  loading.value = true
  listAlarm(queryParams.value).then(response => {
    alarmList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { queryParams.value = { pageNum: 1, pageSize: 10, type: null, level: null, status: null }; handleQuery() }

getList()
</script>
