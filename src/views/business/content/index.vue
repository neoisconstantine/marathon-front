<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="内容类型" prop="type">
        <el-select v-model="queryParams.type" placeholder="内容类型" clearable style="width: 200px">
          <el-option v-for="dict in content_type" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="标题" prop="title">
        <el-input v-model="queryParams.title" placeholder="请输入标题" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['business:content:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['business:content:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['business:content:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="contentList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="类型" align="center" prop="type">
        <template #default="scope">{{ contentTypeLabel(scope.row.type) }}</template>
      </el-table-column>
      <el-table-column label="标题" align="center" prop="title" :show-overflow-tooltip="true" />
      <el-table-column label="摘要" align="center" prop="summary" :show-overflow-tooltip="true" />
      <el-table-column label="排序" align="center" prop="sort" width="80" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag :type="scope.row.status == 1 ? 'success' : 'danger'">{{ scope.row.status == 1 ? '上架' : '下架' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="200" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['business:content:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['business:content:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="800px" append-to-body>
      <el-form ref="contentRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="内容类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择类型">
            <el-option v-for="dict in content_type" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title"><el-input v-model="form.title" placeholder="请输入标题" /></el-form-item>
        <el-form-item label="摘要" prop="summary"><el-input v-model="form.summary" type="textarea" :rows="2" placeholder="请输入摘要" /></el-form-item>
        <el-form-item v-if="form.type == 1" label="轮播图" prop="imageData">
          <el-upload action="#" :auto-upload="false" :show-file-list="false" accept="image/*" @change="handleImageChange">
            <el-button type="primary" plain icon="Upload">上传图片</el-button>
          </el-upload>
          <div v-if="form.imageData" style="margin-top: 10px">
            <img :src="'data:' + form.imageType + ';base64,' + form.imageData" style="max-width: 200px; max-height: 100px" />
          </div>
        </el-form-item>
        <el-form-item v-if="form.type != 1" label="详情内容" prop="detail">
          <el-input v-model="form.detail" type="textarea" :rows="6" placeholder="请输入详情内容（支持HTML）" />
        </el-form-item>
        <el-form-item label="排序" prop="sort"><el-input-number v-model="form.sort" :min="0" controls-position="right" /></el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">上架</el-radio>
            <el-radio :value="0">下架</el-radio>
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

<script setup name="Content" lang="ts">
import { listContent, getContent, addContent, updateContent, delContent } from '@/api/business/content'
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'

const { proxy } = getCurrentInstance()
const content_type = [
  { label: '轮播图', value: 1 },
  { label: '公告', value: 2 },
  { label: '常见问题', value: 3 }
]
const contentList = ref([])
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
  queryParams: { pageNum: 1, pageSize: 10, type: null, title: null },
  rules: { type: [{ required: true, message: '内容类型不能为空', trigger: 'change' }], title: [{ required: true, message: '标题不能为空', trigger: 'blur' }] }
})
const { queryParams, form, rules } = toRefs(data)

function contentTypeLabel(t) { return { 1: '轮播图', 2: '公告', 3: '常见问题' }[t] || '未知' }

function getList() {
  loading.value = true
  listContent(queryParams.value).then(response => {
    contentList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() { queryParams.value = { pageNum: 1, pageSize: 10, type: null, title: null }; handleQuery() }
function handleSelectionChange(selection) { ids.value = selection.map(item => item.id); single.value = selection.length != 1; multiple.value = !selection.length }
function handleAdd() { reset(); open.value = true; title.value = '新增资讯' }
function handleUpdate(row) { reset(); const id = row.id || ids.value[0]; getContent(id).then(response => { form.value = response.data; open.value = true; title.value = '修改资讯' }) }
function handleDelete(row) { const id = row.id || ids.value; proxy.$modal.confirm('是否确认删除？').then(() => delContent(id)).then(() => { getList(); proxy.$modal.msgSuccess('删除成功') }).catch(() => {}) }

function handleImageChange(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target.result.split(',')[1]
    form.value.imageData = base64
    form.value.imageType = file.raw.type
  }
  reader.readAsDataURL(file.raw)
}

function submitForm() {
  proxy.$refs.contentRef.validate(valid => {
    if (valid) {
      if (form.value.id) { updateContent(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('修改成功') }) }
      else { addContent(form.value).then(() => { open.value = false; getList(); proxy.$modal.msgSuccess('新增成功') }) }
    }
  })
}

function cancel() { open.value = false; reset() }
function reset() { form.value = { id: null, type: 1, title: null, imageData: null, imageType: null, summary: null, detail: null, sort: 0, status: 1 }; proxy.$refs.contentRef?.resetFields() }

getList()
</script>
