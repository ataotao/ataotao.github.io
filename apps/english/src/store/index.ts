import { configureStore } from '@reduxjs/toolkit';
import appReducer from './appSlice';
import dataReducer from './dataSlice';

/** 
 * 应用状态管理 
 * 包含 app 和 data 两个状态模块，分别对应导航、学习设置、UI 临时状态和学习记录、自定义词/单元（持久化到 localStorage）
 * app：导航、学习设置、UI 临时状态（不持久化）
 * data：学习记录、自定义词/单元（持久化到 localStorage）
*/
 
export const store = configureStore({
  reducer: {
    app: appReducer,
    data: dataReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 统一从此处导入所有 action，避免在业务代码中直接引用 slice 文件
export * from './appSlice';
export * from './dataSlice';
