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

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['business:alarm:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['business:alarm:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['business:alarm:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="alarmList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="报警类型" align="center" prop="type" width="120">
        <template #default="scope">{{ alarmTypeLabel(scope.row.type) }}</template>
      </el-table-column>
      <el-table-column label="报警级别" align="center" prop="level" width="100">
        <template #default="scope">
          <el-tag :type="alarmLevelType(scope.row.level)">{{ alarmLevelLabel(scope.row.level) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="报警标题" align="center" prop="title" :show-overflow-tooltip="true" />
      <el-table-column label="报警内容" align="center" prop="content" :show-overflow-tooltip="true" />
      <el-table-column label="赛事ID" align="center" prop="eventId" width="90" />
      <el-table-column label="处理状态" align="center" prop="status" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status == 0 ? 'danger' : 'success'">{{ scope.row.status == 0 ? '未处理' : '已处理' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="报警时间" align="center" prop="createTime" width="180" />
      <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['business:alarm:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['business:alarm:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="alarmRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="报警类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择报警类型">
            <el-option v-for="dict in alarm_type" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="报警级别" prop="level">
          <el-select v-model="form.level" placeholder="请选择报警级别">
            <el-option v-for="dict in alarm_level" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="报警标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入报警标题" />
        </el-form-item>
        <el-form-item label="报警内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="请输入报警内容" />
        </el-form-item>
        <el-form-item label="赛事ID" prop="eventId">
          <el-input-number v-model="form.eventId" :min="0" controls-position="right" placeholder="赛事ID" />
        </el-form-item>
        <el-form-item label="处理状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="0">未处理</el-radio>
            <el-radio :label="1">已处理</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Alarm" lang="ts">
import { listAlarm, getAlarm, addAlarm, updateAlarm, delAlarm } from '@/api/business/alarm'
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'

const { proxy } = getCurrentInstance()

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
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')
const open = ref(false)

const data = reactive({
  form: {},
  queryParams: { pageNum: 1, pageSize: 10, type: null, level: null, status: null },
  rules: {
    type: [{ required: true, message: '报警类型不能为空', trigger: 'change' }],
    level: [{ required: true, message: '报警级别不能为空', trigger: 'change' }],
    title: [{ required: true, message: '报警标题不能为空', trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

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
function handleSelectionChange(selection) { ids.value = selection.map(item => item.id); single.value = selection.length != 1; multiple.value = !selection.length }

function handleAdd() { reset(); open.value = true; title.value = '新增报警' }
function handleUpdate(row) {
  reset()
  const id = row.id || ids.value[0]
  getAlarm(id).then(response => { form.value = response.data; open.value = true; title.value = '修改报警' })
}
function handleDelete(row) {
  const id = row.id || ids.value
  proxy.$modal.confirm('是否确认删除报警编号为"' + id + '"的数据项？').then(() => delAlarm(id)).then(() => { getList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {})
}

function submitForm() {
  proxy.$refs.alarmRef.validate(valid => {
    if (valid) {
      if (form.value.id) { updateAlarm(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('修改成功') }) }
      else { addAlarm(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('新增成功') }) }
    }
  })
}

function cancel() { open.value = false; reset() }
function reset() {
  form.value = { id: null, type: null, level: 1, title: null, content: null, eventId: null, status: 0 }
  proxy.$refs.alarmRef?.resetFields()
}

getList()
</script>