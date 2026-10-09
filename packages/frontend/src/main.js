import { createApp } from 'vue';
import {
  create,
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NLayoutSider,
  NButton,
  NInput,
  NAvatar,
  NBadge,
  NTag,
  NSpace,
  NDivider,
  NSpin,
  NEmpty,
  NScrollbar,
  NSwitch,
  NList,
  NListItem,
  NDrawer,
  NDrawerContent,
  NIcon,
} from 'naive-ui';
import { zhCN, dateZhCN } from 'naive-ui';
import App from './App.vue';
import './styles/style.css';

const naive = create({
  components: [
    NConfigProvider,
    NMessageProvider,
    NDialogProvider,
    NLayout,
    NLayoutHeader,
    NLayoutContent,
    NLayoutSider,
    NButton,
    NInput,
    NAvatar,
    NBadge,
    NTag,
    NSpace,
    NDivider,
    NSpin,
    NEmpty,
    NScrollbar,
    NSwitch,
    NList,
    NListItem,
    NDrawer,
    NDrawerContent,
    NIcon,
  ],
});

createApp(App).use(naive).mount('#app');

// 供子组件通过 inject 使用 message/dialog（在 App 根通过 Provider 注入）
export { zhCN, dateZhCN };
