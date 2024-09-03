import Module from '../module';

export default class TrackTime extends Module {

    time: number // In milliseconds

    start(): void {
        this.time = performance.now();
    }

    onSendData(data): void {
        if (!this.time) {
            return;
        }
        const timeSpent = performance.now() - this.time;
        // Restart time
        this.time = performance.now();

        // Attach data
        data.ts = timeSpent;
    }

    onUserInactive(): void {
        this.time = null;
    }

    onUserReactive(): void {
        this.time = performance.now();
    }
}