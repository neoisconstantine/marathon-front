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
      <el-form-item label="手机号" prop="personPhone">
        <el-input v-model="queryParams.personPhone" placeholder="请输入手机号" clearable style="width: 200px" @keyup.enter="handleQuery" />
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['business:registration:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['business:registration:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['business:registration:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['business:registration:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="registrationList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="赛事" align="center" prop="eventName" :show-overflow-tooltip="true" />
      <el-table-column label="姓名" align="center" prop="personName" />
      <el-table-column label="手机号" align="center" prop="personPhone" />
      <el-table-column label="参赛号" align="center" prop="bib" />
      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="scope">
          <el-tag :type="regStatusType(scope.row.status)">{{ regStatusLabel(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="报名时间" align="center" prop="createTime" width="180" />
      <el-table-column label="操作" align="center" width="230" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['business:registration:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['business:registration:remove']">删除</el-button>
          <el-button link type="primary" icon="Check" @click="handleReview(scope.row)" v-hasPermi="['business:registration:review']" v-if="scope.row.status == 0">审核</el-button>
          <el-button link type="warning" icon="CircleClose" @click="handleRefund(scope.row)" v-hasPermi="['business:registration:refund']" v-if="scope.row.status != 2">退赛</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="registrationRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="参赛人员" prop="personId">
          <el-select v-model="form.personId" placeholder="请选择参赛人员" filterable style="width: 100%">
            <el-option v-for="item in personOptions" :key="item.id" :label="item.name + '（' + item.phone + '）'" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="赛事" prop="eventId">
          <el-select v-model="form.eventId" placeholder="请选择赛事" filterable style="width: 100%">
            <el-option v-for="item in eventOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="参赛号" prop="bib">
          <el-input v-model="form.bib" placeholder="请输入参赛号码布" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option v-for="dict in registration_status" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Registration" lang="ts">
import { listRegistration, getRegistration, addRegistration, updateRegistration, delRegistration, reviewRegistration, refundRegistration, exportRegistration } from '@/api/business/registration'
import { listPerson } from '@/api/business/person'
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
const personOptions = ref([])
const registrationList = ref([])
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
  queryParams: { pageNum: 1, pageSize: 10, eventId: null, personName: null, personPhone: null, status: null },
  rules: {
    personId: [{ required: true, message: '请选择参赛人员', trigger: 'change' }],
    eventId: [{ required: true, message: '请选择赛事', trigger: 'change' }],
    status: [{ required: true, message: '请选择状态', trigger: 'change' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

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
function resetQuery() { queryParams.value = { pageNum: 1, pageSize: 10, eventId: null, personName: null, personPhone: null, status: null }; handleQuery() }
function handleSelectionChange(selection) { ids.value = selection.map(item => item.id); single.value = selection.length != 1; multiple.value = !selection.length }

function handleAdd() { reset(); open.value = true; title.value = '新增报名' }
function handleUpdate(row) {
  reset()
  const id = row.id || ids.value[0]
  getRegistration(id).then(response => { form.value = response.data; open.value = true; title.value = '修改报名' })
}
function handleDelete(row) {
  const id = row.id || ids.value
  proxy.$modal.confirm('是否确认删除报名编号为"' + id + '"的数据项？').then(() => delRegistration(id)).then(() => { getList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {})
}
function handleReview(row) {
  proxy.$modal.confirm('确认审核通过该报名？').then(() => {
    return reviewRegistration(row.id, 1)
  }).then(() => { getList(); proxy.$modal.msgSuccess('审核成功') }).catch(() => {})
}
function handleRefund(row) {
  proxy.$modal.confirm('确认将该报名标记为已退赛？报名人数将回退。').then(() => {
    return refundRegistration(row.id)
  }).then(() => { getList(); proxy.$modal.msgSuccess('退赛成功') }).catch(() => {})
}

function submitForm() {
  proxy.$refs.registrationRef.validate(valid => {
    if (valid) {
      if (form.value.id) { updateRegistration(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('修改成功') }) }
      else { addRegistration(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('新增成功') }) }
    }
  })
}

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

function cancel() { open.value = false; reset() }
function reset() {
  form.value = { id: null, personId: null, eventId: null, bib: null, status: 0 }
  proxy.$refs.registrationRef?.resetFields()
}

listEvent({ pageNum: 1, pageSize: 100 }).then(response => { eventOptions.value = response.rows })
listPerson({ pageNum: 1, pageSize: 100 }).then(response => { personOptions.value = response.rows })
getList()
</script>