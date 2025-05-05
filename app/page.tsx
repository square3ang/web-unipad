"use client";
import Image from "next/image";
import Pitch from "./pitch";
import { createRef, Dispatch, Ref, RefObject, SetStateAction, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { Input, Output, WebMidi } from "webmidi";
import { Howl, Howler } from "howler";

const notes = [
  [Pitch.G6, Pitch.GSharp6, Pitch.A6, Pitch.ASharp6, Pitch.B6, Pitch.C7, Pitch.CSharp7, Pitch.D7, Pitch.DSharp7],
  [Pitch.A5, Pitch.ASharp5, Pitch.B5, Pitch.C6, Pitch.CSharp6, Pitch.D6, Pitch.DSharp6, Pitch.E6, Pitch.F6],
  [Pitch.B4, Pitch.C5, Pitch.CSharp5, Pitch.D5, Pitch.DSharp5, Pitch.E5, Pitch.F5, Pitch.FSharp5, Pitch.G5],
  [Pitch.CSharp4, Pitch.D4, Pitch.DSharp4, Pitch.E4, Pitch.F4, Pitch.FSharp4, Pitch.G4, Pitch.GSharp4, Pitch.A4],
  [Pitch.DSharp3, Pitch.E3, Pitch.F3, Pitch.FSharp3, Pitch.G3, Pitch.GSharp3, Pitch.A3, Pitch.ASharp3, Pitch.B3],
  [Pitch.F2, Pitch.FSharp2, Pitch.G2, Pitch.GSharp2, Pitch.A2, Pitch.ASharp2, Pitch.B2, Pitch.C3, Pitch.CSharp3],
  [Pitch.G1, Pitch.GSharp1, Pitch.A1, Pitch.ASharp1, Pitch.B1, Pitch.C2, Pitch.CSharp2, Pitch.D2, Pitch.DSharp2],
  [Pitch.A0, Pitch.ASharp0, Pitch.B0, Pitch.C1, Pitch.CSharp1, Pitch.D1, Pitch.DSharp1, Pitch.E1, Pitch.F1],
  [Pitch.BNeg1, Pitch.C0, Pitch.CSharp0, Pitch.D0, Pitch.DSharp0, Pitch.E0, Pitch.F0, Pitch.FSharp0, Pitch.G0]
];

const rightLEDnotes = [
  Pitch.F6, Pitch.G5, Pitch.A4, Pitch.B3, Pitch.CSharp3, Pitch.DSharp2, Pitch.F1, Pitch.G0
];

const topLEDNotes = [
  Pitch.G6, Pitch.GSharp6, Pitch.A6, Pitch.ASharp6, Pitch.B6, Pitch.C7, Pitch.CSharp7, Pitch.D7, Pitch.DSharp7
];

type Session = { keySoundsNum: { [x: number]: { [y: number]: number } }, ledNum: { [x: number]: { [y: number]: number } } };

type KeyLED = { [chain: number]: { [x: number]: { [y: number]: { type: string, args: string[], fileName: string }[][] } } };

function RGBtoHSV(r: number, g: number, b: number) {
  var max = Math.max(r, g, b), min = Math.min(r, g, b),
      d = max - min,
      h,
      s = (max === 0 ? 0 : d / max),
      v = max / 255;

  switch (max) {
      case min: h = 0; break;
      case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
      case g: h = (b - r) + d * 2; h /= 6 * d; break;
      case b: h = (r - g) + d * 4; h /= 6 * d; break;
  }

  return {
      h: h,
      s: s,
      v: v
  };
}

function HSVtoRGB(h: number, s: number, v: number) {
  var r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
  }
  return {
      r: Math.round(r! * 255),
      g: Math.round(g! * 255),
      b: Math.round(b! * 255)
  };
}

export default function Home() {
  const [midiInputs, setMidiInputs] = useState<Input[]>([]);
  const [midiOutputs, setMidiOutputs] = useState<Output[]>([]);

  const grid = Array(8 * 9).fill(0);
  const gridRef = useRef<([string, Dispatch<SetStateAction<string>>])[]>(Array(8 * 9).fill(null));
  const [pallete, setPallete] = useState<any>({});

  const midiInput = useRef<Input | null>(null);
  const midiOutput = useRef<Output | null>(null);

  const keySounds = useRef<{ [chain: number]: { [x: number]: { [y: number]: { name: string, repeat: number, chainNum: number }[] } } }>({});
  const sounds = useRef<{ [key: string]: Howl }>({});
  const keyLEDs = useRef<KeyLED>({});

  const chain = useRef<number>(1);

  const session = useRef<Session>({ keySoundsNum: {}, ledNum: {} });

  const LEDEnabled = useRef<{ [fileName: string]: { [x: number]: { [y: number]: boolean } } }>({});

  useEffect(() => { }, [grid])

  useEffect(() => {
    (async () => {
      var palleteReq = await fetch("/pallete.txt");
      var txt = await palleteReq.text();
      var arr = txt.split("\n");
      let pal: any = {};
      for (let val of arr) {
        let spl = val.split(",");
        if (spl.length < 2) continue;
        let velo = spl[0].trim();
        let color = spl[1].trim();

        let col = color.replaceAll(" ", ",").replace(";", "");
        let colspl = col.split(",");
        let hsv = RGBtoHSV(Number(colspl[0]), Number(colspl[1]), Number(colspl[2]));
        let h = hsv.h!;
        let s = hsv.s!;
        let v = hsv.v!;
        v += 0.5;
        s *= 0.8;
        if (v > 1) v = 1;
        let rgb = HSVtoRGB(h, s, v);
        col = `${rgb.r},${rgb.g},${rgb.b}`;

        pal[velo] = col;
      }
      setPallete(pal);
    })();
    (async () => {
      const webmidi = await WebMidi.enable()
      setMidiInputs(WebMidi.inputs);
      setMidiOutputs(WebMidi.outputs);
    })();
  }, []);

  function playSnd(x: number, y: number) {

    let b = keySounds.current[chain.current];
    if (b == undefined) return;
    if (b[x] == undefined) return;
    if (b[x][y] == undefined) return;
    let sound = b[x][y];
    if (session.current.keySoundsNum[x] == undefined) {
      session.current.keySoundsNum[x] = {};
    }
    if (session.current.keySoundsNum[x][y] == undefined) {
      session.current.keySoundsNum[x][y] = 0;
    }
    let snd = session.current.keySoundsNum[x][y];
    if (sound[snd].name == undefined) return;

    sounds.current[sound[snd].name]?.play();
    session.current.keySoundsNum[x][y]++;
    if (session.current.keySoundsNum[x][y] >= sound.length) {
      session.current.keySoundsNum[x][y] = 0;
    }
  }

  async function runLED(curchain: number, l: { type: string, args: string[], fileName: string }) {
    if (l.type == "on" || l.type == "o") {
      let [y, x, color, velo] = l.args;
      let xAsNum = Number(x);
      let yAsNum = Number(y);
      let veloAsNum = Number(velo);
      if (midiOutput) {
        let note = notes[yAsNum][xAsNum - 1];
        if (note != undefined)
          midiOutput.current?.sendNoteOn(note, { rawAttack: veloAsNum, channels: 1 });
      }
      if (LEDEnabled.current[l.fileName] == undefined) {
        LEDEnabled.current[l.fileName] = {};
      }
      if (LEDEnabled.current[l.fileName][xAsNum] == undefined) {
        LEDEnabled.current[l.fileName][xAsNum] = {};
      }
      if (LEDEnabled.current[l.fileName][xAsNum][yAsNum] == undefined) {
        LEDEnabled.current[l.fileName][xAsNum][yAsNum] = false;
      }
      LEDEnabled.current[l.fileName][xAsNum][yAsNum] = true;
      gridRef.current[(yAsNum - 1) * 9 + xAsNum - 1][1](pallete[veloAsNum]);
    }
    else if (l.type == "off" || l.type == "f") {
      let [y, x] = l.args;
      let xAsNum = Number(x);
      let yAsNum = Number(y);
      if (LEDEnabled.current[l.fileName] == undefined) {
        LEDEnabled.current[l.fileName] = {};
      }
      if (LEDEnabled.current[l.fileName][xAsNum] == undefined) {
        LEDEnabled.current[l.fileName][xAsNum] = {};
      }
      if (LEDEnabled.current[l.fileName][xAsNum][yAsNum] == undefined) {
        LEDEnabled.current[l.fileName][xAsNum][yAsNum] = false;
      }

      if (!LEDEnabled.current[l.fileName][xAsNum][yAsNum]) return;

      if (midiOutput) {
        let note = notes[yAsNum][xAsNum - 1];
        if (note != undefined)
          midiOutput.current?.sendNoteOn(note, { rawAttack: 0, channels: 1 });
      }
      LEDEnabled.current[l.fileName][xAsNum][yAsNum] = false;
      gridRef.current[(yAsNum - 1) * 9 + xAsNum - 1][1](pallete[0]);

    }
  }

  async function playLED(x: number, y: number) {
    let c = keyLEDs.current[chain.current];
    if (c == undefined) return;
    if (c[x] == undefined) return;
    if (c[x][y] == undefined) return;
    let led = c[x][y];
    if (session.current.ledNum[x] == undefined) {
      session.current.ledNum[x] = {};
    }
    if (session.current.ledNum[x][y] == undefined) {
      session.current.ledNum[x][y] = 0;
    }
    let ledNum = session.current.ledNum[x][y];
    let l = led[ledNum];
    session.current.ledNum[x][y]++;
    if (session.current.ledNum[x][y] >= led.length) {
      session.current.ledNum[x][y] = 0;
    }
    if (l == undefined) return;
    let curchain = chain.current;
    let delayOffset = 0;
    for (let i = 0; i < l.length; i++) {
      let l2 = l[i];

      if (l2.type == "delay" || l2.type == "d") {
        let delay = Number(l2.args[0]);
        let curtime = new Date().getTime();
        await new Promise(resolve => setTimeout(resolve, delay - delayOffset));
        delayOffset = new Date().getTime() - (curtime + (delay - delayOffset));
        continue;
      }

      await runLED(curchain, l2);
    }

  }

  function press(x: number, y: number) {
    if (x == 9) {
      console.log("set chain " + y);
      chain.current = y;
      session.current = { keySoundsNum: {}, ledNum: {} };
      return;
    }
    playSnd(x, y);
    playLED(x, y);
  }

  function clearLED() {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 9; j++) {
        LEDEnabled.current = {};
        gridRef.current[i * 9 + j][1](pallete[0]);

        if (midiOutput) {
          let note = notes[j][i];
          if (note != undefined)
            midiOutput.current?.sendNoteOn(note, { rawAttack: 0, channels: 1 });
        }
      }
    }
  }

  return (<>
    <header className="p-10 bg-gray-700 text-white text-3xl flex justify-between items-center">
      <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-cyan-500">Web Unipad</span>
      <div>
        <button onClick={async a => {
          session.current = { keySoundsNum: {}, ledNum: {} };
          LEDEnabled.current = {};
          chain.current = 1;
          clearLED();
          let newsounds: { [key: string]: Howl } = {};
          let newkeySounds: { [chain: number]: { [x: number]: { [y: number]: { name: string, repeat: number, chainNum: number }[] } } } = {};
          let newkeyLEDs: KeyLED = {};
          const [fileHandle] = await (window as any).showOpenFilePicker({
            types: [
              {
                description: "Unipad Zip",
                accept: {
                  "application/zip": [".zip"],
                },
              },
            ],
            excludeAcceptAllOption: true,
            multiple: false,
          });
          if (fileHandle == undefined) return;
          const file = await fileHandle.getFile();
          const fileData = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(fileData);
          for (let dat of Object.values(zip.files)) {
            if (dat.dir) continue;
            if (dat.name.toLowerCase().startsWith("sounds/")) {
              const spl = dat.name.split("/");
              const name = spl[spl.length - 1].trim();
              const fileData = await (dat as JSZip.JSZipObject).async("arraybuffer");
              var arrayBufferView = new Uint8Array(fileData);
              let type = "";
              if (name.endsWith(".wav")) {
                type = "audio/wav";
              } else if (name.endsWith(".mp3")) {
                type = "audio/mp3";
              } else if (name.endsWith(".ogg")) {
                type = "audio/ogg";
              } else if (name.endsWith(".m4a")) {
                type = "audio/m4a";
              } else if (name.endsWith(".aac")) {
                type = "audio/aac";
              } else if (name.endsWith(".flac")) {
                type = "audio/flac";
              } else if (name.endsWith(".opus")) {
                type = "audio/opus";
              }
              var blob = new Blob([arrayBufferView], { type: type });
              const url = URL.createObjectURL(blob);
              const sound = new Howl({
                src: [url],
                format: [name.split(".").slice(-1)[0]],
                preload: true,
              });

              newsounds[name] = sound;
            }
            if (dat.name == "keySound") {
              const spl = dat.name.split("/");
              const name = spl[spl.length - 1].trim();
              const txt = await dat.async("text");
              const lines = txt.split("\n");
              for (let line of lines) {
                if (line.trim() == "") continue;
                let [chain, y, x, soundName, repeat, chainNum] = line.trim().split(" ");
                if (repeat == undefined) repeat = "1";
                if (chainNum == undefined) chainNum = "-1";
                let chainAsNum = Number(chain);
                let xAsNum = Number(x);
                let yAsNum = Number(y);
                if (newkeySounds[chainAsNum] == undefined) {
                  newkeySounds[chainAsNum] = {};
                }
                if (newkeySounds[chainAsNum][xAsNum] == undefined) {
                  newkeySounds[chainAsNum][xAsNum] = {};
                }
                if (newkeySounds[chainAsNum][xAsNum][yAsNum] == undefined) {
                  newkeySounds[chainAsNum][xAsNum][yAsNum] = [];
                }
                newkeySounds[chainAsNum][xAsNum][yAsNum].push({ name: soundName, repeat: Number(repeat), chainNum: Number(chainNum) });
              }
            }

            if (dat.name.toLowerCase().startsWith("keyled/")) {
              const txt = await dat.async("text");
              const lines = txt.split("\n");
              const splitted = dat.name.split("/");
              const name = splitted[splitted.length - 1].trim();
              let [chain, y, x, repeat, multimap] = name.split(" ");
              let chainAsNum = Number(chain);
              let xAsNum = Number(x);
              let yAsNum = Number(y);

              if (multimap == undefined) multimap = "a";

              if (session.current.ledNum[xAsNum] == undefined) {
                session.current.ledNum[xAsNum] = {};
              }
              if (session.current.ledNum[xAsNum][yAsNum] == undefined) {
                session.current.ledNum[xAsNum][yAsNum] = 0;
              }

              if (newkeyLEDs[chainAsNum] == undefined) {
                newkeyLEDs[chainAsNum] = {};
              }
              if (newkeyLEDs[chainAsNum][xAsNum] == undefined) {
                newkeyLEDs[chainAsNum][xAsNum] = {};
              }
              if (newkeyLEDs[chainAsNum][xAsNum][yAsNum] == undefined) {
                newkeyLEDs[chainAsNum][xAsNum][yAsNum] = [];
              }

              newkeyLEDs[chainAsNum][xAsNum][yAsNum].push([]);
              let idx = newkeyLEDs[chainAsNum][xAsNum][yAsNum].length - 1;

              for (let line of lines) {
                if (line.trim() == "") continue;
                let splitted = line.trim().split(" ");
                newkeyLEDs[chainAsNum][xAsNum][yAsNum][idx].push({ type: splitted[0], args: splitted.slice(1), fileName: name });
              }
            }

          }

          sounds.current = newsounds;
          keySounds.current = newkeySounds;
          keyLEDs.current = newkeyLEDs;
          console.log("Loaded");
          console.log(newsounds);
          console.log(newkeySounds);
        }} className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl transition duration-100 hover:scale-105">Open</button>
      </div>
    </header >
    <main className="flex flex-col justify-center items-center mt-5">
      <div className="flex gap-2 justify-center items-center">
        <div className="flex flex-col gap-2 justify-center items-center text-xl text-gray-300 font-bold">
          Input
          <select onChange={a => {
            if (a.target.value == "none") {
              midiInput.current = null;
              return;
            }
            if (midiInput.current) {
              midiInput.current.removeListener("noteon");
              midiInput.current.removeListener("noteoff");
            }
            const mdi = midiInputs.find(key => key.id == a.target.value) ?? null;
            midiInput.current = mdi;
            if (mdi) {
              mdi.addListener("noteon", e => {
                const noteValue = e.note.number;
                let row = 0;
                let col = 0;
                for (row = 0; row < notes.length; row++) {
                  col = (notes[row] as number[]).indexOf(noteValue);
                  if (col !== -1) {
                    break;
                  }
                }
                col += 1;
                press(col, row);
              });
              mdi.addListener("noteoff", e => {
                const noteValue = e.note.number;
                let row = 0;
                let col = 0;
                for (row = 0; row < notes.length; row++) {
                  col = (notes[row] as number[]).indexOf(noteValue);
                  if (col !== -1) {
                    break;
                  }
                }
                col += 1;

              });
            }
          }} className="bg-gray-300 text-black p-2 rounded w-56">
            <option value="none">None</option>
            {
              midiInputs ? midiInputs.map((key, index) => {
                return <option key={index} value={key.id}>{key.name}</option>
              }) : undefined
            }
          </select>
        </div>
        <div className="flex flex-col gap-2 justify-center items-center text-xl text-gray-300 font-bold">
          Output
          <select onChange={a => {
            if (a.target.value == "none") {
              midiOutput.current = null;
              return;
            }
            midiOutput.current = midiOutputs.find(key => key.id == a.target.value) ?? null;
          }} className="bg-gray-300 text-black p-2 rounded w-56">
            <option value="none">None</option>
            {
              midiOutputs ? midiOutputs.map((key, index) => {
                return <option key={index} value={key.id}>{key.name}</option>
              }) : undefined
            }
          </select>
        </div>
        <button onClick={a => {
          clearLED();
        }} className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-xl transition duration-100 hover:scale-105">Clear LED</button>
      </div>
      <div className="text-gray-300 flex gap-5 justify-center items-center mt-10">

        <div className="flex justify-center items-center">
          <input type="checkbox" className="w-6 h-6" defaultChecked={true} disabled />
          <label className="text-xl font-bold ml-1">Will be added</label>
        </div>
      </div>
      <div className="flex justify-center items-center mt-10 text-gray-300">
        <div className="grid grid-cols-9 gap-2">
          {
            grid.map((key, index) => {
              let y = Math.floor(index / 9);
              let x = index % 9;
              let state = useState("128,128,128");
              gridRef.current[y * 9 + x] = state;

              return <div key={index} className={`w-16 h-16 flex justify-center items-center`}>
                <button onClick={a => {

                  press(x + 1, y + 1);
                }} className={`w-full h-full ${x == 8 ? "rounded-full" : "rounded-lg"}`} style={{ backgroundColor: `rgb(${state[0]})` }}></button>
              </div>
            })
          }
        </div>
      </div>
    </main>
  </>);
}
