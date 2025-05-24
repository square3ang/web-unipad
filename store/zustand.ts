import { Input, Output } from 'webmidi';
import { create } from 'zustand';

interface Store {
    midiInput: Input | null;
    setMidiInput: (input: Input | null) => void;
    midiOutput: Output | null;
    setMidiOutput: (output: Output | null) => void;
    speedMultiplier: number;
    setSpeedMultiplier: (multiplier: number) => void;
    modelType: string;
    setModelType: (modelType: string) => void;
    showChain: boolean;
    setShowChain: (showChain: boolean) => void;
    autoPlaying: boolean;
    setAutoPlaying: (autoPlaying: boolean) => void;
}

const store = create<Store>((set) => ({
    midiInput: null,
    setMidiInput: (input: Input | null) => set({ midiInput: input }),
    midiOutput: null,
    setMidiOutput: (output: Output | null) => set({ midiOutput: output }),
    speedMultiplier: 1,
    setSpeedMultiplier: (multiplier: number) => set({ speedMultiplier: multiplier }),
    modelType: "pro",
    setModelType: (modelType: string) => set({ modelType: modelType }),
    showChain: false,
    setShowChain: (showChain: boolean) => set({ showChain: showChain }),
    autoPlaying: false,
    setAutoPlaying: (autoPlaying: boolean) => set({ autoPlaying: autoPlaying }),
}));

export default store;
