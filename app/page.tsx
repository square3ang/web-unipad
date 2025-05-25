"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Output, WebMidi } from "webmidi";
import { Button, Checkbox, Dialog, Icon, IconButton, Modal, Select, SelectOption, TextField, useDialogState } from "actify";
import useStore from "@/store/zustand";
import VirtualDevice from "./components/virtualdevice";
import { clearLED, load, playAuto, press, updateChainLED, inputChanged } from "@/store/registerHandlers";


export default function Home() {
  const store = useStore();
  const [midiInputs, setMidiInputs] = useState<Input[]>([]);
  const [midiOutputs, setMidiOutputs] = useState<Output[]>([]);
  const multiplierFieldRef = useRef<HTMLInputElement>(null);
  const state = useDialogState({})

  useEffect(() => {
    (async () => {
      await WebMidi.enable({ sysex: true });
      setMidiInputs(WebMidi.inputs);
      setMidiOutputs(WebMidi.outputs);
    })();

  }, []);

  useEffect(() => {
    if (!multiplierFieldRef.current) return;
    multiplierFieldRef.current.step = "0.1";
    multiplierFieldRef.current.min = "0.1";
  }, [state]);

  return (<>
    <header className="bg2 p-3 pl-10 text-white text-3xl flex justify-between items-center">
      <span className="font-bold">Web Unipad</span>
      <div className="flex gap-2 justify-center items-center">
        <IconButton onPress={state.open} aria-label="Settings" variant="filled"><Icon>settings</Icon></IconButton>
        <IconButton onPress={load} aria-label="Open" variant="filled"><Icon>file_open</Icon></IconButton>
        <IconButton onPress={async () => {
          await document.getElementById("virtualdevice")?.requestFullscreen();
          try {
            await (screen.orientation as unknown as { lock: (orientation: string) => Promise<void> }).lock("landscape");
          }
          catch { }
        }} aria-label="Fullscreen" variant="filled"><Icon>fullscreen</Icon></IconButton>
      </div>
    </header >
    <main className="flex flex-col justify-center items-center mt-5">
      <Modal state={state}>
        <Dialog title="Settings">
          <div className="flex flex-col gap-2 justify-center items-center">
            <div className="flex flex-col gap-2 justify-center items-center text-xl font-bold">
              Input
              <Select aria-label="Input Device Selection" onSelectionChange={a => {
                if (a?.toString() === "none") {
                  store.setMidiInput(null);
                  inputChanged(null);
                  return;
                }
                if (store.midiInput) {
                  store.midiInput.removeListener("noteon");
                  store.midiInput.removeListener("noteoff");
                }
                const mdi = midiInputs.find(key => key.id === a?.toString()) ?? null;
                store.setMidiInput(mdi);
                inputChanged(mdi);

              }} selectedKey={store.midiInput?.id ?? "none"}>
                <SelectOption key="none">None</SelectOption>
                <>{
                  midiInputs ? midiInputs.map((key) => {
                    return <SelectOption key={key.id}>{key.name}</SelectOption>;
                  }) : undefined
                }</>
              </Select>
            </div>
            <div className="flex flex-col gap-2 justify-center items-center text-xl font-bold">
              Output
              <Select aria-label="Output Device Selection" onSelectionChange={a => {
                if (a?.toString() === "none") {
                  store.setMidiOutput(null);
                  return;
                }
                store.setMidiOutput(midiOutputs.find(key => key.id === a?.toString()) ?? null);
              }} selectedKey={store.midiOutput?.id ?? "none"}>
                <SelectOption key="none">None</SelectOption>
                <>
                  {midiOutputs && midiOutputs.length > 0
                    ? midiOutputs.map((key) => (
                      <SelectOption key={key.id}>{key.name}</SelectOption>
                    ))
                    : null}
                </>
              </Select>
            </div><div className="flex flex-col gap-2 justify-center items-center text-xl font-bold">
              ModelType
              <Select onSelectionChange={a => {
                store.setModelType(a?.toString() ?? "pro");
              }} aria-label="Model Selection" selectedKey={store.modelType ?? "pro"}>
                <SelectOption key="pro">Pro</SelectOption>
                <SelectOption key="mk2">MK2</SelectOption>
                <SelectOption key="promk3">Pro MK3</SelectOption>
                <SelectOption key="x">X</SelectOption>
              </Select>
            </div>
            <Button onPress={() => {
              clearLED();
            }} className="h-14 mt-10" variant="filled">Clear LED</Button>
            <div className="flex gap-5 justify-center items-center mt-5">
              <Checkbox isSelected={store.showChain} onChange={async a => {
                store.setShowChain(a);
                await new Promise(resolve => setTimeout(resolve, 100));
                updateChainLED(!a);
              }}>Show Chain</Checkbox>
              <Checkbox isSelected={store.autoPlaying}  onChange={a => {
                store.setAutoPlaying(a);
                clearLED();
                press(9, 1);
                if (a) {
                  playAuto();
                }
              }}>Autoplay</Checkbox>
            </div>
            <div className="flex flex-col gap-2 justify-center items-center text-xl font-bold mt-5">
              Speed Multiplier (experimental)
              <div>
                <TextField aria-label="Speed Multiplier" type="number" ref={multiplierFieldRef} value={store.speedMultiplier.toString()} onChange={a => {
                  store.setSpeedMultiplier(Number(a));
                }} trailingIcon={
                  <span>x</span>
                } />
              </div>
            </div>
            <Button onPress={state.close} variant="filled">Done</Button>
          </div>
        </Dialog>
      </Modal>

      <VirtualDevice />

    </main>
  </>);
}
