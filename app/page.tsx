"use client";

import { useEffect, useState } from "react";
import { Input, Output, WebMidi } from "webmidi";
import { Button, Checkbox, Select, SelectOption, TextField } from "actify";
import useStore from "@/store/zustand";
import VirtualDevice from "./components/virtualdevice";
import { clearLED, load, playAuto, press, updateChainLED, inputChanged } from "@/store/registerHandlers";


export default function Home() {
  const store = useStore();
  const [midiInputs, setMidiInputs] = useState<Input[]>([]);
  const [midiOutputs, setMidiOutputs] = useState<Output[]>([]);

  useEffect(() => {
    (async () => {
      await WebMidi.enable({ sysex: true });
      setMidiInputs(WebMidi.inputs);
      setMidiOutputs(WebMidi.outputs);
    })();
  }, []);

  return (<>
    <header className="bg2 p-3 pl-10 text-white text-3xl flex justify-between items-center">
      <span className="font-bold">Web Unipad</span>
      <div className="flex gap-2 justify-center items-center">
        <Button onClick={() => {
          load();
        }} variant="tonal">Open</Button>
        <Button onClick={async () => {
          await document.getElementById("virtualdevice")?.requestFullscreen();
          try {
            await (screen.orientation as unknown as { lock: (orientation: string) => Promise<void> }).lock("landscape");
          }
          catch { }
        }} variant="tonal">Fullscreen</Button>
      </div>
    </header >
    <main className="flex flex-col justify-center items-center mt-5">
      <div className="flex flex-col md:flex-row gap-2 justify-center items-center">
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
            
          }} defaultSelectedKey="none">
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
          }} defaultSelectedKey="none">
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
          }} aria-label="Model Selection" defaultSelectedKey="pro">
            <SelectOption key="pro">Pro</SelectOption>
            <SelectOption key="mk2">MK2</SelectOption>
            <SelectOption key="promk3">Pro MK3</SelectOption>
            <SelectOption key="x">X</SelectOption>
          </Select>
        </div>
        <Button onClick={() => {
          clearLED();
        }} className="h-14 mt-10" variant="filled">Clear LED</Button>
      </div>
      <div className="flex gap-5 justify-center items-center mt-5">
        <Checkbox onChange={async a => {
          store.setShowChain(a);
          await new Promise(resolve => setTimeout(resolve, 100));
          updateChainLED(!a);
        }}>Show Chain</Checkbox>
        <Checkbox onChange={a => {
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
        <div className="flex gap-2 items-center">
          <TextField aria-label="Speed Multiplier" type="number" value={store.speedMultiplier} onChange={a => {
            store.setSpeedMultiplier(a);
          }} />
          X
        </div>
      </div>
      <VirtualDevice />

    </main>
  </>);
}
