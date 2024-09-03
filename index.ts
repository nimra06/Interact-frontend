import Module from './modules/module';
import TrackTimeBySections from './modules/track-time-by-sections/index';
import TrackTime from './modules/track-time/index';


class Interact {

    readonly MIN_DATA_INTERVAL: number = 1000 // milliseconds
    readonly INACTIVITY_INTERVAL: number = 2000

    ws: WebSocket

    lastSentAt: number = performance.now() // In milliseconds
    lastInteractedAt: number = performance.now(); // In milliseconds

    interactId: string
    requestId: string

    data: Object = {} // Data to send to websocket
    isInActive: boolean = false
    sendingForFirstTime: boolean = true

    // Event listeners
    mouseMoveEventListener: EventListener

    modules: Module[] = [
        new TrackTime,
        new TrackTimeBySections,
    ]


    constructor() {
        this.mouseMoveEventListener = () => this.maybeSendData();
    }

    start(): void {
        let interactId = this.getCookie('interactid');
        if (!interactId) {
            interactId = this.generateUuid();
            this.setCookie('interactid', interactId, 90);
        }
        this.requestId = this.generateUuid();
        this.interactId = interactId;
        // For now host is the same site script is running on
        let host = '';
        if (process.env.NODE_ENV === 'production') {
            host = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/app/${process.env.PUSHER_APP_KEY}/v1/client/ws`;
        } else {
            host = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}:6001/app/${process.env.PUSHER_APP_KEY}/v1/client/ws`;
        }
        this.ws = new WebSocket(host);
        this.ws.onopen = (evt) => this.onOpen(evt);
        this.ws.onmessage = (evt) => this.onMessage(evt);
        this.loadModules();
        document.addEventListener('mousemove', this.mouseMoveEventListener);
        document.addEventListener('scroll', this.mouseMoveEventListener);
        setInterval(() => this.checkInactivity(), 100);
    }

    checkInactivity(): void {
        if (this.isInActive) return;
        const currentTime = performance.now();
        if ((currentTime - this.lastInteractedAt) > this.INACTIVITY_INTERVAL) {
            this.isInActive = true;
            // Set lastSentAt to current time
            this.lastInteractedAt = currentTime;

            // All modules know that user is inactive
            this.modules.forEach(module => {
                module.onUserInactive(this.data);
            })
        }
    }

    maybeSendData(): void {
        if (this.isInActive) {
            this.isInActive = false;
            this.modules.forEach(module => {
                module.onUserReactive(this.data);
            })
        } else {
            this.lastInteractedAt = performance.now();
            const currentTime = performance.now();
            if ((currentTime - this.lastSentAt) < this.MIN_DATA_INTERVAL) {
                return;
            }

            this.prepareAndSendData();
        }
    }

    generateUuid(): string {
        var dt = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (dt + Math.random()*16)%16 | 0;
            dt = Math.floor(dt/16);
            return (c=='x' ? r :(r&0x3|0x8)).toString(16);
        });
        return uuid;
    }

    loadModules(): void {
        this.modules.forEach(module => {
            module.start();
        })
    }

    prepareAndSendData(): void {
        // Prepare data from all modules
        this.modules.forEach(module => {
            module.onSendData(this.data);
        });

        const prependData = {
            uuid: this.interactId,
            url: window.location.href,
            request_uuid: this.requestId,
        }
        if (this.sendingForFirstTime) {
            this.sendingForFirstTime = false;
            const { detect } = require('detect-browser');
            const browser = detect();
            if (browser) {
                prependData['browser'] = browser.name;
                prependData['os'] = browser.os;
                prependData['browser_type'] = browser.type;
                prependData['browser_version'] = browser.version;
                prependData['referrer'] = document.referrer;
            }
        }
        const payload = {...this.data, ...prependData};

        // Finally send data
        this.ws.send(JSON.stringify(payload));
        this.lastSentAt = performance.now();
    }

    setCookie(name: string, value: string, days: number) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    }

    getCookie(name: string) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }

    onOpen(evt) {
        this.prepareAndSendData();
    }

    onMessage(evt) {
    }
}
new Interact().start();