<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="赛事名称" prop="name">
        <el-input v-model="queryParams.name" placeholder="请输入赛事名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="赛事状态" clearable style="width: 200px">
          <el-option v-for="dict in event_status" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['business:event:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['business:event:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['business:event:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="eventList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="赛事名称" align="center" prop="name" :show-overflow-tooltip="true" />
      <el-table-column label="举办地点" align="center" prop="location" :show-overflow-tooltip="true" />
      <el-table-column label="开赛时间" align="center" prop="startTime" width="180" />
      <el-table-column label="报名时间" align="center" width="200">
        <template #default="scope">
          {{ scope.row.signupStart }} ~ {{ scope.row.signupEnd }}
        </template>
      </el-table-column>
      <el-table-column label="名额" align="center" width="120">
        <template #default="scope">
          <span>{{ scope.row.registered }}/{{ scope.row.totalQuota }}</span>
        </template>
      </el-table-column>
      <el-table-column label="报名费用" align="center" prop="fee" width="110">
        <template #default="scope">
          <span>{{ scope.row.fee === 0 || scope.row.fee === null || scope.row.fee === undefined ? '免费' : '¥' + scope.row.fee }}</span>
        </template>
      </el-table-column>
      <el-table-column label="报名开关" align="center" prop="signupOpen" width="100">
        <template #default="scope">
          <el-switch v-model="scope.row.signupOpen" :active-value="1" :inactive-value="0" @change="handleSignupOpen(scope.row)" v-hasPermi="['business:event:edit']" />
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="scope">
          <el-tag :type="statusTag(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="200" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['business:event:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['business:event:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="eventRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="赛事名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入赛事名称" />
        </el-form-item>
        <el-form-item label="举办地点" prop="location">
          <el-input v-model="form.location" placeholder="请输入举办地点" />
        </el-form-item>
        <el-form-item label="开赛时间" prop="startTime">
          <el-date-picker v-model="form.startTime" type="datetime" placeholder="选择开赛时间" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="报名开始" prop="signupStart">
          <el-date-picker v-model="form.signupStart" type="datetime" placeholder="选择报名开始时间" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="报名截止" prop="signupEnd">
          <el-date-picker v-model="form.signupEnd" type="datetime" placeholder="选择报名截止时间" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="总名额" prop="totalQuota">
          <el-input-number v-model="form.totalQuota" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="报名费用" prop="fee">
          <el-input-number v-model="form.fee" :min="0" :precision="2" :step="10" controls-position="right" placeholder="单位：元，0 表示免费" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option v-for="dict in event_status" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="赛事介绍" prop="intro">
          <el-input v-model="form.intro" type="textarea" :rows="4" placeholder="请输入赛事介绍" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Event" lang="ts">
import { listEvent, getEvent, addEvent, updateEvent, delEvent, updateEventStatus } from '@/api/business/event'
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'

const { proxy } = getCurrentInstance()
const event_status = [
  { label: '未发布', value: 0 },
  { label: '报名中', value: 1 },
  { label: '进行中', value: 2 },
  { label: '已结束', value: 3 }
]

const eventList = ref([])
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
  queryParams: { pageNum: 1, pageSize: 10, name: null, status: null },
  rules: {
    name: [{ required: true, message: '赛事名称不能为空', trigger: 'blur' }],
    startTime: [
      { required: true, message: '请选择开赛时间', trigger: 'change' },
      { validator: validateEventTime, trigger: 'change' }
    ],
    signupStart: [
      { required: true, message: '请选择报名开始时间', trigger: 'change' },
      { validator: validateEventTime, trigger: 'change' }
    ],
    signupEnd: [
      { required: true, message: '请选择报名截止时间', trigger: 'change' },
      { validator: validateEventTime, trigger: 'change' }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/**
 * 赛事时间校验（业务规则）：
 * 1. 报名开始时间必须晚于当前时间（赛事尚未开放报名时录入）
 * 2. 报名开始时间必须早于报名截止时间（signupStart < signupEnd）
 * 3. 开赛时间必须晚于报名截止时间（startTime > signupEnd）
 */
function validateEventTime(rule, value, callback) {
  if (!value) {
    callback(new Error('请选择时间'))
    return
  }
  const f = data.form
  const v = new Date(value).getTime()
  if (rule.field === 'signupStart') {
    if (v <= Date.now()) {
      callback(new Error('报名开始时间必须晚于当前时间'))
      return
    }
    if (f.signupEnd && v >= new Date(f.signupEnd).getTime()) {
      callback(new Error('报名开始时间必须早于报名截止时间'))
      return
    }
  } else if (rule.field === 'signupEnd') {
    if (f.signupStart && v <= new Date(f.signupStart).getTime()) {
      callback(new Error('报名截止时间必须晚于报名开始时间'))
      return
    }
  } else if (rule.field === 'startTime') {
    if (f.signupEnd && v <= new Date(f.signupEnd).getTime()) {
      callback(new Error('开赛时间必须晚于报名截止时间'))
      return
    }
  }
  callback()
}

function statusTag(s) { return ['', 'primary', 'success', 'info'][s] || 'info' }
function statusLabel(s) { return ['未发布', '报名中', '进行中', '已结束'][s] || '未知' }

function getList() {
  loading.value = true
  listEvent(queryParams.value).then(response => {
    eventList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { queryParams.value = { pageNum: 1, pageSize: 10, name: null, status: null }; handleQuery() }
function handleSelectionChange(selection) { ids.value = selection.map(item => item.id); single.value = selection.length != 1; multiple.value = !selection.length }

function handleAdd() { reset(); open.value = true; title.value = '新增赛事' }
function handleUpdate(row) { reset(); const id = row.id || ids.value[0]; getEvent(id).then(response => { form.value = response.data; open.value = true; title.value = '修改赛事' }) }
function handleDelete(row) { const id = row.id || ids.value; proxy.$modal.confirm('是否确认删除？').then(() => delEvent(id)).then(() => { getList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {}) }

function submitForm() {
  proxy.$refs.eventRef.validate(valid => {
    if (valid) {
      if (form.value.id) { updateEvent(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('修改成功') }) }
      else { addEvent(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('新增成功') }) }
    }
  })
}

function handleSignupOpen(row) { updateEventStatus(row.id, row.status).then(() => { proxy.$modal.msgSuccess('操作成功') }) }
function cancel() { open.value = false; reset() }
function reset() { form.value = { id: null, name: null, location: null, startTime: null, signupStart: null, signupEnd: null, totalQuota: 0, registered: 0, signupOpen: 1, status: 0, fee: 0, coverUrl: null, intro: null }; proxy.$refs.eventRef?.resetFields() }

getList()
</script>
