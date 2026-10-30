// src/timer/restTimerSingleton.ts
import { RestTimer } from './restTimer';
import { audioSynthesizer } from '../audio/audioSynthesizer';

export const restTimerSingleton = new RestTimer({
  audioSynthesizer,
});
