<template>
  <div class="app-container home">
    <el-row :gutter="20">
      <el-col :sm="24" :lg="12" style="padding-left: 20px">
        <h2>智慧马拉松监管平台</h2>
        <p>
          马拉松赛事智能化信息化监管平台，为赛事组织管理提供全方位的信息化支持，涵盖赛事报名、选手管理、赛道监控、成绩管理、志愿者调度等核心功能模块，助力赛事高效、安全、智能化运行。
        </p>
        <p>
<!--          <b>当前版本:</b> <span>v{{ version }}</span>-->
        </p>
      </el-col>

<!--      <el-col :sm="24" :lg="12" style="padding-left: 50px">-->
<!--        <el-row>-->
<!--          <el-col :span="12">-->
<!--            <h2>技术选型</h2>-->
<!--          </el-col>-->
<!--        </el-row>-->
<!--        <el-row>-->
<!--          <el-col :span="6">-->
<!--            <h4>后端技术</h4>-->
<!--            <ul>-->
<!--              <li>SpringBoot</li>-->
<!--              <li>Spring Security</li>-->
<!--              <li>JWT</li>-->
<!--              <li>MyBatis</li>-->
<!--              <li>Druid</li>-->
<!--              <li>Fastjson</li>-->
<!--              <li>...</li>-->
<!--            </ul>-->
<!--          </el-col>-->
<!--          <el-col :span="6">-->
<!--            <h4>前端技术</h4>-->
<!--            <ul>-->
<!--              <li>Vue</li>-->
<!--              <li>Vuex</li>-->
<!--              <li>Element-ui</li>-->
<!--              <li>Axios</li>-->
<!--              <li>Sass</li>-->
<!--              <li>Quill</li>-->
<!--              <li>...</li>-->
<!--            </ul>-->
<!--          </el-col>-->
<!--        </el-row>-->
<!--      </el-col>-->
    </el-row>
    <el-divider />
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="12" :lg="8">
        <el-card class="update-log">
          <template v-slot:header>
            <div class="clearfix">
              <span>更新日志</span>
            </div>
          </template>
          <el-collapse accordion>
            <el-collapse-item title="v1.1.0 - 2026-08-11">
              <ol>
                <li>新增赛事报名管理</li>
                <li>新增数据大屏展示</li>
                <li>其他细节优化</li>
              </ol>
            </el-collapse-item>
            <el-collapse-item title="v1.0.0 - 2026-08-08">
              <ol>
                <li>系统正式发布</li>
              </ol>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="Index">
const version = ref('3.9.2')
</script>

<style scoped lang="scss">
.home {
  blockquote {
    padding: 10px 20px;
    margin: 0 0 20px;
    font-size: 17.5px;
    border-left: 5px solid #eee;
  }
  hr {
    margin-top: 20px;
    margin-bottom: 20px;
    border: 0;
    border-top: 1px solid #eee;
  }
  .col-item {
    margin-bottom: 20px;
  }

  ul {
    padding: 0;
    margin: 0;
  }

  font-family: "open sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: #676a6c;
  overflow-x: hidden;

  ul {
    list-style-type: none;
  }

  h4 {
    margin-top: 0px;
  }

  h2 {
    margin-top: 10px;
    font-size: 26px;
    font-weight: 100;
  }

  p {
    margin-top: 10px;

    b {
      font-weight: 700;
    }
  }

  .update-log {
    ol {
      display: block;
      list-style-type: decimal;
      margin-block-start: 1em;
      margin-block-end: 1em;
      margin-inline-start: 0;
      margin-inline-end: 0;
      padding-inline-start: 40px;
    }
  }
}
</style>

