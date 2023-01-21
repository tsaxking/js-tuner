const sleep = async(ms) => new Promise(resolve => setTimeout(resolve, ms));

var audioCtxHPS;
var streamRunningHPS = false;

// # General settings
const SAMPLE_FREQ = 180000; // sample frequency in Hz
const WINDOW_SIZE = Math.pow(2, 16); // window size of the DFT in samples
const WINDOW_STEP = WINDOW_SIZE / 2; // step size of window
const WINDOW_T_LEN = WINDOW_SIZE / SAMPLE_FREQ; // length of the window in seconds
const SAMPLE_T_LENGTH = 1 / SAMPLE_FREQ; // length between two samples in seconds
const NUM_HPS = 4; //max number of harmonic product spectrums
const DELTA_FREQ = (SAMPLE_FREQ / WINDOW_SIZE); // frequency step width of the interpolated DFT
const FUND = 440;
//var windowSamples = [0 for _ in range(WINDOW_SIZE)]; // samples of the current window

class Canvas {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');

        this.elements = [];
        this.animating = false;
    }

    get width() {
        return this.canvas.width;
    }

    get height() {
        return this.canvas.height;
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    add(element) {
        this.elements.push(element);
    }

    remove(element) {
        this.elements.splice(this.elements.indexOf(element), 1);
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    draw() {
        this.clear();
        this.elements.forEach(element => element.draw({
            context: this.context,
            width: this.width,
            height: this.height,
            canvas: this.canvas
        }));
    }

    animate(animateFunction = () => {}) {
        if (!this.animateFunction) this.animateFunction = animateFunction;
        this.animating = true;
        this.animateFunction(this.elements);
        this.canvas.draw();
        if (this.animating) requestAnimationFrame(this.animate.bind(this));
    }

    stop() {
        this.animating = false;
        this.animateFunction = null;
    }
}

const canvas = new Canvas(document.querySelector('canvas'));

canvas.resize(window.innerWidth, window.innerHeight);

class Data {
    constructor(data) {
        this.data = data;
    }

    draw({
        context,
        width,
        height
    }) {
        canvas.clear();
        // draw data as a line
        context.beginPath();
        const length = this.data.length;
        const step = width / length;
        this.data.forEach((value, index) => {
            context.lineTo(index * step, (height / 2) - value * height);
        });
        context.stroke();
    }
}

class Tuner {
    constructor() {
        this.currentPromise = null;
    }

    async start() {
        await this.initialTuning();
        await this.startTuning();
    }

    stop() {
        if (this.currentPromise) {
            this.currentPromise.reject();
            this.currentPromise = null;
        }
    }

    async initialTuning() {
        // tuning note

        // resolve when button is pressed

        return new Promise((resolve, reject) => {
            this.currentPromise = { resolve, reject };
            this.draw = ({
                context,
                width,
                height
            }) => {

            }
        });
    }

    async startTuning() {
        // chromatic scale, full range

        // resolve when button is pressed

        return new Promise((resolve, reject) => {
            this.currentPromise = { resolve, reject };

            this.draw = ({
                context,
                width,
                height
            }) => {

            }
        });
    }

    draw() {}
}

var streamRunning = false;

Number.prototype.mod = function(n) {
    return ((this % n) + n) % n;
};

function start_simple_tuner() {
    "use strict";
    var input_data = [];
    var fft = new FFT(WINDOW_SIZE, SAMPLE_FREQ);
    var max_freq = 0;
    var spectrum = [];
    let analyzer;
    let time;

    var soundAllowed = async function(stream) {
        console.log("sound allowed");
        streamRunning = true;
        window.persistAudioStream = stream;
        const audioCtx = new(AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_FREQ });
        var audioStream = audioCtx.createMediaStreamSource(stream);

        analyzer = audioCtx.createAnalyser();
        analyzer.fftSize = 256;
        analyzer.maxDecibels = -6;
        // analyzer.minDecibels = -90;

        audioStream.connect(analyzer);

        // audioworklet
        await audioCtx.audioWorklet.addModule('/tuner/static/audio-worklet-node.js');
        const soundProcNode = new AudioWorkletNode(audioCtx, 'sound-processor');
        audioStream.connect(soundProcNode);
        soundProcNode.connect(audioCtx.destination);
        soundProcNode.port.onmessage = do_processing;
    }

    function do_processing(e) {
        if (!streamRunning) return;
        if (!time) time = performance.now();
        else {
            // console.log('Time: ', performance.now() - time);
            time = performance.now();
        }

        input_data = input_data.concat(e.data);
        if (input_data.length >= WINDOW_SIZE) {
            fft.forward(input_data.slice(0, WINDOW_SIZE));
            spectrum = fft.spectrum;

            canvas.elements = [new Data(spectrum.map(s => s * 10))];
            canvas.draw();

            // Calculate signal power
            var normFactor = spectrum.reduce((t, n) => t + n ** 2);
            if ((normFactor / spectrum.length) < (3e-8)) {
                input_data = input_data.slice(WINDOW_STEP, input_data.length);
                return;
            }

            const indexOfMaxValue = spectrum.indexOf(Math.max(...spectrum));
            max_freq = indexOfMaxValue * (SAMPLE_FREQ / WINDOW_SIZE);
            input_data = input_data.slice(WINDOW_STEP, input_data.length);
            const note = find_closest_note(max_freq);

            note.addSample(max_freq);
            console.log(note);
        }
    }

    const soundNotAllowed = function(error) {
        console.log('Sound was not allowed');
        console.log(error);
    }

    function find_closest_note(pitch) {
        return notes.find((n, i, a) => {
            if (i === a.length - 1) {
                return Math.abs(pitch - n.pitch) < Math.abs(pitch - a[i - 1].pitch);
            }
            const next = a[i + 1];
            return Math.abs(pitch - n.pitch) < Math.abs(pitch - next.pitch);
        });
    }

    const peaked = (arr) => {
        const peak = 0; // 0dB
        // test if the array is peaked
        return arr.every((v, i, a) => {
            if (i === 0) return true;
            return v < a[i - 1] + peak;
        });
    }


    navigator.getUserMedia = (navigator.getUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.msGetUserMedia);
    navigator.getUserMedia({ audio: true }, soundAllowed, soundNotAllowed);
};

function average(arr) {
    return arr.reduce((t, n) => t + n) / arr.length;
}

class Note {
    constructor(pitch) {
        this.pitch = pitch;
        this.midi = Note.getMidiNum(pitch);
        const { name, octave, enharmonics } = Note.getNoteName(pitch);

        this.noteInfo = {
            name: name + octave,
            diatonic: name[0],
            accidental: name[1],
            octave: octave,
            enharmonics: enharmonics
        }

        this.name = name + octave;
        this.diatonic = name[0];
        this.accidental = name[1];
        this.noteName = name;
        this.octave = octave;
        this.samples = [];
        this.average = 0;
        this.max = 0;
        this.min = 0;
        this.std = 0;
    }

    getInterval(note) {
        return note.midi - this.midi;
    }

    getNoteFromInterval(interval) {
        return notes.find(n => n.midi === this.midi + interval);
    }

    addSample(sample) {
        this.samples.push(sample);
        this.average = average(this.samples);
        this.max = Math.max(...this.samples);
        this.min = Math.min(...this.samples);
        this.std = Math.sqrt(this.samples.reduce((t, n) => t + (n - this.average) ** 2) / this.samples.length);
    }

    static getMidiNum(pitch) {
        return Math.round(12 * Math.log2(pitch / FUND)) + 69;
    }

    static getNoteName(pitch) {
        const midiNum = Note.getMidiNum(pitch);
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const enharmonics = {
            'C': ['B#', 'Dbb'],
            'C#': ['Db', 'B##'],
            'D': ['C##', 'Ebb'],
            'D#': ['Eb', 'Fbb'],
            'E': ['D##', 'Fb'],
            'F': ['E#', 'Gbb'],
            'F#': ['Gb', 'E##'],
            'G': ['F##', 'Abb'],
            'G#': ['Ab', 'Bbb'],
            'A': ['G##', 'Bb'],
            'A#': ['Bb', 'Cbb'],
            'B': ['A##', 'Cb']
        }


        return {
            name: noteNames[midiNum.mod(12)],
            octave: (Math.floor(midiNum / 12) - 1),
            enharmonics: enharmonics[noteNames[midiNum.mod(12)]]
        };
    }

    static getNote(pitch) {
        const midi = Note.getMidiNum(pitch);
        return notes[midi - 21];
    }

    static getCents(pitch1, pitch2) {
        return 1200 * (Math.log(pitch2 / pitch1) / Math.log(2));
    }

    play(duration) {
        // create an oscillator
        // set attack and release times
        // connect to the output

        const audioCtx = new AudioContext();

        const osc = new OscillatorNode(audioCtx, {
            type: 'sine',
            frequency: this.pitch
        });

        const gain = new GainNode(audioCtx, {
            gain: 0
        });

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        gain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + .05);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (duration / 1000));

        setTimeout(() => {
            osc.stop();
            osc.disconnect();
            gain.disconnect();
        }, duration);

        return osc;
    }
}

// create all the notes in a piano (A0 - C8)
const notes = Array.from({ length: 88 }, (_, i) => {
    return new Note(FUND * Math.pow(2, (i) / 12) / 16);
});

const scales = {};

class Scale {
    constructor(name, notes) {
        this.name = name;
        this.notes = notes;
    }

    generateFromRoot(root) {
        // root is a note name without the octave
        const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const rootIndex = chromatic.indexOf(root);
        const notes = [];
        for (let i = 0; i < this.allNotes.length; i++) {
            notes.push(chromatic[(rootIndex + this.notes[i]) % 12]);
        }
        return notes;
    }

    generateFromPitch(pitch) {
        const root = notes.find(n => n.pitch === pitch);
        return this.generateFromRoot(root.name);
    }

    generateFromMidi(midi) {
        const root = notes.find(n => n.midi === midi);
        return this.allNotes.map(n => notes[n + root.midi - 21]);
    }

    get allScales() {
        return {
            A: this.generateFromRoot('A'),
            'A#': this.generateFromRoot('A#'),
            B: this.generateFromRoot('B'),
            C: this.generateFromRoot('C'),
            'C#': this.generateFromRoot('C#'),
            D: this.generateFromRoot('D'),
            'D#': this.generateFromRoot('D#'),
            E: this.generateFromRoot('E'),
            F: this.generateFromRoot('F'),
            'F#': this.generateFromRoot('F#'),
            G: this.generateFromRoot('G'),
            'G#': this.generateFromRoot('G#')
        }
    }

    get intonation() {
        // return array of cents off from 12TET for each note in the scale
        // use the harmonic series to calculate the correct pitch
        // the correct pitch is the lowest pitch that is a multiple of the fundamental

        const aScale = this.allScales.A;

        aScale.pop();

        const scale = aScale.map(n => {
            return notes.find(note => note.noteName === n);
        });

        const firstNote = scale[0];

        const intonation = scale.map((note, i) => {
            if (i === 0) return 0;
            let j = 2;
            while (true) {
                const octave = (2 ** Math.floor((Math.log2(j))));
                const harmonic = (firstNote.pitch * j) / octave;
                const foundNote = Note.getNote(harmonic);
                if (foundNote.noteName == note.noteName) {
                    return Note.getCents(foundNote.pitch, harmonic);
                }

                j++;

                if (j == 1000) throw new Error('Could not find harmonic');
            }
        });

        return [...intonation, 0];
    }

    get allNotes() {
        return [...this.notes, 12];
    }

    async playScale(duration, midiRoot) {
        if (!midiRoot) midiRoot = 48;
        if (!duration) duration = 500;

        const scale = this.generateFromMidi(midiRoot);

        for (const note of scale) {
            note.play(duration);
            await sleep(duration);
        }
    }

    async playIntonation(duration, midiRoot) {
        if (!midiRoot) midiRoot = 'A';
        if (!duration) duration = 500;

        const { intonation } = this;

        const scale = this.generateFromMidi(midiRoot).map((n, i) => {
            const cents = intonation[i];
            const newPitch = n.pitch * Math.pow(2, cents / 1200);
            return new Note(newPitch);
        });

        for (const note of scale) {
            note.play(duration);
            await sleep(duration);
        }
    }

    async playBoth(duration, midiRoot) {
        this.playScale(duration, midiRoot);
        this.playIntonation(duration, midiRoot);
    }
}

class Interval {

}

class HarmonicSeries {
    constructor() {}

    static get intervals() {
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(interval => {
            const harmonics = [];

            const firstNote = notes.find(n => n.noteName === 'A');
            console.log('note+interval', firstNote, interval);

            let j = 2;
            let test = 0;
            let lastJ;
            let root;
            let threshold = 5;
            while (harmonics.length < threshold) {
                test++;
                if (test == 1000000) break;
                const octave = (2 ** Math.floor((Math.log2(j))));
                const harmonic = (firstNote.pitch * j) / octave;
                const foundNote = Note.getNote(harmonic);
                if (!root) {
                    console.log('root', foundNote, j);
                    root = foundNote;
                    lastJ = j;
                    continue;
                }
                if (root.getInterval(foundNote) == interval) {
                    console.log('found', foundNote);
                    const cents = Note.getCents(foundNote.pitch, harmonic);
                    if (harmonics.length > 0 && harmonics.includes(cents)) {
                        threshold--;
                    } else harmonics.push(cents);

                    root = null;
                    lastJ = null;
                }
                j++;
            }

            return harmonics;
        }).reduce((acc, val, i) => {
            acc[i + 1] = val;
            return acc;
        }, {});
    }
}

class CircleOfFifths {
    constructor() {

    }

    static get intervals() {
        let current = 0;
        return Array.from({ length: 12 }, (v, i) => {
            if (i === 0) {
                current = 0;
                return 0;
            }

            current += 7;
            if (current > 11) current -= 12;

            return current;
        });
    }
}

scales.major = new Scale('major', [0, 2, 4, 5, 7, 9, 11]);
scales.minor = new Scale('minor', [0, 2, 3, 5, 7, 8, 10]);
scales.aeolian = new Scale('aeolian', [0, 2, 3, 5, 7, 8, 10]);
scales.dorian = new Scale('dorian', [0, 2, 3, 5, 7, 9, 10]);
scales.phrygian = new Scale('phrygian', [0, 1, 3, 5, 7, 8, 10]);
scales.lydian = new Scale('lydian', [0, 2, 4, 6, 7, 9, 11]);
scales.mixolydian = new Scale('mixolydian', [0, 2, 4, 5, 7, 9, 10]);
scales.locrian = new Scale('locrian', [0, 1, 3, 5, 6, 8, 10]);
scales.harmonicMinor = new Scale('harmonicMinor', [0, 2, 3, 5, 7, 8, 11]);
scales.melodicMinor = new Scale('melodicMinor', [0, 2, 3, 5, 7, 9, 11]);
scales.pentatonicMajor = new Scale('pentatonicMajor', [0, 2, 4, 7, 9]);
scales.pentatonicMinor = new Scale('pentatonicMinor', [0, 3, 5, 7, 10]);
scales.blues = new Scale('blues', [0, 3, 5, 6, 7, 10]);
scales.wholeTone = new Scale('wholeTone', [0, 2, 4, 6, 8, 10]);
scales.octatonic = new Scale('octatonic', [0, 2, 3, 5, 6, 8, 9, 11]);
scales.diminished = new Scale('diminished', [0, 1, 3, 4, 6, 7, 9, 10]);
scales.chromatic = new Scale('chromatic', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);


start_simple_tuner();