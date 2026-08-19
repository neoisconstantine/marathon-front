<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="姓名" prop="name">
        <el-input v-model="queryParams.name" placeholder="请输入姓名" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="queryParams.phone" placeholder="请输入手机号" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="性别" prop="gender">
        <el-select v-model="queryParams.gender" placeholder="性别" clearable style="width: 200px">
          <el-option v-for="dict in person_gender" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['business:person:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['business:person:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['business:person:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="personList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="姓名" align="center" prop="name" />
      <el-table-column label="性别" align="center" prop="gender">
        <template #default="scope">{{ genderLabel(scope.row.gender) }}</template>
      </el-table-column>
      <el-table-column label="手机号" align="center" prop="phone" />
      <el-table-column label="身份证号" align="center" prop="idCard" :show-overflow-tooltip="true" />
      <el-table-column label="紧急联系人" align="center" prop="emergencyName" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status == 0 ? 'success' : 'danger'">{{ scope.row.status == 0 ? '正常' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="200" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['business:person:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['business:person:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="personRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="姓名" prop="name"><el-input v-model="form.name" placeholder="请输入姓名" /></el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="form.gender" placeholder="请选择性别">
            <el-option v-for="dict in person_gender" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号" prop="phone"><el-input v-model="form.phone" placeholder="请输入手机号" /></el-form-item>
        <el-form-item label="身份证号" prop="idCard"><el-input v-model="form.idCard" placeholder="请输入身份证号" /></el-form-item>
        <el-form-item label="紧急联系人" prop="emergencyName"><el-input v-model="form.emergencyName" placeholder="请输入紧急联系人姓名" /></el-form-item>
        <el-form-item label="紧急电话" prop="emergencyPhone"><el-input v-model="form.emergencyPhone" placeholder="请输入紧急联系人电话" /></el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="0">正常</el-radio>
            <el-radio :value="1">禁用</el-radio>
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

<script setup name="Person" lang="ts">
import { listPerson, getPerson, addPerson, updatePerson, delPerson } from '@/api/business/person'
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'

const { proxy } = getCurrentInstance()
const person_gender = [
  { label: '未知', value: 0 },
  { label: '男', value: 1 },
  { label: '女', value: 2 }
]
const personList = ref([])
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
  queryParams: { pageNum: 1, pageSize: 10, name: null, phone: null, gender: null },
  rules: { name: [{ required: true, message: '姓名不能为空', trigger: 'blur' }] }
})
const { queryParams, form, rules } = toRefs(data)

function genderLabel(g) { return ['未知', '男', '女'][g] || '未知' }

function getList() {
  loading.value = true
  listPerson(queryParams.value).then(response => {
    personList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { queryParams.value = { pageNum: 1, pageSize: 10, name: null, phone: null, gender: null }; handleQuery() }
function handleSelectionChange(selection) { ids.value = selection.map(item => item.id); single.value = selection.length != 1; multiple.value = !selection.length }
function handleAdd() { reset(); open.value = true; title.value = '新增参赛用户' }
function handleUpdate(row) { reset(); const id = row.id || ids.value[0]; getPerson(id).then(response => { form.value = response.data; open.value = true; title.value = '修改参赛用户' }) }
function handleDelete(row) { const id = row.id || ids.value; proxy.$modal.confirm('是否确认删除？').then(() => delPerson(id)).then(() => { getList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {}) }

function submitForm() {
  proxy.$refs.personRef.validate(valid => {
    if (valid) {
      if (form.value.id) { updatePerson(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('修改成功') }) }
      else { addPerson(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('新增成功') }) }
    }
  })
}

function cancel() { open.value = false; reset() }
function reset() { form.value = { id: null, name: null, gender: 0, phone: null, idCard: null, emergencyName: null, emergencyPhone: null, status: 0 }; proxy.$refs.personRef?.resetFields() }

getList()
</script>
