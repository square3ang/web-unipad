import { Input } from 'webmidi';

// 핸들러를 저장할 객체
const handlers = {
  clearLED: (() => {}) as (() => void),
  playAuto: (() => {}) as (() => void),
  load: (() => {}) as (() => void),
  inputChanged: (() => {}) as ((input: Input | null) => void),
  updateChainLED: (() => {}) as ((chainLED: boolean) => void),
  press: (() => {}) as ((x: number, y: number) => void)
};

// 등록 함수들
export const registerClearLED = (clearLED: () => void) => {
  handlers.clearLED = clearLED;
};

export const registerPlayAuto = (playAuto: () => void) => {
  handlers.playAuto = playAuto;
};

export const registerLoad = (load: () => void) => {
  handlers.load = load;
};

export const registerInputChanged = (inputChanged: (input: Input | null) => void) => {
  handlers.inputChanged = inputChanged;
};

export const registerUpdateChainLED = (updateChainLED: (chainLED: boolean) => void) => {
  handlers.updateChainLED = updateChainLED;
};

export const registerPress = (press: (x: number, y: number) => void) => {
  handlers.press = press;
};

// 외부에서 사용할 함수들
export const clearLED = () => handlers.clearLED();
export const playAuto = () => handlers.playAuto();
export const load = () => handlers.load();
export const inputChanged = (input: Input | null) => handlers.inputChanged(input);
export const updateChainLED = (chainLED: boolean) => handlers.updateChainLED(chainLED);
export const press = (x: number, y: number) => handlers.press(x, y);

export default handlers;
