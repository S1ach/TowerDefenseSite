import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { engine } from '../../game/core/GameEngine';
import type { CloudSetting } from '../../widgets/game-world/clouds/quality';
import type { TowerType } from '../../game/entities/types';
const gameSlice = createSlice({ name: 'game', initialState: engine.snapshot(), reducers: {
  synchronize: (_state, action: PayloadAction<ReturnType<typeof engine.snapshot>>) => action.payload,
} });
const settingsSlice = createSlice({ name: 'settings', initialState: {
  cloudQuality: 'medium' as CloudSetting, building: null as TowerType | null, selectedId: null as number | null, debug: false, showPath: false, showRanges: false, showCollision: false, pauseAI: false,
}, reducers: {
  chooseTower: (state, action: PayloadAction<TowerType | null>) => { state.building = action.payload; state.selectedId = null; },
  selectTower: (state, action: PayloadAction<number | null>) => { state.selectedId = action.payload; state.building = null; },
  setCloudQuality: (state, action: PayloadAction<CloudSetting>) => { state.cloudQuality = action.payload; },
  toggleDebug: state => { state.debug = !state.debug; },
  toggleSetting: (state, action: PayloadAction<'showPath' | 'showRanges' | 'showCollision' | 'pauseAI'>) => { state[action.payload] = !state[action.payload]; },
} });
export const store = configureStore({ reducer: { game: gameSlice.reducer, settings: settingsSlice.reducer } });
export const { synchronize } = gameSlice.actions;
export const { chooseTower, selectTower, toggleDebug, toggleSetting, setCloudQuality } = settingsSlice.actions;
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();
export const useAppSelector = useSelector.withTypes<ReturnType<typeof store.getState>>();
export function syncUI() { store.dispatch(synchronize(engine.snapshot())); }
