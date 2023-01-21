class SoundProcessor extends AudioWorkletProcessor {
    constructor(...args) {
        super(...args);
        this.input_data = [];
    }

    process(inputs, outputs) {
        // By default, the node has single input and output.
        for (let i = 0; i < inputs[0][0].length; i++) {
            this.input_data.push(inputs[0][0][i])
        }

        if (this.input_data.length >= 16384) {
            this.port.postMessage(this.input_data);
            this.input_data = [];
        }
        return true
    }
}

registerProcessor('sound-processor', SoundProcessor);