import useStore from "@/store/zustand";
import { registerClearLED, registerPlayAuto, registerLoad, registerInputChanged, registerUpdateChainLED, registerPress, press, unpress } from "@/store/registerHandlers";
import { useEffect, useRef, useState } from "react";
import Pitch from "../pitch";
import { v4 as uuid } from "uuid";
import JSZip from "jszip";
import { Howl } from "howler";
import { Output } from "webmidi";

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
];

const circleCodes: { [key: string]: number[][] } = {
  mk2: one,
  pro: two,
  promk3: two,
  x: two
};

const deviceCode: { [key: string]: number } = {
  mk2: 24,
  pro: 16,
  promk3: 14,
  x: 12
};

type Session = { keySoundsNum: { [x: number]: { [y: number]: number } }, ledNum: { [x: number]: { [y: number]: number } } };

type KeyLED = { [chain: number]: { [x: number]: { [y: number]: { acts: { type: string, args: string[] }[], repeat: number }[] } } };

export default function VirtualDevice() {
  const store = useStore();

  const chainRef = useRef<number>(1);

  const session = useRef<Session>({ keySoundsNum: {}, ledNum: {} });

  const LEDEnabled = useRef<{ [x: number]: { [y: number]: string } }>({});

  const modelType = useRef<string>("");

  const stopled = useRef<boolean>(false);

  const offLEDOnUnpress = useRef<{ [x: number]: { [y: number]: { sess: string }[] | undefined } }>([]);

  const offSoundOnUnpress = useRef<{ [x: number]: { [y: number]: { sound: Howl }[] | undefined } }>([]);

  const interruptLEDQueue = useRef<string[]>([]);

  const speedMultiplierRef = useRef(1);
  const midiOutputRef = useRef<Output | null>(null);
  const showChainRef = useRef<boolean>(true);

  const keySounds = useRef<{ [chain: number]: { [x: number]: { [y: number]: { name: string, repeat: number, chainNum: number }[] } } }>({});
  const sounds = useRef<{ [key: string]: Howl }>({});
  const keyLEDs = useRef<KeyLED>({});
  const autoPlay = useRef<string>("");
  const autoPlayingRef = useRef<boolean>(false);

  const [height, setHeight] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);

  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const [chain, setChain] = useState(1);

  const beforeChain = useRef(0);

  const grid = Array(10 * 10).fill("");


  function setGridColor(x: number, y: number, color: string) {
    document.getElementById(`lp-button-${x + y * 10}`)?.style.setProperty("--lp-button-color", `rgb(${color})`);
  }

  useEffect(() => {
    let pallete: { [key: string]: string } = {};

    setHeight(window.innerHeight);
    setWidth(window.innerWidth);
    window.addEventListener("resize", () => {
      setHeight(window.innerHeight);
      setWidth(window.innerWidth);
    });
    document.addEventListener("fullscreenchange", () => {
      setIsFullScreen(document.fullscreenElement != null);
    });
    (async () => {
      const palleteReq = await fetch("/pallete.txt");
      const txt = await palleteReq.text();
      const arr = txt.split("\n");
      const pal: { [key: string]: string } = {};
      for (const val of arr) {
        const spl = val.split(",");
        if (spl.length < 2) continue;
        const velo = spl[0].trim();
        const color = spl[1].trim();

        let col = color.replaceAll(" ", ",").replace(";", "");
        const colspl = col.split(",");
        let r = Number(colspl[0]) * 4;
        let g = Number(colspl[1]) * 4;
        let b = Number(colspl[2]) * 4;

        r = 80 + (255 - 80) * (r / 255);
        g = 80 + (255 - 80) * (g / 255);
        b = 80 + (255 - 80) * (b / 255);

        col = `${r},${g},${b}`;

        pal[velo] = col;
      }
      pallete = pal;
    })();

    async function load() {
      session.current = { keySoundsNum: {}, ledNum: {} };
      LEDEnabled.current = {};
      setChain(1);
      clearLED();
      const newsounds: { [key: string]: Howl } = {};
      const newkeySounds: { [chain: number]: { [x: number]: { [y: number]: { name: string, repeat: number, chainNum: number }[] } } } = {};
      const newkeyLEDs: KeyLED = {};
      const [fileHandle] = await (window as unknown as {
        showOpenFilePicker: (options: {
          types: {
            description: string;
            accept: { [mime: string]: string[] };
          }[];
          excludeAcceptAllOption: boolean;
          multiple: boolean;
        }) => Promise<FileSystemFileHandle[]>
      }).showOpenFilePicker({
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
      for (const dat of Object.values(zip.files)) {
        if (dat.dir) continue;
        if (dat.name.toLowerCase().startsWith("sounds/")) {
          const spl = dat.name.split("/");
          const name = spl[spl.length - 1].trim();
          const fileData = await (dat as JSZip.JSZipObject).async("arraybuffer");
          const arrayBufferView = new Uint8Array(fileData);
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
          const blob = new Blob([arrayBufferView], { type: type });
          const url = URL.createObjectURL(blob);
          const sound = new Howl({
            src: [url],
            format: [name.split(".").slice(-1)[0]],
            preload: true,
          });

          newsounds[name] = sound;
        }
        if (dat.name.toLowerCase() === "keysound") {
          const txt = await dat.async("text");
          const lines = txt.split("\n");
          for (const line of lines) {
            if (line.trim() === "") continue;
            const [chain, y, x, soundName, repeat, chainNum] = line.trim().split(" ");
            const repeatValue = repeat === undefined ? "1" : repeat;
            const chainNumValue = chainNum === undefined ? "-1" : chainNum;
            const chainAsNum = Number(chain);
            const xAsNum = Number(x);
            const yAsNum = Number(y);
            if (newkeySounds[chainAsNum] == undefined) {
              newkeySounds[chainAsNum] = {};
            }
            if (newkeySounds[chainAsNum][xAsNum] == undefined) {
              newkeySounds[chainAsNum][xAsNum] = {};
            }
            if (newkeySounds[chainAsNum][xAsNum][yAsNum] == undefined) {
              newkeySounds[chainAsNum][xAsNum][yAsNum] = [];
            }
            newkeySounds[chainAsNum][xAsNum][yAsNum].push({ name: soundName, repeat: Number(repeatValue), chainNum: Number(chainNumValue) });
          }
        }

        if (dat.name.toLowerCase() === "autoplay") {
          autoPlay.current = await dat.async("text");
        }

        if (dat.name.toLowerCase().startsWith("keyled/")) {
          const txt = await dat.async("text");
          const lines = txt.split(/\r\n|\r|\n/);
          const splitted = dat.name.split("/");
          const name = splitted[splitted.length - 1].trim();
          const [chain, y, x, repeat] = name.split(" ");
          const chainAsNum = Number(chain);
          const xAsNum = Number(x);
          const yAsNum = Number(y);

          //const multimapValue = multimap === undefined ? "a" : multimap;

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
          const idx = newkeyLEDs[chainAsNum][xAsNum][yAsNum].length - 1;
          for (const line of lines) {
            if (line.trim() === "") continue;
            const splittedLine = line.trim().split(" ");
            newkeyLEDs[chainAsNum][xAsNum][yAsNum][idx].acts.push({ type: splittedLine[0], args: splittedLine.slice(1) });
          }
        }
      }

      sounds.current = newsounds;
      keySounds.current = newkeySounds;
      keyLEDs.current = newkeyLEDs;
      console.log("Loaded");
      console.log(newsounds);
      console.log(newkeySounds);
    }
    registerLoad(load);

    registerInputChanged((mdi) => {
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
          unpress(col, row);
        });
      }
    });


    async function playAuto() {
      await new Promise(resolve => setTimeout(resolve, 1000));
      let delayOffset = 0;
      for (const l of autoPlay.current.split(/\r\n|\r|\n/)) {
        if (!autoPlayingRef.current) {
          break;
        }
        const line = l.trim();
        const spl = line.split(" ");
        if (spl[0] === "chain" || spl[0] === "c") {
          press(9, Number(spl[1]));
        }
        else if (spl[0] === "on" || spl[0] === "o") {
          press(Number(spl[2]), Number(spl[1]));
        }
        else if (spl[0] === "off" || spl[0] === "f") {
          unpress(Number(spl[2]), Number(spl[1]));
        }
        else if (spl[0] === "touch" || spl[0] === "t") {
          press(Number(spl[2]), Number(spl[1]));
          unpress(Number(spl[2]), Number(spl[1]));
        }
        else if (spl[0] === "delay" || spl[0] === "d") {
          const delay = Number(spl[1]) / speedMultiplierRef.current;
          const curtime = new Date().getTime();
          await new Promise(resolve => setTimeout(resolve, Math.max(0, delay - delayOffset)));
          delayOffset = new Date().getTime() - (curtime + delay - delayOffset);
        }
      }
    }

    registerPlayAuto(playAuto);



    function setMiscLED(code: number, velo: number) {
      if (modelType.current === "mk2" || modelType.current === "pro") {
        // legacy
        midiOutputRef.current?.send(new Uint8Array([
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
        midiOutputRef.current?.send(new Uint8Array([
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
      const code = circleCodes[modelType.current][XYtoCircle(x, y) - 1];
      if (code != undefined && midiOutputRef.current) {
        setMiscLED(code[2], velo);
      }
      setGridColor(x, y, pallete[velo]);
    }


    function updateChainLED(off: boolean) {
      if (!showChainRef.current && !off) return;
      if (beforeChain.current !== chainRef.current && beforeChain.current !== 0)
        setCircleLED(9, beforeChain.current, 0);
      setCircleLED(9, chainRef.current, off ? 0 : 3);
      beforeChain.current = chainRef.current;
      console.log("Update Chain LED", chainRef.current, off);
    }
    registerUpdateChainLED(updateChainLED);



    function playSnd(x: number, y: number) {
      const b = keySounds.current[chainRef.current];
      if (b == undefined) return;
      if (b[x] == undefined) return;
      if (b[x][y] == undefined) return;
      const sound = b[x][y];
      if (session.current.keySoundsNum[x] == undefined) {
        session.current.keySoundsNum[x] = {};
      }
      if (session.current.keySoundsNum[x][y] == undefined) {
        session.current.keySoundsNum[x][y] = 0;
      }
      const snd = session.current.keySoundsNum[x][y];
      const sndd = Object.assign({}, sound[snd]);
      if (sndd.name == undefined) return;

      if (sndd.repeat !== 1) {
        if (sndd.repeat === 0) {
          sndd.repeat = 1;
          if (offSoundOnUnpress.current[x] == undefined) {
            offSoundOnUnpress.current[x] = {};
          }
          if (offSoundOnUnpress.current[x][y] == undefined) {
            offSoundOnUnpress.current[x][y] = [];
          }
          offSoundOnUnpress.current[x][y].push({ sound: sounds.current[sndd.name] });
        }
        let cnt = 0;
        sounds.current[sndd.name].on("end", () => {
          cnt++;
          if (cnt >= sndd.repeat) {
            sounds.current[sndd.name]?.off("end");
            return;
          }
          const id = sounds.current[sndd.name]?.play();
          sounds.current[sndd.name]?.rate(speedMultiplierRef.current, id);
        });
      }
      const id = sounds.current[sndd.name]?.play();
      sounds.current[sndd.name]?.rate(speedMultiplierRef.current, id);

      session.current.keySoundsNum[x][y]++;
      if (session.current.keySoundsNum[x][y] >= sound.length) {
        session.current.keySoundsNum[x][y] = 0;
      }
      if (sound[snd].chainNum !== -1) {
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
      if (y === 0) {
        code = x;
      }
      else if (x === 9) {
        code = y + 8;
      }
      else if (y === 9) {
        code = (9 - x) + 16;
      }
      else if (x === 0) {
        code = (9 - y) + 24;
      }
      return code;
    }

    async function runLED(l: { type: string, args: string[] }, sess: string) {
      if (l.type === "on" || l.type === "o") {
        let [y, x, color, velo] = l.args;
        if (y === "l") {
          velo = color;
          color = x;
          setMiscLED(99, Number(velo));
          setGridColor(9, 0, pallete[velo]);
        }
        if (y === "mc" || y === "*") {
          const circ = circleToXY(Number(x));
          x = circ[0] + "";
          y = circ[1] + "";
        }
        const xAsNum = Number(x);
        const yAsNum = Number(y);
        const veloAsNum = Number(velo);

        if (xAsNum === 0 || yAsNum === 0 || xAsNum === 9 || yAsNum === 9) {
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

        if (midiOutputRef.current) {
          try {
            const note = notes[yAsNum][xAsNum - 1];

            if (note != undefined)
              midiOutputRef.current?.sendNoteOn(note, { rawAttack: veloAsNum, channels: 1 });
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
          setGridColor(xAsNum, yAsNum, pallete[veloAsNum]);
        }
        catch { }
      }
      else if (l.type === "off" || l.type === "f") {
        let [y, x] = l.args;
        if (y === "mc" || y === "*") {
          const circ = circleToXY(Number(x));
          x = circ[0] + "";
          y = circ[1] + "";
        }
        const xAsNum = Number(x);
        const yAsNum = Number(y);
        if (LEDEnabled.current[xAsNum] == undefined) {
          LEDEnabled.current[xAsNum] = {};
        }
        if (LEDEnabled.current[xAsNum][yAsNum] == undefined) {
          LEDEnabled.current[xAsNum][yAsNum] = "unknown";
        }

        if (LEDEnabled.current[xAsNum][yAsNum] !== sess) return;

        if (xAsNum === 0 || yAsNum === 0 || xAsNum === 9 || yAsNum === 9) {
          setCircleLED(xAsNum, yAsNum, 0);
          LEDEnabled.current[xAsNum][yAsNum] = "unknown";
          return;
        }

        if (midiOutputRef.current) {
          try {
            const note = notes[yAsNum][xAsNum - 1];
            if (note != undefined)
              midiOutputRef.current?.sendNoteOn(note, { rawAttack: 0, channels: 1 });
          }
          catch (err) {
            console.error(err);
          }
        }
        LEDEnabled.current[xAsNum][yAsNum] = "unknown";
        try {
          setGridColor(xAsNum, yAsNum, pallete[0]);
        }
        catch (err) {
          console.error(err);
        }
      }
    }

    async function playLED(x: number, y: number) {
      stopled.current = false;
      const c = keyLEDs.current[chainRef.current];
      if (c == undefined) return;
      if (c[x] == undefined) return;
      if (c[x][y] == undefined) return;
      const led = c[x][y];
      if (session.current.ledNum[x] == undefined) {
        session.current.ledNum[x] = {};
      }
      if (session.current.ledNum[x][y] == undefined) {
        session.current.ledNum[x][y] = 0;
      }
      const ledNum = session.current.ledNum[x][y];
      const l = Object.assign({}, led[ledNum]);
      session.current.ledNum[x][y]++;
      if (session.current.ledNum[x][y] >= led.length) {
        session.current.ledNum[x][y] = 0;
      }
      if (l == undefined) return;
      let delayOffset = 0;
      const sess = uuid();

      if (l.repeat === 0) {
        l.repeat = 1;
        if (offLEDOnUnpress.current[x] == undefined) {
          offLEDOnUnpress.current[x] = {};
        }
        if (offLEDOnUnpress.current[x][y] == undefined) {
          offLEDOnUnpress.current[x][y] = [];
        }
        offLEDOnUnpress.current[x][y].push({ sess: sess });
      }

      for (let asdf = 0; asdf < l.repeat; asdf++) {
        for (let i = 0; i < l.acts.length; i++) {
          if (stopled.current || sess in interruptLEDQueue.current) {
            interruptLEDQueue.current = interruptLEDQueue.current.filter(value => value !== sess);
            break;
          }
          const l2 = l.acts[i];

          if (l2.type === "delay" || l2.type === "d") {
            const delay = Number(l2.args[0]) / speedMultiplierRef.current;
            const curtime = new Date().getTime();
            await new Promise(resolve => setTimeout(resolve, Math.max(0, delay - delayOffset)));
            delayOffset = new Date().getTime() - (curtime + delay - delayOffset);
            continue;
          }

          await runLED(l2, sess);
          updateChainLED(false);
        }
      }
    }

    function press(x: number, y: number) {
      if (x === 9) {
        setChain(y);
        session.current = { keySoundsNum: {}, ledNum: {} };
        updateChainLED(false);
        return;
      }
      playSnd(x, y);
      playLED(x, y);
    }
    registerPress(press);

    function unpress(x: number, y: number) {
      if (offLEDOnUnpress.current[x] && offLEDOnUnpress.current[x][y] && offLEDOnUnpress.current[x][y].length > 0) {
        for (const asdf of offLEDOnUnpress.current[x][y]) {
          const sess = asdf.sess;
          interruptLEDQueue.current.push(sess);
          for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
              runLED({ type: "off", args: [i + "", j + ""] }, sess);
            }
          }

        }
        offLEDOnUnpress.current[x][y] = [];
      }
      if (offSoundOnUnpress.current[x] && offSoundOnUnpress.current[x][y] && offSoundOnUnpress.current[x][y].length > 0) {

        for (const asdf of offSoundOnUnpress.current[x][y]) {
          const sound = asdf.sound;
          sound.stop();
        }
        offSoundOnUnpress.current[x][y] = [];
      }
    }

    function clearLED() {
      stopled.current = true;
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          LEDEnabled.current = {};

          setGridColor(j, i, pallete[0]);

          const x = j;
          const y = i;

          if (x === 0 || y === 0 || x === 9 || y === 9) {
            setCircleLED(x, y, 0);
            continue;
          }

          if (midiOutputRef.current) {
            const note = notes[y][x - 1];
            if (note != undefined)
              midiOutputRef.current?.sendNoteOn(note, { rawAttack: 0, channels: 1 });
          }
        }
      }
      updateChainLED(false);
    }
    registerClearLED(clearLED);
  }, []);
  // autoPlaying 상태를 ref로 동기화
  useEffect(() => {
    autoPlayingRef.current = store.autoPlaying;
  }, [store.autoPlaying]);

  // showChain 상태를 ref로 동기화
  useEffect(() => {
    showChainRef.current = store.showChain;
  }, [store.showChain]);

  // chain 상태를 ref로 동기화
  useEffect(() => {
    chainRef.current = chain;
  }, [chain]);

  // speedMultiplier 상태를 ref로 동기화
  useEffect(() => {
    speedMultiplierRef.current = store.speedMultiplier;
  }, [store.speedMultiplier]);

  // modelType 상태를 ref로 동기화
  useEffect(() => {
    modelType.current = store.modelType;
  }, [store.modelType]);

  // midiOutput 상태를 ref로 동기화
  useEffect(() => {
    midiOutputRef.current = store.midiOutput;
  }, [store.midiOutput]);

  return (
    <div id="virtualdevice" className="flex justify-center items-center mt-5 bg" style={{ zoom: Math.min(height, width) / (isFullScreen ? 625 : 700) }}>
      <div className="flex justify-center items-center text-gray-30 bg-black p-5 rounded-lg">
        <div className="grid grid-cols-10 gap-2">
          {
            grid.map((key, index) => {
              const y = Math.floor(index / 10);
              const x = index % 10;
              if (x === 0 && y === 0) return <div key={index} id={`lp-button-${index}`} />;
              if (x === 0 && y === 9) return <div key={index} id={`lp-button-${index}`} />;
              if (x === 9 && y === 0) return <div key={index} id={`lp-button-${index}`} className="w-12 h-12 flex justify-center items-center"><div className="w-10 h-10 rounded-md" style={{ backgroundColor: `var(--lp-button-color)` }} /></div>;
              if (x === 9 && y === 9) return <div key={index} id={`lp-button-${index}`} />;
              let clipPath = "";
              if (x == 4 && y == 4) {
                clipPath = "polygon(100% 0, 100% 80%, 80% 100%, 0 100%, 0 0)";
              }
              else if (x == 4 && y == 5) {
                clipPath = "polygon(80% 0, 100% 20%, 100% 100%, 0 100%, 0 0)"
              }
              else if (x == 5 && y == 4) {
                clipPath = "polygon(100% 0, 100% 100%, 20% 100%, 0 80%, 0 0)";
              }
              else if (x == 5 && y == 5) {
                clipPath = "polygon(20% 0, 100% 0, 100% 100%, 0 100%, 0 20%)";
              }

              return <div key={index} id={`lp-button-${index}`} className="w-12 h-12 flex justify-center items-center">
                <button onPointerDown={() => {
                  press(x, y);
                }}
                  onPointerUp={() => {
                    unpress(x, y);
                  }} className="w-full h-full text-2xl" style={{ backgroundColor: x === 9 || y === 0 || x === 0 || y === 9 ? "#1b1b1b" : `var(--lp-button-color)`, clipPath: clipPath }}>
                  {x === 9 ? <><span className="text-2xl block" style={{ color: `var(--lp-button-color)`, transform: "scaleY(1.5)" }}>&gt;</span>{chain == y ? <span className="absolute block text-2xl text-white opacity-25 ml-20 -mt-8">&lt;</span> : undefined}</> : x == 0 || y == 0 || y == 9 ? <span className="text-xs block" style={{ color: `var(--lp-button-color)` }}>Text</span> : undefined}
                </button>
              </div>;
            })
          }
        </div>
      </div>
    </div>
  );
}