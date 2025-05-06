"use client";
import Image from "next/image";
import Pitch from "./pitch";
import { createRef, Dispatch, Ref, RefObject, SetStateAction, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { Input, Output, WebMidi } from "webmidi";
import { Howl, Howler } from "howler";
import { v4 as uuid } from "uuid";

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

const one = [
  [11, -80, 104],
  [11, -80, 105],
  [11, -80, 106],
  [11, -80, 107],
  [11, -80, 108],
  [11, -80, 109],
  [11, -80, 110],
  [11, -80, 111],
  [9, -112, 89],
  [9, -112, 79],
  [9, -112, 69],
  [9, -112, 59],
  [9, -112, 49],
  [9, -112, 39],
  [9, -112, 29],
  [9, -112, 19]
];

const two = [
  [11, -80, 91],
  [11, -80, 92],
  [11, -80, 93],
  [11, -80, 94],
  [11, -80, 95],
  [11, -80, 96],
  [11, -80, 97],
  [11, -80, 98],
  [11, -80, 89],
  [11, -80, 79],
  [11, -80, 69],
  [11, -80, 59],
  [11, -80, 49],
  [11, -80, 39],
  [11, -80, 29],
  [11, -80, 19],
  [11, -80, 8],
  [11, -80, 7],
  [11, -80, 6],
  [11, -80, 5],
  [11, -80, 4],
  [11, -80, 3],
  [11, -80, 2],
  [11, -80, 1],
  [11, -80, 10],
  [11, -80, 20],
  [11, -80, 30],
  [11, -80, 40],
  [11, -80, 50],
  [11, -80, 60],
  [11, -80, 70],
  [11, -80, 80]
]


const circleCodes: { [key: string]: any } = {
  mk2: one,
  pro: two,
  promk3: two,
  x: two
}

const deviceCode: { [key: string]: any } = {
  mk2: 24,
  pro: 16,
  promk3: 14,
  x: 12
}


type Session = { keySoundsNum: { [x: number]: { [y: number]: number } }, ledNum: { [x: number]: { [y: number]: number } } };

type KeyLED = { [chain: number]: { [x: number]: { [y: number]: { acts: { type: string, args: string[] }[], repeat: number }[] } } };

function RGBtoHSV(r: number, g: number, b: number) {
  var max = Math.max(r, g, b), min = Math.min(r, g, b),
    d = max - min,
    h,
    s = (max === 0 ? 0 : d / max),
    v = max / 255;

  switch (max) {
    case min: h = 0; break;
    case r: h = (g - b) + d * (g < b ? 6 : 0); h /= 6 * d; break;
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


  const gridRef = useRef<([string, Dispatch<SetStateAction<string>>])[]>(Array(8 * 9).fill(null));
  const [pallete, setPallete] = useState<any>({});

  const midiInput = useRef<Input | null>(null);
  const midiOutput = useRef<Output | null>(null);

  const keySounds = useRef<{ [chain: number]: { [x: number]: { [y: number]: { name: string, repeat: number, chainNum: number }[] } } }>({});
  const sounds = useRef<{ [key: string]: Howl }>({});
  const keyLEDs = useRef<KeyLED>({});
  const autoPlay = useRef<string>("");

  const [chain, setChain] = useState(1);

  const chainRef = useRef<number>(1);

  const session = useRef<Session>({ keySoundsNum: {}, ledNum: {} });

  const LEDEnabled = useRef<{ [x: number]: { [y: number]: string } }>({});

  const modelType = useRef<string>("pro");

  const showChain = useRef<boolean>(false);

  const autoPlaying = useRef<boolean>(false);

  const stopled = useRef<boolean>(false);

  async function playAuto() {
    await new Promise(resolve => setTimeout(resolve, 500));
    let delayOffset = 0;
    for (let l of autoPlay.current.split(/\r\n|\r|\n/)) {
      if (!autoPlaying.current) {
        break;
      }
      let line = l.trim();
      let spl = line.split(" ");
      if (spl[0] == "chain" || spl[0] == "c") {
        press(9, Number(spl[1]));
      }
      else if (spl[0] == "on" || spl[0] == "o") {
        press(Number(spl[2]), Number(spl[1]));
      }
      else if (spl[0] == "touch" || spl[0] == "t") {
        press(Number(spl[2]), Number(spl[1]));
      }
      else if (spl[0] == "delay" || spl[0] == "d") {
        let delay = Number(spl[1]);
        let curtime = new Date().getTime();
        await new Promise(resolve => setTimeout(resolve, Math.max(0, delay - delayOffset)));
        delayOffset = new Date().getTime() - (curtime + delay - delayOffset);
      }
    }
  }

  function setMiscLED(code: number, velo: number) {
    if (modelType.current == "mk2" || modelType.current == "pro") {
      // legacy
      midiOutput.current?.send(new Uint8Array([
        240,
        0, 32, 41,
        2, deviceCode[modelType.current],
        10,
        code,
        velo,
        247
      ]));
    }
    else {
      midiOutput.current?.send(new Uint8Array([
        240,
        0, 32, 41,
        2, deviceCode[modelType.current],
        3, 0,
        code,
        velo,
        247
      ]));
    }
  }

  function setCircleLED(x: number, y: number, velo: number) {
    let code = circleCodes[modelType.current][XYtoCircle(x, y) - 1];
    if (code != undefined && midiOutput) {
      setMiscLED(code[2], velo);
    }
    gridRef.current[y * 10 + x][1](pallete[velo]);

  }

  let beforeChain = useRef(0);
  function updateChainLED(off: boolean = false) {
    if (!showChain.current && !off) return;
    if (beforeChain.current != chainRef.current && beforeChain.current != 0)
      setCircleLED(9, beforeChain.current, 0);
    setCircleLED(9, chainRef.current, off ? 0 : 3);
    beforeChain.current = chainRef.current;
  }

  useEffect(() => {
    chainRef.current = chain;
  }, [chain]);

  useEffect(() => {
    clearLED();
  }, [pallete]);

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
        let hsv = RGBtoHSV(Number(colspl[0]) * 4, Number(colspl[1]) * 4, Number(colspl[2]) * 4);
        let h = hsv.h!;
        let s = hsv.s!;
        let v = hsv.v!;
        v = v * 0.4 + 0.6;
        s *= 0.7;
        let rgb = HSVtoRGB(h, s, v);
        col = `${rgb.r},${rgb.g},${rgb.b}`;

        pal[velo] = col;
      }
      setPallete(pal);
    })();
    (async () => {
      const webmidi = await WebMidi.enable({ sysex: true });
      setMidiInputs(WebMidi.inputs);
      setMidiOutputs(WebMidi.outputs);
    })();
  }, []);

  function playSnd(x: number, y: number) {

    let b = keySounds.current[chainRef.current];
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


    if (sound[snd].repeat != 1) {
      if (sound[snd].repeat == 0) {
        return; // not implemented
      }
      let cnt = 0;
      sounds.current[sound[snd].name].on("end", () => {
        cnt++;
        if (cnt >= sound[snd].repeat) {
          sounds.current[sound[snd].name]?.off("end");
          return;
        }
        sounds.current[sound[snd].name]?.play();
      });
    }
    sounds.current[sound[snd].name]?.play();

    session.current.keySoundsNum[x][y]++;
    if (session.current.keySoundsNum[x][y] >= sound.length) {
      session.current.keySoundsNum[x][y] = 0;
    }
    if (sound[snd].chainNum != -1) {
      press(9, sound[snd].chainNum);
    }
  }

  function circleToXY(code: number) {
    let x = 0;
    let y = 0;
    if (code <= 8) {
      x = code;
      y = 0;
    }
    else if (code <= 16) {
      y = code - 8;
      x = 9;
    }
    else if (code <= 24) {
      y = 9;
      x = 9 - (code - 16);
    }
    else if (code <= 32) {
      x = 0;
      y = 9 - (code - 24);
    }
    return [x, y];
  }

  function XYtoCircle(x: number, y: number) {
    let code = 0;
    if (y == 0) {
      code = x;
    }
    else if (x == 9) {
      code = y + 8;
    }
    else if (y == 9) {
      code = (9 - x) + 16;
    }
    else if (x == 0) {
      code = (9 - y) + 24;
    }
    return code;
  }

  async function runLED(l: { type: string, args: string[] }, sess: string) {
    if (l.type == "on" || l.type == "o") {
      let [y, x, color, velo] = l.args;
      if (y == "l") {
        velo = color;
        color = x;
        setMiscLED(99, Number(velo));
        gridRef.current[9][1](pallete[velo]);
      }
      if (y == "mc" || y == "*") {
        let circ = circleToXY(Number(x));
        x = circ[0] + "";
        y = circ[1] + "";
      }
      let xAsNum = Number(x);
      let yAsNum = Number(y);
      let veloAsNum = Number(velo);

      if (xAsNum == 0 || yAsNum == 0 || xAsNum == 9 || yAsNum == 9) {
        setCircleLED(xAsNum, yAsNum, veloAsNum);
        if (LEDEnabled.current[xAsNum] == undefined) {
          LEDEnabled.current[xAsNum] = {};
        }
        if (LEDEnabled.current[xAsNum][yAsNum] == undefined) {
          LEDEnabled.current[xAsNum][yAsNum] = sess;
        }
        LEDEnabled.current[xAsNum][yAsNum] = sess;
        return;
      }

      if (midiOutput) {
        try {
          let note = notes[yAsNum][xAsNum - 1];

          if (note != undefined)
            midiOutput.current?.sendNoteOn(note, { rawAttack: veloAsNum, channels: 1 });
        }
        catch { }
      }
      if (LEDEnabled.current[xAsNum] == undefined) {
        LEDEnabled.current[xAsNum] = {};
      }
      if (LEDEnabled.current[xAsNum][yAsNum] == undefined) {
        LEDEnabled.current[xAsNum][yAsNum] = sess;
      }
      LEDEnabled.current[xAsNum][yAsNum] = sess;
      try {
        gridRef.current[(yAsNum) * 10 + xAsNum][1](pallete[veloAsNum]);
      }
      catch { }
    }
    else if (l.type == "off" || l.type == "f") {
      let [y, x] = l.args;
      if (y == "mc" || y == "*") {
        let circ = circleToXY(Number(x));
        x = circ[0] + "";
        y = circ[1] + "";
      }
      let xAsNum = Number(x);
      let yAsNum = Number(y);
      if (LEDEnabled.current[xAsNum] == undefined) {
        LEDEnabled.current[xAsNum] = {};
      }
      if (LEDEnabled.current[xAsNum][yAsNum] == undefined) {
        LEDEnabled.current[xAsNum][yAsNum] = "unknown";
      }

      if (LEDEnabled.current[xAsNum][yAsNum] != sess) return;

      if (xAsNum == 0 || yAsNum == 0 || xAsNum == 9 || yAsNum == 9) {
        setCircleLED(xAsNum, yAsNum, 0);
        LEDEnabled.current[xAsNum][yAsNum] = "unknown";
        return;
      }

      if (midiOutput) {
        try {

          let note = notes[yAsNum][xAsNum - 1];
          if (note != undefined)
            midiOutput.current?.sendNoteOn(note, { rawAttack: 0, channels: 1 });
        }
        catch (err) {
          console.error(err);
        }
      }
      LEDEnabled.current[xAsNum][yAsNum] = "unknown";
      try {
        gridRef.current[(yAsNum) * 10 + xAsNum][1](pallete[0]);
      }
      catch (err) {
        console.error(err);
      }

    }
  }

  async function playLED(x: number, y: number) {
    stopled.current = false;
    let c = keyLEDs.current[chainRef.current];
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
    let delayOffset = 0;
    let sess = uuid();

    for (let asdf = 0; asdf < l.repeat; asdf++) {
      for (let i = 0; i < l.acts.length; i++) {
        if (stopled.current) return;
        let l2 = l.acts[i];

        if (l2.type == "delay" || l2.type == "d") {
          let delay = Number(l2.args[0]);
          let curtime = new Date().getTime();
          await new Promise(resolve => setTimeout(resolve, Math.max(0, delay - delayOffset)));
          delayOffset = new Date().getTime() - (curtime + delay - delayOffset);
          continue;
        }

        await runLED(l2, sess);
        updateChainLED();
      }
    }

  }

  function press(x: number, y: number) {
    if (x == 9) {
      setChain(y);
      session.current = { keySoundsNum: {}, ledNum: {} };
      chainRef.current = y;
      updateChainLED();
      return;
    }
    playSnd(x, y);
    playLED(x, y);
  }

  function clearLED() {
    stopled.current = true;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        LEDEnabled.current = {};
        gridRef.current[i * 10 + j][1](pallete[0]);

        let x = j;
        let y = i;

        if (x == 0 || y == 0 || x == 9 || y == 9) {
          setCircleLED(x, y, 0);
          continue;
        }

        if (midiOutput) {
          let note = notes[y][x - 1];
          if (note != undefined)
            midiOutput.current?.sendNoteOn(note, { rawAttack: 0, channels: 1 });
        }
      }
    }
    updateChainLED();
  }

  const grid = Array(10 * 10).fill(0);

  for (let idx = 0; idx < grid.length; idx++) {
    let y = Math.floor(idx / 10);
    let x = idx % 10;

    let state = useState("0,0,0");
    gridRef.current[y * 10 + x] = state;
  }

  return (<>
    <header className="p-5 bg-gray-700 text-white text-3xl flex justify-between items-center">
      <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-cyan-500">Web Unipad</span>
      <div>
        <button onClick={async a => {
          session.current = { keySoundsNum: {}, ledNum: {} };
          LEDEnabled.current = {};
          setChain(1);
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
            if (dat.name.toLowerCase() == "keysound") {
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

            if (dat.name.toLowerCase() == "autoplay") {
              autoPlay.current = await dat.async("text");
            }

            if (dat.name.toLowerCase().startsWith("keyled/")) {
              const txt = await dat.async("text");
              const lines = txt.split(/\r\n|\r|\n/);
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

              newkeyLEDs[chainAsNum][xAsNum][yAsNum].push({ repeat: Number(repeat), acts: [] });
              let idx = newkeyLEDs[chainAsNum][xAsNum][yAsNum].length - 1;
              for (let line of lines) {
                if (line.trim() == "") continue;
                let splitted = line.trim().split(" ");
                newkeyLEDs[chainAsNum][xAsNum][yAsNum][idx].acts.push({ type: splitted[0], args: splitted.slice(1) });
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
        </div><div className="flex flex-col gap-2 justify-center items-center text-xl text-gray-300 font-bold">
          ModelType
          <select onChange={a => {
            modelType.current = a.target.value;
          }} className="bg-gray-300 text-black p-2 rounded w-56">
            <option value="pro">Pro</option>
            <option value="mk2">MK2</option>
            <option value="promk3">Pro MK3</option>
            <option value="x">X</option>
          </select>
        </div>
        <button onClick={a => {
          clearLED();
        }} className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-xl transition duration-100 hover:scale-105">Clear LED</button>
      </div>
      <div className="text-gray-300 flex gap-5 justify-center items-center mt-10">

        <div className="flex justify-center items-center">
          <input type="checkbox" className="w-6 h-6" defaultChecked={false} onChange={a => {
            showChain.current = a.target.checked;
            if (a.target.checked) {
              updateChainLED();
            }
            else {
              updateChainLED(true);
            }
          }} />
          <label className="text-xl font-bold ml-1">Show Chain</label>
        </div>

        <div className="flex justify-center items-center">
          <input type="checkbox" className="w-6 h-6" defaultChecked={false} onChange={a => {
            autoPlaying.current = a.target.checked;
            clearLED();
            press(9, 1);
            if (a.target.checked) {
              playAuto();
            }
          }} />
          <label className="text-xl font-bold ml-1">Autoplay</label>
        </div>
      </div>
      <div className="flex justify-center items-center mt-10 text-gray-300">
        <div className="grid grid-cols-10 gap-2">
          {
            grid.map((key, index) => {
              let y = Math.floor(index / 10);
              let x = index % 10;
              let state = gridRef.current[y * 10 + x]
              if (x == 0 && y == 0) return <div key={index} />
              if (x == 0 && y == 9) return <div key={index} />
              if (x == 9 && y == 0) return <div key={index} className="w-16 h-16 flex justify-center items-center"><div className="w-12 h-12 rounded-xl" style={{ backgroundColor: `rgb(${state[0]})` }} /></div>
              if (x == 9 && y == 9) return <div key={index} />
              return <div key={index} className="w-16 h-16 flex justify-center items-center">
                <button onClick={a => {

                  press(x, y);
                }} className="w-full h-full text-2xl" style={x == 9 || y == 0 || x == 0 || y == 9 ? { border: `4px solid rgb(${state[0]})`, backgroundColor: "black" } : { backgroundColor: `rgb(${state[0]})` }}>
                  {x == 9 ? <span className="text-2xl" style={{ color: `rgb(${state[0]})` }}>{y == chain ? "▶" : "▷"}</span> : undefined}
                </button>
              </div>
            })
          }
        </div>
      </div>
    </main>
  </>);
}
