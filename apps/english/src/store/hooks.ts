import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

/** 带类型的 dispatch hook，避免每次手动标注 AppDispatch */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/** 带类型的 selector hook，避免每次手动标注 RootState */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
