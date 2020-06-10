import { AuthTokenService } from './oj-oda-chat-auth-token-service';

/**
 * Interface that describes required configuration to connect to speech server.
 *
 * @interface IHostConfig
 */
interface IHostConfig {
    protocol: string;
    host: string;
    channelId: string;
    userId: string;
}

/**
 * Service to manage speech recognition for user's audio speech to text
 * message conversion.
 *
 * @class SpeechRecognitionService
 */
class SpeechRecognitionService {

    /**
     * Returns an instance of the Speech recognition service
     *
     * @static
     * @returns SpeechRecognitionService
     */
    public static getInstance() {
        if (!this._service) {
            this._service = new SpeechRecognitionService();
        }
        return this._service;
    }

    private static _service: SpeechRecognitionService;

    // Speech Service Access Variables
    private readonly speechRoute = '/voice/stream/recognize';
    private readonly speechLocale = 'en-us';
    private readonly speechDomain = 'generic';

    private requestUrl: string;
    private authTokenService: AuthTokenService;

    // Connection Management Variables
    private connection: WebSocket;

    // State Tracking Variables
    private started = false;
    private isConnected = false;

    // Callbacks
    private onSpeechRecognition: Function;
    private onSpeechNetworkChange: Function;

    // Recording Variables
    private audioContext: AudioContext;
    private BUFF_SIZE = 4096;
    private processor: ScriptProcessorNode;
    private microphoneStream: MediaStreamAudioSourceNode;

    // Frame management for downsampling
    private isFirstFrame = true;
    private filterBuffer: any = [];

    // Anti-aliasing filter: Lowpass from 48 kHz to 16 kHz ( QMF FIR filter with cut-off frequency (@ -3 dB) at about 0.913 times target fs/2 - 180 taps)
    private readonly LP_48000_TO_16000_FIR = [
        -2.5033838264794034e-05, -3.6451561137378568e-05, -1.1489993827892933e-05, 3.9324378887465603e-05, 6.9984193520672766e-05, 3.7556691270439976e-05, -4.7696645534530499e-05, -0.00011379935461751734, -8.4009576971176187e-05, 4.2088177776074692e-05, 0.00016391587447478332, 0.00015508372993570357, -1.253765788919669e-05, -0.00021258262011091092, -0.00025240598961751948, -5.1874329668708116e-05, 0.00024792300097682143, 0.00037351534477673157, 0.00016157590781788105, -0.00025410852391986031, -0.00051048686533259301, -0.00032461046175409392, 0.00021219136947965464, 0.00064888778256045612, 0.00054444169352930365, -0.0001016639071691704, -0.0007673001147209819, -0.00081767209129386914, -9.7269698241155101e-05, 0.00083761858525280384, 0.0011319450250252222, 0.00040081933397990521, -0.0008262743020160207, -0.0014643282305934196, -0.00081833650450470333, 0.00069644717721537768, 0.0017804679224891051, 0.0013489288090360295, -0.00041122152287042, -0.0020347535966250413, -0.0019782994815083733, -6.2477942460992689e-05, 0.0021716438099647051, 0.0026761621389245617, 0.00074944268608934995, -0.0021281777588728801, -0.003394541347147186, -0.0016615884301227524, 0.001837545335885159, 0.0040671707022465458, 0.0027936171643976352, -0.001233420727213658, -0.0046100353145374761, -0.0041193191532029718, 0.00025459137646049936, 0.00492286494534436, 0.0055888057003698156, 0.0011507624257558831, -0.004891042781491068, -0.0071267634777626675, -0.0030219790398189408, 0.0043868863131564196, 0.008631467181982988, 0.0053851392366346717, -0.0032684060793252661, -0.0099736612552352843, -0.0082562565027453159, 0.0013719935383757782, 0.010993210336541666, 0.011651337116264694, 0.0015082475865128093, -0.011488721952090169, -0.015609515327517686, -0.0056715044416709888, 0.011188303272599716, 0.020245190585021479, 0.011637590928971467, -0.009667754909210324, -0.025878090076785515, -0.020500381603699786, 0.0060989081377006418, 0.033428666116203716, 0.035134870175731782, 0.0017197396227647229, -0.046085580848361105, -0.066230781503150371, -0.023349941728869696, 0.082922132071591242, 0.21069217442624302, 0.29738297113974183, 0.29738297113974188, 0.21069217442624305, 0.082922132071591242, -0.023349941728869693, -0.066230781503150371, -0.046085580848361105, 0.0017197396227647225, 0.035134870175731782, 0.033428666116203716, 0.0060989081377006409, -0.020500381603699783, -0.025878090076785508, -0.0096677549092103257, 0.011637590928971469, 0.020245190585021472, 0.011188303272599716, -0.0056715044416709897, -0.015609515327517682, -0.011488721952090169, 0.0015082475865128089, 0.011651337116264699, 0.010993210336541666, 0.0013719935383757782, -0.0082562565027453141, -0.0099736612552352825, -0.0032684060793252657, 0.0053851392366346699, 0.008631467181982988, 0.0043868863131564188, -0.0030219790398189413, -0.0071267634777626675, -0.0048910427814910715, 0.0011507624257558842, 0.005588805700369813, 0.00492286494534436, 0.00025459137646049936, -0.0041193191532029726, -0.0046100353145374752, -0.0012334207272136583, 0.0027936171643976361, 0.0040671707022465458, 0.0018375453358851592, -0.0016615884301227509, -0.0033945413471471847, -0.0021281777588728797, 0.00074944268608935049, 0.0026761621389245612, 0.0021716438099647056, -6.2477942460992527e-05, -0.0019782994815083729, -0.0020347535966250404, -0.00041122152287042, 0.0013489288090360292, 0.0017804679224891048, 0.00069644717721537768, -0.00081833650450470257, -0.00146432823059342, -0.0008262743020160207, 0.0004008193339799063, 0.0011319450250252222, 0.00083761858525280373, -9.7269698241154938e-05, -0.00081767209129386936, -0.00076730011472097832, -0.00010166390716916983, 0.00054444169352930332, 0.00064888778256045622, 0.00021219136947965461, -0.00032461046175409424, -0.00051048686533259301, -0.00025410852391986036, 0.0001615759078178811, 0.00037351534477673152, 0.00024792300097682137, -5.1874329668708082e-05, -0.00025240598961751942, -0.00021258262011091095, -1.253765788919669e-05, 0.0001550837299357036, 0.00016391587447478329, 4.2088177776074685e-05, -8.4009576971176228e-05, -0.00011379935461751733, -4.7696645534530512e-05, 3.7556691270440023e-05, 6.9984193520672793e-05, 3.9324378887465603e-05, -1.1489993827892933e-05, -3.6451561137378561e-05, -2.503383826479402e-05];

    // Anti-aliasing filter: Lowpass from 44.1 kHz to 16 kHz ( QMF FIR filter with cut-off frequency (@ -3 dB) at about 0.913 times target fs/2 - 198 taps)
    private LP_44100_TO_16000_FIR = [
        -5.0442670678931389e-06, 5.7387402475946118e-06, 1.6111955556881562e-05, 1.0560179594562795e-05, -1.242816862904201e-05, -3.0844307043286112e-05, -1.8160396924882423e-05, 2.303124169528074e-05, 5.2166127028948343e-05, 2.8060268867465088e-05, -3.8960852158706798e-05, -8.1742452780124758e-05, -4.0375430619853529e-05, 6.1937527629495596e-05, 0.00012143092661620545, 5.5083199655424166e-05, -9.4018915834788832e-05, -0.00017326981522755043, -7.1980690559262061e-05, 0.00013762742186917889, 0.00023946132645647525, 9.0640305456980252e-05, -0.00019557611633250834, -0.00032235115028269961, -0.00011036322783022617, 0.00027109356679312489, 0.00042440564349633953, 0.00013013140955365376, -0.00036784896615780913, -0.00054818864384810245, -0.00014855826094166272, 0.00048997989469673812, 0.00069634056098547199, 0.00016383778624615643, -0.00064212634080516417, -0.00087156318803636578, -0.00017369118859371453, 0.00082947634944882101, 0.0010766146787146871, 0.00017530890385814463, -0.0010578310750603923, -0.001314320458073489, -0.00016528446487115559, 0.0013337004262191077, 0.0015876076783199174, 0.00013953430808441101, -0.0016644454627712116, -0.0018995735273800139, -9.3194220249958316e-05, 0.0020584911853959329, 0.0022536018141979036, 2.0477911370491685e-05, -0.0025256449668619525, -0.0026535487754524955, 8.5524983764739568e-05, 0.0030775744811722015, 0.0031040297261920998, -0.00023314744969763122, -0.0037285298083316772, -0.0036108562301133918, 0.000432598472497653, 0.0044964472481822506, 0.004181705019767344, -0.00069666854662353778, -0.0054046664894787377, -0.0048271571073186699, 0.0010418556659416306, 0.0064846675196077869, 0.0055623536874255799, -0.0014902159613265254, -0.0077805739864079248, -0.0064097301786953595, 0.0020725170108587278, 0.0093568705461191341, 0.0074037416266333166, -0.0028338600976495301, -0.011312323822665827, -0.0085995125961405242, 0.003844300507349054, 0.013806774337071994, 0.01008985372973804, -0.0052204603128626383, -0.01711716324115331, -0.012041967497539271, 0.0071740462453576109, 0.021768247992024713, 0.01478690833035584, -0.010136389804721707, -0.028887356248960279, -0.019078400739739057, 0.015146805312378952, 0.041410446665863104, 0.027068163980255515, -0.025512027260482153, -0.070112183787435889, -0.048296784335034211, 0.060413687016046512, 0.21199607414538668, 0.32135326524472613, 0.32135326524472613, 0.21199607414538668, 0.060413687016046526, -0.048296784335034218, -0.070112183787435889, -0.025512027260482153, 0.027068163980255515, 0.041410446665863104, 0.015146805312378952, -0.019078400739739057, -0.028887356248960279, -0.010136389804721703, 0.01478690833035584, 0.021768247992024713, 0.0071740462453576109, -0.012041967497539271, -0.01711716324115331, -0.0052204603128626391, 0.010089853729738038, 0.013806774337071994, 0.0038443005073490553, -0.0085995125961405242, -0.011312323822665827, -0.0028338600976495314, 0.0074037416266333174, 0.0093568705461191341, 0.002072517010858727, -0.0064097301786953586, -0.0077805739864079248, -0.001490215961326526, 0.0055623536874255773, 0.0064846675196077869, 0.0010418556659416256, -0.0048271571073186734, -0.0054046664894787386, -0.00069666854662353778, 0.0041817050197673448, 0.0044964472481822514, 0.00043259847249765327, -0.0036108562301133918, -0.0037285298083316772, -0.00023314744969763149, 0.0031040297261921003, 0.0030775744811722011, 8.5524983764738972e-05, -0.002653548775452496, -0.0025256449668619521, 2.0477911370491641e-05, 0.002253601814197904, 0.0020584911853959329, -9.3194220249959088e-05, -0.0018995735273800139, -0.0016644454627712118, 0.00013953430808441038, 0.0015876076783199174, 0.0013337004262191077, -0.00016528446487115559, -0.0013143204580734896, -0.0010578310750603925, 0.00017530890385814333, 0.0010766146787146878, 0.00082947634944881949, -0.00017369118859371463, -0.00087156318803637001, -0.0006421263408051633, 0.00016383778624615698, 0.00069634056098547155, 0.00048997989469673812, -0.00014855826094166245, -0.00054818864384810267, -0.00036784896615780924, 0.00013013140955365368, 0.00042440564349633964, 0.00027109356679312505, -0.00011036322783022619, -0.00032235115028269961, -0.00019557611633250842, 9.0640305456980171e-05, 0.00023946132645647525, 0.00013762742186917883, -7.1980690559262075e-05, -0.00017326981522755049, -9.4018915834788859e-05, 5.5083199655424159e-05, 0.00012143092661620549, 6.1937527629495569e-05, -4.0375430619853522e-05, -8.1742452780124772e-05, -3.8960852158706805e-05, 2.8060268867465078e-05, 5.2166127028948336e-05, 2.303124169528077e-05, -1.8160396924882423e-05, -3.0844307043286126e-05, -1.2428168629042018e-05, 1.0560179594562806e-05, 1.6111955556881568e-05, 5.738740247594605e-06, -5.044267067893138e-06];

    private constructor() {
        this.setupMediaDevices();
    }

    /**
     * Initialize or reset speech server connection URL
     *
     * @param {IHostConfig} hostConfig URL configuration object with fields host, channelId, and userId
     * @param {string} [authToken] Optional authorization string for client auth secure mode
     * @returns {Promise<void>} Resolves once the server URL is set
     */
    public init(hostConfig: IHostConfig, authTokenService?: AuthTokenService): Promise<void> {
        return new Promise((resolve, reject) => {
            this.authTokenService = authTokenService;
            this.buildSpeechRequestUrl(hostConfig, authTokenService ? true : false).then((url) => {
                this.requestUrl = url;
                resolve();
            }).catch((reason) => {
                reject(reason);
            });
        });
    }

    /**
     * Start audio recording for speech recognition
     *
     * @returns Promise to resolve if the audio recording is started.
     */
    public startRecording(onSpeechRecognition: Function, onSpeechNetworkChange: Function): Promise<any> {
        this.onSpeechRecognition = onSpeechRecognition;
        this.onSpeechNetworkChange = onSpeechNetworkChange;

        if (this.getAudioInput()) {
            // Cordova
            return this.startRecordingCordova();
        } else {
            // Web
            return this.startRecordingWeb();
        }
    }

    /**
     * Stop audio recording and cancel speech recognition
     */
    public stopRecording() {
        if (!this.connection) {
            return;
        }
        if (this.connection.readyState === WebSocket.OPEN) {
            this.connection.close();
        }
        this.stopMicrophone();
    }

    /**
     * Uses WebRTC APIs to get microphone permission and starts recording voice
     *
     * @private
     * @returns {Promise<any>} Promise that is resolved when user grants mic permission and is rejected if the permission is denied
     */
    private startRecordingWeb(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.requestUrl) {
                reject(new Error('Speech server URL not set. Can not start recording.'));
            } else if (navigator.mediaDevices) {
                if (this.started) {
                    reject(new Error('A speech recognition is in process. Can not start a new recognition.'));
                } else {
                    navigator.mediaDevices.getUserMedia({ audio: true })
                        .then((stream: MediaStream) => {
                            resolve();

                            this.audioContext = new AudioContext();
                            this.microphoneStream = this.audioContext.createMediaStreamSource(stream);
                            this.startMicrophone();
                        }).catch((error) => {
                            reject(error);
                        });
                }
            } else {
                reject(new Error('getUserMedia is not implemented in this browser. Can not record voice.'));
            }
        });
    }

    /**
     * Uses cordova-audio-input plugin APIs to get microphone permission and starts recording voice
     *
     * @private
     * @returns {Promise<any>} Promise that is resolved when user grants mic permission and is rejected if the permission is denied
     */
    private startRecordingCordova(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getMicrophonePermission().then(() => {
                resolve();
                this.getAudioInput().start({
                    audioSourceType: this.getAudioInput().AUDIOSOURCE_TYPE.VOICE_RECOGNITION || this.getAudioInput().AUDIOSOURCE_TYPE.DEFAULT,
                    streamToWebAudio: true
                });
                this.audioContext = this.getAudioInput().getAudioContext();
                this.microphoneStream = this.getAudioInput();
                this.startMicrophone();
            }).catch((reason) => {
                reject(reason);
            });
        });
    }

    /**
     * Requests permission to access microphone stream using cordova-audio-input plugin
     *
     * @private
     * @returns {Promise<boolean>} Promise that resolves to true if user grants the permission, false otherwise
     */
    private getMicrophonePermission(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.getAudioInput().checkMicrophonePermission((hasPermission: boolean) => {
                try {
                    if (hasPermission) {
                        resolve();
                    } else {
                        this.getAudioInput().getMicrophonePermission((granted: boolean, message: any) => {
                            try {
                                if (granted) {
                                    resolve();
                                } else {
                                    reject('Permission to record voice has been denied. ' + message);
                                }
                            } catch (e) {
                                reject('Start after getting permission exception: ' + e);
                            }
                        });
                    }
                } catch (e) {
                    reject(e); //, "getMicrophonePermission exception: " + ex);
                }
            });
        });
    }

    /**
     * Add compatibility support for navigator getUserMedia
     *
     * @private
     */
    private setupMediaDevices() {
        if (navigator.mediaDevices === undefined) {
            navigator['mediaDevices' as any] = {};
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia === undefined) {
            navigator.mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) => {
                // tslint:disable-next-line: no-string-literal
                const getUserMedia = navigator['webkitGetUserMedia'] || navigator['mozGetUserMedia'];

                if (!getUserMedia) {
                    return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
                }

                return new Promise((resolve, reject) => {
                    getUserMedia.call(navigator, constraints, resolve, reject);
                });
            };
        }

        // tslint:disable-next-line: no-string-literal
        window['AudioContext'] = window.AudioContext || window['webkitAudioContext'];
    }

    /**
     * Build speech server URL for sending user voice recording
     *
     * @private
     * @param {IHostConfig} config object with server configuration, includes host, channelId, userId
     * @param {boolean} [isClientAuth] optional flag to indicate whether auth token is enabled
     * @returns {Promise<string>} Promise that resolves to request URL string
     */
    private buildSpeechRequestUrl(config: IHostConfig, isClientAuth?: boolean): Promise<string> {
        const setRequestUrl = () => {
            const endpoint = new URL(config.protocol + config.host + this.speechRoute + '/' + this.speechLocale + '/' + this.speechDomain);
            const urlQueryString = endpoint.search;
            const searchParams = new URLSearchParams(urlQueryString);
            searchParams.set('channelId', config.channelId);
            searchParams.set('userId', config.userId);
            searchParams.set('encoding', 'audio/raw');
            if (isClientAuth) {
                searchParams.set('jwtInBody', 'true');
            }
            endpoint.search = searchParams.toString();
            return encodeURI(endpoint.toString());
        };
        return new Promise((resolve, reject) => {
            if (isClientAuth) {
                this.authTokenService.getToken()
                    .then((token) => {
                        config.channelId = token.getClaim('channelId');
                        config.userId = token.getClaim('userId');
                        resolve(setRequestUrl());
                    })
                    .catch(() => {
                        reject(Error('Unable to fetch JWT token. Can not use speech service.'));
                    });
                return setRequestUrl();
            } else {
                resolve(setRequestUrl());
            }
        });
    }

    /**
     * Open WebSocket connection to speech server
     * Maps WebSocket callbacks to internal functions.
     *
     * @private
     * @param {string} url
     * @returns {WebSocket}
     */
    private connectToWebSocket(url: string): WebSocket {
        const connection = new WebSocket(url);

        connection.onopen = this.connectionOnOpen.bind(this);
        connection.onclose = this.connectionOnClose.bind(this);
        connection.onmessage = this.connectionOnMessage.bind(this);
        connection.onerror = this.connectionOnError.bind(this);

        return connection;
    }

    /**
     * Callback that is called when the connection to speech server is
     * established
     *
     * @private
     */
    private connectionOnOpen() {
        if (this.authTokenService) {
            this.authTokenService.getToken().then((jwtToken) => {
                this.connectionSendMessage('Bearer ' + jwtToken.token);

                // Start a timer to determine whether the connection is closed due to invalid token
                setTimeout(() => {
                    if (this.connection.readyState === WebSocket.OPEN) {
                        this.setConnectionStatus(WebSocket.OPEN);
                    }
                }, 500);
            }).catch((reason) => {
                this.connection.close();
            });
        } else {
            this.setConnectionStatus(WebSocket.OPEN);
        }
    }

    /**
     * Callback that is called when the connection to speech server is closed
     *
     * @private
     * @param {CloseEvent} closeEvent
     */
    private connectionOnClose(closeEvent: CloseEvent) {
        this.setConnectionStatus(WebSocket.CLOSED);
        this.stopMicrophone();
    }

    /**
     * Callback for receiving response on WebSocket onmessage
     * Parse data and update onSpeechRecognition callback on valid result
     *
     * @private
     * @param {*} message
     */
    private connectionOnMessage(message) {
        try {
            const data = JSON.parse(message.data);
            this.onSpeechRecognition(data);
        } catch (e) {
            console.log(e);
        }
    }

    /**
     * Callback that is called when an error occurs in speech server connection
     *
     * @private
     * @param {Event} error
     */
    private connectionOnError(error: Event) {
        if (this.connection.readyState === WebSocket.OPEN) {
            this.connection.close();
        }
    }

    /**
     * Sends data to speech server after validating that connection is open
     *
     * @private
     * @param {*} data Data to send
     */
    private connectionSendMessage(data: any) {
        if (this.connection.readyState === WebSocket.OPEN) {
            this.connection.send(data);
        }
    }

    /**
     * Set connection status of Speech server
     *
     * @private
     * @param {number} status
     */
    private setConnectionStatus(status: number) {
        this.isConnected = status === WebSocket.OPEN;
        this.onSpeechNetworkChange(status);
    }

    /**
     * Returns cordova audioinput exposed object wrapper for
     * accessing microphone
     *
     * @private
     * @returns
     */
    private getAudioInput() {
        // tslint:disable-next-line: no-string-literal
        return window['audioinput'];
    }

    /**
     * Lanczos resampling
     * https://en.wikipedia.org/wiki/Lanczos_resampling
     *
     * @private
     * @param {number} a
     * @param {number} t
     * @returns {number}
     */
    private lanczosWindow(a: number, t: number): number {
        if (t === 0.)
            return 1.;
        if (t >= a || t <= -a)
            return 0.;

        const p = Math.PI * t;
        return a * Math.sin(p) * Math.sin(p / a) / (p * p);
    }

    /**
     * Downsample recorded buffer for better performance sending audio over network
     *
     * @private
     * @param {Float32Array} inBuffer
     * @param {number} inSampleRate
     * @param {number} outSampleRate
     * @returns
     */
    private downsampleBuffer(inBuffer: Float32Array, inSampleRate: number, outSampleRate: number) {
        // If input sampling rate is good, do nothing
        if (outSampleRate === inSampleRate) {
            return inBuffer;
        } else if (outSampleRate > inSampleRate) { // Else if input sampling rate is too low, throw error
            throw new Error('Input sample rate (' + inSampleRate + ' kHz) is lower than output sample rate(' + outSampleRate + ' kHz) : Use case not handled.');
        }

        // Define low pass filter for current downsampling
        let filter = [];
        if (inSampleRate === 48000) {
            filter = this.LP_48000_TO_16000_FIR;
        } else if (inSampleRate === 44100) {
            filter = this.LP_44100_TO_16000_FIR;
        } else {
            throw new Error(inSampleRate + ' kHz is not an expected input sampling frequency');
        }

        const decimationFactor = inSampleRate / outSampleRate;

        // Define working buffer for current audio frame
        let nSamplesForNextFrame;
        let nUsefulSamplesCurrentFrame;
        let workBuffer;

        if (this.isFirstFrame) {
            nSamplesForNextFrame = Math.floor(inBuffer.length % decimationFactor);
            nUsefulSamplesCurrentFrame = inBuffer.length - nSamplesForNextFrame;

            // No padding applied : dropping the first samples
            // From 48 kHz  : 168 taps / 2 in samples => 1.75 ms
            // From 44.1 kHz: 198 taps / 2 in samples => ~2.25 ms
            if (nSamplesForNextFrame === 0) {
                workBuffer = Array.from(inBuffer);
            } else {
                workBuffer = inBuffer.slice(0, nUsefulSamplesCurrentFrame);
            }
        } else {
            nSamplesForNextFrame = Math.floor((inBuffer.length + this.filterBuffer.length - filter.length) % decimationFactor); // Avoid temporal shift
            nUsefulSamplesCurrentFrame = (inBuffer.length + this.filterBuffer.length - filter.length) - nSamplesForNextFrame;

            workBuffer = new Float32Array(this.filterBuffer.length + nUsefulSamplesCurrentFrame);
            workBuffer.set(this.filterBuffer);
            workBuffer.set(inBuffer.slice(0, nUsefulSamplesCurrentFrame), this.filterBuffer.length);
        }

        // Apply filtering and decimation / interpolation
        const outBufferLength = Math.floor(nUsefulSamplesCurrentFrame / decimationFactor);
        const outBuffer = new Int16Array(outBufferLength);

        // decimationFactor is an integer (3)
        if (inSampleRate === 48000) {
            for (let i = filter.length; i < workBuffer.length; i += decimationFactor) {
                // Low Pass filtering
                let acc = 0;
                for (let k = 0; k < filter.length; k++) {
                    acc += workBuffer[i - k] * filter[k];
                }

                // Handle clipping and short formatting
                const formattedValue = Math.max(Math.min(acc, 1), -1) * 0x7FFF;

                // Decimation
                outBuffer[(i - filter.length) / decimationFactor] = formattedValue;
            }
        } else {    // 44100 kHz : decimationFactor is not an integer (~2.75)
            // Low Pass filtering
            const LP_SIGNAL = [];
            for (let i = filter.length; i < workBuffer.length; i++) {
                let acc = 0;
                for (let k = 0; k < filter.length; k++) {
                    acc += workBuffer[i - k] * filter[k];
                }
                LP_SIGNAL[i - filter.length] = acc;
            }

            // Decimation / interpolation
            for (let n = 0; n < outBufferLength; n++) {
                const a = 3; // Lanczos window type 3
                const x = n * decimationFactor;
                const start = Math.floor(x) - a + 1;
                const end = Math.floor(x) + a;
                let acc = 0.;

                for (let i = start; i <= end; i++) {
                    let s;
                    if (i < 0)
                        s = LP_SIGNAL[0];
                    else if (i >= LP_SIGNAL.length)
                        s = LP_SIGNAL[LP_SIGNAL.length - 1];
                    else
                        s = LP_SIGNAL[i];
                    acc += s * this.lanczosWindow(a, x - i);
                }

                // Handle clipping and short formatting
                outBuffer[n] = Math.max(Math.min(acc, 1), -1) * 0x7FFF;
            }
        }

        // Update filterBuffer with the last samples of current frame
        if (this.isFirstFrame) {
            this.filterBuffer = inBuffer.slice(nUsefulSamplesCurrentFrame - filter.length - this.filterBuffer.length);
        } else {
            this.filterBuffer = inBuffer.slice(nUsefulSamplesCurrentFrame - filter.length - (this.filterBuffer.length - filter.length));
        }

        // First frame already handled
        this.isFirstFrame = false; // will be re-initialized when listening is done (allowing next records)

        return outBuffer.buffer;
    }

    /**
     * Process audio buffer
     * Downsample the buffer, then send to speech server
     *
     * @private
     * @param {AudioProcessingEvent} event
     */
    private processAudioBuffer(event: AudioProcessingEvent) {
        const samples = event.inputBuffer.getChannelData(0); // just mono

        // SampleRate management (input audio can be 16, 44.1 or 48 kHz while output rate must be 16kHz)
        const outSampleRate = 16000;
        const inSampleRate = event.inputBuffer.sampleRate;
        const outBuffer = this.downsampleBuffer(samples, inSampleRate, outSampleRate);

        this.connectionSendMessage(outBuffer);
    }

    /**
     * Stop microphone from recording audio
     *
     * @private
     */
    private stopMicrophone() {
        this.started = false;
        if (!this.connection) {
            return;
        }
        if (this.isConnected) {
            this.connectionSendMessage('Done');
        }

        this.isFirstFrame = true;

        if (this.getAudioInput()) {
            this.getAudioInput().stop();
        } else {
            this.microphoneStream?.mediaStream?.getAudioTracks?.()?.forEach((track) => {
                track.stop();
                this.microphoneStream.mediaStream.removeTrack(track);
            });
            if (this.audioContext) {
                this.audioContext.close();
            }
        }

        if (this.processor) {
            this.processor.disconnect();
        }

        this.microphoneStream = null;
        this.audioContext = null;
        this.processor = null;
    }

    /**
     * Sets up microphone as media source for audio and processor as destination
     * to start recording voice
     *
     * @private
     */
    private startMicrophone() {
        this.connection = this.connectToWebSocket(this.requestUrl);

        // create audio processor with given buffer size
        this.processor = this.audioContext.createScriptProcessor(this.BUFF_SIZE, 1, 1);
        // handle onaudioprocess events
        this.processor.onaudioprocess = this.processAudioBuffer.bind(this);
        // connect stream to processor
        this.microphoneStream.connect(this.processor);
        // connect processor to audioContext destination
        this.processor.connect(this.audioContext.destination);
        this.started = true;
    }
}

export { SpeechRecognitionService };
