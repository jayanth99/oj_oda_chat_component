export class SpeechSynthesisService {

    /**
     * Static method that provides a single instance of Speech synthesis
     * service.
     *
     * @static
     * @returns {SpeechSynthesisService}
     */
    public static getInstance(): SpeechSynthesisService {
        if (!this.instance) {
            this.instance = new SpeechSynthesisService();
        }
        return this.instance;
    }

    private static instance: SpeechSynthesisService;
    private static readonly VOICES_LOAD_TIMEOUT = 2000;

    private botVoice: SpeechSynthesisVoice;

    /**
     * Creates an instance of SpeechSynthesisService.
     * If speechSynthesis Web API is not available, throws an error
     */
    private constructor() {
        if (!speechSynthesis) {
            throw new Error('SpeechSynthesis API not available on your device.');
        }

        // Async load available voices
        if (speechSynthesis.onvoiceschanged) {
            speechSynthesis.addEventListener('voiceschanged', this._setVoice.bind(this));
        } else {
            setTimeout(this._setVoice.bind(this), SpeechSynthesisService.VOICES_LOAD_TIMEOUT);
        }

        window.addEventListener('beforeunload', (event: BeforeUnloadEvent) => {
            speechSynthesis.cancel();
            delete event.returnValue;
        });
    }

    /**
     * Adds an utterance to the utterance queue; it will be spoken when any
     * other utterances queued before it have been spoken.
     *
     * @param {string} text
     */
    public speak(text: string) {
        if (speechSynthesis) {
            const speechUtterance = new SpeechSynthesisUtterance();
            speechUtterance.voice = this.botVoice;
            speechUtterance.text = text;
            speechUtterance.rate = 1;
            if (speechSynthesis.paused) {
                speechSynthesis.resume();
            }
            speechSynthesis.speak(speechUtterance);
        }
    }

    /**
     * Removes all utterances from the utterance queue. Any running utterance
     * will be stopped.
     */
    public cancel() {
        if (speechSynthesis?.speaking) {
            speechSynthesis.cancel();
        }
    }

    /**
     * Puts the SpeechSynthesis object into a paused state.
     */
    public pause() {
        if (speechSynthesis?.speaking) {
            speechSynthesis.pause();
        }
    }

    /**
     * Puts the SpeechSynthesis object into a non-paused state: resumes it if
     * it was already paused.
     */
    public resume() {
        if (speechSynthesis) {
            speechSynthesis.resume();
        }
    }

    /**
     * Set speech voice
     *
     * @private
     */
    private _setVoice() {
        if (speechSynthesis) {
            const voices = this._getVoices();
            // Use client locale if available
            if (navigator?.language) {
                this.botVoice = voices.filter((voice) => voice.lang === navigator.language)[0];
            }
            // Else get default voice from the device
            if (!this.botVoice) {
                this.botVoice = voices?.filter((voice) => voice.default)[0];
            }
            // Else, get first voice that is available
            if (!this.botVoice) {
                this.botVoice = voices[0];
            }
        }
    }

    /**
     * Returns available voices on client. Also handles API exposed by
     * cordova plugin which set voices inside _list field.
     *
     * @private
     * @returns SpeechSynthesisVoice[]
     */
    private _getVoices() {
        let voices: SpeechSynthesisVoice[] = [];
        if (speechSynthesis) {
            voices = window.speechSynthesis.getVoices();

            // Handling cordova plugins for speech synthesis
            if (!Array.isArray(voices)) {
                // tslint:disable-next-line: no-string-literal
                voices = voices['_list'];
            }
        }
        return voices;
    }
}
